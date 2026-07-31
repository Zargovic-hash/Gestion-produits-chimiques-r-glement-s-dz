import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStock, upsertSeuil } from '../api/stock.api';
import { createUtilisation } from '../api/utilisation.api';
import StatutStockBadge from '../components/common/StatutStockBadge';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';

const emptyForm = { quantite_utilisee: '', date_utilisation: new Date().toISOString().split('T')[0], objectif: '', remarques: '' };

export default function Stock() {
  const { user } = useAuth();
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [utilForm, setUtilForm] = useState(null); // produit en cours de déclaration
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [seuilEdit, setSeuilEdit] = useState(null); // produit en cours d'édition de seuil
  const [seuilValue, setSeuilValue] = useState('');

  const canDeclarer = user.role === 'admin' || user.role === 'responsable_stock';

  const load = () => {
    setLoading(true);
    getStock().then((res) => setStock(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openUtilForm = (produit) => {
    setUtilForm(produit);
    setFormData(emptyForm);
    setError('');
    setSuccess('');
  };

  const handleUtilSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await createUtilisation({
        product_code: utilForm.product_code,
        departement: utilForm.departement,
        unite: utilForm.unite,
        ...formData,
      });
      setSuccess('Utilisation enregistrée avec succès.');
      setUtilForm(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

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
        Stock disponible = quantités acquises (achats) − quantités déclarées comme utilisées.
      </p>

      <Alert type="success">{success}</Alert>

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
                <th className="px-4 py-2">Acquis</th>
                <th className="px-4 py-2">Consommé</th>
                <th className="px-4 py-2">Disponible</th>
                <th className="px-4 py-2">Seuil min.</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2"></th>
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
                  <td className="px-4 py-2">
                    {canDeclarer && (
                      <button
                        onClick={() => openUtilForm(p)}
                        disabled={parseFloat(p.stock_disponible) <= 0}
                        className="text-primary-500 text-xs font-medium hover:underline disabled:text-gray-300 disabled:no-underline"
                      >
                        + Déclarer utilisation
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {utilForm && (
        <div className="bg-white rounded-lg shadow p-4 border-2 border-primary-100">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Déclarer une utilisation — {utilForm.designation_technique} ({utilForm.departement})
            {' '}<span className="text-gray-400 font-normal">(disponible : {utilForm.stock_disponible} {utilForm.unite})</span>
          </h2>
          <Alert type="error">{error}</Alert>
          <form onSubmit={handleUtilSubmit} className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Quantité utilisée *</label>
              <input
                type="number" step="0.001" min="0.001" required
                value={formData.quantite_utilisee}
                onChange={(e) => setFormData({ ...formData, quantite_utilisee: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date d'utilisation *</label>
              <input
                type="date" required
                value={formData.date_utilisation}
                onChange={(e) => setFormData({ ...formData, date_utilisation: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Objectif / Projet</label>
              <input
                value={formData.objectif}
                onChange={(e) => setFormData({ ...formData, objectif: e.target.value })}
                placeholder="ex : Synthèse expérience #12"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Remarques</label>
              <textarea
                value={formData.remarques}
                onChange={(e) => setFormData({ ...formData, remarques: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2 flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={() => setUtilForm(null)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Enregistrement...' : "Enregistrer l'utilisation"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
