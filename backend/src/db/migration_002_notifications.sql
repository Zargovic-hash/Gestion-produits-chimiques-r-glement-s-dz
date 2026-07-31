-- Migration : notifications (spec §4.4 + §6.2) et piste d'audit (spec §6.1)
-- Idempotent : peut être ré-appliquée sans risque (IF NOT EXISTS partout).

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    autorisation_id UUID REFERENCES autorisations(id) ON DELETE CASCADE,
    reference VARCHAR(255),
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'EXPIRATION_PROCHE', 'EXPIREE', 'PRESQUE_EPUISEE', 'PRODUIT_PRESQUE_EPUISE',
        'STOCK_FAIBLE', 'STOCK_CRITIQUE', 'ACHAT_REQUIS_AVANT_EXPIRATION'
    )),
    priorite VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priorite IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    titre VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    est_lue BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pour les bases où la table existait déjà avant l'ajout de "reference"/types stock
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference VARCHAR(255);
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'EXPIRATION_PROCHE', 'EXPIREE', 'PRESQUE_EPUISEE', 'PRODUIT_PRESQUE_EPUISE',
    'STOCK_FAIBLE', 'STOCK_CRITIQUE', 'ACHAT_REQUIS_AVANT_EXPIRATION'
));

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, est_lue) WHERE est_lue = false;
CREATE INDEX IF NOT EXISTS idx_notifications_autorisation ON notifications(autorisation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

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
