# coreapp/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User, Agency, CustomsCategory, Trip, Shipment, Payment

# Admin pour le User personnalisé
@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    # On ajoute le champ 'role' dans l'admin
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Luggo", {"fields": ("role",)}),
    )

# Enregistrement simple des autres modèles
admin.site.register(Agency)
admin.site.register(CustomsCategory)
admin.site.register(Trip)
admin.site.register(Shipment)
admin.site.register(Payment)
