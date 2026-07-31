import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAchats } from '../api/achat.api';

export default function AchatsList() {
  const [achats, setAchats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAchats().then((res) => setAchats(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Historique des Achats</h1>
        <p className="text-sm text-gray-500">
          Pour enregistrer un achat, ouvrez une autorisation puis cliquez sur « + Nouvel Achat ».
        </p>
      </div>

      {loading ? (
        <div className="text-gray-500">Chargement...</div>
      ) : achats.length === 0 ? (
        <div className="text-gray-500">Aucun achat enregistré.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Autorisation</th>
                <th className="px-4 py-2">Produit</th>
                <th className="px-4 py-2">Département</th>
                <th className="px-4 py-2">Quantité</th>
                <th className="px-4 py-2">Fournisseur</th>
                <th className="px-4 py-2">N° Facture</th>
              </tr>
            </thead>
            <tbody>
              {achats.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2">{new Date(a.date_achat).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2">
                    <Link to={`/autorisations/${a.autorisation_id}`} className="text-primary-500 hover:underline">
                      {a.numero_autorisation}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{a.designation_technique}</td>
                  <td className="px-4 py-2">{a.departement}</td>
                  <td className="px-4 py-2">{a.quantite_acquise} {a.unite}</td>
                  <td className="px-4 py-2">{a.fournisseur}</td>
                  <td className="px-4 py-2">{a.numero_facture}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
