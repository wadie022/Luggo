# coreapp/models.py
from django.db import models                      # → base des types de champs (CharField, DateTimeField, etc.)
from django.contrib.auth.models import AbstractUser  # → pour créer un utilisateur personnalisé (avec un champ 'role')

# -----------------------------
# Utilisateur de Luggo (custom)
# -----------------------------
KYC_STATUS = (('PENDING', 'PENDING'), ('VERIFIED', 'VERIFIED'), ('REJECTED', 'REJECTED'))

class User(AbstractUser):
    ROLE_CHOICES = (('CLIENT', 'CLIENT'), ('AGENCY', 'AGENCY'), ('ADMIN', 'ADMIN'))
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='CLIENT')
    kyc_status = models.CharField(max_length=20, choices=KYC_STATUS, default='PENDING')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    email = models.EmailField(blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

# -----------------------------
# Agence (profil pro relié à un User)
# -----------------------------
class Agency(models.Model):
    # 1–1 avec un User : une agence appartient à un compte utilisateur 'AGENCY'
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="agency")
    legal_name = models.CharField(max_length=120)      # raison sociale
    registration_number = models.CharField(max_length=50, blank=True)  # SIRET / RC / …
    country = models.CharField(max_length=2)           # code pays ISO (FR/BE/ES/CH/I/MA)
    city = models.CharField(max_length=80)             # ville
    kyc_status = models.CharField(max_length=20, default='PENDING')  # statut vérification (KYC)
    latitude  = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    address   = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.legal_name} [{self.country}-{self.city}]"


class AgencyBranch(models.Model):
    """Adresse/succursale d'une agence — une agence peut en avoir plusieurs."""
    agency    = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name="branches")
    label     = models.CharField(max_length=120)          # ex: "Agence Paris", "Bureau Casablanca"
    address   = models.CharField(max_length=255, blank=True)
    city      = models.CharField(max_length=80)
    country   = models.CharField(max_length=2)            # code ISO
    latitude  = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    is_main   = models.BooleanField(default=False)        # adresse principale

    class Meta:
        ordering = ["-is_main", "city"]

    def __str__(self):
        return f"{self.agency.legal_name} — {self.label} ({self.city})"

# -----------------------------------------
# Catégorie douane (pour estimation pro)
# -----------------------------------------
class KYCDocument(models.Model):
    """Vérification d'identité — pour les clients (particuliers)."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='kyc')
    id_front = models.FileField(upload_to='kyc/', null=True, blank=True)
    id_back  = models.FileField(upload_to='kyc/', null=True, blank=True)
    status   = models.CharField(max_length=20, choices=KYC_STATUS, default='PENDING')
    rejection_reason = models.TextField(blank=True)
    extracted_data   = models.JSONField(default=dict, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    verified_at  = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"KYC {self.user.username} → {self.status}"


class Notification(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title      = models.CharField(max_length=200)
    message    = models.TextField(blank=True)
    link       = models.CharField(max_length=200, blank=True)
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{'lu' if self.is_read else 'non lu'}] {self.user.username}: {self.title}"


class AgencyDocument(models.Model):
    """Vérification d'entreprise (KYB) — pour les agences (Kbis / Registre de Commerce)."""
    agency = models.OneToOneField(Agency, on_delete=models.CASCADE, related_name='kyb_doc')
    document = models.FileField(upload_to='kyb/', null=True, blank=True)
    status   = models.CharField(max_length=20, choices=KYC_STATUS, default='PENDING')
    rejection_reason = models.TextField(blank=True)
    extracted_data   = models.JSONField(default=dict, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    verified_at  = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"KYB {self.agency.legal_name} → {self.status}"


class CustomsCategory(models.Model):
    slug = models.SlugField(unique=True)         # identifiant court (ex: 'vetements', 'electronique')
    label = models.CharField(max_length=120)     # libellé visible
    hs_code_hint = models.CharField(max_length=16, blank=True)  # indice code SH (optionnel)
    duty_rate_pct = models.FloatField(default=0.0)  # % droits de douane
    vat_rate_pct = models.FloatField(default=20.0)  # % TVA (ex UE 20%)

    def __str__(self):
        return f"{self.label} (duty {self.duty_rate_pct}%, VAT {self.vat_rate_pct}%)"

# -----------------------------------------
# Trajet publié par une Agence
# -----------------------------------------
class Trip(models.Model):
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE)  # → relation N:1 (une agence a plusieurs trajets)
    origin_country = models.CharField(max_length=2)   # ex: FR ou MA
    origin_city = models.CharField(max_length=80)     # ex: Paris, Casablanca
    dest_country = models.CharField(max_length=2)     # ex: MA ou FR
    dest_city = models.CharField(max_length=80)       # ex: Rabat, Lyon
    departure_at = models.DateTimeField()             # date/heure départ
    arrival_eta = models.DateTimeField(null=True, blank=True)  # estimation d'arrivée
    capacity_kg = models.FloatField()                 # capacité acceptée (kg)
    price_per_kg = models.FloatField()                # prix au kilo
    status = models.CharField(max_length=20, default='PUBLISHED')  # PUBLISHED/CLOSED

    def __str__(self):
        return f"{self.origin_city}({self.origin_country}) → {self.dest_city}({self.dest_country}) @ {self.departure_at}"

