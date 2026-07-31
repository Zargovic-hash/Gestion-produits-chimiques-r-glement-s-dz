const STYLES = {
  NON_ACQUIS: 'bg-gray-100 text-gray-600',
  ACQUIS: 'bg-blue-100 text-blue-800',
  ACQUISITION_PARTIELLE: 'bg-amber-100 text-amber-800',
  ACQUISITION_CRITIQUE: 'bg-red-100 text-red-800',
  ACQUIS_COMPLET: 'bg-emerald-100 text-emerald-800',
};

const LABELS = {
  NON_ACQUIS: 'Non acquis',
  ACQUIS: 'Acquis',
  ACQUISITION_PARTIELLE: 'Acquisition Partielle',
  ACQUISITION_CRITIQUE: 'Acquisition Critique',
  ACQUIS_COMPLET: 'Acquis Complet',
};

export default function EtatProduitBadge({ etat }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        STYLES[etat] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {LABELS[etat] || etat}
    </span>
  );
}
