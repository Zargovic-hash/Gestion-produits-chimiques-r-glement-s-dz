import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUtilisations, deleteUtilisation } from '../api/utilisation.api';

export default function UtilisationsList() {
  const { user } = useAuth();
  const [utilisations, setUtilisations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getUtilisations().then((res) => setUtilisations(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

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
          Pour déclarer une utilisation, ouvrez la page Stock puis cliquez sur « + Déclarer utilisation ».
        </p>
      </div>

      {loading ? (
        <div className="text-gray-500">Chargement...</div>
      ) : utilisations.length === 0 ? (
        <div className="text-gray-500">Aucune utilisation déclarée.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="px-4 py-2">Date</th>
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
