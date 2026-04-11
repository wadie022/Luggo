# coreapp/serializers.py
from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import User, Trip, Shipment, Agency, AgencyBranch, KYCDocument, AgencyDocument, Notification, Reclamation, Review, Conversation, Message
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

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Cette adresse e-mail est déjà utilisée.")
        return value.lower()

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

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
    agency_name = serializers.CharField(source='agency.legal_name', read_only=True)

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
            "agency_id": t.agency.id if t.agency else None,
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
    user_id = serializers.IntegerField(source='user.id', read_only=True, default=None)

    class Meta:
        model = Shipment
        fields = [
            "id",
            "trip",
            "trip_summary",
            "user_id",
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


class ReclamationSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email    = serializers.CharField(source="user.email",    read_only=True)
    shipment_route = serializers.SerializerMethodField()

    class Meta:
        model = Reclamation
        fields = ("id", "user", "username", "email", "shipment", "shipment_route",
                  "subject", "message", "status", "admin_response", "created_at", "updated_at")
        read_only_fields = ("id", "user", "username", "email", "shipment_route",
                            "status", "admin_response", "created_at", "updated_at")

    def get_shipment_route(self, obj):
        if not obj.shipment:
            return None
        t = obj.shipment.trip
        return f"{t.origin_city} ({t.origin_country}) → {t.dest_city} ({t.dest_country})"


class AgencyBranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgencyBranch
        fields = ("id", "label", "address", "city", "country", "latitude", "longitude", "is_main")
        read_only_fields = ("id",)


class MessageSerializer(serializers.ModelSerializer):
    sender_id       = serializers.IntegerField(source='sender.id', read_only=True)
    sender_username = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = Message
        fields = ('id', 'conversation', 'sender_id', 'sender_username', 'content', 'created_at', 'is_read')
        read_only_fields = ('id', 'conversation', 'sender_id', 'sender_username', 'created_at', 'is_read')


class ConversationListSerializer(serializers.ModelSerializer):
    agency_id       = serializers.IntegerField(source='agency.id', read_only=True)
    agency_name     = serializers.CharField(source='agency.legal_name', read_only=True)
    client_id       = serializers.IntegerField(source='client.id', read_only=True)
    client_username = serializers.CharField(source='client.username', read_only=True)
    shipment_id     = serializers.IntegerField(source='shipment.id', read_only=True, default=None)
    last_message    = serializers.SerializerMethodField()
    unread_count    = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ('id', 'agency_id', 'agency_name', 'client_id', 'client_username',
                  'shipment_id', 'updated_at', 'last_message', 'unread_count')

    def get_last_message(self, obj):
        msgs = list(obj.messages.all())
        if not msgs:
            return None
        last = msgs[-1]
        return {'content': last.content, 'created_at': last.created_at, 'sender_username': last.sender.username}

    def get_unread_count(self, obj):
        user = self.context['request'].user
        return sum(1 for m in obj.messages.all() if not m.is_read and m.sender_id != user.id)


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_username = serializers.CharField(source='reviewer.username', read_only=True)
    agency_name = serializers.CharField(source='agency.legal_name', read_only=True)

    class Meta:
        model = Review
        fields = ("id", "reviewer_username", "agency", "agency_name", "reviewed_user", "shipment", "rating", "comment", "created_at")
        read_only_fields = ("id", "reviewer_username", "agency_name", "created_at")