# -----------------------------------------
# Réservation d'envoi (faite par un client)
# -----------------------------------------
TRACKING_STATUS = [
    ("PENDING",    "En attente agence"),
    ("ACCEPTED",   "Accepté"),
    ("REJECTED",   "Rejeté"),
    ("DEPOSITED",  "Déposé au bureau de départ"),
    ("IN_TRANSIT", "En transit"),
    ("ARRIVED",    "Arrivé au bureau de destination"),
    ("DELIVERED",  "Livré"),
]

DELIVERY_TYPE = [
    ("PICKUP",        "Retrait au bureau"),
    ("HOME_DELIVERY", "Livraison à domicile"),
]

class Shipment(models.Model):
    trip = models.ForeignKey("Trip", on_delete=models.CASCADE, related_name="shipments")
    user = models.ForeignKey("User", null=True, blank=True, on_delete=models.SET_NULL, related_name="shipments")

    customer_name  = models.CharField(max_length=255)
    customer_email = models.EmailField(blank=False, default="")
    customer_phone = models.CharField(max_length=50, blank=False, default="")

    weight_kg   = models.FloatField()
    description = models.TextField(blank=True, default="")

    delivery_type    = models.CharField(max_length=20, choices=DELIVERY_TYPE, default="PICKUP")
    delivery_address = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=TRACKING_STATUS, default="PENDING")

    def __str__(self):
        return f"{self.customer_name} ({self.weight_kg}kg) → trip {self.trip_id}"

# -----------------------------------------
# Réclamation client
# -----------------------------------------
class Reclamation(models.Model):
    STATUS_CHOICES = [
        ("OPEN",        "Ouverte"),
        ("IN_PROGRESS", "En cours de traitement"),
        ("RESOLVED",    "Résolue"),
        ("CLOSED",      "Fermée"),
    ]
    user     = models.ForeignKey("User", on_delete=models.CASCADE, related_name="reclamations")
    shipment = models.ForeignKey("Shipment", null=True, blank=True, on_delete=models.SET_NULL, related_name="reclamations")
    subject  = models.CharField(max_length=200)
    message  = models.TextField()
    status   = models.CharField(max_length=20, choices=STATUS_CHOICES, default="OPEN")
    admin_response = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Réclamation #{self.id} — {self.user.username} ({self.status})"


# -----------------------------------------
# Paiement lié à un Shipment
# -----------------------------------------
class Review(models.Model):
    reviewer      = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_written')
    agency        = models.ForeignKey(Agency, null=True, blank=True, on_delete=models.SET_NULL, related_name='reviews')
    reviewed_user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='reviews_received')
    shipment      = models.ForeignKey('Shipment', null=True, blank=True, on_delete=models.SET_NULL, related_name='reviews')
    rating        = models.IntegerField()  # 1-5
    comment       = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review #{self.id} — {self.reviewer.username} ({self.rating}★)"


class Conversation(models.Model):
    client   = models.ForeignKey(User, on_delete=models.CASCADE, related_name='client_conversations')
    agency   = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='agency_conversations')
    shipment = models.ForeignKey('Shipment', null=True, blank=True, on_delete=models.SET_NULL, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('client', 'agency')
        ordering = ['-updated_at']

    def __str__(self):
        return f"Conv {self.client.username} ↔ {self.agency.legal_name}"


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content      = models.TextField()
    created_at   = models.DateTimeField(auto_now_add=True)
    is_read      = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Msg #{self.id} de {self.sender.username}"


class Payment(models.Model):
    shipment = models.OneToOneField(Shipment, on_delete=models.CASCADE)  # 1 paiement ↔ 1 envoi
    amount_total_cents = models.IntegerField()       # montant total en centimes
    currency = models.CharField(max_length=8, default='EUR')
    fee_platform_cents = models.IntegerField(default=0)  # commission plateforme (centimes)
    stripe_pi = models.CharField(max_length=120, blank=True)  # id PaymentIntent Stripe (quand on l'ajoutera)
    status = models.CharField(max_length=20, default='REQUIRES_ACTION')  # REQUIRES_ACTION/SUCCEEDED/FAILED/REFUNDED

    def __str__(self):
        return f"Payment for Shipment #{self.shipment_id} - {self.status}"
