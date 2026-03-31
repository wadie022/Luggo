# coreapp/serializers.py
from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import User, Trip, Shipment, Agency
from django.db.models import Sum
from django.db.models.functions import Coalesce

class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "role")


class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("username", "email", "password", "role")
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        validated_data["password"] = make_password(validated_data["password"])
        user = super().create(validated_data)

        # ✅ auto-create Agency profile if AGENCY
        if user.role == "AGENCY":
            Agency.objects.get_or_create(
                user=user,
                defaults={
                    "legal_name": user.username,
                    "country": "FR",
                    "city": "Paris",
                },
            )
        return user


class TripSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = "__all__"
        read_only_fields = ("agency",)  # ✅ IMPORTANT


class ShipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shipment
        fields = [
            "id",
            "trip",
            "customer_name",
            "customer_email",
            "customer_phone",
            "weight_kg",
            "description",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]


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
