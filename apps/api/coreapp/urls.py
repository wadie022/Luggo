# coreapp/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    healthz, RegisterView, TripListView, TripDetailView,
    ShipmentCreateView, ShipmentClientView, MeView, AvatarUploadView,
    KYCUploadView, KYCStatusView,
    AgencyKYBUploadView, AgencyKYBStatusView,
    AdminKYCListView, AdminKYCReviewView, AdminKYBListView, AdminKYBReviewView,
    NotificationListView, NotificationUnreadCountView, NotificationReadView, NotificationReadAllView,
    AgencyListView,
    AgencyTripsView, AgencyTripEditView, AgencyShipmentsView, AgencyShipmentStatusView, AgencyStatsView,
    AgencyProfileView, ShipmentTrackingView
)

urlpatterns = [
    path("healthz/", healthz, name="healthz"),

    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="auth-login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),

    path("me/", MeView.as_view(), name="me"),
    path("me/avatar/", AvatarUploadView.as_view(), name="me-avatar"),

    # Notifications
    path("notifications/", NotificationListView.as_view(), name="notifications"),
    path("notifications/unread-count/", NotificationUnreadCountView.as_view(), name="notifications-unread"),
    path("notifications/<int:pk>/read/", NotificationReadView.as_view(), name="notification-read"),
    path("notifications/read-all/", NotificationReadAllView.as_view(), name="notifications-read-all"),

    path("agencies/", AgencyListView.as_view(), name="agency-list"),
    path("trips/", TripListView.as_view(), name="trip-list"),
    path("trips/<int:pk>/", TripDetailView.as_view(), name="trip-detail"),

    path("shipments/", ShipmentCreateView.as_view(), name="shipment-create"),
    path("shipments/<int:pk>/", ShipmentClientView.as_view(), name="shipment-client"),
    path("shipments/<int:pk>/tracking/", ShipmentTrackingView.as_view(), name="shipment-tracking"),

    # KYC
    path("kyc/upload/", KYCUploadView.as_view(), name="kyc-upload"),
    path("kyc/status/", KYCStatusView.as_view(), name="kyc-status"),

    # Admin review
    path("admin/kyc/", AdminKYCListView.as_view(), name="admin-kyc-list"),
    path("admin/kyc/<int:pk>/review/", AdminKYCReviewView.as_view(), name="admin-kyc-review"),
    path("admin/kyb/", AdminKYBListView.as_view(), name="admin-kyb-list"),
    path("admin/kyb/<int:pk>/review/", AdminKYBReviewView.as_view(), name="admin-kyb-review"),

    # KYB (agences)
    path("agency/kyb/upload/", AgencyKYBUploadView.as_view(), name="agency-kyb-upload"),
    path("agency/kyb/status/", AgencyKYBStatusView.as_view(), name="agency-kyb-status"),

    # ✅ agency
    path("agency/trips/", AgencyTripsView.as_view(), name="agency-trips"),
    path("agency/trips/<int:pk>/", AgencyTripEditView.as_view(), name="agency-trip-edit"),
    path("agency/shipments/", AgencyShipmentsView.as_view(), name="agency-shipments"),
    path("agency/shipments/<int:pk>/status/", AgencyShipmentStatusView.as_view(), name="agency-shipment-status"),
    path("agency/stats/", AgencyStatsView.as_view(), name="agency-stats"),
    path("agency/profile/", AgencyProfileView.as_view(), name="agency-profile"),
]
