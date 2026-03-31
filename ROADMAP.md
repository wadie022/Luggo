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
