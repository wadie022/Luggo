from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('coreapp', '0008_shipment_tracking_delivery'),
    ]

    operations = [
        migrations.CreateModel(
            name='Reclamation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('subject', models.CharField(max_length=200)),
                ('message', models.TextField()),
                ('status', models.CharField(
                    choices=[
                        ('OPEN', 'Ouverte'),
                        ('IN_PROGRESS', 'En cours de traitement'),
                        ('RESOLVED', 'Résolue'),
                        ('CLOSED', 'Fermée'),
                    ],
                    default='OPEN',
                    max_length=20,
                )),
                ('admin_response', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reclamations',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('shipment', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='reclamations',
                    to='coreapp.shipment',
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
