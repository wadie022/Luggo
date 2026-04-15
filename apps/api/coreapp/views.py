# coreapp/views.py
from rest_framework import generics, permissions
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from django.db.models import Sum, Q
from django.db.models.functions import Coalesce

import os
import json
import base64
import mimetypes
import re as _re
from django.utils import timezone

from .models import Trip, Shipment, KYCDocument, AgencyDocument, Notification, Reclamation, AgencyBranch, Review, Conversation, Message, Payment
from .serializers import (
    RegisterSerializer, TripSerializer, ShipmentSerializer, MeSerializer,
    AgencyTripSerializer, AgencyShipmentSerializer, KYCDocumentSerializer,
    AgencyDocumentSerializer, NotificationSerializer, ReclamationSerializer, AgencyBranchSerializer,
    ReviewSerializer, MessageSerializer, ConversationListSerializer
)
from .permissions import IsAgency
from .emails import (
    send_welcome_client, send_welcome_agency,
    send_kyc_submitted, send_kyc_approved, send_kyc_rejected,
    send_kyb_submitted, send_kyb_approved, send_kyb_rejected,
    send_shipment_created, send_shipment_accepted, send_shipment_rejected,
    send_shipment_deposited, send_shipment_in_transit, send_shipment_arrived, send_shipment_delivered,
    send_trip_published,
)


@api_view(["GET"])
def healthz(request):
    return Response({"ok": True})


def notify(user, title: str, message: str = "", link: str = ""):
    """Crée une notification in-app pour un utilisateur."""
    try:
        Notification.objects.create(user=user, title=title, message=message, link=link)
    except Exception:
        pass


# ============================
# 🔍 CLAUDE KYC VERIFICATION
# ============================

def _verify_id_with_claude(file_bytes: bytes, mime: str) -> dict:
    """Envoie l'image à Claude et extrait les infos du document d'identité."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"is_valid_id": False, "reason": "ANTHROPIC_API_KEY non configurée"}

    try:
        import anthropic

        if mime not in ("image/jpeg", "image/png", "image/gif", "image/webp"):
            mime = "image/jpeg"

        img_b64 = base64.standard_b64encode(file_bytes).decode("utf-8")

        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": mime, "data": img_b64},
                    },
                    {
                        "type": "text",
                        "text": (
                            "Analyse ce document d'identité et réponds UNIQUEMENT en JSON valide, sans texte autour :\n"
                            '{"is_valid_id": true, "document_type": "CNI", "last_name": "", '
                            '"first_name": "", "date_of_birth": "YYYY-MM-DD", '
                            '"id_number": "", "expiry_date": "YYYY-MM-DD", "country": ""}\n'
                            "Si ce n'est pas une pièce d'identité valide ou si l'image est illisible, "
                            'réponds : {"is_valid_id": false, "reason": "..."}'
                        ),
                    },
                ],
            }],
        )

        text = msg.content[0].text.strip()
        m = _re.search(r"\{.*\}", text, _re.DOTALL)
        if m:
            return json.loads(m.group())
        return {"is_valid_id": False, "reason": "Réponse non parsable"}

    except Exception as e:
        return {"is_valid_id": False, "reason": str(e)}


def _verify_business_with_claude(file_bytes: bytes, mime: str) -> dict:
    """Envoie le document d'entreprise à Claude et extrait les infos (Kbis / Registre de Commerce)."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"is_valid_business": False, "reason": "ANTHROPIC_API_KEY non configurée"}

    try:
        import anthropic

        if mime not in ("image/jpeg", "image/png", "image/gif", "image/webp"):
            mime = "image/jpeg"

        img_b64 = base64.standard_b64encode(file_bytes).decode("utf-8")

        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": mime, "data": img_b64},
                    },
                    {
                        "type": "text",
                        "text": (
                            "Analyse ce document d'entreprise (Kbis français, extrait du Registre de Commerce marocain, "
                            "ou tout autre document officiel d'immatriculation d'entreprise) et réponds UNIQUEMENT en JSON valide, sans texte autour :\n"
                            '{"is_valid_business": true, "company_name": "", "registration_number": "", '
                            '"legal_form": "", "address": "", "manager_name": "", "country": "", "document_type": "Kbis"}\n'
                            "Si ce n'est pas un document officiel d'entreprise valide ou si l'image est illisible, "
                            'réponds : {"is_valid_business": false, "reason": "..."}'
                        ),
                    },
                ],
            }],
        )

        text = msg.content[0].text.strip()
        m = _re.search(r"\{.*\}", text, _re.DOTALL)
        if m:
            return json.loads(m.group())
        return {"is_valid_business": False, "reason": "Réponse non parsable"}

    except Exception as e:
        return {"is_valid_business": False, "reason": str(e)}


class ShipmentCreateView(generics.ListCreateAPIView):
    serializer_class = ShipmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Shipment.objects.filter(user=self.request.user).select_related("trip", "trip__agency").order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        shipment = serializer.save(
            user=user,
            customer_name=user.get_full_name() or user.username,
            customer_email=user.email,
        )
        t = shipment.trip
        route = f"{t.origin_city} ({t.origin_country}) → {t.dest_city} ({t.dest_country})"
        send_shipment_created(
            shipment.customer_email, shipment.customer_name, route, shipment.id,
            shipment_data={
                "id": shipment.id,
                "route": route,
                "customer_name": shipment.customer_name,
                "customer_email": shipment.customer_email,
                "customer_phone": shipment.customer_phone,
                "weight_kg": shipment.weight_kg,
                "description": shipment.description,
                "price_per_kg": t.price_per_kg,
                "delivery_type": shipment.delivery_type,
                "delivery_address": shipment.delivery_address,
                "status_label": "En attente",
                "created_at": shipment.created_at.strftime("%d/%m/%Y à %H:%M"),
            }
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user, context={"request": request}).data)

    def patch(self, request):
        allowed = {"email"}
        data = {k: v for k, v in request.data.items() if k in allowed}
        ser = MeSerializer(request.user, data=data, partial=True, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


class AvatarUploadView(APIView):
    """PATCH /api/me/avatar/ — upload ou remplace la photo de profil."""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        avatar = request.FILES.get("avatar")
        if not avatar:
            return Response({"detail": "Fichier avatar requis."}, status=status.HTTP_400_BAD_REQUEST)
        request.user.avatar = avatar
        request.user.save(update_fields=["avatar"])
        return Response(MeSerializer(request.user, context={"request": request}).data)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class TripDetailView(generics.RetrieveAPIView):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    permission_classes = [permissions.AllowAny]


def _auto_delete_trip(trip):
    """
    Supprime un trajet (et ses colis en cascade) si :
    - la date de départ est dépassée, OU
    - les kg acceptés atteignent ou dépassent la capacité max.
    Retourne True si le trajet a été supprimé.
    """
    if timezone.now() >= trip.departure_at:
        trip.delete()
        return True
    used_kg = (
        Shipment.objects.filter(trip=trip, status="ACCEPTED")
        .aggregate(v=Coalesce(Sum("weight_kg"), 0.0))["v"]
    )
    if used_kg >= trip.capacity_kg:
        trip.delete()
        return True
    return False


class TripListView(generics.ListCreateAPIView):
    queryset = Trip.objects.all().order_by("departure_at")
    serializer_class = TripSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsAgency()]

    def get_queryset(self):
        # Supprimer les trajets expirés avant de lister
        Trip.objects.filter(departure_at__lte=timezone.now()).delete()

        qs = super().get_queryset()
        o = self.request.query_params.get("origin_country")
        d = self.request.query_params.get("dest_country")
        if o:
            qs = qs.filter(origin_country=o.upper())
        if d:
            qs = qs.filter(dest_country=d.upper())
        return qs

    def perform_create(self, serializer):
        agency = getattr(self.request.user, "agency", None)
        if agency is None:
            raise ValidationError("Cet utilisateur n'est lié à aucune agence.")
        if agency.kyc_status != "VERIFIED":
            raise ValidationError("KYC non vérifié. Veuillez soumettre vos documents d'identité avant de publier un trajet.")
        trip = serializer.save(agency=agency)
        route = f"{trip.origin_city} ({trip.origin_country}) → {trip.dest_city} ({trip.dest_country})"
        send_trip_published(self.request.user.email, agency.legal_name, route)


