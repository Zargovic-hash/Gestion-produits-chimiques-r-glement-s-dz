const STYLES = {
  OK: 'bg-emerald-100 text-emerald-800',
  FAIBLE: 'bg-amber-100 text-amber-800',
  CRITIQUE: 'bg-red-100 text-red-800',
};

const LABELS = { OK: 'OK', FAIBLE: 'Faible', CRITIQUE: 'Critique' };

export default function StatutStockBadge({ statut }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        STYLES[statut] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {LABELS[statut] || statut}
    </span>
  );
}
