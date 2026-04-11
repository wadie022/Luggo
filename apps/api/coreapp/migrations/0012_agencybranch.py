from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("coreapp", "0011_agency_registration_number"),
    ]

    operations = [
        migrations.CreateModel(
            name="AgencyBranch",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("label", models.CharField(max_length=120)),
                ("address", models.CharField(blank=True, max_length=255)),
                ("city", models.CharField(max_length=80)),
                ("country", models.CharField(max_length=2)),
                ("latitude", models.FloatField(blank=True, null=True)),
                ("longitude", models.FloatField(blank=True, null=True)),
                ("is_main", models.BooleanField(default=False)),
                ("agency", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="branches", to="coreapp.agency")),
            ],
            options={
                "ordering": ["-is_main", "city"],
            },
        ),
    ]
