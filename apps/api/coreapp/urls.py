# coreapp/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    healthz, RegisterView, TripListView, TripDetailView, AgencyPublicDetailView,
    ShipmentCreateView, ShipmentClientView, MeView, AvatarUploadView,
    KYCUploadView, KYCStatusView,
    AgencyKYBUploadView, AgencyKYBStatusView,
    AdminKYCListView, AdminKYCReviewView, AdminKYBListView, AdminKYBReviewView,
    AdminStatsView, AdminUsersView, AdminUserActionView,
    ReclamationView, AdminReclamationsView, AdminReclamationReplyView,
    NotificationListView, NotificationUnreadCountView, NotificationReadView, NotificationReadAllView,
    AgencyListView,
    AgencyTripsView, AgencyTripEditView, AgencyShipmentsView, AgencyShipmentStatusView, AgencyStatsView,
    AgencyProfileView, AgencyBranchView, AgencyBranchDetailView, ShipmentTrackingView,
    ReviewView, PublicAgencyBranchesView,
    ConversationView, MessageListView, ConversationReadView,
    PaymentCreateIntentView, PaymentStatusView, PaymentWebhookView,
    AgencyTripBulkStatusView,
    PushTokenView, RouteAlertListView, RouteAlertDeleteView,
    EmailVerifyView, EmailResendCodeView,
    DeleteAccountView,
)

urlpatterns = [
    path("healthz/", healthz, name="healthz"),

    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/verify-email/", EmailVerifyView.as_view(), name="auth-verify-email"),
    path("auth/resend-verification/", EmailResendCodeView.as_view(), name="auth-resend-verification"),
    path("auth/login/", TokenObtainPairView.as_view(), name="auth-login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),

    path("me/", MeView.as_view(), name="me"),
    path("me/avatar/", AvatarUploadView.as_view(), name="me-avatar"),
    path("me/delete/", DeleteAccountView.as_view(), name="me-delete"),

    # Notifications
    path("notifications/", NotificationListView.as_view(), name="notifications"),
    path("notifications/unread-count/", NotificationUnreadCountView.as_view(), name="notifications-unread"),
    path("notifications/<int:pk>/read/", NotificationReadView.as_view(), name="notification-read"),
    path("notifications/read-all/", NotificationReadAllView.as_view(), name="notifications-read-all"),

    path("agencies/", AgencyListView.as_view(), name="agency-list"),
    path("agencies/<int:pk>/", AgencyPublicDetailView.as_view(), name="agency-public-detail"),
    path("agency-branches/", PublicAgencyBranchesView.as_view(), name="public-agency-branches"),
    path("trips/", TripListView.as_view(), name="trip-list"),
    path("trips/<int:pk>/", TripDetailView.as_view(), name="trip-detail"),

    path("reclamations/", ReclamationView.as_view(), name="reclamations"),

    path("shipments/", ShipmentCreateView.as_view(), name="shipment-create"),
    path("shipments/<int:pk>/", ShipmentClientView.as_view(), name="shipment-client"),
    path("shipments/<int:pk>/tracking/", ShipmentTrackingView.as_view(), name="shipment-tracking"),

    # KYC
    path("kyc/upload/", KYCUploadView.as_view(), name="kyc-upload"),
    path("kyc/status/", KYCStatusView.as_view(), name="kyc-status"),

    # Admin
    path("admin/stats/", AdminStatsView.as_view(), name="admin-stats"),
    path("admin/users/", AdminUsersView.as_view(), name="admin-users"),
    path("admin/users/<int:pk>/", AdminUserActionView.as_view(), name="admin-user-action"),
    path("admin/reclamations/", AdminReclamationsView.as_view(), name="admin-reclamations"),
    path("admin/reclamations/<int:pk>/", AdminReclamationReplyView.as_view(), name="admin-reclamation-reply"),
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
    path("agency/trips/<int:pk>/bulk-status/", AgencyTripBulkStatusView.as_view(), name="agency-trip-bulk-status"),
    path("agency/shipments/", AgencyShipmentsView.as_view(), name="agency-shipments"),
    path("agency/shipments/<int:pk>/status/", AgencyShipmentStatusView.as_view(), name="agency-shipment-status"),
    path("agency/stats/", AgencyStatsView.as_view(), name="agency-stats"),
    path("agency/profile/", AgencyProfileView.as_view(), name="agency-profile"),
    path("agency/branches/", AgencyBranchView.as_view(), name="agency-branches"),
    path("agency/branches/<int:pk>/", AgencyBranchDetailView.as_view(), name="agency-branch-detail"),

    path("reviews/", ReviewView.as_view(), name="reviews"),

    path("conversations/", ConversationView.as_view(), name="conversations"),
    path("conversations/<int:pk>/messages/", MessageListView.as_view(), name="conversation-messages"),
    path("conversations/<int:pk>/read/", ConversationReadView.as_view(), name="conversation-read"),

    # Payments
    path("payments/create-intent/", PaymentCreateIntentView.as_view(), name="payment-create-intent"),
    path("payments/webhook/", PaymentWebhookView.as_view(), name="payment-webhook"),
    path("payments/<int:shipment_id>/", PaymentStatusView.as_view(), name="payment-status"),

    # Push tokens & alertes
    path("push-token/", PushTokenView.as_view(), name="push-token"),
    path("alerts/", RouteAlertListView.as_view(), name="route-alerts"),
    path("alerts/<int:pk>/", RouteAlertDeleteView.as_view(), name="route-alert-delete"),
]
