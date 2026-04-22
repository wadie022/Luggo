# coreapp/emails.py
import os
import resend

ADMIN_EMAIL = "cr55108@gmail.com"
FROM_EMAIL  = "Luggo <onboarding@resend.dev>"
SITE_URL    = os.getenv("SITE_URL", "https://luggo.vercel.app")


def _generate_recap_pdf(data: dict) -> bytes:
    """Génère un PDF récapitulatif de colis avec reportlab."""
    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    h1 = ParagraphStyle('h1', parent=styles['Normal'], fontSize=22, fontName='Helvetica-Bold',
                        textColor=colors.HexColor('#0f172a'), spaceAfter=4)
    sub = ParagraphStyle('sub', parent=styles['Normal'], fontSize=11,
                         textColor=colors.HexColor('#64748b'), spaceAfter=20)
    foot = ParagraphStyle('foot', parent=styles['Normal'], fontSize=9,
                          textColor=colors.HexColor('#94a3b8'), alignment=TA_CENTER)

    blue = colors.HexColor('#2563eb')
    grey = colors.HexColor('#64748b')
    dark = colors.HexColor('#0f172a')
    line = colors.HexColor('#e2e8f0')
    bg1  = colors.HexColor('#f8fafc')

    estimated = float(data.get('weight_kg', 0)) * float(data.get('price_per_kg', 0))
    delivery_label = ('Livraison à domicile' if data.get('delivery_type') == 'HOME_DELIVERY'
                      else 'Retrait au bureau')

    rows = [
        ['N° colis',           f"#{data.get('id', '—')}"],
        ['Trajet',             data.get('route', '—')],
        ['Client',             data.get('customer_name', '—')],
        ['Email',              data.get('customer_email', '—')],
        ['Téléphone',          data.get('customer_phone', '—') or '—'],
        ['Poids',              f"{data.get('weight_kg', 0)} kg"],
        ['Description',        data.get('description', '—') or '—'],
        ['Tarif',              f"{data.get('price_per_kg', 0)} €/kg"],
        ['Montant estimé',     f"{estimated:.2f} €"],
        ['Mode de réception',  delivery_label],
    ]
    if data.get('delivery_address'):
        rows.append(['Adresse livraison', data['delivery_address']])
    rows += [
        ['Statut',             data.get('status_label', 'En attente')],
        ['Date',               data.get('created_at', '—')],
    ]

    table = Table(rows, colWidths=[4.5*cm, 11.5*cm])
    table.setStyle(TableStyle([
        ('FONTNAME',     (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME',     (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE',     (0, 0), (-1, -1), 10),
        ('TEXTCOLOR',    (0, 0), (0, -1), grey),
        ('TEXTCOLOR',    (1, 0), (1, -1), dark),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [bg1, colors.white]),
        ('TOPPADDING',   (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 8),
        ('LEFTPADDING',  (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('GRID',         (0, 0), (-1, -1), 0.5, line),
    ]))

    story = [
        Paragraph("LUGGO", h1),
        Paragraph(f"Récapitulatif de votre colis #{data.get('id', '')}", sub),
        HRFlowable(width="100%", thickness=1, color=line),
        Spacer(1, 0.5*cm),
        table,
        Spacer(1, 0.8*cm),
        HRFlowable(width="100%", thickness=1, color=line),
        Spacer(1, 0.2*cm),
        Paragraph("© Luggo.ma — Transport Europe ↔ Maroc", foot),
    ]

    doc.build(story)
    buf.seek(0)
    return buf.read()


def _send(to: list[str], subject: str, html: str, attachments: list | None = None):
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        return
    resend.api_key = api_key
    try:
        params: dict = {
            "from": FROM_EMAIL,
            "to": to,
            "subject": subject,
            "html": html,
        }
        if attachments:
            params["attachments"] = attachments
        resend.Emails.send(params)
    except Exception:
        pass  # ne jamais planter l'API à cause d'un email


def _base(title: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title}</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- HEADER -->
        <tr><td style="background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);border-radius:16px 16px 0 0;padding:32px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:44px;vertical-align:middle;">
                <div style="background:rgba(255,255,255,0.2);width:44px;height:44px;border-radius:12px;text-align:center;line-height:44px;font-size:22px;font-weight:900;color:#ffffff;">L</div>
              </td>
              <td style="vertical-align:middle;padding-left:12px;">
                <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Luggo</span>
              </td>
            </tr>
          </table>
          <h1 style="margin:20px 0 0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;">{title}</h1>
        </td></tr>

        <!-- BODY -->
        <tr><td style="background:#ffffff;padding:36px 40px;">
          {body}
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">© 2026 Luggo.ma — Transport Europe ↔ Maroc</p>
          <p style="margin:6px 0 0;font-size:12px;color:#cbd5e1;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ─── Vérification email ────────────────────────────────────────────────────────

def send_email_verification(email: str, username: str, code: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{username}</strong>,</p>
    <p style="color:#475569;margin:0 0 20px">Pour activer ton compte Luggo, entre le code de vérification ci-dessous. Il est valable <strong>15 minutes</strong>.</p>
    <div style="text-align:center;margin:0 0 24px">
      <div style="display:inline-block;background:#eff6ff;border:2px solid #bfdbfe;border-radius:16px;padding:20px 40px;">
        <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#1d4ed8;font-family:monospace">{code}</span>
      </div>
    </div>
    <p style="color:#94a3b8;font-size:13px;margin:0">Si tu n'as pas créé de compte Luggo, ignore cet email.</p>"""
    _send([email], "Vérifie ton adresse email 🔐", _base("Code de vérification", body))


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

def send_shipment_created(customer_email: str, customer_name: str, trip_route: str,
                          shipment_id: int, shipment_data: dict | None = None):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{customer_name}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Ta demande d'envoi a bien été enregistrée sur le trajet <strong>{trip_route}</strong>.</p>
    <p style="color:#475569;margin:0 0 16px">Tu trouveras en pièce jointe le récapitulatif de ton colis.</p>
    <p style="color:#475569;margin:0 0 24px">Elle est en attente de validation par l'agence.</p>
    <a href="{SITE_URL}/mes-colis" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Suivre mon colis →</a>"""

    attachments = None
    if shipment_data:
        try:
            pdf = _generate_recap_pdf(shipment_data)
            attachments = [{"filename": f"recap_colis_{shipment_id}.pdf", "content": list(pdf)}]
        except Exception:
            pass

    _send([customer_email], "Demande d'envoi enregistrée 📦", _base("Demande enregistrée !", body), attachments)
    _send([ADMIN_EMAIL], f"[Luggo] Nouveau colis #{shipment_id} — {trip_route}", _base(
        "Nouveau colis",
        f"<p style='color:#475569'><strong>{customer_name}</strong> ({customer_email}) a soumis un colis sur {trip_route}.</p>"
    ))


def send_shipment_accepted(customer_email: str, customer_name: str, trip_route: str,
                           shipment_data: dict | None = None):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{customer_name}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Bonne nouvelle ! Ton colis sur le trajet <strong>{trip_route}</strong> a été <strong style="color:#16a34a">accepté</strong> par l'agence.</p>
    <p style="color:#475569;margin:0 0 24px">Tu trouveras en pièce jointe le récapitulatif de ton colis. Dépose-le au bureau de départ dès que possible.</p>
    <a href="{SITE_URL}/mes-colis" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Voir mes colis →</a>"""

    attachments = None
    if shipment_data:
        try:
            pdf = _generate_recap_pdf(shipment_data)
            attachments = [{"filename": f"recap_colis_{shipment_data.get('id', 'X')}.pdf", "content": list(pdf)}]
        except Exception:
            pass

    _send([customer_email], "Colis accepté ✅", _base("Colis accepté !", body), attachments)


def send_shipment_rejected(customer_email: str, customer_name: str, trip_route: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{customer_name}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Malheureusement, ta demande de colis sur le trajet <strong>{trip_route}</strong> a été <strong style="color:#dc2626">refusée</strong> par l'agence.</p>
    <a href="{SITE_URL}/trips" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Voir d'autres trajets →</a>"""
    _send([customer_email], "Demande de colis refusée ❌", _base("Demande refusée", body))


def send_shipment_deposited(customer_email: str, customer_name: str, trip_route: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{customer_name}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Ton colis sur le trajet <strong>{trip_route}</strong> a bien été <strong>déposé au bureau de départ</strong>.</p>
    <p style="color:#475569;margin:0 0 24px">Il sera pris en charge par l'agence sous peu.</p>
    <a href="{SITE_URL}/mes-colis" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Suivre mon colis →</a>"""
    _send([customer_email], "Colis déposé au bureau 📦", _base("Colis déposé !", body))


def send_shipment_in_transit(customer_email: str, customer_name: str, trip_route: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{customer_name}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Ton colis est maintenant <strong style="color:#2563eb">en transit</strong> sur le trajet <strong>{trip_route}</strong>.</p>
    <p style="color:#475569;margin:0 0 24px">Il est en route vers le bureau de destination.</p>
    <a href="{SITE_URL}/mes-colis" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Suivre mon colis →</a>"""
    _send([customer_email], "Ton colis est en route 🚚", _base("Colis en transit !", body))


def send_shipment_arrived(customer_email: str, customer_name: str, trip_route: str, delivery_type: str):
    if delivery_type == "HOME_DELIVERY":
        next_step = "Il sera livré à ton domicile très prochainement."
    else:
        next_step = "Tu peux désormais le récupérer au bureau de destination."
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{customer_name}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Ton colis est <strong style="color:#16a34a">arrivé au bureau de destination</strong> ({trip_route}).</p>
    <p style="color:#475569;margin:0 0 24px">{next_step}</p>
    <a href="{SITE_URL}/mes-colis" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Voir mes colis →</a>"""
    _send([customer_email], "Colis arrivé à destination 🎉", _base("Colis arrivé !", body))


def send_shipment_delivered(customer_email: str, customer_name: str, trip_route: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{customer_name}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Ton colis sur le trajet <strong>{trip_route}</strong> a été <strong style="color:#16a34a">livré avec succès</strong> !</p>
    <p style="color:#475569;margin:0 0 24px">Merci d'avoir utilisé Luggo.</p>
    <a href="{SITE_URL}/trips" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Envoyer un autre colis →</a>"""
    _send([customer_email], "Colis livré ✅", _base("Livraison confirmée !", body))


def send_route_alert(email: str, username: str, route: str, price_per_kg: float):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{username}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Un nouveau trajet correspondant à votre alerte vient d'être publié :</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin:0 0 20px">
      <p style="color:#1e40af;margin:0;font-size:18px;font-weight:800">{route}</p>
      <p style="color:#3b82f6;margin:8px 0 0;font-size:14px">{price_per_kg} €/kg</p>
    </div>
    <a href="{SITE_URL}/trips" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Voir le trajet →</a>"""
    _send([email], f"🚚 Nouveau trajet : {route}", _base("Alerte trajet !", body))


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


def send_shipment_new_to_agency(agency_email: str, agency_name: str, route: str,
                                 customer_name: str, weight_kg: float, shipment_id: int):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{agency_name}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Un client vient de soumettre une demande de colis sur votre trajet <strong>{route}</strong>.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:0 0 20px">
      <p style="color:#0f172a;margin:0 0 6px"><strong>Client :</strong> {customer_name}</p>
      <p style="color:#0f172a;margin:0 0 6px"><strong>Poids :</strong> {weight_kg} kg</p>
      <p style="color:#0f172a;margin:0"><strong>N° colis :</strong> #{shipment_id}</p>
    </div>
    <a href="{SITE_URL}/dashboard/agency" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Accepter ou refuser →</a>"""
    _send([agency_email], f"📦 Nouvelle demande de colis — {route}", _base("Nouvelle demande de colis", body))


def send_reclamation_received(email: str, username: str, subject: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{username}</strong>,</p>
    <p style="color:#475569;margin:0 0 16px">Nous avons bien reçu ta réclamation : <strong>{subject}</strong>.</p>
    <p style="color:#475569;margin:0 0 24px">Notre équipe te répondra dans les 48h.</p>
    <a href="{SITE_URL}/reclamations" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Voir mes réclamations →</a>"""
    _send([email], "Réclamation reçue ✅", _base("Réclamation enregistrée", body))
    _send([ADMIN_EMAIL], f"[Luggo] Nouvelle réclamation de {username}", _base(
        "Nouvelle réclamation",
        f"<p style='color:#475569'><strong>{username}</strong> ({email}) a soumis une réclamation : <em>{subject}</em>.</p>"
    ))


def send_reclamation_replied(email: str, username: str, subject: str, reply: str):
    body = f"""
    <p style="color:#475569;margin:0 0 16px">Bonjour <strong>{username}</strong>,</p>
    <p style="color:#475569;margin:0 0 12px">L'équipe Luggo a répondu à ta réclamation : <strong>{subject}</strong>.</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin:0 0 20px">
      <p style="color:#1e40af;margin:0;font-size:14px">{reply}</p>
    </div>
    <a href="{SITE_URL}/reclamations" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Voir ma réclamation →</a>"""
    _send([email], f"Réponse à ta réclamation 📩", _base("Réponse reçue", body))
