import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAutorisations } from '../api/autorisation.api';
import { useAuth } from '../context/AuthContext';
import EtatBadge from '../components/common/EtatBadge';
import ProgressBar from '../components/common/ProgressBar';
import Button from '../components/common/Button';

const ETAT_FILTERS = [
  { value: '', label: 'Tous les états' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PRESQUE_EPUISEE', label: 'Presque Épuisée' },
  { value: 'EPUISEE', label: 'Épuisée' },
  { value: 'PRESQUE_EXPIREE', label: 'Presque Expirée' },
  { value: 'EXPIREE', label: 'Expirée' },
];

export default function AutorisationsList() {
  const { user } = useAuth();
  const [autorisations, setAutorisations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [etatFilter, setEtatFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    getAutorisations(etatFilter ? { etat: etatFilter } : {})
      .then((res) => setAutorisations(res.data))
      .finally(() => setLoading(false));
  }, [etatFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Autorisations</h1>
        <div className="flex items-center gap-3">
          <select
            value={etatFilter}
            onChange={(e) => setEtatFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {ETAT_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          {user.role === 'admin' && (
            <Link to="/autorisations/nouveau">
              <Button>+ Nouvelle Autorisation</Button>
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Chargement...</div>
      ) : autorisations.length === 0 ? (
        <div className="text-gray-500">Aucune autorisation trouvée.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {autorisations.map((a) => (
            <Link
              key={a.id}
              to={`/autorisations/${a.id}`}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{a.numero_autorisation}</h2>
                  <p className="text-xs text-gray-500">
                    Échéance : {new Date(a.date_echeance).toLocaleDateString('fr-FR')} · {a.jours_restants} j restants
                  </p>
                </div>
                <EtatBadge etat={a.etat} />
              </div>
              <ProgressBar pourcentage={a.pourcentage_acquis} />
              <p className="text-xs text-gray-400">{a.nombre_achats} achat(s) enregistré(s)</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
