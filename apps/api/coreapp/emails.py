# coreapp/emails.py
import os
import resend

ADMIN_EMAIL = "cr55108@gmail.com"
FROM_EMAIL  = "Luggo <noreply@luggo.ma>"   # remplace par ton domaine vérifié sur Resend
SITE_URL    = os.getenv("SITE_URL", "https://luggo.vercel.app")


def _send(to: list[str], subject: str, html: str):
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        return  # pas de clé = on ignore silencieusement
    resend.api_key = api_key
    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": to,
            "subject": subject,
            "html": html,
        })
    except Exception:
        pass  # ne jamais planter l'API à cause d'un email


def _base(title: str, body: str) -> str:
    return f"""
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;border:1px solid #e2e8f0">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
        <div style="background:#2563eb;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:18px">L</div>
        <span style="font-weight:700;font-size:18px;color:#0f172a">Luggo</span>
      </div>
      <h1 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 12px">{title}</h1>
      {body}
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
        © Luggo.ma — Transport Europe ↔ Maroc
      </div>
    </div>"""


# ─── Inscription ───────────────────────────────────────────────────────────────

def send_welcome_client(email: str, username: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{username}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Bienvenue sur Luggo ! Ton compte client a bien été créé.</p>
    <p style="color:#475569;margin:0 0 24px">Pour pouvoir réserver un trajet, tu dois d'abord vérifier ton identité (KYC).</p>
    <a href="{SITE_URL}/profile/kyc" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Vérifier mon identité →</a>"""
    _send([email], "Bienvenue sur Luggo 👋", _base("Bienvenue sur Luggo !", body))
    _send([ADMIN_EMAIL], f"[Luggo] Nouveau client : {username}", _base(
        "Nouveau client inscrit",
        f"<p style='color:#475569'><strong>{username}</strong> ({email}) vient de créer un compte client.</p>"
    ))


def send_welcome_agency(email: str, username: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{username}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Ton compte agence Luggo a été créé avec succès.</p>
    <p style="color:#475569;margin:0 0 24px">Pour publier des trajets, tu dois d'abord vérifier ton entreprise (Kbis ou RC).</p>
    <a href="{SITE_URL}/dashboard/agency/kyb" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Vérifier mon entreprise →</a>"""
    _send([email], "Bienvenue sur Luggo Agence 🚚", _base("Compte agence créé !", body))
    _send([ADMIN_EMAIL], f"[Luggo] Nouvelle agence : {username}", _base(
        "Nouvelle agence inscrite",
        f"<p style='color:#475569'><strong>{username}</strong> ({email}) vient de créer un compte agence.</p>"
    ))


# ─── KYC ───────────────────────────────────────────────────────────────────────

def send_kyc_submitted(email: str, username: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{username}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Nous avons bien reçu ton document d'identité. Il est en cours de vérification.</p>
    <p style="color:#475569">Tu recevras un email dès que la vérification sera terminée.</p>"""
    _send([email], "Document KYC reçu ✅", _base("Document reçu", body))
    _send([ADMIN_EMAIL], f"[Luggo Admin] KYC soumis par {username}", _base(
        "Nouveau KYC à vérifier",
        f"<p style='color:#475569'><strong>{username}</strong> ({email}) a soumis un document KYC.</p>"
        f"<a href='{SITE_URL}/dashboard/admin' style='background:#2563eb;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block;margin-top:12px'>Voir dans l'admin →</a>"
    ))


def send_kyc_approved(email: str, username: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{username}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Bonne nouvelle ! Ton identité a été <strong style="color:#16a34a">vérifiée avec succès</strong>.</p>
    <p style="color:#475569;margin:0 0 24px">Tu peux maintenant réserver des trajets et envoyer des colis.</p>
    <a href="{SITE_URL}/trips" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Voir les trajets →</a>"""
    _send([email], "Identité vérifiée ✅", _base("Identité vérifiée !", body))


def send_kyc_rejected(email: str, username: str, reason: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{username}</strong>,</p>
    <p style="color:#475569;margin:0 0 12px">Malheureusement, ton document n'a pas pu être vérifié.</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:12px 16px;margin:0 0 20px">
      <p style="color:#dc2626;margin:0;font-size:14px"><strong>Raison :</strong> {reason or "Document invalide ou illisible"}</p>
    </div>
    <a href="{SITE_URL}/profile/kyc" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Soumettre à nouveau →</a>"""
    _send([email], "Vérification d'identité rejetée ❌", _base("Document non accepté", body))


# ─── KYB ───────────────────────────────────────────────────────────────────────

def send_kyb_submitted(email: str, agency_name: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour,</p>
    <p style="color:#475569;margin:0 0 16px">Nous avons bien reçu le document de vérification pour <strong>{agency_name}</strong>.</p>
    <p style="color:#475569">Tu recevras un email dès que la vérification sera terminée.</p>"""
    _send([email], "Document entreprise reçu ✅", _base("Document reçu", body))
    _send([ADMIN_EMAIL], f"[Luggo Admin] KYB soumis par {agency_name}", _base(
        "Nouveau KYB à vérifier",
        f"<p style='color:#475569'>L'agence <strong>{agency_name}</strong> ({email}) a soumis un document KYB.</p>"
        f"<a href='{SITE_URL}/dashboard/admin' style='background:#2563eb;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block;margin-top:12px'>Voir dans l'admin →</a>"
    ))


def send_kyb_approved(email: str, agency_name: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour,</p>
    <p style="color:#475569;margin:0 0 16px">L'entreprise <strong>{agency_name}</strong> a été <strong style="color:#16a34a">vérifiée avec succès</strong>.</p>
    <p style="color:#475569;margin:0 0 24px">Tu peux maintenant publier des trajets.</p>
    <a href="{SITE_URL}/dashboard/agency" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Aller au dashboard →</a>"""
    _send([email], "Entreprise vérifiée ✅", _base("Entreprise vérifiée !", body))


def send_kyb_rejected(email: str, agency_name: str, reason: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour,</p>
    <p style="color:#475569;margin:0 0 12px">Le document de <strong>{agency_name}</strong> n'a pas pu être vérifié.</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:12px 16px;margin:0 0 20px">
      <p style="color:#dc2626;margin:0;font-size:14px"><strong>Raison :</strong> {reason or "Document invalide ou illisible"}</p>
    </div>
    <a href="{SITE_URL}/dashboard/agency/kyb" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Soumettre à nouveau →</a>"""
    _send([email], "Vérification entreprise rejetée ❌", _base("Document non accepté", body))


# ─── Shipments ─────────────────────────────────────────────────────────────────

def send_shipment_created(customer_email: str, customer_name: str, trip_route: str, shipment_id: int):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{customer_name}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Ta demande d'envoi a bien été enregistrée sur le trajet <strong>{trip_route}</strong>.</p>
    <p style="color:#475569;margin:0 0 24px">Elle est en attente de validation par l'agence.</p>
    <a href="{SITE_URL}/mes-colis" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Suivre mon colis →</a>"""
    _send([customer_email], "Demande d'envoi enregistrée 📦", _base("Demande enregistrée !", body))
    _send([ADMIN_EMAIL], f"[Luggo] Nouveau colis #{shipment_id} — {trip_route}", _base(
        "Nouveau colis",
        f"<p style='color:#475569'><strong>{customer_name}</strong> ({customer_email}) a soumis un colis sur {trip_route}.</p>"
    ))


def send_shipment_accepted(customer_email: str, customer_name: str, trip_route: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{customer_name}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Bonne nouvelle ! Ton colis sur le trajet <strong>{trip_route}</strong> a été <strong style="color:#16a34a">accepté</strong> par l'agence.</p>
    <a href="{SITE_URL}/mes-colis" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Voir mes colis →</a>"""
    _send([customer_email], "Colis accepté ✅", _base("Colis accepté !", body))


def send_shipment_rejected(customer_email: str, customer_name: str, trip_route: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{customer_name}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Malheureusement, ta demande de colis sur le trajet <strong>{trip_route}</strong> a été <strong style="color:#dc2626">refusée</strong> par l'agence.</p>
    <a href="{SITE_URL}/trips" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Voir d'autres trajets →</a>"""
    _send([customer_email], "Demande de colis refusée ❌", _base("Demande refusée", body))


def send_trip_published(agency_email: str, agency_name: str, route: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{agency_name}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Ton trajet <strong>{route}</strong> a bien été publié sur Luggo.</p>
    <a href="{SITE_URL}/dashboard/agency" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Voir le dashboard →</a>"""
    _send([agency_email], f"Trajet publié : {route} ✅", _base("Trajet publié !", body))
    _send([ADMIN_EMAIL], f"[Luggo] Nouveau trajet : {route}", _base(
        "Nouveau trajet publié",
        f"<p style='color:#475569'>L'agence <strong>{agency_name}</strong> a publié un nouveau trajet : <strong>{route}</strong>.</p>"
    ))
