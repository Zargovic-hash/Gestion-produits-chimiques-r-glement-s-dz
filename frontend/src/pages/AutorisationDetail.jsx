import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAutorisationById, deleteAutorisation, updateAutorisation } from '../api/autorisation.api';
import { createAchat, deleteAchat } from '../api/achat.api';
import { downloadAutorisationDetailReport } from '../api/report.api';
import { useAuth } from '../context/AuthContext';
import EtatBadge from '../components/common/EtatBadge';
import ProgressBar from '../components/common/ProgressBar';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';

export default function AutorisationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [autorisation, setAutorisation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [achatForm, setAchatForm] = useState(null); // autorisation_produit_id being purchased
  const [formData, setFormData] = useState({ quantite_acquise: '', date_achat: '', fournisseur: '', numero_facture: '', remarques: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canAchat = user.role === 'admin' || user.role === 'responsable_stock';

  const load = () => {
    setLoading(true);
    getAutorisationById(id).then((res) => setAutorisation(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const openAchatForm = (produitId) => {
    setAchatForm(produitId);
    setFormData({ quantite_acquise: '', date_achat: new Date().toISOString().split('T')[0], fournisseur: '', numero_facture: '', remarques: '' });
    setError('');
    setSuccess('');
  };

  const handleAchatSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await createAchat({ autorisation_produit_id: achatForm, ...formData });
      setSuccess('Achat enregistré avec succès.');
      setAchatForm(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette autorisation et tous ses achats associés ?')) return;
    await deleteAutorisation(id);
    navigate('/autorisations');
  };

  const handleArchive = async () => {
    if (!window.confirm('Archiver cette autorisation expirée ?')) return;
    await updateAutorisation(id, { is_archived: true });
    navigate('/autorisations');
  };

  const handleDeleteAchat = async (achatId) => {
    if (!window.confirm('Supprimer cet achat ? Les quantités seront recalculées.')) return;
    await deleteAchat(achatId);
    load();
  };

  if (loading) return <div className="text-gray-500">Chargement...</div>;
  if (!autorisation) return <div className="text-gray-500">Autorisation introuvable.</div>;

  const produitEnCours = autorisation.produits.find((p) => p.id === achatForm);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{autorisation.numero_autorisation}</h1>
            <EtatBadge etat={autorisation.etat} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Délivrance : {new Date(autorisation.date_delivrance).toLocaleDateString('fr-FR')} ·
            {' '}Échéance : {new Date(autorisation.date_echeance).toLocaleDateString('fr-FR')} ·
            {' '}{autorisation.jours_restants} jour(s) restant(s) · {autorisation.type_marche}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => downloadAutorisationDetailReport(id)}>
            Télécharger le rapport (PDF)
          </Button>
          {user.role === 'admin' && (
            <>
              {autorisation.etat === 'EXPIREE' && !autorisation.is_archived && (
                <Button variant="secondary" onClick={handleArchive}>Archiver</Button>
              )}
              <Button variant="danger" onClick={handleDelete}>Supprimer</Button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <ProgressBar pourcentage={autorisation.pourcentage_acquis} />
      </div>

      <Alert type="success">{success}</Alert>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
              <th className="px-4 py-2">Product ID</th>
              <th className="px-4 py-2">Désignation</th>
              <th className="px-4 py-2">Qté Autorisée</th>
              <th className="px-4 py-2">Qté Acquise</th>
              <th className="px-4 py-2">Reste</th>
              <th className="px-4 py-2">% Acquis</th>
              {canAchat && <th className="px-4 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {autorisation.produits.map((p) => (
              <tr key={p.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2 font-mono text-xs">{p.product_code}</td>
                <td className="px-4 py-2">{p.designation_technique}</td>
                <td className="px-4 py-2">{p.quantite_autorisee} {p.unite}</td>
                <td className="px-4 py-2">{p.quantite_acquise} {p.unite}</td>
                <td className="px-4 py-2">{p.reste_a_acquerir} {p.unite}</td>
                <td className="px-4 py-2">{p.pourcentage_acquis}%</td>
                {canAchat && (
                  <td className="px-4 py-2">
                    <button
                      onClick={() => openAchatForm(p.id)}
                      disabled={autorisation.etat === 'EXPIREE' || parseFloat(p.reste_a_acquerir) <= 0}
                      className="text-primary-500 text-xs font-medium hover:underline disabled:text-gray-300 disabled:no-underline"
                    >
                      + Nouvel Achat
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {achatForm && produitEnCours && (
        <div className="bg-white rounded-lg shadow p-4 border-2 border-primary-100">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Enregistrer un achat — {produitEnCours.designation_technique}
            {' '}<span className="text-gray-400 font-normal">(reste disponible : {produitEnCours.reste_a_acquerir} {produitEnCours.unite})</span>
          </h2>
          <Alert type="error">{error}</Alert>
          <form onSubmit={handleAchatSubmit} className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Quantité acquise *</label>
              <input
                type="number" step="0.001" min="0.001" required
                value={formData.quantite_acquise}
                onChange={(e) => setFormData({ ...formData, quantite_acquise: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date d'achat *</label>
              <input
                type="date" required
                value={formData.date_achat}
                onChange={(e) => setFormData({ ...formData, date_achat: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fournisseur *</label>
              <input
                required
                value={formData.fournisseur}
                onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">N° Facture *</label>
              <input
                required
                value={formData.numero_facture}
                onChange={(e) => setFormData({ ...formData, numero_facture: e.target.value })}
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
              <Button type="button" variant="secondary" onClick={() => setAchatForm(null)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Enregistrement...' : "Enregistrer l'Achat"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <h2 className="text-sm font-semibold text-gray-700 px-4 pt-4">Historique des achats</h2>
        {autorisation.achats.length === 0 ? (
          <div className="px-4 py-4 text-sm text-gray-400">Aucun achat enregistré.</div>
        ) : (
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Produit</th>
                <th className="px-4 py-2">Quantité</th>
                <th className="px-4 py-2">Fournisseur</th>
                <th className="px-4 py-2">N° Facture</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {autorisation.achats.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2">{new Date(a.date_achat).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2">{a.designation_technique}</td>
                  <td className="px-4 py-2">{a.quantite_acquise} {a.unite}</td>
                  <td className="px-4 py-2">{a.fournisseur}</td>
                  <td className="px-4 py-2">{a.numero_facture}</td>
                  <td className="px-4 py-2">
                    {(user.role === 'admin' || a.enregistre_par === user.id) && (
                      <button
                        onClick={() => handleDeleteAchat(a.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
