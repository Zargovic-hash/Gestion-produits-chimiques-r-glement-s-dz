-- Migration : Phase 2 - Gestion de l'Utilisation / Consommation (spec §9.1)
-- Idempotent (IF NOT EXISTS partout).

-- ============================================================
-- UTILISATIONS (consommations déclarées)
-- ============================================================
CREATE TABLE IF NOT EXISTS utilisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(50) NOT NULL,
    departement VARCHAR(100) NOT NULL,
    quantite_utilisee NUMERIC(12, 3) NOT NULL CHECK (quantite_utilisee > 0),
    unite VARCHAR(20) NOT NULL CHECK (unite IN ('L', 'mL', 'kg', 'g', 't', 'unite')),
    date_utilisation DATE NOT NULL,
    objectif VARCHAR(255),
    remarques TEXT,
    declare_par UUID REFERENCES utilisateurs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_utilisations_product ON utilisations(product_code, departement);
CREATE INDEX IF NOT EXISTS idx_utilisations_date ON utilisations(date_utilisation);
CREATE INDEX IF NOT EXISTS idx_utilisations_declare_par ON utilisations(declare_par);

-- ============================================================
-- SEUILS_STOCK (seuil minimum par produit/département, gérés par l'admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS seuils_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(50) NOT NULL,
    departement VARCHAR(100) NOT NULL,
    stock_minimum NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (stock_minimum >= 0),
    created_by UUID REFERENCES utilisateurs(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (product_code, departement)
);

-- ============================================================
-- VUE : stock disponible par produit / département
-- Stock disponible = Total Acquis (achats) - Total Consommé (utilisations)
-- ============================================================
CREATE OR REPLACE VIEW v_stock_produits AS
WITH acquisitions AS (
    SELECT ap.product_code, ap.departement,
           MAX(ap.designation_technique) AS designation_technique,
           MAX(ap.unite) AS unite,
           COALESCE(SUM(ach.quantite_acquise), 0) AS quantite_acquise_totale
    FROM autorisation_produits ap
    LEFT JOIN achats ach ON ach.autorisation_produit_id = ap.id
    GROUP BY ap.product_code, ap.departement
),
consommations AS (
    SELECT product_code, departement, COALESCE(SUM(quantite_utilisee), 0) AS quantite_consommee_totale
    FROM utilisations
    GROUP BY product_code, departement
)
SELECT
    a.product_code,
    a.departement,
    a.designation_technique,
    a.unite,
    a.quantite_acquise_totale,
    COALESCE(c.quantite_consommee_totale, 0) AS quantite_consommee_totale,
    a.quantite_acquise_totale - COALESCE(c.quantite_consommee_totale, 0) AS stock_disponible,
    COALESCE(s.stock_minimum, 0) AS stock_minimum,
    CASE
        WHEN (a.quantite_acquise_totale - COALESCE(c.quantite_consommee_totale, 0)) <= COALESCE(s.stock_minimum, 0)
            THEN 'CRITIQUE'
        WHEN COALESCE(s.stock_minimum, 0) > 0
             AND (a.quantite_acquise_totale - COALESCE(c.quantite_consommee_totale, 0)) <= (COALESCE(s.stock_minimum, 0) * 1.5)
            THEN 'FAIBLE'
        ELSE 'OK'
    END AS statut
FROM acquisitions a
LEFT JOIN consommations c ON c.product_code = a.product_code AND c.departement = a.departement
LEFT JOIN seuils_stock s ON s.product_code = a.product_code AND s.departement = a.departement;
