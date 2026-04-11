from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("coreapp", "0009_reclamation"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="email",
            field=models.EmailField(max_length=254, unique=True),
        ),
    ]
