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

from .models import Trip, Shipment, KYCDocument
from .serializers import (
    RegisterSerializer, TripSerializer, ShipmentSerializer, MeSerializer,
    AgencyTripSerializer, AgencyShipmentSerializer, KYCDocumentSerializer
)
from .permissions import IsAgency


@api_view(["GET"])
def healthz(request):
    return Response({"ok": True})


# ============================
# 🔍 CLAUDE KYC VERIFICATION
# ============================

def _verify_id_with_claude(file_path: str) -> dict:
    """Envoie l'image à Claude et extrait les infos du document d'identité."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"is_valid_id": False, "reason": "ANTHROPIC_API_KEY non configurée"}

    try:
        import anthropic

        mime, _ = mimetypes.guess_type(file_path)
        if mime not in ("image/jpeg", "image/png", "image/gif", "image/webp"):
            mime = "image/jpeg"

        with open(file_path, "rb") as f:
            img_b64 = base64.standard_b64encode(f.read()).decode("utf-8")

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


class ShipmentCreateView(generics.ListCreateAPIView):
    serializer_class = ShipmentSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        email = self.request.query_params.get("email", "").strip()
        if email:
            return Shipment.objects.filter(customer_email=email).order_by("-created_at")
        return Shipment.objects.none()


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)


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
        serializer.save(agency=agency)


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

        kyc, _ = KYCDocument.objects.get_or_create(user=request.user)
        kyc.status = "PENDING"
        kyc.rejection_reason = ""
        kyc.extracted_data = {}

        if id_front:
            kyc.id_front = id_front
        if id_back:
            kyc.id_back = id_back
        kyc.save()

        # Vérification Claude sur le recto
        front_path = kyc.id_front.path
        result = _verify_id_with_claude(front_path)

        if result.get("is_valid_id"):
            kyc.status = "VERIFIED"
            kyc.extracted_data = result
            kyc.verified_at = timezone.now()
            # Propager le statut
            request.user.kyc_status = "VERIFIED"
            request.user.save(update_fields=["kyc_status"])
            if hasattr(request.user, "agency"):
                request.user.agency.kyc_status = "VERIFIED"
                request.user.agency.save(update_fields=["kyc_status"])
        else:
            kyc.status = "REJECTED"
            kyc.rejection_reason = result.get("reason", "Document invalide ou illisible.")
            request.user.kyc_status = "REJECTED"
            request.user.save(update_fields=["kyc_status"])
            if hasattr(request.user, "agency"):
                request.user.agency.kyc_status = "REJECTED"
                request.user.agency.save(update_fields=["kyc_status"])

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
