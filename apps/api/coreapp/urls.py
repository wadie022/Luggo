# coreapp/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    healthz, RegisterView, TripListView, TripDetailView,
    ShipmentCreateView, ShipmentClientView, MeView,
    KYCUploadView, KYCStatusView,
    AgencyTripsView, AgencyTripEditView, AgencyShipmentsView, AgencyShipmentStatusView, AgencyStatsView
)

urlpatterns = [
    path("healthz/", healthz, name="healthz"),

    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="auth-login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),

    path("me/", MeView.as_view(), name="me"),

    path("trips/", TripListView.as_view(), name="trip-list"),
    path("trips/<int:pk>/", TripDetailView.as_view(), name="trip-detail"),

    path("shipments/", ShipmentCreateView.as_view(), name="shipment-create"),
    path("shipments/<int:pk>/", ShipmentClientView.as_view(), name="shipment-client"),

    # KYC
    path("kyc/upload/", KYCUploadView.as_view(), name="kyc-upload"),
    path("kyc/status/", KYCStatusView.as_view(), name="kyc-status"),

    # ✅ agency
    path("agency/trips/", AgencyTripsView.as_view(), name="agency-trips"),
    path("agency/trips/<int:pk>/", AgencyTripEditView.as_view(), name="agency-trip-edit"),
    path("agency/shipments/", AgencyShipmentsView.as_view(), name="agency-shipments"),
    path("agency/shipments/<int:pk>/status/", AgencyShipmentStatusView.as_view(), name="agency-shipment-status"),
    path("agency/stats/", AgencyStatsView.as_view(), name="agency-stats"),
]
