from django.db import migrations


class Migration(migrations.Migration):
    """
    Email uniqueness is enforced at the serializer level, not DB level,
    to avoid constraint failures with existing blank emails.
    """

    dependencies = [
        ("coreapp", "0009_reclamation"),
    ]

    operations = []
