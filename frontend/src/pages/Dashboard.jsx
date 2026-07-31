import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../api/dashboard.api';
import EtatBadge from '../components/common/EtatBadge';

const STAT_CARDS = [
  { key: 'ACTIVE', label: 'Actives' },
  { key: 'PRESQUE_EPUISEE', label: 'Presque Épuisées' },
  { key: 'PRESQUE_EXPIREE', label: 'Presque Expirées' },
  { key: 'EPUISEE', label: 'Épuisées' },
  { key: 'EXPIREE', label: 'Expirées' },
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Chargement...</div>;
  if (!data) return <div className="text-gray-500">Aucune donnée disponible.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">Autorisations</div>
          <div className="text-2xl font-bold text-gray-900">{data.total_autorisations}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">Canevas</div>
          <div className="text-2xl font-bold text-gray-900">{data.total_canevas}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">Achats enregistrés</div>
          <div className="text-2xl font-bold text-gray-900">{data.total_achats}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">Alertes critiques</div>
          <div className="text-2xl font-bold text-red-600">{data.alertes_critiques.length}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Répartition par état</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {STAT_CARDS.map(({ key, label }) => (
            <div key={key} className="border border-gray-200 rounded-md p-3 text-center">
              <div className="text-lg font-bold text-gray-900">{data.par_etat[key] || 0}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {data.alertes_critiques.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Alertes actives</h2>
          <div className="space-y-2">
            {data.alertes_critiques.map((a) => (
              <Link
                key={a.id}
                to={`/autorisations/${a.id}`}
                className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 hover:bg-gray-50"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{a.numero_autorisation}</div>
                  <div className="text-xs text-gray-500">
                    {a.jours_restants} jour(s) restant(s) · {a.pourcentage_acquis}% acquis
                  </div>
                </div>
                <EtatBadge etat={a.etat} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Activité récente</h2>
        {data.activite_recente.length === 0 ? (
          <div className="text-sm text-gray-400">Aucun achat enregistré.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="py-2">Date</th>
                <th className="py-2">Produit</th>
                <th className="py-2">Quantité</th>
                <th className="py-2">Autorisation</th>
                <th className="py-2">Enregistré par</th>
              </tr>
            </thead>
            <tbody>
              {data.activite_recente.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2">{new Date(r.date_achat).toLocaleDateString('fr-FR')}</td>
                  <td className="py-2">{r.designation_technique}</td>
                  <td className="py-2">{r.quantite_acquise} {r.unite}</td>
                  <td className="py-2">{r.numero_autorisation}</td>
                  <td className="py-2">{r.prenom} {r.nom}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
