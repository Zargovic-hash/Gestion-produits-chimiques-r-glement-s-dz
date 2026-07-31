-- Migration : état discret par produit (comme le système VBA de référence),
-- en complément (pas en remplacement) de l'état global par autorisation déjà en place.
--
-- États VBA : Non acquis / Acquis / Acquisition Partielle (reste > 50%) /
-- Acquisition Critique (reste < 20%) / Acquis Complet (reste = 0)

CREATE OR REPLACE FUNCTION calculer_etat_produit(p_quantite_autorisee NUMERIC, p_quantite_acquise NUMERIC)
RETURNS VARCHAR AS $$
DECLARE
    v_reste_pct NUMERIC;
BEGIN
    IF p_quantite_acquise <= 0 THEN
        RETURN 'NON_ACQUIS';
    END IF;

    IF p_quantite_acquise >= p_quantite_autorisee THEN
        RETURN 'ACQUIS_COMPLET';
    END IF;

    v_reste_pct := ((p_quantite_autorisee - p_quantite_acquise) / p_quantite_autorisee) * 100;

    IF v_reste_pct < 20 THEN
        RETURN 'ACQUISITION_CRITIQUE';
    ELSIF v_reste_pct > 50 THEN
        RETURN 'ACQUISITION_PARTIELLE';
    ELSE
        RETURN 'ACQUIS';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
