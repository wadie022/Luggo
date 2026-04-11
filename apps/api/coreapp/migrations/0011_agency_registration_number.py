from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("coreapp", "0010_user_unique_email"),
    ]

    operations = [
        migrations.AddField(
            model_name="agency",
            name="registration_number",
            field=models.CharField(blank=True, max_length=50),
        ),
    ]
