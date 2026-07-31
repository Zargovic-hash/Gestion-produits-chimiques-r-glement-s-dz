# Gestion des Autorisations de Produits Chimiques Réglementés

Application de gestion du cycle d'acquisition des produits chimiques réglementés (Algérie), construite autour du modèle **Canevas → Autorisation → Achat** décrit dans `Description of the Web App/descriptif non technique.pdf`.

Périmètre actuel : Phase 1 (Acquisition) uniquement — création de Canevas, création d'Autorisations, enregistrement des Achats, suivi des états et tableau de bord.

## Stack

- **Backend** : Node.js + Express + PostgreSQL (driver `pg`, sans ORM)
- **Frontend** : React (Vite) + Tailwind CSS + React Router
- **Auth** : JWT, 3 rôles (`admin`, `responsable_stock`, `visiteur`)

## Prérequis

- Node.js 18+
- PostgreSQL (une base `gestion_chimique` avec un rôle applicatif dédié)

## Installation

### 1. Base de données

Créer un rôle et une base dédiés, puis appliquer le schéma :

```bash
psql -U postgres -c "CREATE ROLE chemapp LOGIN PASSWORD 'votre_mot_de_passe';"
psql -U postgres -c "CREATE DATABASE gestion_chimique OWNER chemapp;"
psql -U chemapp -d gestion_chimique -f backend/src/db/schema.sql
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # renseigner DB_PASSWORD, JWT_SECRET, etc.
npm run seed            # crée un admin, un responsable stock, un visiteur, et un canevas d'exemple
npm run dev              # démarre sur http://localhost:5000
```

Comptes créés par le seed :

| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur | admin@gestion-chimique.local | Admin123! |
| Responsable Stock | stock@gestion-chimique.local | Stock123! |
| Visiteur | visiteur@gestion-chimique.local | Visiteur123! |

**Changez ces mots de passe avant tout déploiement en production.**

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL si le backend n'est pas sur localhost:5000
npm run dev              # démarre sur http://localhost:5173
```

## Structure

```
backend/
  src/
    config/db.js            # pool PostgreSQL + helper de transaction
    db/schema.sql            # schéma complet (tables, fonction d'état, vue)
    middleware/               # auth JWT, contrôle de rôle, gestion d'erreurs
    controllers/ + routes/    # canevas, autorisations, achats, users, dashboard
  scripts/seed.js            # utilisateurs de démo + canevas par défaut

frontend/
  src/
    api/                      # client axios + appels par ressource
    context/AuthContext.jsx   # session utilisateur
    components/                # composants réutilisables (badges, formulaires produits, layout)
    pages/                     # Login, Dashboard, Canevas, Autorisations, Achats, Utilisateurs
```

## Notes de conception

- Les **Canevas** sont immuables après création (conformément à la spec) : pas d'endpoint de modification, uniquement duplication.
- L'**état d'une Autorisation** (`Active`, `Presque Épuisée`, `Épuisée`, `Presque Expirée`, `Expirée`) est calculé côté base via une fonction SQL (`calculer_etat_autorisation`), jamais stocké en dur — il est donc toujours à jour.
- L'enregistrement d'un **Achat** est transactionnel avec verrou de ligne (`FOR UPDATE`) pour empêcher les dépassements de quantité en cas d'accès concurrent.
- Le **Responsable Stock** ne voit que les autorisations/achats de son département ; le **Visiteur** est en lecture seule sur tout ; l'**Administrateur** a accès complet.

## Hors périmètre (Phase 2, cf. spec non technique §9)

Suivi de consommation/stock, intégrations ERP, rapports PDF/Excel/CSV, envoi d'emails, application mobile — non implémentés dans cette version MVP.
