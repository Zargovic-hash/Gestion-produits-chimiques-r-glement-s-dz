-- Schema: Gestion des Autorisations de Produits Chimiques Réglementés
-- Modèle : Canevas -> Autorisation -> Achat (Phase 1 - Acquisition uniquement)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- UTILISATEURS
-- ============================================================
CREATE TABLE IF NOT EXISTS utilisateurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'responsable_stock', 'visiteur')),
    departement VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES utilisateurs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_utilisateurs_role ON utilisateurs(role);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_departement ON utilisateurs(departement);

-- ============================================================
-- CANEVAS (modèles de produits, immuables une fois créés)
-- ============================================================
CREATE TABLE IF NOT EXISTS canevas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES utilisateurs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS canevas_produits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canevas_id UUID NOT NULL REFERENCES canevas(id) ON DELETE CASCADE,
    product_code VARCHAR(50) NOT NULL,
    designation_technique VARCHAR(255) NOT NULL,
    numero_onu VARCHAR(50),
    numero_cas VARCHAR(50),
    numero_cee VARCHAR(50),
    designation_chimique TEXT,
    autre_designation TEXT,
    unite VARCHAR(20) NOT NULL CHECK (unite IN ('L', 'mL', 'kg', 'g', 't', 'unite')),
    departement VARCHAR(100) NOT NULL,
    UNIQUE (canevas_id, product_code)
);

CREATE INDEX IF NOT EXISTS idx_canevas_produits_canevas ON canevas_produits(canevas_id);

-- ============================================================
-- AUTORISATIONS (documents officiels digitalisés)
-- ============================================================
CREATE TABLE IF NOT EXISTS autorisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_autorisation VARCHAR(100) UNIQUE NOT NULL,
    date_delivrance DATE NOT NULL,
    duree_validite_jours INTEGER NOT NULL CHECK (duree_validite_jours > 0),
    date_echeance DATE NOT NULL,
    type_marche VARCHAR(20) NOT NULL CHECK (type_marche IN ('Local', 'International')),
    canevas_id UUID REFERENCES canevas(id),
    notes TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES utilisateurs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_echeance CHECK (date_echeance > date_delivrance)
);

CREATE INDEX IF NOT EXISTS idx_autorisations_date_echeance ON autorisations(date_echeance);
CREATE INDEX IF NOT EXISTS idx_autorisations_numero ON autorisations(numero_autorisation);

CREATE TABLE IF NOT EXISTS autorisation_produits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    autorisation_id UUID NOT NULL REFERENCES autorisations(id) ON DELETE CASCADE,
    product_code VARCHAR(50) NOT NULL,
    designation_technique VARCHAR(255) NOT NULL,
    numero_onu VARCHAR(50),
    numero_cas VARCHAR(50),
    numero_cee VARCHAR(50),
    designation_chimique TEXT,
    autre_designation TEXT,
    unite VARCHAR(20) NOT NULL CHECK (unite IN ('L', 'mL', 'kg', 'g', 't', 'unite')),
    departement VARCHAR(100) NOT NULL,
    quantite_autorisee NUMERIC(12, 3) NOT NULL CHECK (quantite_autorisee > 0),
    quantite_acquise NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (quantite_acquise >= 0),
    quantite_utilisee NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (quantite_utilisee >= 0),
    CONSTRAINT no_overacquisition CHECK (quantite_acquise <= quantite_autorisee),
    CONSTRAINT utilisee_ne_depasse_pas_acquise CHECK (quantite_utilisee <= quantite_acquise),
    UNIQUE (autorisation_id, product_code)
);

CREATE INDEX IF NOT EXISTS idx_autorisation_produits_autorisation ON autorisation_produits(autorisation_id);

-- ============================================================
-- ACHATS (acquisitions enregistrées)
-- ============================================================
CREATE TABLE IF NOT EXISTS achats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    autorisation_produit_id UUID NOT NULL REFERENCES autorisation_produits(id) ON DELETE CASCADE,
    quantite_acquise NUMERIC(12, 3) NOT NULL CHECK (quantite_acquise > 0),
    date_achat DATE NOT NULL,
    fournisseur VARCHAR(255) NOT NULL,
    numero_facture VARCHAR(100) NOT NULL,
    remarques TEXT,
    enregistre_par UUID REFERENCES utilisateurs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_achats_autorisation_produit ON achats(autorisation_produit_id);
CREATE INDEX IF NOT EXISTS idx_achats_date ON achats(date_achat);