# ============================
# 🪪 KYC ENDPOINTS
# ============================

class KYCUploadView(APIView):
    """
    POST /api/kyc/upload/
    Multipart : id_front (required), id_back (optional)
    → crée ou met à jour le KYCDocument, lance la vérification Claude.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        id_front = request.FILES.get("id_front")
        id_back  = request.FILES.get("id_back")

        if not id_front:
            return Response({"detail": "id_front requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Lire les bytes avant upload (fonctionne local ET R2)
            front_bytes = id_front.read()
            front_mime  = id_front.content_type or "image/jpeg"
            id_front.seek(0)  # rembobiner pour l'upload

            kyc, _ = KYCDocument.objects.get_or_create(user=request.user)
            kyc.status = "PENDING"
            kyc.rejection_reason = ""
            kyc.extracted_data = {}
            kyc.id_front = id_front
            if id_back:
                kyc.id_back = id_back
            kyc.save()
        except Exception as e:
            return Response({"detail": f"Erreur sauvegarde fichier : {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Vérification Claude sur le recto (via bytes en mémoire)
        result = _verify_id_with_claude(front_bytes, front_mime)

        no_api_key = not os.getenv("ANTHROPIC_API_KEY")
        send_kyc_submitted(request.user.email, request.user.username)

        if no_api_key:
            kyc.status = "PENDING"
            kyc.rejection_reason = ""
        elif result.get("is_valid_id"):
            kyc.status = "VERIFIED"
            kyc.extracted_data = result
            kyc.verified_at = timezone.now()
            update_fields = ["kyc_status"]
            request.user.kyc_status = "VERIFIED"
            if result.get("first_name") and not request.user.first_name:
                request.user.first_name = result["first_name"]
                update_fields.append("first_name")
            if result.get("last_name") and not request.user.last_name:
                request.user.last_name = result["last_name"]
                update_fields.append("last_name")
            request.user.save(update_fields=update_fields)
            if hasattr(request.user, "agency"):
                request.user.agency.kyc_status = "VERIFIED"
                request.user.agency.save(update_fields=["kyc_status"])
            send_kyc_approved(request.user.email, request.user.username)
            notify(request.user, "Identité vérifiée ✅", "Ton document d'identité a été validé.", "/trips")
        else:
            kyc.status = "REJECTED"
            kyc.rejection_reason = result.get("reason", "Document invalide ou illisible.")
            request.user.kyc_status = "REJECTED"
            request.user.save(update_fields=["kyc_status"])
            if hasattr(request.user, "agency"):
                request.user.agency.kyc_status = "REJECTED"
                request.user.agency.save(update_fields=["kyc_status"])
            send_kyc_rejected(request.user.email, request.user.username, kyc.rejection_reason)
            notify(request.user, "Document KYC rejeté ❌", kyc.rejection_reason or "Document invalide.", "/profile/kyc")

        kyc.save()
        return Response(KYCDocumentSerializer(kyc).data, status=status.HTTP_200_OK)


class KYCStatusView(APIView):
    """
    GET /api/kyc/status/
    → retourne le statut KYC de l'utilisateur connecté.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        kyc = getattr(request.user, "kyc", None)
        if kyc is None:
            return Response({"status": "PENDING", "extracted_data": {}, "rejection_reason": ""})
        return Response(KYCDocumentSerializer(kyc).data)


# ============================
# 🔔 NOTIFICATIONS
# ============================

class NotificationListView(generics.ListAPIView):
    """GET /api/notifications/ — liste les notifs de l'utilisateur connecté."""
    permission_classes = [IsAuthenticated]
    serializer_class   = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)[:50]


class NotificationUnreadCountView(APIView):
    """GET /api/notifications/unread-count/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"count": count})


class NotificationReadView(APIView):
    """PATCH /api/notifications/<id>/read/ — marque une notif comme lue."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response({"ok": True})


class NotificationReadAllView(APIView):
    """PATCH /api/notifications/read-all/ — marque toutes les notifs comme lues."""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"ok": True})


# ============================
# 🛡️ ADMIN — Révision manuelle KYC/KYB
# ============================

class AdminKYCListView(generics.ListAPIView):
    """GET /api/admin/kyc/ — liste tous les KYCDocument (admin only)."""
    permission_classes = [IsAuthenticated]
    serializer_class   = KYCDocumentSerializer

    def get_queryset(self):
        if self.request.user.role != "ADMIN":
            return KYCDocument.objects.none()
        st = self.request.query_params.get("status")
        qs = KYCDocument.objects.select_related("user").order_by("-submitted_at")
        if st:
            qs = qs.filter(status=st.upper())
        return qs


