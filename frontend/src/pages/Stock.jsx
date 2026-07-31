import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStock, upsertSeuil } from '../api/stock.api';
import { getAutorisations, getAutorisationById } from '../api/autorisation.api';
import StatutStockBadge from '../components/common/StatutStockBadge';
import EtatProduitBadge from '../components/common/EtatProduitBadge';

export default function Stock() {
  const { user } = useAuth();
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);

  const [autorisations, setAutorisations] = useState([]);
  const [autorisationId, setAutorisationId] = useState('');
  const [autorisationDetail, setAutorisationDetail] = useState(null);
  const [loadingAutorisation, setLoadingAutorisation] = useState(false);

  const [seuilEdit, setSeuilEdit] = useState(null);
  const [seuilValue, setSeuilValue] = useState('');

  const load = () => {
    setLoading(true);
    getStock().then((res) => setStock(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    getAutorisations().then((res) => setAutorisations(res.data));
  }, []);

  useEffect(() => {
    if (!autorisationId) {
      setAutorisationDetail(null);
      return;
    }
    setLoadingAutorisation(true);
    getAutorisationById(autorisationId)
      .then((res) => setAutorisationDetail(res.data))
      .finally(() => setLoadingAutorisation(false));
  }, [autorisationId]);

  const openSeuilEdit = (produit) => {
    setSeuilEdit(produit);
    setSeuilValue(produit.stock_minimum);
  };

  const handleSeuilSave = async () => {
    await upsertSeuil({
      product_code: seuilEdit.product_code,
      departement: seuilEdit.departement,
      stock_minimum: parseFloat(seuilValue) || 0,
    });
    setSeuilEdit(null);
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Stock</h1>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Voir le stock d'une autorisation précise</label>
        <select
          value={autorisationId}
          onChange={(e) => setAutorisationId(e.target.value)}
          className="w-full md:w-80 rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Vue agrégée (toutes autorisations)</option>
          {autorisations.map((a) => (
            <option key={a.id} value={a.id}>{a.numero_autorisation}</option>
          ))}
        </select>
      </div>

      {autorisationId ? (
        <>
          <p className="text-sm text-gray-500">
            Stock des produits de l'autorisation {autorisationDetail?.numero_autorisation} uniquement.{' '}
            <Link to={`/autorisations/${autorisationId}`} className="text-primary-500 hover:underline">
              Voir la page complète de l'autorisation →
            </Link>
          </p>
          {loadingAutorisation ? (
            <div className="text-gray-500">Chargement...</div>
          ) : !autorisationDetail ? (
            <div className="text-gray-500">Autorisation introuvable.</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                    <th className="px-4 py-2">Product ID</th>
                    <th className="px-4 py-2">Désignation</th>
                    <th className="px-4 py-2">Qté Autorisée</th>
                    <th className="px-4 py-2">Qté Acquise</th>
                    <th className="px-4 py-2">Qté Utilisée</th>
                    <th className="px-4 py-2">Reste à Acquérir</th>
                    <th className="px-4 py-2">Stock disponible</th>
                    <th className="px-4 py-2">État Produit</th>
                  </tr>
                </thead>
                <tbody>
                  {autorisationDetail.produits.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2 font-mono text-xs">{p.product_code}</td>
                      <td className="px-4 py-2">{p.designation_technique}</td>
                      <td className="px-4 py-2">{p.quantite_autorisee} {p.unite}</td>
                      <td className="px-4 py-2">{p.quantite_acquise} {p.unite}</td>
                      <td className="px-4 py-2">{p.quantite_utilisee} {p.unite}</td>
                      <td className="px-4 py-2">{p.reste_a_acquerir} {p.unite}</td>
                      <td className="px-4 py-2 font-medium">{p.stock_disponible} {p.unite}</td>
                      <td className="px-4 py-2"><EtatProduitBadge etat={p.etat_produit} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Vue agrégée par produit / département, toutes autorisations confondues (Σ acquis − Σ utilisé).
            Pour déclarer un achat ou une utilisation, ouvrez l'autorisation concernée.
          </p>

          {loading ? (
            <div className="text-gray-500">Chargement...</div>
          ) : stock.length === 0 ? (
            <div className="text-gray-500">Aucun produit avec des achats enregistrés.</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                    <th className="px-4 py-2">Product ID</th>
                    <th className="px-4 py-2">Désignation</th>
                    <th className="px-4 py-2">Département</th>
                    <th className="px-4 py-2">Acquis (total)</th>
                    <th className="px-4 py-2">Consommé (total)</th>
                    <th className="px-4 py-2">Disponible</th>
                    <th className="px-4 py-2">Seuil min.</th>
                    <th className="px-4 py-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((p) => (
                    <tr key={`${p.product_code}-${p.departement}`} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2 font-mono text-xs">{p.product_code}</td>
                      <td className="px-4 py-2">{p.designation_technique}</td>
                      <td className="px-4 py-2">{p.departement}</td>
                      <td className="px-4 py-2">{p.quantite_acquise_totale} {p.unite}</td>
                      <td className="px-4 py-2">{p.quantite_consommee_totale} {p.unite}</td>
                      <td className="px-4 py-2 font-medium">{p.stock_disponible} {p.unite}</td>
                      <td className="px-4 py-2">
                        {user.role === 'admin' && seuilEdit?.product_code === p.product_code && seuilEdit?.departement === p.departement ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number" step="0.001" min="0" value={seuilValue}
                              onChange={(e) => setSeuilValue(e.target.value)}
                              className="w-20 rounded border border-gray-300 px-1.5 py-0.5 text-xs"
                            />
                            <button onClick={handleSeuilSave} className="text-xs text-primary-500 hover:underline">OK</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => user.role === 'admin' && openSeuilEdit(p)}
                            className={user.role === 'admin' ? 'hover:underline cursor-pointer' : ''}
                          >
                            {p.stock_minimum} {p.unite}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2"><StatutStockBadge statut={p.statut} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
