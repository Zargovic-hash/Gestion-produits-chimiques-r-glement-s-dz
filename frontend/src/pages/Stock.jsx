import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStock, upsertSeuil } from '../api/stock.api';
import StatutStockBadge from '../components/common/StatutStockBadge';

export default function Stock() {
  const { user } = useAuth();
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);

  const [seuilEdit, setSeuilEdit] = useState(null);
  const [seuilValue, setSeuilValue] = useState('');

  const load = () => {
    setLoading(true);
    getStock().then((res) => setStock(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

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
    </div>
  );
}
