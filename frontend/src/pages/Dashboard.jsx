import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
  RadialBarChart, RadialBar,
} from 'recharts';
import { getDashboard } from '../api/dashboard.api';
import EcheanceCalendar from '../components/dashboard/EcheanceCalendar';
import DecisionList from '../components/dashboard/DecisionList';

const STAT_CARDS = [
  { key: 'ACTIVE', label: 'Actives' },
  { key: 'PRESQUE_EPUISEE', label: 'Presque Épuisées' },
  { key: 'PRESQUE_EXPIREE', label: 'Presque Expirées' },
  { key: 'EPUISEE', label: 'Épuisées' },
  { key: 'EXPIREE', label: 'Expirées' },
];

const ETAT_COLORS = {
  ACTIVE: '#10b981',
  PRESQUE_EPUISEE: '#f59e0b',
  EPUISEE: '#f97316',
  PRESQUE_EXPIREE: '#eab308',
  EXPIREE: '#ef4444',
};

const ETAT_LABELS = {
  ACTIVE: 'Active',
  PRESQUE_EPUISEE: 'Presque Épuisée',
  EPUISEE: 'Épuisée',
  PRESQUE_EXPIREE: 'Presque Expirée',
  EXPIREE: 'Expirée',
};

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

  const pieData = Object.entries(data.par_etat)
    .filter(([, count]) => count > 0)
    .map(([etat, count]) => ({ name: ETAT_LABELS[etat], value: count, etat }));

  const gaugeData = [{ name: 'Moyenne', value: data.moyenne_pourcentage_acquis, fill: '#001965' }];

  const aRenouvelerCount = data.autorisations_liste.filter((a) => a.jours_restants <= 30).length;
  const achatRequisCount = data.autorisations_liste.filter(
    (a) => a.jours_restants <= 60 && parseFloat(a.pourcentage_acquis) < 100
  ).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>

      {/* KPI decisionnels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">Autorisations actives</div>
          <div className="text-2xl font-bold text-gray-900">{data.par_etat.ACTIVE + data.par_etat.PRESQUE_EPUISEE + data.par_etat.PRESQUE_EXPIREE}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">À renouveler (≤ 30j)</div>
          <div className={`text-2xl font-bold ${aRenouvelerCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{aRenouvelerCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">Achats à finaliser</div>
          <div className={`text-2xl font-bold ${achatRequisCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{achatRequisCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">Stock en alerte</div>
          <div className={`text-2xl font-bold ${data.stock_critique.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>{data.stock_critique.length}</div>
        </div>
      </div>

      {/* Vue décisionnelle : calendrier + actions prioritaires */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <EcheanceCalendar autorisations={data.autorisations_liste} />
        </div>
        <div>
          <DecisionList autorisations={data.autorisations_liste} stockCritique={data.stock_critique} />
        </div>
      </div>

      {/* Statistiques (support à la décision de second niveau) */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Statistiques</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Répartition par état</h3>
            {pieData.length === 0 ? (
              <div className="text-sm text-gray-400 py-8 text-center">Aucune autorisation.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                    {pieData.map((entry) => (
                      <Cell key={entry.etat} fill={ETAT_COLORS[entry.etat]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              % moyen d'acquisition (autorisations non expirées)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={gaugeData}
                startAngle={180}
                endAngle={0}
                barSize={20}
              >
                <RadialBar dataKey="value" cornerRadius={10} background max={100} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="text-center -mt-16 text-3xl font-bold text-primary-500">
              {data.moyenne_pourcentage_acquis}%
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Évolution des achats (6 mois)</h3>
            {data.evolution_achats.length === 0 ? (
              <div className="text-sm text-gray-400 py-8 text-center">Aucun achat sur la période.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.evolution_achats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mois" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Line type="monotone" dataKey="nb_achats" stroke="#001965" strokeWidth={2} name="Nb achats" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Top 10 des produits les plus acquis</h2>
        {data.top_produits.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">Aucun achat enregistré.</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.top_produits} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="product_code" fontSize={10} angle={-40} textAnchor="end" interval={0} />
              <YAxis fontSize={10} />
              <Tooltip formatter={(value, name, props) => [`${value} ${props.payload.unite}`, 'Quantité']} />
              <Bar dataKey="quantite_totale" fill="#335daf" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Répartition détaillée</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {STAT_CARDS.map(({ key, label }) => (
            <div key={key} className="border border-gray-200 rounded-md p-3 text-center">
              <div className="text-lg font-bold text-gray-900">{data.par_etat[key] || 0}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {data.activite_recente && (
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
      )}
    </div>
  );
}
