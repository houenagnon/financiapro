# Financiapro

Plateforme numérique de gestion financière décentralisée pour les
communautés chrétiennes et organisations ecclésiales disposant de
plusieurs centres (paroisses, communautés, orphelinats, écoles, œuvres
sociales...).

Chaque centre gère ses revenus/dépenses de façon autonome sous la
responsabilité d'un Économe principal (qui peut créer des assistants),
tandis qu'un Économat central supervise l'ensemble : création des centres,
des types de centre, des économes, et pilotage consolidé (comparaisons,
tendances, analyses par type de centre).

Il n'y a pas d'inscription publique : la création de comptes suit
strictement la hiérarchie **Économat central → Économe principal →
Assistants**.

## Stack technique

| Composant | Choix |
|---|---|
| Backend | Django + Django REST Framework |
| Base de données | SQLite en dev, PostgreSQL en prod (`DATABASE_URL`) |
| Frontend | Next.js (TypeScript) |
| Style frontend | Tailwind CSS |
| Formulaires & validation frontend | react-hook-form + zod |
| Auth API | JWT (SimpleJWT) |
| Déploiement frontend | Vercel |
| Déploiement backend | Render |

> La prod utilise la base PostgreSQL managée déclarée dans `render.yaml`
> (⚠️ plan free : expire après 30 jours — passer sur un plan payant avant
> usage réel). En dev, SQLite par défaut ; exporter `DATABASE_URL` pour
> travailler sur PostgreSQL en local.

## Entités métier (MVP)

- **User** — compte avec rôle (`ECONOMAT_CENTRAL`, `ECONOME_PRINCIPAL`, `ASSISTANT`), rattaché à un centre (sauf Économat central)
- **Centre** — paroisse, communauté, orphelinat, école, œuvre sociale...
- **TypeCentre** — catalogue des types de centre, géré par l'Économat central
- **Category** — catégories/sous-catégories de revenus et dépenses, catalogue global
- **Transaction** — mouvement financier (revenu ou dépense) rattaché à un centre
- **DeclarationJournaliere** — statut de déclaration du jour par centre (déclaré avec mouvement / sans mouvement / non déclaré)
- **TypePlacement** — catalogue des types de placement (dépôt à terme, obligation, action, immobilier...), géré par l'Économat central
- **Portefeuille** — regroupement de placements, géré par l'Économat central
- **Placement** — un investissement au sein d'un portefeuille (montant investi, niveau de risque qualitatif, statut en cours/clôturé)
- **ValorisationPlacement** — historique des valorisations d'un placement ("marquage"), une ligne par mise à jour
- **MouvementTresorerie** — journal de la trésorerie centrale (virements avec les centres, achats/rachats de placements) ; sa somme donne le solde de la caisse centrale

## Rôles & permissions

| Rôle | Portée | Peut créer | Peut voir |
|---|---|---|---|
| Économat central | Globale | Centres, types de centre, économes principaux, catégories, portefeuilles/placements, virements de trésorerie | Tous les centres, rapports consolidés, placements et trésorerie centrale |
| Économe principal | Son centre | Assistants de son centre, transactions | Données de son centre uniquement |
| Assistant | Son centre | Transactions | Données de son centre uniquement |

## Arborescence du projet

```
financiapro/
  backend/
    manage.py
    config/
      settings/ (base.py, dev.py, prod.py)
      urls.py
      wsgi.py / asgi.py
    apps/
      accounts/      # User, rôles, permissions, serializers, views
      centres/       # Centre, TypeCentre
      finances/      # Category, Transaction
      declarations/  # DeclarationJournaliere
      placements/    # TypePlacement, Portefeuille, Placement, ValorisationPlacement, MouvementTresorerie (trésorerie centrale)
      reports/       # endpoints d'agrégation (lecture seule, cross-app)
      core/          # permissions/mixins/pagination communs
    requirements/ (base.txt, dev.txt, prod.txt)
    .env.example
  frontend/
    src/
      app/
        (auth)/login/
        (economat)/dashboard/ centres/ types-centres/ categories/ utilisateurs/ placements/ tresorerie/ rapports/
        (centre)/tableau-de-bord/ operations/ declaration-du-jour/ assistants/ rapports/
        profil/
      components/ (ui/, forms/, layout/)
      lib/         # client API, auth, utils
      hooks/
      types/       # interfaces TS miroir des serializers DRF
      stores/      # état de session/auth
    .env.local.example
  README.md
```

## Endpoints backend (DRF)

