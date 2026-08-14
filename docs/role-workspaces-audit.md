# Audit des espaces métier

## État initial

- Authentification: Supabase Auth, profil applicatif Prisma (`Profile`).
- Rôles existants: `ADMIN`, `AGENT`, `CLIENT`.
- Protection UI: `src/proxy.ts`, layouts serveur et contrôles dans les routes API.
- Navigation: un composant `AppShell` partagé; aucun besoin de dupliquer l'application.
- Multi-tenant: toutes les requêtes principales utilisent `organizationId`; RLS Supabase active.
- Données métier présentes: dossiers, clients, douane, documents, débours, factures, paiements et incidents.
- Données absentes: devis structuré, portefeuille client explicite, agence/site et détails de paiement mobile.

## Migration 202608140

La migration est additive et idempotente. Elle ajoute les rôles métier, les champs manquants et les tables `Quotation`/`QuotationItem`. Elle ne renomme et ne supprime aucune donnée. `AGENT` est conservé pour les comptes historiques.

Le périmètre fin reste vérifié dans les routes serveur, en plus de la RLS. Prisma utilise la connexion serveur et ne doit jamais considérer la RLS comme son seul contrôle d'autorisation.
