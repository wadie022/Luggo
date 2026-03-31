# Luggo — Roadmap

## Modification de trajet (Agence)
- Cas 1 : aucun shipment ACCEPTED → agence peut tout modifier (route, date, capacité, prix)
- Cas 2 : au moins 1 shipment ACCEPTED → agence peut modifier UNIQUEMENT la capacité restante
- Endpoint : PATCH /api/agency/trips/<id>/
- UI : bouton "Modifier" sur chaque trajet dans dashboard agence
- Validation backend : vérifier si used_kg > 0 avant d'autoriser modification complète

## Modification de shipment (Client)
- Un client peut modifier son shipment UNIQUEMENT si statut = PENDING (pas encore accepté)
- Champs modifiables : poids, description, téléphone
- Champs non modifiables : trajet, email
- Endpoint : PATCH /api/shipments/<id>/
- UI : bouton "Modifier ma demande" sur la page mes-colis
- Si statut = ACCEPTED ou REJECTED → modification impossible, message explicatif

## KYC - Vérification d'identité
- Upload carte d'identité (recto/verso) par le client ET l'agence
- Stockage sécurisé dans la DB (champ FileField ou URL S3)
- Vérification automatique par IA (Claude API) : extraction nom, prénom, date naissance, numéro
- Statut KYC : PENDING / VERIFIED / REJECTED
- Un agent ne peut pas publier de trajet si KYC non vérifié
- Un client ne peut pas réserver si KYC non vérifié

## Page Profil Client
- Nom, prénom, email, téléphone
- Statut KYC + upload carte d'identité
- Historique de ses colis

## Page Profil Agence
- Logo, nom légal, description
- Localisation sur carte (Google Maps / Mapbox)
- Horaires d'ouverture (lundi-dimanche)
- Téléphone, email, site web
- Statut KYC + documents légaux
- Note et avis clients
- Trajets publiés

## Stack suggérée
- Upload fichiers : AWS S3 ou Cloudflare R2
- Vérification KYC : Claude API (vision)
- Cartes : Mapbox ou Google Maps
- Avis : modèle Review dans Django
