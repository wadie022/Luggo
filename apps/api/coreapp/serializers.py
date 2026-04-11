# coreapp/serializers.py
from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import User, Trip, Shipment, Agency, KYCDocument, AgencyDocument, Notification
from django.db.models import Sum
from django.db.models.functions import Coalesce

class MeSerializer(serializers.ModelSerializer):
    kyc_status = serializers.SerializerMethodField()
    avatar_url  = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "role", "kyc_status", "avatar_url")
        read_only_fields = ("id", "username", "role")

    def get_kyc_status(self, obj):
        kyc = getattr(obj, 'kyc', None)
        if kyc:
            return kyc.status
        return obj.kyc_status

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class KYCDocumentSerializer(serializers.ModelSerializer):
    user_info = serializers.SerializerMethodField()
    id_front_url = serializers.SerializerMethodField()
    id_back_url = serializers.SerializerMethodField()

    class Meta:
        model = KYCDocument
        fields = ("id", "status", "rejection_reason", "extracted_data", "submitted_at", "verified_at", "user_info", "id_front_url", "id_back_url")
        read_only_fields = fields

    def get_user_info(self, obj):
        return {"username": obj.user.username, "email": obj.user.email}

    def get_id_front_url(self, obj):
        try:
            return obj.id_front.url if obj.id_front else None
        except Exception:
            return None

    def get_id_back_url(self, obj):
        try:
            return obj.id_back.url if obj.id_back else None
        except Exception:
            return None


class AgencyDocumentSerializer(serializers.ModelSerializer):
    agency_name = serializers.SerializerMethodField()
    document_url = serializers.SerializerMethodField()

    class Meta:
        model = AgencyDocument
        fields = ("id", "status", "rejection_reason", "extracted_data", "submitted_at", "verified_at", "agency_name", "document_url")
        read_only_fields = fields

    def get_agency_name(self, obj):
        return obj.agency.legal_name

    def get_document_url(self, obj):
        try:
            return obj.document.url if obj.document else None
        except Exception:
            return None


class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("username", "email", "password", "role")
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        validated_data["password"] = make_password(validated_data["password"])
        user = super().create(validated_data)

        if user.role == "AGENCY":
            Agency.objects.get_or_create(
                user=user,
                defaults={"legal_name": user.username, "country": "FR", "city": "Paris"},
            )
            from .emails import send_welcome_agency
            send_welcome_agency(user.email, user.username)
        elif user.role == "CLIENT":
            from .emails import send_welcome_client
            send_welcome_client(user.email, user.username)

        return user


class TripSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = "__all__"
        read_only_fields = ("agency",)  # ✅ IMPORTANT


class ShipmentSerializer(serializers.ModelSerializer):
    trip_detail = serializers.SerializerMethodField()

    class Meta:
        model = Shipment
        fields = [
            "id",
            "trip",
            "trip_detail",
            "customer_name",
            "customer_email",
            "customer_phone",
            "weight_kg",
            "description",
            "delivery_type",
            "delivery_address",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "status", "created_at", "customer_name", "customer_email", "trip_detail"]

    def get_trip_detail(self, obj):
        t = obj.trip
        return {
            "id": t.id,
            "origin_city": t.origin_city,
            "origin_country": t.origin_country,
            "dest_city": t.dest_city,
            "dest_country": t.dest_country,
            "departure_at": t.departure_at,
            "arrival_eta": t.arrival_eta,
            "price_per_kg": t.price_per_kg,
            "agency_name": t.agency.legal_name if t.agency else "",
        }


# ✅ Agence: Trips avec capacité
class AgencyTripSerializer(serializers.ModelSerializer):
    used_kg = serializers.FloatField(read_only=True)
    pending_kg = serializers.FloatField(read_only=True)

    class Meta:
        model = Trip
        fields = [
            "id",
            "origin_country", "origin_city",
            "dest_country", "dest_city",
            "departure_at", "arrival_eta",
            "capacity_kg", "price_per_kg",
            "status",
            "used_kg", "pending_kg",
        ]


# ✅ Agence: Shipments détaillés
class AgencyShipmentSerializer(serializers.ModelSerializer):
    trip_summary = serializers.SerializerMethodField()

    class Meta:
        model = Shipment
        fields = [
            "id",
            "trip",
            "trip_summary",
            "customer_name",
            "customer_email",
            "customer_phone",
            "weight_kg",
            "description",
            "delivery_type",
            "delivery_address",
            "status",
            "created_at",
        ]

    def get_trip_summary(self, obj):
        t = obj.trip
        return {
            "id": t.id,
            "route": f"{t.origin_city}({t.origin_country}) → {t.dest_city}({t.dest_country})",
            "capacity_kg": t.capacity_kg,
            "price_per_kg": t.price_per_kg,
            "departure_at": t.departure_at,
        }


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "title", "message", "link", "is_read", "created_at")
        read_only_fields = ("id", "title", "message", "link", "created_at")
