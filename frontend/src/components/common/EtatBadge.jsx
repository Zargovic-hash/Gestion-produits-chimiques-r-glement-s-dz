const STYLES = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  PRESQUE_EPUISEE: 'bg-amber-100 text-amber-800',
  EPUISEE: 'bg-orange-100 text-orange-800',
  PRESQUE_EXPIREE: 'bg-amber-100 text-amber-800',
  EXPIREE: 'bg-red-100 text-red-800',
};

const LABELS = {
  ACTIVE: 'Active',
  PRESQUE_EPUISEE: 'Presque Épuisée',
  EPUISEE: 'Épuisée',
  PRESQUE_EXPIREE: 'Presque Expirée',
  EXPIREE: 'Expirée',
};

export default function EtatBadge({ etat }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        STYLES[etat] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {LABELS[etat] || etat}
    </span>
  );
}
