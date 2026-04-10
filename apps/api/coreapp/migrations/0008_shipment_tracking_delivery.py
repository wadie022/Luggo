from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('coreapp', '0007_agency_location'),
    ]

    operations = [
        migrations.AddField(
            model_name='shipment',
            name='user',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='shipments',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='shipment',
            name='delivery_type',
            field=models.CharField(
                choices=[('PICKUP', 'Retrait au bureau'), ('HOME_DELIVERY', 'Livraison à domicile')],
                default='PICKUP',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='shipment',
            name='delivery_address',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='status',
            field=models.CharField(
                choices=[
                    ('PENDING',    'En attente agence'),
                    ('ACCEPTED',   'Accepté'),
                    ('REJECTED',   'Rejeté'),
                    ('DEPOSITED',  'Déposé au bureau de départ'),
                    ('IN_TRANSIT', 'En transit'),
                    ('ARRIVED',    'Arrivé au bureau de destination'),
                    ('DELIVERED',  'Livré'),
                ],
                default='PENDING',
                max_length=20,
            ),
        ),
    ]
