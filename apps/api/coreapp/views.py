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

from .models import Trip, Shipment, KYCDocument, AgencyDocument
from .serializers import (
    RegisterSerializer, TripSerializer, ShipmentSerializer, MeSerializer,
    AgencyTripSerializer, AgencyShipmentSerializer, KYCDocumentSerializer, AgencyDocumentSerializer
)
from .permissions import IsAgency
from .emails import (
    send_welcome_client, send_welcome_agency,
    send_kyc_submitted, send_kyc_approved, send_kyc_rejected,
    send_kyb_submitted, send_kyb_approved, send_kyb_rejected,
    send_shipment_created, send_shipment_accepted, send_shipment_rejected,
    send_trip_published,
)


@api_view(["GET"])
def healthz(request):
    return Response({"ok": True})


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
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        email = self.request.query_params.get("email", "").strip()
        if email:
            return Shipment.objects.filter(customer_email=email).order_by("-created_at")
        return Shipment.objects.none()

    def perform_create(self, serializer):
        shipment = serializer.save()
        t = shipment.trip
        route = f"{t.origin_city} ({t.origin_country}) → {t.dest_city} ({t.dest_country})"
        send_shipment_created(shipment.customer_email, shipment.customer_name, route, shipment.id)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user, context={"request": request}).data)


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


class TripListView(generics.ListCreateAPIView):
    queryset = Trip.objects.all().order_by("departure_at")
    serializer_class = TripSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsAgency()]

    def get_queryset(self):
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
    parser_classes = [permissions.AllowAny]  # override below

    def post(self, request):
        from rest_framework.parsers import MultiPartParser
        # Parse manually if needed
        id_front = request.FILES.get("id_front")
        id_back  = request.FILES.get("id_back")

        if not id_front:
            return Response({"detail": "id_front requis."}, status=status.HTTP_400_BAD_REQUEST)

        # Lire les bytes avant upload (fonctionne local ET R2)
        front_bytes = id_front.read()
        front_mime  = id_front.content_type or "image/jpeg"
        id_front.seek(0)  # rembobiner pour l'upload

        kyc, _ = KYCDocument.objects.get_or_create(user=request.user)
        kyc.status = "PENDING"
        kyc.rejection_reason = ""
        kyc.extracted_data = {}

        if id_front:
            kyc.id_front = id_front
        if id_back:
            kyc.id_back = id_back
        kyc.save()

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
            request.user.kyc_status = "VERIFIED"
            request.user.save(update_fields=["kyc_status"])
            if hasattr(request.user, "agency"):
                request.user.agency.kyc_status = "VERIFIED"
                request.user.agency.save(update_fields=["kyc_status"])
            send_kyc_approved(request.user.email, request.user.username)
        else:
            kyc.status = "REJECTED"
            kyc.rejection_reason = result.get("reason", "Document invalide ou illisible.")
            request.user.kyc_status = "REJECTED"
            request.user.save(update_fields=["kyc_status"])
            if hasattr(request.user, "agency"):
                request.user.agency.kyc_status = "REJECTED"
                request.user.agency.save(update_fields=["kyc_status"])
            send_kyc_rejected(request.user.email, request.user.username, kyc.rejection_reason)

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

        kyc.user.kyc_status = new_status
        kyc.user.save(update_fields=["kyc_status"])
        if new_status == "VERIFIED":
            send_kyc_approved(kyc.user.email, kyc.user.username)
        else:
            send_kyc_rejected(kyc.user.email, kyc.user.username, kyc.rejection_reason)
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
        kyb.agency.save(update_fields=["kyc_status"])
        if new_status == "VERIFIED":
            send_kyb_approved(kyb.agency.user.email, kyb.agency.legal_name)
        else:
            send_kyb_rejected(kyb.agency.user.email, kyb.agency.legal_name, kyb.rejection_reason)
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

        no_api_key = not os.getenv("ANTHROPIC_API_KEY")
        result = {} if no_api_key else _verify_business_with_claude(doc_bytes, doc_mime)
        send_kyb_submitted(agency.user.email, agency.legal_name)

        if no_api_key:
            kyb.status = "PENDING"
            kyb.rejection_reason = ""
        elif result.get("is_valid_business"):
            kyb.status = "VERIFIED"
            kyb.extracted_data = result
            kyb.verified_at = timezone.now()
            agency.kyc_status = "VERIFIED"
            agency.save(update_fields=["kyc_status"])
        else:
            kyb.status = "REJECTED"
            kyb.rejection_reason = result.get("reason", "Document invalide ou illisible.")
            agency.kyc_status = "REJECTED"
            agency.save(update_fields=["kyc_status"])

        kyb.save()
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


class ShipmentClientView(APIView):
    """
    PATCH /api/shipments/<id>/  — modifier poids/description/téléphone si PENDING
    DELETE /api/shipments/<id>/ — supprimer si PENDING
    Ownership vérifié via customer_email dans le body.
    """
    permission_classes = [permissions.AllowAny]

    def _get_shipment(self, pk, email):
        try:
            return Shipment.objects.get(pk=pk, customer_email=email)
        except Shipment.DoesNotExist:
            return None

    def patch(self, request, pk):
        email = (request.data.get("customer_email") or "").strip()
        if not email:
            return Response({"detail": "customer_email requis."}, status=status.HTTP_400_BAD_REQUEST)

        sh = self._get_shipment(pk, email)
        if sh is None:
            return Response({"detail": "Colis introuvable ou email incorrect."}, status=status.HTTP_404_NOT_FOUND)

        if sh.status != "PENDING":
            return Response(
                {"detail": f"Modification impossible : le colis est {sh.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for field in ("weight_kg", "description", "customer_phone"):
            if field in request.data:
                setattr(sh, field, request.data[field])
        sh.save()
        return Response(ShipmentSerializer(sh).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        email = (request.data.get("customer_email") or "").strip()
        if not email:
            return Response({"detail": "customer_email requis."}, status=status.HTTP_400_BAD_REQUEST)

        sh = self._get_shipment(pk, email)
        if sh is None:
            return Response({"detail": "Colis introuvable ou email incorrect."}, status=status.HTTP_404_NOT_FOUND)

        if sh.status != "PENDING":
            return Response(
                {"detail": f"Suppression impossible : le colis est {sh.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sh.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
        elif new_status == "REJECTED":
            send_shipment_rejected(sh.customer_email, sh.customer_name, route)

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