class AdminKYCReviewView(APIView):
    """PATCH /api/admin/kyc/<id>/review/ — approuver ou rejeter un KYC."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if request.user.role != "ADMIN":
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)
        try:
            kyc = KYCDocument.objects.select_related("user").get(pk=pk)
        except KYCDocument.DoesNotExist:
            return Response({"detail": "KYC introuvable."}, status=status.HTTP_404_NOT_FOUND)

        new_status = (request.data.get("status") or "").upper()
        if new_status not in ("VERIFIED", "REJECTED"):
            return Response({"detail": "status doit être VERIFIED ou REJECTED."}, status=status.HTTP_400_BAD_REQUEST)

        kyc.status = new_status
        kyc.rejection_reason = request.data.get("rejection_reason", "")
        if new_status == "VERIFIED":
            kyc.verified_at = timezone.now()
        kyc.save()

        update_fields = ["kyc_status"]
        kyc.user.kyc_status = new_status
        if new_status == "VERIFIED":
            # Admin peut fournir first_name/last_name manuellement, sinon on prend extracted_data
            data = kyc.extracted_data or {}
            first_name = request.data.get("first_name") or data.get("first_name", "")
            last_name  = request.data.get("last_name")  or data.get("last_name", "")
            if first_name:
                kyc.user.first_name = first_name
                update_fields.append("first_name")
            if last_name:
                kyc.user.last_name = last_name
                update_fields.append("last_name")
        kyc.user.save(update_fields=update_fields)
        if new_status == "VERIFIED":
            send_kyc_approved(kyc.user.email, kyc.user.username)
            notify(kyc.user, "Identité vérifiée ✅", "Ton document d'identité a été validé.", "/trips")
        else:
            send_kyc_rejected(kyc.user.email, kyc.user.username, kyc.rejection_reason)
            notify(kyc.user, "Document KYC rejeté ❌", kyc.rejection_reason or "Document invalide.", "/profile/kyc")
        return Response(KYCDocumentSerializer(kyc).data)


class AdminKYBListView(generics.ListAPIView):
    """GET /api/admin/kyb/ — liste tous les AgencyDocument (admin only)."""
    permission_classes = [IsAuthenticated]
    serializer_class   = AgencyDocumentSerializer

    def get_queryset(self):
        if self.request.user.role != "ADMIN":
            return AgencyDocument.objects.none()
        st = self.request.query_params.get("status")
        qs = AgencyDocument.objects.select_related("agency").order_by("-submitted_at")
        if st:
            qs = qs.filter(status=st.upper())
        return qs


class AdminKYBReviewView(APIView):
    """PATCH /api/admin/kyb/<id>/review/ — approuver ou rejeter un KYB."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if request.user.role != "ADMIN":
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)
        try:
            kyb = AgencyDocument.objects.select_related("agency").get(pk=pk)
        except AgencyDocument.DoesNotExist:
            return Response({"detail": "KYB introuvable."}, status=status.HTTP_404_NOT_FOUND)

        new_status = (request.data.get("status") or "").upper()
        if new_status not in ("VERIFIED", "REJECTED"):
            return Response({"detail": "status doit être VERIFIED ou REJECTED."}, status=status.HTTP_400_BAD_REQUEST)

        kyb.status = new_status
        kyb.rejection_reason = request.data.get("rejection_reason", "")
        if new_status == "VERIFIED":
            kyb.verified_at = timezone.now()
        kyb.save()

        kyb.agency.kyc_status = new_status
        if new_status == "VERIFIED":
            data = kyb.extracted_data or {}
            legal_name  = request.data.get("legal_name")  or data.get("company_name", "")
            reg_number  = request.data.get("registration_number") or data.get("registration_number", "")
            update_fields = ["kyc_status"]
            if legal_name:
                kyb.agency.legal_name = legal_name
                update_fields.append("legal_name")
            if reg_number:
                kyb.agency.registration_number = reg_number
                update_fields.append("registration_number")
            kyb.agency.save(update_fields=update_fields)
        else:
            kyb.agency.save(update_fields=["kyc_status"])
        if new_status == "VERIFIED":
            send_kyb_approved(kyb.agency.user.email, kyb.agency.legal_name)
            notify(kyb.agency.user, "Entreprise vérifiée ✅", f"{kyb.agency.legal_name} a été validée.", "/dashboard/agency")
        else:
            send_kyb_rejected(kyb.agency.user.email, kyb.agency.legal_name, kyb.rejection_reason)
            notify(kyb.agency.user, "Document KYB rejeté ❌", kyb.rejection_reason or "Document invalide.", "/dashboard/agency/kyb")
        return Response(AgencyDocumentSerializer(kyb).data)


# ============================
# 🏢 KYB ENDPOINTS (Agences)
# ============================

