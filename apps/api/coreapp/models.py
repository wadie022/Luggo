# coreapp/models.py
from django.db import models                      # → base des types de champs (CharField, DateTimeField, etc.)
from django.contrib.auth.models import AbstractUser  # → pour créer un utilisateur personnalisé (avec un champ 'role')

# -----------------------------
# Utilisateur de Luggo (custom)
# -----------------------------
class User(AbstractUser):
    # On ajoute un champ 'role' pour distinguer les profils (CLIENT, AGENCY, ADMIN)
    ROLE_CHOICES = (('CLIENT', 'CLIENT'), ('AGENCY', 'AGENCY'), ('ADMIN', 'ADMIN'))
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='CLIENT')  # → valeur par défaut : CLIENT

    def __str__(self):
        # Affichage lisible dans l’admin : "username (ROLE)"
        return f"{self.username} ({self.role})"

# -----------------------------
# Agence (profil pro relié à un User)
# -----------------------------
class Agency(models.Model):
    # 1–1 avec un User : une agence appartient à un compte utilisateur 'AGENCY'
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="agency")
    legal_name = models.CharField(max_length=120)      # raison sociale
    country = models.CharField(max_length=2)           # code pays ISO (FR/BE/ES/CH/I/MA)
    city = models.CharField(max_length=80)             # ville
    kyc_status = models.CharField(max_length=20, default='PENDING')  # statut vérification (KYC)

    def __str__(self):
        return f"{self.legal_name} [{self.country}-{self.city}]"

# -----------------------------------------
# Catégorie douane (pour estimation pro)
# -----------------------------------------
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
    arrival_eta = models.DateTimeField(null=True, blank=True)  # estimation d’arrivée
    capacity_kg = models.FloatField()                 # capacité acceptée (kg)
    price_per_kg = models.FloatField()                # prix au kilo
    status = models.CharField(max_length=20, default='PUBLISHED')  # PUBLISHED/CLOSED

    def __str__(self):
        return f"{self.origin_city}({self.origin_country}) → {self.dest_city}({self.dest_country}) @ {self.departure_at}"

# -----------------------------------------
# Réservation d’envoi (faite par un client)
# -----------------------------------------
class Shipment(models.Model):
    trip = models.ForeignKey("Trip", on_delete=models.CASCADE, related_name="shipments")

    customer_name = models.CharField(max_length=255)
    customer_email = models.EmailField(blank=False, default="")
    customer_phone = models.CharField(max_length=50, blank=False, default="")

    weight_kg = models.FloatField()
    description = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default="PENDING")

    def __str__(self):
        return f"{self.customer_name} ({self.weight_kg}kg) → trip {self.trip_id}"

# -----------------------------------------
# Paiement lié à un Shipment
# -----------------------------------------
class Payment(models.Model):
    shipment = models.OneToOneField(Shipment, on_delete=models.CASCADE)  # 1 paiement ↔ 1 envoi
    amount_total_cents = models.IntegerField()       # montant total en centimes
    currency = models.CharField(max_length=8, default='EUR')
    fee_platform_cents = models.IntegerField(default=0)  # commission plateforme (centimes)
    stripe_pi = models.CharField(max_length=120, blank=True)  # id PaymentIntent Stripe (quand on l’ajoutera)
    status = models.CharField(max_length=20, default='REQUIRES_ACTION')  # REQUIRES_ACTION/SUCCEEDED/FAILED/REFUNDED

    def __str__(self):
        return f"Payment for Shipment #{self.shipment_id} - {self.status}"
