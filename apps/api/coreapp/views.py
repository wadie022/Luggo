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

from .models import Trip, Shipment
from .serializers import (
    RegisterSerializer, TripSerializer, ShipmentSerializer, MeSerializer,
    AgencyTripSerializer, AgencyShipmentSerializer
)
from .permissions import IsAgency


@api_view(["GET"])
def healthz(request):
    return Response({"ok": True})


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
        serializer.save(agency=agency)


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