-- ============================================================
-- FONCTION : calcul de l'état d'une autorisation
-- États (codes ASCII en base, libellés FR affichés côté frontend) :
--   ACTIVE, PRESQUE_EPUISEE, EPUISEE, PRESQUE_EXPIREE, EXPIREE
-- ============================================================
CREATE OR REPLACE FUNCTION calculer_etat_autorisation(p_autorisation_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_date_echeance DATE;
    v_jours_restants INTEGER;
    v_qte_autorisee NUMERIC;
    v_qte_acquise NUMERIC;
    v_pct_acquis NUMERIC;
BEGIN
    SELECT date_echeance INTO v_date_echeance
    FROM autorisations WHERE id = p_autorisation_id;

    IF v_date_echeance IS NULL THEN
        RETURN 'ACTIVE';
    END IF;

    v_jours_restants := v_date_echeance - CURRENT_DATE;

    SELECT COALESCE(SUM(quantite_autorisee), 0), COALESCE(SUM(quantite_acquise), 0)
    INTO v_qte_autorisee, v_qte_acquise
    FROM autorisation_produits WHERE autorisation_id = p_autorisation_id;

    IF v_qte_autorisee > 0 THEN
        v_pct_acquis := (v_qte_acquise / v_qte_autorisee) * 100;
    ELSE
        v_pct_acquis := 0;
    END IF;

    IF v_jours_restants < 0 THEN
        RETURN 'EXPIREE';
    ELSIF v_pct_acquis >= 100 THEN
        RETURN 'EPUISEE';
    ELSIF v_pct_acquis >= 80 THEN
        RETURN 'PRESQUE_EPUISEE';
    ELSIF v_jours_restants <= 30 THEN
        RETURN 'PRESQUE_EXPIREE';
    ELSE
        RETURN 'ACTIVE';
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- VUE : autorisations avec état et pourcentages calculés
-- ============================================================
CREATE OR REPLACE VIEW v_autorisations AS
SELECT
    a.id,
    a.numero_autorisation,
    a.date_delivrance,
    a.duree_validite_jours,
    a.date_echeance,
    a.type_marche,
    a.canevas_id,
    a.notes,
    a.is_archived,
    a.created_by,
    a.created_at,
    GREATEST(a.date_echeance - CURRENT_DATE, 0) AS jours_restants,
    COALESCE(SUM(ap.quantite_autorisee), 0) AS quantite_autorisee_totale,
    COALESCE(SUM(ap.quantite_acquise), 0) AS quantite_acquise_totale,
    CASE WHEN COALESCE(SUM(ap.quantite_autorisee), 0) > 0
        THEN ROUND((COALESCE(SUM(ap.quantite_acquise), 0) / SUM(ap.quantite_autorisee)) * 100, 2)
        ELSE 0
    END AS pourcentage_acquis,
    (SELECT COUNT(*) FROM achats ach
        JOIN autorisation_produits ap2 ON ach.autorisation_produit_id = ap2.id
        WHERE ap2.autorisation_id = a.id) AS nombre_achats,
    calculer_etat_autorisation(a.id) AS etat
FROM autorisations a
LEFT JOIN autorisation_produits ap ON ap.autorisation_id = a.id
GROUP BY a.id;

-- ============================================================
-- NOTIFICATIONS (spec §4.4 + §6.2)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    autorisation_id UUID REFERENCES autorisations(id) ON DELETE CASCADE,
    reference VARCHAR(255),
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'EXPIRATION_PROCHE', 'EXPIREE', 'PRESQUE_EPUISEE', 'PRODUIT_PRESQUE_EPUISE',
        'STOCK_FAIBLE', 'STOCK_CRITIQUE'
    )),
    priorite VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priorite IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    titre VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    est_lue BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, est_lue) WHERE est_lue = false;
CREATE INDEX IF NOT EXISTS idx_notifications_autorisation ON notifications(autorisation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ============================================================
-- AUDIT_LOGS (spec §6.1 - traçabilité qui/quoi/quand)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES utilisateurs(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
    entite VARCHAR(50) NOT NULL,
    entite_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entite ON audit_logs(entite, entite_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================
-- PHASE 2 : UTILISATIONS / STOCK (spec §9.1)
-- Une utilisation cible une autorisation_produit précise (comme un achat),
-- ce qui permet de retracer Autorisation -> Achats -> Utilisations.
-- ============================================================
CREATE TABLE IF NOT EXISTS utilisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    autorisation_produit_id UUID NOT NULL REFERENCES autorisation_produits(id) ON DELETE CASCADE,
    quantite_utilisee NUMERIC(12, 3) NOT NULL CHECK (quantite_utilisee > 0),
    date_utilisation DATE NOT NULL,
    objectif VARCHAR(255),
    remarques TEXT,
    declare_par UUID REFERENCES utilisateurs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_utilisations_autorisation_produit ON utilisations(autorisation_produit_id);
CREATE INDEX IF NOT EXISTS idx_utilisations_date ON utilisations(date_utilisation);
CREATE INDEX IF NOT EXISTS idx_utilisations_declare_par ON utilisations(declare_par);

CREATE TABLE IF NOT EXISTS seuils_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(50) NOT NULL,
    departement VARCHAR(100) NOT NULL,
    stock_minimum NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (stock_minimum >= 0),
    created_by UUID REFERENCES utilisateurs(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (product_code, departement)
);

-- Vue : stock disponible agrégé par produit / département, toutes autorisations confondues.
-- (le détail par autorisation se lit directement sur autorisation_produits)
CREATE OR REPLACE VIEW v_stock_produits AS
SELECT
    ap.product_code,
    ap.departement,
    MAX(ap.designation_technique) AS designation_technique,
    MAX(ap.unite) AS unite,
    SUM(ap.quantite_acquise) AS quantite_acquise_totale,
    SUM(ap.quantite_utilisee) AS quantite_consommee_totale,
    SUM(ap.quantite_acquise) - SUM(ap.quantite_utilisee) AS stock_disponible,
    COALESCE(s.stock_minimum, 0) AS stock_minimum,
    CASE
        WHEN (SUM(ap.quantite_acquise) - SUM(ap.quantite_utilisee)) <= COALESCE(s.stock_minimum, 0)
            THEN 'CRITIQUE'
        WHEN COALESCE(s.stock_minimum, 0) > 0
             AND (SUM(ap.quantite_acquise) - SUM(ap.quantite_utilisee)) <= (COALESCE(s.stock_minimum, 0) * 1.5)
            THEN 'FAIBLE'
        ELSE 'OK'
    END AS statut
FROM autorisation_produits ap
LEFT JOIN seuils_stock s ON s.product_code = ap.product_code AND s.departement = ap.departement
GROUP BY ap.product_code, ap.departement, s.stock_minimum;
