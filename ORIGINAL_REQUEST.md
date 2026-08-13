# Original User Request

## Initial Request — 2026-08-08T22:49:00Z

Implémentation du stockage physique sécurisé des documents de transit via Supabase Storage (avec URLs privées signées) et intégration d'un composant d'upload Drag & Drop et d'une visionneuse intégrée.

Working directory: /Users/alphasalinkobarry/Downloads/ISS projet 2027
Integrity mode: demo

## Requirements

### R1. Composant d'Upload Premium (Drag & Drop)
Remplacer le champ texte de saisie manuelle d'URL par un composant d'upload premium avec zone Drag & Drop, indicateur de progression et validation du type/taille de fichier dans l'interface d'ajout de documents.

### R2. Intégration Supabase Storage Privé
Téléverser physiquement les fichiers dans un bucket nommé `transit-documents` sur Supabase. Les fichiers doivent être stockés de manière organisée (ex : par dossier `/cases/{caseId}/nom_fichier.pdf`). L'accès aux fichiers doit se faire uniquement par le biais d'URLs signées temporaires générées côté serveur, pour assurer la confidentialité.

### R3. Enregistrement en Base de Données
Une fois le fichier téléversé avec succès, enregistrer le chemin de stockage (`fileUrl`), sa taille (`fileSize`) et son format (`fileType`) dans la table `Document` via l'API Prisma existante.

### R4. Visionneuse de Fichiers Intégrée (Aperçu)
Ajouter un bouton d'aperçu à côté de chaque document permettant de visualiser le fichier (images PNG/JPG, fichiers PDF) directement dans un panneau latéral (Sheet) ou popup de l'application, sans forcer le téléchargement.

## Acceptance Criteria

### Fonctionnalités & Sécurité
- [ ] Le bucket de stockage privé `transit-documents` est créé et configuré.
- [ ] Le composant UI permet de sélectionner ou glisser-déposer un fichier.
- [ ] Le téléversement utilise le token de session Supabase pour respecter les règles de sécurité.
- [ ] Les fichiers ne sont pas accessibles publiquement et nécessitent une URL signée générée dynamiquement.
- [ ] La visionneuse affiche correctement les fichiers PDF et les images.
- [ ] Les métadonnées du document (URL relative, type, taille) sont persistées en base de données.