class AgencyKYBUploadView(APIView):
    """
    POST /api/agency/kyb/upload/
    Multipart : document (Kbis ou RC — obligatoire)
    → crée ou met à jour le AgencyDocument, lance la vérification Claude.
    """
    permission_classes = [IsAuthenticated, IsAgency]

    def post(self, request):
        agency = getattr(request.user, "agency", None)
        if agency is None:
            return Response({"detail": "Aucune agence liée à ce compte."}, status=status.HTTP_400_BAD_REQUEST)

        doc_file = request.FILES.get("document")
        if not doc_file:
            return Response({"detail": "Le document est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)

        # Lire les bytes avant upload (fonctionne local ET R2)
        doc_bytes = doc_file.read()
        doc_mime  = doc_file.content_type or "image/jpeg"
        doc_file.seek(0)  # rembobiner pour l'upload

        kyb, _ = AgencyDocument.objects.get_or_create(agency=agency)
        kyb.status = "PENDING"
        kyb.rejection_reason = ""
        kyb.extracted_data = {}
        kyb.document = doc_file
        kyb.save()

        send_kyb_submitted(agency.user.email, agency.legal_name)
        return Response(AgencyDocumentSerializer(kyb).data, status=status.HTTP_200_OK)


class AgencyKYBStatusView(APIView):
    """
    GET /api/agency/kyb/status/
    → retourne le statut KYB de l'agence connectée.
    """
    permission_classes = [IsAuthenticated, IsAgency]

    def get(self, request):
        agency = getattr(request.user, "agency", None)
        if agency is None:
            return Response({"detail": "Aucune agence liée à ce compte."}, status=status.HTTP_400_BAD_REQUEST)
        kyb = getattr(agency, "kyb_doc", None)
        if kyb is None:
            return Response({"status": "PENDING", "extracted_data": {}, "rejection_reason": ""})
        return Response(AgencyDocumentSerializer(kyb).data)


# ============================
# ✅ AGENCY ENDPOINTS
# ============================

class ReclamationView(generics.ListCreateAPIView):
    """
    GET  /api/reclamations/ — mes réclamations
    POST /api/reclamations/ — soumettre une réclamation
    """
    serializer_class = ReclamationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Reclamation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        rec = serializer.save(user=self.request.user)
        # Notif client
        notify(self.request.user, "Réclamation reçue 📋",
               "Nous avons bien reçu ta réclamation. Notre équipe te répondra sous 48h.", "/reclamations")
        # Notif admins
        admins = User.objects.filter(role="ADMIN")
        for admin in admins:
            notify(admin, f"Nouvelle réclamation #{rec.id}",
                   f"De {self.request.user.username} : {rec.subject}", "/dashboard/admin")


class AdminReclamationsView(generics.ListAPIView):
    """GET /api/admin/reclamations/?status= — toutes les réclamations pour l'admin."""
    serializer_class = ReclamationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role != "ADMIN":
            return Reclamation.objects.none()
        qs = Reclamation.objects.select_related("user", "shipment", "shipment__trip").all()
        st = self.request.query_params.get("status")
        if st:
            qs = qs.filter(status=st.upper())
        return qs


class AdminReclamationReplyView(APIView):
    """PATCH /api/admin/reclamations/<id>/ — répondre + changer statut."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if request.user.role != "ADMIN":
            return Response({"detail": "Interdit."}, status=status.HTTP_403_FORBIDDEN)
        try:
            rec = Reclamation.objects.select_related("user").get(pk=pk)
        except Reclamation.DoesNotExist:
            return Response({"detail": "Introuvable."}, status=404)

        new_status = request.data.get("status", "").upper()
        admin_response = request.data.get("admin_response", "")

        if new_status and new_status in ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]:
            rec.status = new_status
        if admin_response:
            rec.admin_response = admin_response
        rec.save()

        # Notifier le client
        if rec.user and admin_response:
            notify(rec.user, "Réponse à ta réclamation 📩",
                   f"L'équipe Luggo a répondu à ta réclamation : {rec.subject}", "/reclamations")

        return Response(ReclamationSerializer(rec).data)


class AgencyListView(generics.ListAPIView):
    """GET /api/agencies/ — liste publique des agences vérifiées avec coordonnées."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .models import Agency as AgencyModel
        agencies = AgencyModel.objects.filter(kyc_status="VERIFIED").values(
            "id", "legal_name", "city", "country", "address", "latitude", "longitude"
        )
        return Response(list(agencies))


class AgencyPublicDetailView(APIView):
    """GET /api/agencies/<id>/ — profil public d'une agence."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        from .models import Agency as AgencyModel, AgencyBranch, Review as ReviewModel
        from django.db.models import Avg, Count
        try:
            agency = AgencyModel.objects.get(pk=pk)
        except AgencyModel.DoesNotExist:
            return Response({"detail": "Agence introuvable."}, status=404)

        branches = list(AgencyBranch.objects.filter(agency=agency).values(
            "id", "label", "address", "city", "country", "latitude", "longitude", "is_main"
        ))

        trips = list(Trip.objects.filter(
            agency=agency, status="PUBLISHED"
        ).filter(departure_at__gt=timezone.now()).values(
            "id", "origin_city", "origin_country", "dest_city", "dest_country",
            "departure_at", "arrival_eta", "capacity_kg", "price_per_kg", "status"
        ).order_by("departure_at")[:10])

        review_stats = ReviewModel.objects.filter(agency=agency).aggregate(
            avg_rating=Avg("rating"), count=Count("id")
        )

        reviews = list(ReviewModel.objects.filter(agency=agency).order_by("-created_at").values(
            "id", "rating", "comment", "created_at", "reviewer__username"
        )[:20])
        for r in reviews:
            r["reviewer_username"] = r.pop("reviewer__username")

        return Response({
            "id": agency.id,
            "legal_name": agency.legal_name,
            "city": agency.city,
            "country": agency.country,
            "address": agency.address,
            "kyc_status": agency.kyc_status,
            "avg_rating": round(review_stats["avg_rating"], 1) if review_stats["avg_rating"] else None,
            "review_count": review_stats["count"],
            "branches": branches,
            "trips": trips,
            "reviews": reviews,
        })


class PublicAgencyBranchesView(APIView):
    """
    GET /api/agency-branches/
    Retourne tous les points de présence des agences vérifiées :
    - Toutes les succursales (AgencyBranch) avec coordonnées
    - En fallback : agences vérifiées avec coordonnées de profil mais sans succursales
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .models import Agency as AgencyModel, AgencyBranch

        points = []

        # 1) Toutes les succursales avec coords
        branches = (
            AgencyBranch.objects
            .filter(agency__kyc_status="VERIFIED", latitude__isnull=False, longitude__isnull=False)
            .select_related("agency")
        )
        agency_ids_with_branches = set()
        for b in branches:
            agency_ids_with_branches.add(b.agency_id)
            points.append({
                "key": f"b{b.id}",
                "legal_name": b.agency.legal_name,
                "label": b.label,
                "city": b.city,
                "country": b.country,
                "address": b.address,
                "latitude": b.latitude,
                "longitude": b.longitude,
                "is_main": b.is_main,
                "agency_id": b.agency_id,
            })

        # 2) Agences vérifiées avec coords de profil mais sans succursales
        fallback = AgencyModel.objects.filter(
            kyc_status="VERIFIED",
            latitude__isnull=False,
            longitude__isnull=False,
        ).exclude(id__in=agency_ids_with_branches)
        for a in fallback:
            points.append({
                "key": f"a{a.id}",
                "legal_name": a.legal_name,
                "label": a.legal_name,
                "city": a.city,
                "country": a.country,
                "address": a.address,
                "latitude": a.latitude,
                "longitude": a.longitude,
                "is_main": True,
                "agency_id": a.id,
            })

        return Response(points)


class AdminUsersView(APIView):
    """GET /api/admin/users/?role=CLIENT|AGENCY&search=&active= — liste des utilisateurs."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "ADMIN":
            return Response({"detail": "Interdit."}, status=status.HTTP_403_FORBIDDEN)

        from django.contrib.auth import get_user_model
        U = get_user_model()

        qs = U.objects.exclude(role="ADMIN").order_by("-date_joined")

        role = request.query_params.get("role")
        if role:
            qs = qs.filter(role=role.upper())

        search = request.query_params.get("search", "").strip()
        if search:
            from django.db.models import Q as DQ
            qs = qs.filter(DQ(username__icontains=search) | DQ(email__icontains=search))

        active = request.query_params.get("active")
        if active == "false":
            qs = qs.filter(is_active=False)
        elif active == "true":
            qs = qs.filter(is_active=True)

        data = [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.role,
                "kyc_status": u.kyc_status,
                "is_active": u.is_active,
                "date_joined": u.date_joined.strftime("%d/%m/%Y"),
            }
            for u in qs
        ]
        return Response(data)


class AdminUserActionView(APIView):
    """PATCH /api/admin/users/<id>/ — ban ou unban un utilisateur."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if request.user.role != "ADMIN":
            return Response({"detail": "Interdit."}, status=status.HTTP_403_FORBIDDEN)

        from django.contrib.auth import get_user_model
        U = get_user_model()

        try:
            user = U.objects.get(pk=pk)
        except U.DoesNotExist:
            return Response({"detail": "Utilisateur introuvable."}, status=404)

        if user.role == "ADMIN":
            return Response({"detail": "Impossible de modifier un admin."}, status=400)

        action = request.data.get("action")
        if action == "ban":
            user.is_active = False
            user.save(update_fields=["is_active"])
        elif action == "unban":
            user.is_active = True
            user.save(update_fields=["is_active"])
        elif action == "set_reg_number":
            agency = getattr(user, "agency", None)
            if not agency:
                return Response({"detail": "Aucune agence liée."}, status=400)
            reg = request.data.get("registration_number", "").strip()
            if not reg:
                return Response({"detail": "registration_number requis."}, status=400)
            agency.registration_number = reg
            agency.save(update_fields=["registration_number"])
        else:
            return Response({"detail": "Action invalide."}, status=400)

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "kyc_status": user.kyc_status,
            "is_active": user.is_active,
            "date_joined": user.date_joined.strftime("%d/%m/%Y"),
        })


class AdminStatsView(APIView):
    """GET /api/admin/stats/ — statistiques globales pour l'admin."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "ADMIN":
            return Response({"detail": "Interdit."}, status=status.HTTP_403_FORBIDDEN)

        from django.contrib.auth import get_user_model
        from django.db.models import Count, Sum
        U = get_user_model()

        total_clients  = U.objects.filter(role="CLIENT").count()
        total_agencies = U.objects.filter(role="AGENCY").count()
        total_shipments = Shipment.objects.count()

        by_status = dict(
            Shipment.objects.values("status").annotate(c=Count("id")).values_list("status", "c")
        )

        active = Shipment.objects.exclude(
            status__in=["PENDING", "REJECTED"]
        ).select_related("trip")
        estimated_revenue = sum(float(s.weight_kg) * float(s.trip.price_per_kg) for s in active)

        total_kg = Shipment.objects.exclude(
            status__in=["PENDING", "REJECTED"]
        ).aggregate(total=Coalesce(Sum("weight_kg"), 0.0))["total"]

        return Response({
            "total_clients": total_clients,
            "total_agencies": total_agencies,
            "total_shipments": total_shipments,
            "by_status": by_status,
            "estimated_revenue": round(estimated_revenue, 2),
            "total_kg": round(float(total_kg), 1),
        })


class AgencyProfileView(APIView):
    """GET/PATCH /api/agency/profile/ — profil de l'agence connectée."""
    permission_classes = [IsAuthenticated]

    def _serialize(self, agency):
        return {
            "legal_name": agency.legal_name,
            "registration_number": agency.registration_number,
            "city": agency.city,
            "country": agency.country,
            "address": agency.address or "",
            "latitude": agency.latitude,
            "longitude": agency.longitude,
            "kyc_status": agency.kyc_status,
        }

    def get(self, request):
        agency = getattr(request.user, "agency", None)
        if not agency:
            return Response({"detail": "Aucune agence."}, status=404)
        return Response(self._serialize(agency))

    def patch(self, request):
        agency = getattr(request.user, "agency", None)
        if not agency:
            return Response({"detail": "Aucune agence."}, status=404)
        # legal_name et registration_number sont gérés par l'admin via KYB — non modifiables ici
        for field in ["city", "country", "address", "latitude", "longitude"]:
            if field in request.data:
                setattr(agency, field, request.data[field])
        agency.save()
        return Response(self._serialize(agency))


