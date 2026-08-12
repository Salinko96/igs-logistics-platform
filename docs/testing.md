# Tests et CI

## Commandes locales

- `npm run typecheck`: vérification TypeScript.
- `npm run test:e2e:public`: pages légales, cookies et accès non authentifiés.
- `npm run test:e2e:secure`: isolation multi-organisation, upload, facturation et 2FA.
- `npm run test:e2e`: toute la suite; les tests sécurisés sont ignorés sans environnement dédié.

Installer Chromium une première fois avec `npx playwright install chromium`.

## Environnement E2E sécurisé

Ne jamais utiliser les comptes ou dossiers de production. Créer deux organisations de test contenant chacune un compte agent et au moins un dossier/client. Ajouter séparément un administrateur E2E pour contrôler l’obligation 2FA :

```text
PLAYWRIGHT_BASE_URL=https://environnement-e2e.example.com
E2E_ORG_A_EMAIL=
E2E_ORG_A_PASSWORD=
E2E_ORG_A_CASE_ID=
E2E_ORG_B_EMAIL=
E2E_ORG_B_PASSWORD=
E2E_ORG_B_CASE_ID=
E2E_ADMIN_EMAIL=
E2E_ADMIN_PASSWORD=
E2E_ADMIN_TOTP_SECRET=
```

Les mêmes valeurs doivent être ajoutées dans `Settings > Secrets and variables > Actions` du dépôt GitHub. Le job sécurisé ne démarre que si `E2E_BASE_URL` est présent.

Les tests créent un petit PDF et une facture brouillon. La base E2E doit donc être réinitialisée périodiquement.
