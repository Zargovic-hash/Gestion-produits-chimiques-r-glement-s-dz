import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUtilisations, deleteUtilisation } from '../api/utilisation.api';
import { getAutorisations } from '../api/autorisation.api';

export default function UtilisationsList() {
  const { user } = useAuth();
  const [utilisations, setUtilisations] = useState([]);
  const [autorisations, setAutorisations] = useState([]);
  const [autorisationId, setAutorisationId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAutorisations().then((res) => setAutorisations(res.data));
  }, []);

  const load = () => {
    setLoading(true);
    getUtilisations(autorisationId ? { autorisation_id: autorisationId } : {})
      .then((res) => setUtilisations(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, [autorisationId]);

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette déclaration d\'utilisation ?')) return;
    await deleteUtilisation(id);
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historique des Utilisations</h1>
        <p className="text-sm text-gray-500">
          Pour déclarer une utilisation, ouvrez l'autorisation concernée puis cliquez sur « + Utilisation ».
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Filtrer par autorisation</label>
        <select
          value={autorisationId}
          onChange={(e) => setAutorisationId(e.target.value)}
          className="w-full md:w-80 rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Toutes les autorisations</option>
          {autorisations.map((a) => (
            <option key={a.id} value={a.id}>{a.numero_autorisation}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500">Chargement...</div>
      ) : utilisations.length === 0 ? (
        <div className="text-gray-500">Aucune utilisation déclarée{autorisationId ? ' pour cette autorisation' : ''}.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">N° Autorisation</th>
                <th className="px-4 py-2">Product ID</th>
                <th className="px-4 py-2">Département</th>
                <th className="px-4 py-2">Quantité</th>
                <th className="px-4 py-2">Objectif</th>
                <th className="px-4 py-2">Déclaré par</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {utilisations.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2">{new Date(u.date_utilisation).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2">
                    <Link to={`/autorisations/${u.autorisation_id}`} className="text-primary-500 hover:underline">
                      {u.numero_autorisation}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{u.product_code}</td>
                  <td className="px-4 py-2">{u.departement}</td>
                  <td className="px-4 py-2">{u.quantite_utilisee} {u.unite}</td>
                  <td className="px-4 py-2">{u.objectif || '-'}</td>
                  <td className="px-4 py-2">{u.nom ? `${u.prenom} ${u.nom}` : '-'}</td>
                  <td className="px-4 py-2">
                    {(user.role === 'admin' || u.declare_par === user.id) && (
                      <button onClick={() => handleDelete(u.id)} className="text-xs text-red-600 hover:underline">
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
