-- Migration : rattacher les utilisations à une autorisation précise (comme les achats)
-- pour permettre la traçabilité Autorisation -> Achats -> Utilisations et la
-- déclaration mensuelle par autorisation.
--
-- ATTENTION : cette migration supprime et recrée la table `utilisations`.
-- Sans danger si la table est vide (nouveau module, pas encore utilisé en production) ;
-- sinon, exporter les données existantes avant d'exécuter.

DROP VIEW IF EXISTS v_stock_produits;
DROP TABLE IF EXISTS utilisations;

ALTER TABLE autorisation_produits ADD COLUMN IF NOT EXISTS quantite_utilisee NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (quantite_utilisee >= 0);
ALTER TABLE autorisation_produits DROP CONSTRAINT IF EXISTS utilisee_ne_depasse_pas_acquise;
ALTER TABLE autorisation_produits ADD CONSTRAINT utilisee_ne_depasse_pas_acquise CHECK (quantite_utilisee <= quantite_acquise);

CREATE TABLE utilisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    autorisation_produit_id UUID NOT NULL REFERENCES autorisation_produits(id) ON DELETE CASCADE,
    quantite_utilisee NUMERIC(12, 3) NOT NULL CHECK (quantite_utilisee > 0),
    date_utilisation DATE NOT NULL,
    objectif VARCHAR(255),
    remarques TEXT,
    declare_par UUID REFERENCES utilisateurs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_utilisations_autorisation_produit ON utilisations(autorisation_produit_id);
CREATE INDEX idx_utilisations_date ON utilisations(date_utilisation);
CREATE INDEX idx_utilisations_declare_par ON utilisations(declare_par);

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
