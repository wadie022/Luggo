from django.core.management.base import BaseCommand
from coreapp.models import User


class Command(BaseCommand):
    help = "Set a user as ADMIN"

    def add_arguments(self, parser):
        parser.add_argument("username", type=str)

    def handle(self, *args, **options):
        username = options["username"]
        try:
            u = User.objects.get(username=username)
            u.role = "ADMIN"
            u.is_staff = True
            u.is_superuser = True
            u.kyc_status = "VERIFIED"
            u.save()
            self.stdout.write(self.style.SUCCESS(f"OK — {username} est maintenant ADMIN"))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Utilisateur '{username}' introuvable"))
