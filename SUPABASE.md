# Supabase PostgreSQL

Cette plateforme est configurée pour utiliser PostgreSQL via Supabase.

## Projet cible

- Nom Supabase: `iss-guinea`
- Project ref: `hgtesqhmunivzkvaptvs`
- Région: `eu-west-1`
- Host database: `db.hgtesqhmunivzkvaptvs.supabase.co`

## Variables d'environnement

Copier `.env.example` vers `.env`, puis remplacer `[YOUR-PASSWORD]` par le mot de passe database Supabase.

```bash
cp .env.example .env
```

Variables attendues:

- `DATABASE_URL`: URL pooler Supabase pour l'application.
- `DIRECT_URL`: URL directe/pooler session pour Prisma migrations.

## Commandes utiles

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

## Migration initiale

La migration PostgreSQL initiale se trouve ici:

```text
prisma/migrations/202608031_supabase_postgres/migration.sql
```

Elle crée les tables métier de la plateforme: organisations, profils, clients, dossiers, documents, expéditions, douane, débours, factures, paiements, incidents, notifications, audit et catalogue de services.