class AgencyBranchView(APIView):
    """
    GET  /api/agency/branches/      — liste les adresses de l'agence
    POST /api/agency/branches/      — ajouter une adresse
    """
    permission_classes = [IsAuthenticated, IsAgency]

    def _agency(self, request):
        return getattr(request.user, "agency", None)

    def get(self, request):
        agency = self._agency(request)
        if not agency:
            return Response({"detail": "Aucune agence."}, status=404)
        branches = agency.branches.all()
        return Response(AgencyBranchSerializer(branches, many=True).data)

    def post(self, request):
        agency = self._agency(request)
        if not agency:
            return Response({"detail": "Aucune agence."}, status=404)
        ser = AgencyBranchSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        # Si is_main, retirer l'ancien principal
        if ser.validated_data.get("is_main"):
            agency.branches.filter(is_main=True).update(is_main=False)
        ser.save(agency=agency)
        return Response(ser.data, status=201)


class AgencyBranchDetailView(APIView):
    """
    PATCH  /api/agency/branches/<id>/ — modifier
    DELETE /api/agency/branches/<id>/ — supprimer
    """
    permission_classes = [IsAuthenticated, IsAgency]

    def _get_branch(self, request, pk):
        agency = getattr(request.user, "agency", None)
        if not agency:
            return None, Response({"detail": "Aucune agence."}, status=404)
        try:
            return agency.branches.get(pk=pk), None
        except AgencyBranch.DoesNotExist:
            return None, Response({"detail": "Adresse introuvable."}, status=404)

    def patch(self, request, pk):
        branch, err = self._get_branch(request, pk)
        if err:
            return err
        ser = AgencyBranchSerializer(branch, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        if ser.validated_data.get("is_main"):
            branch.agency.branches.filter(is_main=True).update(is_main=False)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        branch, err = self._get_branch(request, pk)
        if err:
            return err
        branch.delete()
        return Response(status=204)


class AgencyTripsView(generics.ListAPIView):
    """
    GET /api/agency/trips/
    -> liste les trajets de l'agence + used_kg + pending_kg
    """
    permission_classes = [IsAuthenticated, IsAgency]
    serializer_class = AgencyTripSerializer

    def get_queryset(self):
        agency = getattr(self.request.user, "agency", None)
        if agency is None:
            raise ValidationError("Aucune agence liée à ce compte.")
        qs = Trip.objects.filter(agency=agency).order_by("-departure_at")

        # used = ACCEPTED
        # pending = PENDING
        return qs.annotate(
            used_kg=Coalesce(
                Sum("shipments__weight_kg", filter=Q(shipments__status="ACCEPTED")),
                0.0,
            ),
            pending_kg=Coalesce(
                Sum("shipments__weight_kg", filter=Q(shipments__status="PENDING")),
                0.0,
            ),
        )


class AgencyTripEditView(APIView):
    """
    PATCH /api/agency/trips/<id>/
    - Cas 1 : aucun shipment ACCEPTED → modification complète autorisée
    - Cas 2 : used_kg > 0 → seule la capacité est modifiable
    """
    permission_classes = [IsAuthenticated, IsAgency]

    def patch(self, request, pk):
        agency = getattr(request.user, "agency", None)
        if agency is None:
            return Response({"detail": "Aucune agence liée à ce compte."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            trip = Trip.objects.get(pk=pk, agency=agency)
        except Trip.DoesNotExist:
            return Response({"detail": "Trajet introuvable."}, status=status.HTTP_404_NOT_FOUND)

        used_kg = Shipment.objects.filter(trip=trip, status="ACCEPTED").aggregate(
            v=Coalesce(Sum("weight_kg"), 0.0)
        )["v"]

        data = request.data

        if used_kg > 0:
            # Cas 2 : shipments acceptés → seule la capacité est modifiable
            allowed = {"capacity_kg"}
            forbidden = [k for k in data.keys() if k not in allowed]
            if forbidden:
                return Response(
                    {"detail": f"Des shipments sont déjà acceptés. Seule la capacité est modifiable. Champs refusés : {', '.join(forbidden)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if "capacity_kg" in data:
                new_cap = float(data["capacity_kg"])
                if new_cap < used_kg:
                    return Response(
                        {"detail": f"La capacité ne peut pas être inférieure aux kg déjà acceptés ({used_kg} kg)."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                trip.capacity_kg = new_cap
        else:
            # Cas 1 : aucun shipment accepté → modification complète
            allowed_fields = {"origin_country", "origin_city", "dest_country", "dest_city",
                              "departure_at", "arrival_eta", "capacity_kg", "price_per_kg", "status"}
            for field in allowed_fields:
                if field in data:
                    setattr(trip, field, data[field])

        trip.save()
        return Response(AgencyTripSerializer(trip).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        agency = getattr(request.user, "agency", None)
        if agency is None:
            return Response({"detail": "Aucune agence liée à ce compte."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            trip = Trip.objects.get(pk=pk, agency=agency)
        except Trip.DoesNotExist:
            return Response({"detail": "Trajet introuvable."}, status=status.HTTP_404_NOT_FOUND)

        used_kg = Shipment.objects.filter(trip=trip, status="ACCEPTED").aggregate(
            v=Coalesce(Sum("weight_kg"), 0.0)
        )["v"]

        if used_kg > 0:
            return Response(
                {"detail": "Suppression impossible : des colis sont déjà acceptés sur ce trajet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        trip.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AgencyTripBulkStatusView(APIView):
    """
    PATCH /api/agency/trips/<id>/bulk-status/
    body: { "status": "IN_TRANSIT" | "ARRIVED" | "DELIVERED" }
    Met à jour tous les colis ACCEPTED/IN_TRANSIT/ARRIVED du trajet en une fois.
    """
    permission_classes = [IsAuthenticated, IsAgency]

    TRANSITIONS = {
        "IN_TRANSIT": ["ACCEPTED", "DEPOSITED"],
        "ARRIVED":    ["IN_TRANSIT"],
        "DELIVERED":  ["ARRIVED"],
    }

    def patch(self, request, pk):
        agency = getattr(request.user, "agency", None)
        if agency is None:
            return Response({"detail": "Aucune agence liée."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            trip = Trip.objects.get(pk=pk, agency=agency)
        except Trip.DoesNotExist:
            return Response({"detail": "Trajet introuvable."}, status=status.HTTP_404_NOT_FOUND)

        new_status = (request.data.get("status") or "").upper()
        allowed_from = self.TRANSITIONS.get(new_status)
        if not allowed_from:
            return Response({"detail": f"Statut invalide. Valeurs acceptées : {list(self.TRANSITIONS.keys())}"}, status=status.HTTP_400_BAD_REQUEST)

        shipments = Shipment.objects.filter(trip=trip, status__in=allowed_from)
        count = shipments.count()
        if count == 0:
            return Response({"detail": "Aucun colis à mettre à jour."}, status=status.HTTP_400_BAD_REQUEST)

        shipments.update(status=new_status)

        # Notifications aux clients
        EMAIL_FNS = {
            "IN_TRANSIT": send_shipment_in_transit,
            "ARRIVED":    send_shipment_arrived,
            "DELIVERED":  send_shipment_delivered,
        }
        NOTIF_TITLES = {
            "IN_TRANSIT": "Colis en transit 🚀",
            "ARRIVED":    "Colis arrivé 📦",
            "DELIVERED":  "Colis livré ✅",
        }
        route = f"{trip.origin_city} ({trip.origin_country}) → {trip.dest_city} ({trip.dest_country})"
        email_fn = EMAIL_FNS.get(new_status)
        notif_title = NOTIF_TITLES.get(new_status, "Mise à jour colis")

        for sh in Shipment.objects.filter(trip=trip, status=new_status).select_related('user'):
            if email_fn:
                try: email_fn(sh.customer_email, sh.customer_name, route)
                except Exception: pass
            if sh.user:
                notify(sh.user, notif_title, f"Ton colis sur {route} est maintenant : {new_status}", "/mes-colis")

        return Response({"updated": count, "new_status": new_status})


class ShipmentClientView(APIView):
    """
    GET    /api/shipments/<id>/  — détail d'un colis
    DELETE /api/shipments/<id>/ — supprimer si PENDING
    """
    permission_classes = [IsAuthenticated]

    def _get_shipment(self, pk, user):
        try:
            return Shipment.objects.select_related("trip", "trip__agency").get(pk=pk, user=user)
        except Shipment.DoesNotExist:
            return None

    def get(self, request, pk):
        sh = self._get_shipment(pk, request.user)
        if sh is None:
            return Response({"detail": "Colis introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ShipmentSerializer(sh).data)

    def delete(self, request, pk):
        sh = self._get_shipment(pk, request.user)
        if sh is None:
            return Response({"detail": "Colis introuvable."}, status=status.HTTP_404_NOT_FOUND)
        if sh.status != "PENDING":
            return Response({"detail": f"Suppression impossible : le colis est {sh.status}."}, status=400)
        sh.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ShipmentTrackingView(APIView):
    """
    PATCH /api/shipments/<id>/tracking/
    Client  : peut passer à DEPOSITED (confirme dépôt)
    Agence  : peut passer à ACCEPTED, REJECTED, IN_TRANSIT, ARRIVED, DELIVERED
    """
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _shipment_data(sh, route, status_label):
        return {
            "id": sh.id,
            "route": route,
            "customer_name": sh.customer_name,
            "customer_email": sh.customer_email,
            "customer_phone": sh.customer_phone,
            "weight_kg": sh.weight_kg,
            "description": sh.description,
            "price_per_kg": sh.trip.price_per_kg,
            "delivery_type": sh.delivery_type,
            "delivery_address": sh.delivery_address,
            "status_label": status_label,
            "created_at": sh.created_at.strftime("%d/%m/%Y à %H:%M"),
        }

    TRACKING_EMAILS = {
        "DEPOSITED":  lambda sh, route: send_shipment_deposited(sh.customer_email, sh.customer_name, route),
        "IN_TRANSIT": lambda sh, route: send_shipment_in_transit(sh.customer_email, sh.customer_name, route),
        "ARRIVED":    lambda sh, route: send_shipment_arrived(sh.customer_email, sh.customer_name, route, sh.delivery_type),
        "DELIVERED":  lambda sh, route: send_shipment_delivered(sh.customer_email, sh.customer_name, route),
        "ACCEPTED":   lambda sh, route: send_shipment_accepted(
            sh.customer_email, sh.customer_name, route,
            shipment_data=ShipmentTrackingView._shipment_data(sh, route, "Accepté"),
        ),
        "REJECTED":   lambda sh, route: send_shipment_rejected(sh.customer_email, sh.customer_name, route),
    }

    NOTIFY_MESSAGES = {
        "ACCEPTED":   ("Colis accepté ✅", "Ton envoi a été accepté par l'agence."),
        "REJECTED":   ("Colis refusé ❌", "Ton envoi a été refusé par l'agence."),
        "DEPOSITED":  ("Dépôt confirmé 📦", "Ton colis a été déposé au bureau de départ."),
        "IN_TRANSIT": ("Colis en transit 🚚", "Ton colis est en route vers la destination."),
        "ARRIVED":    ("Colis arrivé 🎉", "Ton colis est arrivé au bureau de destination."),
        "DELIVERED":  ("Colis livré ✅", "Ton colis a été livré avec succès."),
    }

    def patch(self, request, pk):
        new_status = request.data.get("status", "").upper()
        user = request.user

        try:
            sh = Shipment.objects.select_related("trip", "trip__agency", "user").get(pk=pk)
        except Shipment.DoesNotExist:
            return Response({"detail": "Colis introuvable."}, status=404)

        # Permissions
        is_agency = user.role == "AGENCY" and hasattr(user, "agency") and sh.trip.agency == user.agency
        is_client = sh.user == user

        if not is_agency and not is_client:
            return Response({"detail": "Accès refusé."}, status=403)

        # Transitions autorisées
        client_allowed  = {"DEPOSITED"}
        agency_allowed  = {"ACCEPTED", "REJECTED", "IN_TRANSIT", "ARRIVED", "DELIVERED"}

        if is_client and new_status not in client_allowed:
            return Response({"detail": f"Action non autorisée pour un client."}, status=400)
        if is_agency and new_status not in agency_allowed:
            return Response({"detail": f"Action non autorisée pour une agence."}, status=400)

        sh.status = new_status
        sh.save(update_fields=["status"])

        t = sh.trip
        route = f"{t.origin_city} ({t.origin_country}) → {t.dest_city} ({t.dest_country})"

        # Email
        email_fn = self.TRACKING_EMAILS.get(new_status)
        if email_fn:
            try:
                email_fn(sh, route)
            except Exception:
                pass

        # Notification in-app
        if sh.user:
            msg = self.NOTIFY_MESSAGES.get(new_status)
            if msg:
                notify(sh.user, msg[0], msg[1], "/mes-colis")

        # Supprimer le trajet si kg max atteints
        if new_status == "ACCEPTED":
            _auto_delete_trip(t)

        return Response(ShipmentSerializer(sh).data)


class AgencyShipmentsView(generics.ListAPIView):
    """
    GET /api/agency/shipments/?status=PENDING|ACCEPTED|REJECTED
    -> demandes liées aux trajets de l'agence
    """
    permission_classes = [IsAuthenticated, IsAgency]
    serializer_class = AgencyShipmentSerializer

    def get_queryset(self):
        agency = getattr(self.request.user, "agency", None)
        if agency is None:
            raise ValidationError("Aucune agence liée à ce compte.")
        qs = Shipment.objects.filter(trip__agency=agency).select_related("trip").order_by("-created_at")

        st = self.request.query_params.get("status")
        if st:
            qs = qs.filter(status=st.upper())
        return qs


class AgencyShipmentStatusView(APIView):
    """
    PATCH /api/agency/shipments/<id>/status/
    body: { "status": "ACCEPTED" | "REJECTED" }
    """
    permission_classes = [IsAuthenticated, IsAgency]

    def patch(self, request, pk):
        agency = getattr(request.user, "agency", None)
        if agency is None:
            return Response({"detail": "Aucune agence liée à ce compte."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            sh = Shipment.objects.select_related("trip").get(pk=pk, trip__agency=agency)
        except Shipment.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        new_status = (request.data.get("status") or "").upper()
        if new_status not in ["ACCEPTED", "REJECTED", "PENDING"]:
            return Response({"detail": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        sh.status = new_status
        sh.save()

        t = sh.trip
        route = f"{t.origin_city} ({t.origin_country}) → {t.dest_city} ({t.dest_country})"
        if new_status == "ACCEPTED":
            send_shipment_accepted(sh.customer_email, sh.customer_name, route)
            # notif si le client a un compte
            try:
                from .models import User as U
                u = U.objects.get(email=sh.customer_email)
                notify(u, "Colis accepté ✅", f"Ton colis sur {route} a été accepté.", "/mes-colis")
            except Exception:
                pass
        elif new_status == "REJECTED":
            send_shipment_rejected(sh.customer_email, sh.customer_name, route)
            # Remboursement automatique Stripe si paiement existant
            try:
                payment = Payment.objects.get(shipment=sh, status='SUCCEEDED')
                if _stripe and _stripe.api_key and payment.stripe_pi:
                    _stripe.Refund.create(payment_intent=payment.stripe_pi)
                    payment.status = 'REFUNDED'
                    payment.save()
            except Payment.DoesNotExist:
                pass
            except Exception:
                pass
            try:
                from .models import User as U
                u = U.objects.get(email=sh.customer_email)
                notify(u, "Colis refusé — remboursé ❌", f"Ta demande sur {route} a été refusée. Tu seras remboursé sous 5-10 jours.", "/mes-colis")
            except Exception:
                pass

        # Supprimer le trajet si kg max atteints
        if new_status == "ACCEPTED":
            _auto_delete_trip(t)

        return Response(AgencyShipmentSerializer(sh).data, status=status.HTTP_200_OK)


class AgencyStatsView(APIView):
    """
    GET /api/agency/stats/
    -> stats globales rapides
    """
    permission_classes = [IsAuthenticated, IsAgency]

    def get(self, request):
        agency = getattr(request.user, "agency", None)
        if agency is None:
            return Response({"detail": "Aucune agence liée à ce compte."}, status=status.HTTP_400_BAD_REQUEST)

        base = Shipment.objects.filter(trip__agency=agency)
        pending = base.filter(status="PENDING").count()
        accepted = base.filter(status="ACCEPTED").count()
        rejected = base.filter(status="REJECTED").count()

        used_kg = base.filter(status="ACCEPTED").aggregate(v=Coalesce(Sum("weight_kg"), 0.0))["v"]
        pending_kg = base.filter(status="PENDING").aggregate(v=Coalesce(Sum("weight_kg"), 0.0))["v"]

        return Response(
            {
                "shipments": {"pending": pending, "accepted": accepted, "rejected": rejected},
                "kg": {"used": used_kg, "pending": pending_kg},
            }
        )


# ============================
# ⭐ AVIS / REVIEWS
# ============================

class ReviewView(APIView):
    """
    GET  /reviews/?agency=<id>  → avis sur une agence (public)
    GET  /reviews/?user=<id>    → avis reçus sur un client
    GET  /reviews/              → avis reçus pour l'utilisateur connecté
    POST /reviews/              → soumettre un avis
    """

    def get_permissions(self):
        if self.request.method == "GET" and self.request.query_params.get("agency"):
            return [permissions.AllowAny()]
        return [IsAuthenticated()]

    def get(self, request):
        agency_id = request.query_params.get("agency")
        user_id   = request.query_params.get("user")
        if agency_id:
            reviews = Review.objects.filter(agency_id=agency_id)
        elif user_id:
            reviews = Review.objects.filter(reviewed_user_id=user_id)
        else:
            if request.user.role == "AGENCY":
                agency = getattr(request.user, "agency", None)
                reviews = Review.objects.filter(agency=agency) if agency else Review.objects.none()
            else:
                reviews = Review.objects.filter(reviewed_user=request.user)
        return Response(ReviewSerializer(reviews, many=True).data)

    def post(self, request):
        # Prevent duplicate: same reviewer + same agency (or same reviewed_user)
        agency_id = request.data.get("agency")
        reviewed_user_id = request.data.get("reviewed_user")
        if agency_id and Review.objects.filter(reviewer=request.user, agency_id=agency_id).exists():
            return Response({"detail": "Vous avez déjà laissé un avis pour cette agence."}, status=status.HTTP_400_BAD_REQUEST)
        if reviewed_user_id and Review.objects.filter(reviewer=request.user, reviewed_user_id=reviewed_user_id).exists():
            return Response({"detail": "Vous avez déjà laissé un avis pour ce client."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(reviewer=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ============================
# 💬 MESSAGERIE
# ============================

from django.db.models import Prefetch as _Prefetch

def _check_conv_access(user, conv):
    is_client = (user.id == conv.client_id)
    is_agency = hasattr(user, 'agency') and user.agency_id == conv.agency_id
    is_admin  = user.role == 'ADMIN'
    if not (is_client or is_agency or is_admin):
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Accès refusé à cette conversation.")


class ConversationView(APIView):
    """
    GET  /conversations/ — liste des conversations de l'utilisateur
    POST /conversations/ — démarrer ou reprendre une conversation (client only)
    """
    permission_classes = [IsAuthenticated]

    def _qs(self, user):
        msgs_prefetch = _Prefetch('messages', queryset=Message.objects.select_related('sender').order_by('created_at'))
        if user.role == 'CLIENT':
            qs = Conversation.objects.filter(client=user)
        elif user.role == 'AGENCY':
            agency = getattr(user, 'agency', None)
            qs = Conversation.objects.filter(agency=agency) if agency else Conversation.objects.none()
        else:
            qs = Conversation.objects.all()
        return qs.select_related('client', 'agency', 'shipment').prefetch_related(msgs_prefetch).order_by('-updated_at')

    def get(self, request):
        qs = self._qs(request.user)
        return Response(ConversationListSerializer(qs, many=True, context={'request': request}).data)

    def post(self, request):
        if request.user.role != 'CLIENT':
            return Response({"detail": "Seuls les clients peuvent initier une conversation."}, status=status.HTTP_403_FORBIDDEN)

        agency_id  = request.data.get('agency_id')
        content    = (request.data.get('content') or '').strip()
        shipment_id = request.data.get('shipment_id')

        if not agency_id:
            return Response({"detail": "agency_id requis."}, status=status.HTTP_400_BAD_REQUEST)
        if not content:
            return Response({"detail": "Le message ne peut pas être vide."}, status=status.HTTP_400_BAD_REQUEST)

        from .models import Agency as AgencyModel
        try:
            agency = AgencyModel.objects.get(pk=agency_id)
        except AgencyModel.DoesNotExist:
            return Response({"detail": "Agence introuvable."}, status=status.HTTP_404_NOT_FOUND)

        shipment = None
        if shipment_id:
            try:
                shipment = Shipment.objects.get(pk=shipment_id, user=request.user)
            except Shipment.DoesNotExist:
                pass

        conv, created = Conversation.objects.get_or_create(
            client=request.user,
            agency=agency,
            defaults={'shipment': shipment},
        )
        Message.objects.create(conversation=conv, sender=request.user, content=content)
        conv.save()  # bump updated_at

        notify(agency.user,
               title=f"Nouveau message de {request.user.username}",
               message=content[:120],
               link=f"/dashboard/agency/messages?conv={conv.id}")

        msgs_prefetch = _Prefetch('messages', queryset=Message.objects.select_related('sender').order_by('created_at'))
        conv = Conversation.objects.select_related('client', 'agency', 'shipment').prefetch_related(msgs_prefetch).get(pk=conv.pk)
        return Response(ConversationListSerializer(conv, context={'request': request}).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class MessageListView(APIView):
    """
    GET  /conversations/<id>/messages/ — liste des messages
    POST /conversations/<id>/messages/ — envoyer un message
    """
    permission_classes = [IsAuthenticated]

    def _get_conv(self, pk, user):
        try:
            conv = Conversation.objects.select_related('client', 'agency__user').get(pk=pk)
        except Conversation.DoesNotExist:
            return None
        _check_conv_access(user, conv)
        return conv

    def get(self, request, pk):
        conv = self._get_conv(pk, request.user)
        if conv is None:
            return Response({"detail": "Conversation introuvable."}, status=status.HTTP_404_NOT_FOUND)
        msgs = conv.messages.select_related('sender').order_by('created_at')
        return Response(MessageSerializer(msgs, many=True, context={'request': request}).data)

    def post(self, request, pk):
        conv = self._get_conv(pk, request.user)
        if conv is None:
            return Response({"detail": "Conversation introuvable."}, status=status.HTTP_404_NOT_FOUND)

        content  = (request.data.get('content') or '').strip()
        msg_type = (request.data.get('msg_type') or 'text').strip()
        file_obj = request.FILES.get('file')

        if msg_type not in ('text', 'image', 'audio', 'document'):
            msg_type = 'text'

        if not content and not file_obj:
            return Response({"detail": "Le message ne peut pas être vide."}, status=status.HTTP_400_BAD_REQUEST)

        if file_obj and msg_type == 'text':
            msg_type = 'document'

        msg = Message.objects.create(
            conversation=conv,
            sender=request.user,
            content=content,
            msg_type=msg_type,
            file=file_obj,
        )
        conv.save()  # bump updated_at

        # Notifier le destinataire
        if request.user.id == conv.client_id:
            recipient = conv.agency.user
            link = f"/dashboard/agency/messages?conv={conv.id}"
        else:
            recipient = conv.client
            link = f"/messages?conv={conv.id}"

        notify_text = content[:120] if content else f"[{msg_type}]"
        notify(recipient,
               title=f"Nouveau message de {request.user.username}",
               message=notify_text,
               link=link)

        return Response(MessageSerializer(msg, context={'request': request}).data, status=status.HTTP_201_CREATED)


class ConversationReadView(APIView):
    """PATCH /conversations/<id>/read/ — marquer les messages reçus comme lus."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            conv = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            return Response({"detail": "Conversation introuvable."}, status=status.HTTP_404_NOT_FOUND)
        _check_conv_access(request.user, conv)
        conv.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        return Response({"ok": True})


# ─── PAYMENT ──────────────────────────────────────────────────────────────────

try:
    import stripe as _stripe
    _stripe.api_key = os.getenv('STRIPE_SECRET_KEY', '')
except ImportError:
    _stripe = None


class PaymentCreateIntentView(APIView):
    """POST /payments/create-intent/ — crée un PaymentIntent Stripe pour un colis."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        shipment_id = request.data.get('shipment_id')
        if not shipment_id:
            return Response({"detail": "shipment_id requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            shipment = Shipment.objects.get(pk=shipment_id, user=request.user)
        except Shipment.DoesNotExist:
            return Response({"detail": "Colis introuvable."}, status=status.HTTP_404_NOT_FOUND)

        # Calcul du montant
        base_cents = int(shipment.weight_kg * shipment.trip.price_per_kg * 100)
        delivery_cents = int(shipment.trip.home_delivery_price * 100) if shipment.delivery_type == "HOME_DELIVERY" else 0
        amount_cents = base_cents + delivery_cents
        fee_cents = int(amount_cents * 0.05)  # 5% commission plateforme

        # Récupérer ou créer le Payment
        payment, created = Payment.objects.get_or_create(
            shipment=shipment,
            defaults={
                'amount_total_cents': amount_cents,
                'fee_platform_cents': fee_cents,
                'currency': 'EUR',
                'status': 'REQUIRES_ACTION',
            }
        )

        if payment.status == 'SUCCEEDED':
            return Response({"detail": "Ce colis est déjà payé."}, status=status.HTTP_400_BAD_REQUEST)

        # Créer ou réutiliser le PaymentIntent
        if not payment.stripe_pi:
            if not _stripe or not _stripe.api_key:
                return Response({"detail": "Paiement non configuré (clé Stripe manquante)."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            pi = _stripe.PaymentIntent.create(
                amount=amount_cents,
                currency='EUR',
                metadata={
                    'shipment_id': shipment.id,
                    'payment_id': payment.id,
                    'user_id': request.user.id,
                },
                description=f"Luggo – Colis #{shipment.id} ({shipment.trip.origin_city} → {shipment.trip.dest_city})",
            )
            payment.stripe_pi = pi['id']
            payment.save()
            client_secret = pi['client_secret']
        else:
            if not _stripe or not _stripe.api_key:
                return Response({"detail": "Paiement non configuré."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            pi = _stripe.PaymentIntent.retrieve(payment.stripe_pi)
            client_secret = pi['client_secret']

        return Response({
            'client_secret': client_secret,
            'amount_cents': amount_cents,
            'base_cents': base_cents,
            'delivery_cents': delivery_cents,
            'fee_cents': fee_cents,
            'currency': 'EUR',
            'payment_id': payment.id,
            'stripe_public_key': os.getenv('STRIPE_PUBLIC_KEY', ''),
        })


class PaymentStatusView(APIView):
    """GET /payments/<shipment_id>/ — statut du paiement pour un colis."""
    permission_classes = [IsAuthenticated]

    def get(self, request, shipment_id):
        try:
            shipment = Shipment.objects.get(pk=shipment_id, user=request.user)
        except Shipment.DoesNotExist:
            return Response({"detail": "Colis introuvable."}, status=status.HTTP_404_NOT_FOUND)

        try:
            payment = Payment.objects.get(shipment=shipment)
        except Payment.DoesNotExist:
            return Response({"exists": False})

        return Response({
            "exists": True,
            "status": payment.status,
            "amount_total_cents": payment.amount_total_cents,
            "currency": payment.currency,
        })


class PaymentWebhookView(APIView):
    """POST /payments/webhook/ — endpoint Stripe webhook (non authentifié)."""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET', '')

        if webhook_secret:
            try:
                event = _stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
            except (_stripe.error.SignatureVerificationError, ValueError):
                return Response({"detail": "Invalid signature."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            try:
                event = json.loads(payload)
            except Exception:
                return Response({"detail": "Invalid payload."}, status=status.HTTP_400_BAD_REQUEST)

        if event['type'] == 'payment_intent.succeeded':
            pi_id = event['data']['object']['id']
            try:
                payment = Payment.objects.get(stripe_pi=pi_id)
                payment.status = 'SUCCEEDED'
                payment.save()
                # Notifier le client
                Notification.objects.create(
                    user=payment.shipment.user,
                    title="Paiement confirmé",
                    message=f"Votre paiement pour le colis #{payment.shipment.id} a été confirmé.",
                    link=f"/mes-colis/{payment.shipment.id}",
                )
            except Payment.DoesNotExist:
                pass

        elif event['type'] == 'payment_intent.payment_failed':
            pi_id = event['data']['object']['id']
            try:
                payment = Payment.objects.get(stripe_pi=pi_id)
                payment.status = 'FAILED'
                payment.save()
            except Payment.DoesNotExist:
                pass

        return Response({"ok": True})
