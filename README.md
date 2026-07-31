# Gestion des Autorisations de Produits Chimiques Réglementés

Application de gestion du cycle d'acquisition des produits chimiques réglementés (Algérie), construite autour du modèle **Canevas → Autorisation → Achat** décrit dans `Description of the Web App/descriptif non technique.pdf`.

Périmètre actuel : **Phase 1 (Acquisition)** — Canevas, Autorisations, Achats, alertes/notifications, rapports (PDF/CSV), tableau de bord avec graphiques, piste d'audit — **et Phase 2 (Utilisation)** — déclaration de consommation rattachée à l'autorisation qui a financé l'achat, calcul du stock disponible, seuils d'alerte de rupture (spec non technique §9.1). Chaque autorisation est ainsi traçable de bout en bout : produits autorisés → achats → utilisations → stock restant, avec une déclaration mensuelle récapitulative par autorisation.

## Stack

- **Backend** : Node.js + Express + PostgreSQL (driver `pg`, sans ORM)
- **Frontend** : React (Vite) + Tailwind CSS + React Router + Recharts
- **Auth** : JWT, 3 rôles (`admin`, `responsable_stock`, `visiteur`), déconnexion automatique après 30 min d'inactivité

## Fonctionnalités

- **Canevas** : modèles de produits réutilisables, immuables après création (duplication possible)
- **Autorisations** : création depuis un Canevas ou manuellement, état calculé dynamiquement (Active / Presque Épuisée / Épuisée / Presque Expirée / Expirée), archivage manuel des autorisations expirées
- **Achats** : enregistrement transactionnel avec verrou de ligne, blocage si dépassement de quantité ou autorisation expirée ; modification/suppression réservées au créateur ou à un admin
- **Notifications** : alertes automatiques (seuils 80/90 %, échéance ≤ 30 jours) déclenchées à chaque achat et vérifiées quotidiennement par un scheduler ; cloche in-app avec compteur
- **Rapports** : 6 rapports (État des Autorisations, Détail d'une Autorisation — avec sections Achats et Utilisations, Historique des Achats, Produits les Plus Acquis, Performance par Département, Déclaration Mensuelle par Autorisation), export PDF et CSV
- **Tableau de bord** : répartition par état (camembert), % moyen d'acquisition (jauge), évolution des achats (courbe), top 10 produits (barres) ; vue restreinte pour le Responsable Stock (son département) et le Visiteur (pas de détail nominatif)
- **Piste d'audit** : traçabilité qui/quoi/quand des créations, modifications et suppressions, consultable par l'administrateur
- **Utilisations (Phase 2)** : une utilisation cible un produit d'une autorisation précise (comme un achat) — le Responsable Stock ou l'Admin la déclare depuis la page de l'autorisation, avec blocage si la quantité dépasse ce qui a été acquis sous cette autorisation
- **Stock** : page agrégée (toutes autorisations confondues) par produit/département = Σ acquis − Σ utilisé ; seuils minimum configurables par l'Admin, avec alerte automatique (Faible / Critique) dès qu'un seuil est atteint

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

`schema.sql` contient l'intégralité du schéma à jour (y compris notifications, audit_logs, utilisations/stock). Si une base existante a été créée avant l'ajout de ces tables, appliquer les migrations incrémentales dans l'ordre :

```bash
psql -U chemapp -d gestion_chimique -f backend/src/db/migration_002_notifications.sql
psql -U chemapp -d gestion_chimique -f backend/src/db/migration_003_utilisation.sql
psql -U chemapp -d gestion_chimique -f backend/src/db/migration_004_utilisation_par_autorisation.sql
```

(`migration_004` remplace le modèle initial de stock par produit/département par un modèle par autorisation — cf. Notes de conception. Si `migration_003` n'a jamais été appliquée sur cette base, `migration_004` échouera ; dans ce cas, appliquer directement `schema.sql` à jour sur une base neuve.)

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
    config/db.js              # pool PostgreSQL + helper de transaction
    db/schema.sql              # schéma complet (tables, fonction d'état, vue)
    db/migration_00X_*.sql     # migrations incrémentales (notifications+audit, puis utilisations+stock)
    middleware/                 # auth JWT, contrôle de rôle, gestion d'erreurs
    services/                   # alertes, notifications, rapports (PDF/CSV), audit, scheduler
    controllers/ + routes/      # canevas, autorisations, achats, users, dashboard, reports, notifications, audit, stock, utilisations
  scripts/seed.js              # utilisateurs de démo + canevas par défaut

frontend/
  src/
    api/                        # client axios + appels par ressource
    context/AuthContext.jsx     # session utilisateur
    hooks/useIdleLogout.js       # déconnexion automatique
    components/                  # composants réutilisables (badges, formulaires produits, layout, notifications)
    pages/                       # Login, Dashboard, Canevas, Autorisations, Achats, Stock, Utilisations, Rapports, Utilisateurs, Piste d'audit
```

## Notes de conception

- Les **Canevas** sont immuables après création (conformément à la spec) : pas d'endpoint de modification, uniquement duplication.
- L'**état d'une Autorisation** est calculé côté base via une fonction SQL (`calculer_etat_autorisation`), jamais stocké en dur — il est donc toujours à jour.
- L'enregistrement d'un **Achat** est transactionnel avec verrou de ligne (`FOR UPDATE`) pour empêcher les dépassements de quantité en cas d'accès concurrent.
- Le **Responsable Stock** ne voit que les autorisations/achats/rapports de son département ; le **Visiteur** est en lecture seule sur tout, sans détail nominatif ; l'**Administrateur** a accès complet.
- Les **notifications** sont dédupliquées sur une fenêtre de 24h par (utilisateur, référence, type) pour éviter le spam — la référence est l'autorisation pour les alertes d'acquisition, ou `product_code:departement` pour les alertes de stock agrégé.
- Une **utilisation** cible `autorisation_produit_id`, exactement comme un achat : `autorisation_produits.quantite_utilisee` est incrémentée sous verrou de ligne (`FOR UPDATE`), et la validation de dépassement se fait contre le stock *de cette autorisation* (`quantite_acquise − quantite_utilisee`), pas contre un pot global. C'est ce qui permet de retracer, pour une autorisation donnée, tout ce qui a été acheté et utilisé sous son couvert (cf. Rapport 2 et la Déclaration Mensuelle).
- La page **Stock** reste une vue agrégée en lecture seule (Σ sur toutes les autorisations, par produit/département) — utile pour une vision d'ensemble, mais la déclaration se fait toujours depuis l'autorisation concernée.

## Hors périmètre

Intégrations ERP, portail fournisseurs, connexion aux plateformes des autorités, workflow de validation multi-niveaux, gestion documentaire (pièces jointes), envoi d'emails (notifications in-app uniquement), analytics/ML avancés, application mobile — cf. spec non technique §9.2-9.3, non implémentés dans cette version.
