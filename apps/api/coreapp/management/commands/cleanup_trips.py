from django.core.management.base import BaseCommand
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from coreapp.models import Trip, Shipment


class Command(BaseCommand):
    help = "Supprime les trajets expirés (date dépassée) et les trajets dont les kg max sont atteints."

    def handle(self, *args, **options):
        now = timezone.now()

        # 1. Trajets expirés
        expired = Trip.objects.filter(departure_at__lte=now)
        expired_count = expired.count()
        expired.delete()

        # 2. Trajets dont les kg acceptés >= capacité
        full_count = 0
        for trip in Trip.objects.all():
            used_kg = (
                Shipment.objects.filter(trip=trip, status="ACCEPTED")
                .aggregate(v=Coalesce(Sum("weight_kg"), 0.0))["v"]
            )
            if used_kg >= trip.capacity_kg:
                trip.delete()
                full_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Nettoyage terminé : {expired_count} trajet(s) expirés supprimés, "
                f"{full_count} trajet(s) complets supprimés."
            )
        )