```
POST   /api/auth/login/            (JWT obtain)
POST   /api/auth/refresh/
POST   /api/auth/logout/           (blacklist refresh)
GET    /api/auth/me/

GET    /api/users/                 (scopé selon rôle)
POST   /api/users/
GET    /api/users/{id}/
PATCH  /api/users/{id}/
POST   /api/users/{id}/deactivate/

GET    /api/centres/               POST /api/centres/
GET    /api/centres/{id}/          PATCH /api/centres/{id}/
GET    /api/centres/{id}/stats/

GET    /api/types-centres/         POST/PATCH /api/types-centres/

GET    /api/categories/            POST/PATCH /api/categories/
GET    /api/categories/tree/

GET    /api/transactions/          POST /api/transactions/
GET    /api/transactions/{id}/     PATCH/DELETE /api/transactions/{id}/

GET    /api/declarations/?centre=&date_debut=&date_fin=
POST   /api/declarations/aucune-operation/
GET    /api/declarations/statut-jour/?date=

GET    /api/rapports/consolide/?periode=&type_centre=
GET    /api/rapports/comparaison-centres/?periode=
GET    /api/rapports/placements/   (solde caisse, performance/risque consolidés)

GET    /api/centre/dashboard/

GET    /api/types-placements/      POST/PATCH/DELETE /api/types-placements/{id}/

GET    /api/portefeuilles/         POST /api/portefeuilles/
GET    /api/portefeuilles/{id}/    PATCH/DELETE /api/portefeuilles/{id}/
GET    /api/portefeuilles/{id}/performance/

GET    /api/placements/            POST /api/placements/            (achat, débite la caisse)
GET    /api/placements/{id}/       PATCH/DELETE /api/placements/{id}/
POST   /api/placements/{id}/valoriser/   ("marquer" le placement)
GET    /api/placements/{id}/historique/  (historique des valorisations)
POST   /api/placements/{id}/cloturer/    (rachat/vente, crédite la caisse)

GET    /api/tresorerie/mouvements/
GET    /api/tresorerie/solde/
POST   /api/tresorerie/virements/  (centre <-> trésorerie centrale, génère aussi la Transaction du centre)
```

## Feuille de route (MVP)

- **Étape 0** — Setup & fondations (Django + DRF + SimpleJWT, Next.js + TS, pipeline Render/Vercel)
- **Étape 1** — Auth & accès (User custom, JWT, permissions, isolation par centre)
- **Étape 2** — Centres & structure organisationnelle (Centre, TypeCentre, gestion assistants)
- **Étape 3** — Cœur financier (Category, Transaction)
- **Étape 4** — Suivi quotidien (DeclarationJournaliere, rappels in-app)
- **Étape 5** — Reporting Économat central (consolidé global, comparaison centres)
- **Étape 6** — Durcissement & mise en production (tests, seed, déploiement)
- **Étape 7** — Placements (portefeuilles d'investissement gérés par l'Économat
  central, trésorerie centrale alimentée par virements depuis les centres,
  suivi des valorisations, rapports de performance/risque) — extension
  post-MVP, hors des 6 étapes initiales

Hors périmètre MVP : rappels email/SMS, journal d'audit détaillé, pièces
justificatives, budgets, projets/dons nominatifs, stocks, immobilisations.

## Déploiement

**Backend (Render)** — blueprint `render.yaml` à la racine :
- Build : `backend/build.sh` (pip install prod, collectstatic, migrate)
- Start : `gunicorn config.wsgi:application`
- Variables : `DJANGO_SETTINGS_MODULE=config.settings.prod`,
  `DJANGO_SECRET_KEY` (générée), `DJANGO_ALLOWED_HOSTS` (domaine Render),
  `CORS_ALLOWED_ORIGINS` (domaine Vercel), `DATABASE_URL` (liée
  automatiquement à la base `financiapro-db` du blueprint)

**Frontend (Vercel)** — importer le repo, Root Directory = `frontend/` :
- Variable : `NEXT_PUBLIC_API_URL` = URL du backend Render

**Commandes utiles**
- Tests backend : `cd backend && .venv/bin/pytest`
- Lint backend : `cd backend && .venv/bin/ruff check .`
- Lint frontend : `cd frontend && npm run lint`
- Données de démo : `python manage.py seed_demo` (mot de passe `Demo2026!`)
- npm : toujours utiliser `--registry https://registry.npmjs.org/` (miroir
  par défaut injoignable sur cette machine)

## Documentation

Le plan d'architecture détaillé (contexte, décisions, plan d'implémentation
par étapes, critères de vérification) est disponible dans les échanges de
conception du projet et sera versionné dans `docs/` au fur et à mesure de
l'implémentation.
