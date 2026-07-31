import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAutorisationById, deleteAutorisation, updateAutorisation } from '../api/autorisation.api';
import { createAchat, updateAchat, deleteAchat } from '../api/achat.api';
import { createUtilisation, updateUtilisation, deleteUtilisation } from '../api/utilisation.api';
import { downloadAutorisationDetailReport } from '../api/report.api';
import { useAuth } from '../context/AuthContext';
import EtatBadge from '../components/common/EtatBadge';
import EtatProduitBadge from '../components/common/EtatProduitBadge';
import ProgressBar from '../components/common/ProgressBar';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';

const emptyAchatForm = { quantite_acquise: '', date_achat: '', fournisseur: '', numero_facture: '', remarques: '' };
const emptyUtilForm = { quantite_utilisee: '', date_utilisation: '', objectif: '', remarques: '' };

export default function AutorisationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [autorisation, setAutorisation] = useState(null);
  const [loading, setLoading] = useState(true);

  const [achatForm, setAchatForm] = useState(null); // autorisation_produit_id being purchased
  const [achatData, setAchatData] = useState(emptyAchatForm);
  const [editingAchatId, setEditingAchatId] = useState(null); // null = creating, sinon = corrige cet achat

  const [utilForm, setUtilForm] = useState(null); // autorisation_produit_id being declared
  const [utilData, setUtilData] = useState(emptyUtilForm);
  const [editingUtilId, setEditingUtilId] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canAgir = user.role === 'admin' || user.role === 'responsable_stock';

  const load = () => {
    setLoading(true);
    getAutorisationById(id).then((res) => setAutorisation(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const openAchatForm = (produitId) => {
    setUtilForm(null);
    setEditingUtilId(null);
    setAchatForm(produitId);
    setEditingAchatId(null);
    setAchatData({ ...emptyAchatForm, date_achat: new Date().toISOString().split('T')[0] });
    setError('');
    setSuccess('');
  };

  const openAchatEdit = (achat) => {
    setUtilForm(null);
    setEditingUtilId(null);
    setAchatForm(achat.autorisation_produit_id);
    setEditingAchatId(achat.id);
    setAchatData({
      quantite_acquise: achat.quantite_acquise,
      date_achat: new Date(achat.date_achat).toISOString().split('T')[0],
      fournisseur: achat.fournisseur,
      numero_facture: achat.numero_facture,
      remarques: achat.remarques || '',
    });
    setError('');
    setSuccess('');
  };

  const openUtilForm = (produitId) => {
    setAchatForm(null);
    setEditingAchatId(null);
    setUtilForm(produitId);
    setEditingUtilId(null);
    setUtilData({ ...emptyUtilForm, date_utilisation: new Date().toISOString().split('T')[0] });
    setError('');
    setSuccess('');
  };

  const openUtilEdit = (utilisation) => {
    setAchatForm(null);
    setEditingAchatId(null);
    setUtilForm(utilisation.autorisation_produit_id);
    setEditingUtilId(utilisation.id);
    setUtilData({
      quantite_utilisee: utilisation.quantite_utilisee,
      date_utilisation: new Date(utilisation.date_utilisation).toISOString().split('T')[0],
      objectif: utilisation.objectif || '',
      remarques: utilisation.remarques || '',
    });
    setError('');
    setSuccess('');
  };

  const handleAchatSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editingAchatId) {
        await updateAchat(editingAchatId, achatData);
        setSuccess('Achat corrigé avec succès.');
      } else {
        await createAchat({ autorisation_produit_id: achatForm, ...achatData });
        setSuccess('Achat enregistré avec succès.');
      }
      setAchatForm(null);
      setEditingAchatId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUtilSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editingUtilId) {
        await updateUtilisation(editingUtilId, utilData);
        setSuccess('Utilisation corrigée avec succès.');
      } else {
        await createUtilisation({ autorisation_produit_id: utilForm, ...utilData });
        setSuccess('Utilisation enregistrée avec succès.');
      }
      setUtilForm(null);
      setEditingUtilId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette autorisation et tous ses achats/utilisations associés ?')) return;
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

  const handleDeleteUtil = async (utilId) => {
    if (!window.confirm('Supprimer cette utilisation ? Les quantités seront recalculées.')) return;
    await deleteUtilisation(utilId);
    load();
  };

  if (loading) return <div className="text-gray-500">Chargement...</div>;
  if (!autorisation) return <div className="text-gray-500">Autorisation introuvable.</div>;

  const produitAchat = autorisation.produits.find((p) => p.id === achatForm);
  const produitUtil = autorisation.produits.find((p) => p.id === utilForm);

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
              <th className="px-4 py-2">Qté Utilisée</th>
              <th className="px-4 py-2">Stock disponible</th>
              <th className="px-4 py-2">État Produit</th>
              {canAgir && <th className="px-4 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {autorisation.produits.map((p) => (
              <tr key={p.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2 font-mono text-xs">{p.product_code}</td>
                <td className="px-4 py-2">{p.designation_technique}</td>
                <td className="px-4 py-2">{p.quantite_autorisee} {p.unite}</td>
                <td className="px-4 py-2">{p.quantite_acquise} {p.unite}</td>
                <td className="px-4 py-2">{p.quantite_utilisee} {p.unite}</td>
                <td className="px-4 py-2 font-medium">{p.stock_disponible} {p.unite}</td>
                <td className="px-4 py-2"><EtatProduitBadge etat={p.etat_produit} /></td>
                {canAgir && (
                  <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => openAchatForm(p.id)}
                      disabled={autorisation.etat === 'EXPIREE' || parseFloat(p.reste_a_acquerir) <= 0}
                      className="text-primary-500 text-xs font-medium hover:underline disabled:text-gray-300 disabled:no-underline"
                    >
                      + Achat
                    </button>
                    <button
                      onClick={() => openUtilForm(p.id)}
                      disabled={parseFloat(p.stock_disponible) <= 0}
                      className="text-primary-500 text-xs font-medium hover:underline disabled:text-gray-300 disabled:no-underline"
                    >
                      + Utilisation
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {achatForm && produitAchat && (
        <div className="bg-white rounded-lg shadow p-4 border-2 border-primary-100">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            {editingAchatId ? 'Corriger un achat' : 'Enregistrer un achat'} — {produitAchat.designation_technique}
            {' '}<span className="text-gray-400 font-normal">(reste à acquérir : {produitAchat.reste_a_acquerir} {produitAchat.unite})</span>
          </h2>
          <Alert type="error">{error}</Alert>
          <form onSubmit={handleAchatSubmit} className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Quantité acquise *</label>
              <input
                type="number" step="0.001" min="0.001" required
                value={achatData.quantite_acquise}
                onChange={(e) => setAchatData({ ...achatData, quantite_acquise: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date d'achat *</label>
              <input
                type="date" required
                value={achatData.date_achat}
                onChange={(e) => setAchatData({ ...achatData, date_achat: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fournisseur *</label>
              <input
                required
                value={achatData.fournisseur}
                onChange={(e) => setAchatData({ ...achatData, fournisseur: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">N° Facture *</label>
              <input
                required
                value={achatData.numero_facture}
                onChange={(e) => setAchatData({ ...achatData, numero_facture: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Remarques</label>
              <textarea
                value={achatData.remarques}
                onChange={(e) => setAchatData({ ...achatData, remarques: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2 flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={() => { setAchatForm(null); setEditingAchatId(null); }}>Annuler</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Enregistrement...' : editingAchatId ? 'Corriger l\'Achat' : "Enregistrer l'Achat"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {utilForm && produitUtil && (
        <div className="bg-white rounded-lg shadow p-4 border-2 border-primary-100">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            {editingUtilId ? 'Corriger une utilisation' : 'Déclarer une utilisation'} — {produitUtil.designation_technique}
            {' '}<span className="text-gray-400 font-normal">(stock disponible : {produitUtil.stock_disponible} {produitUtil.unite})</span>
          </h2>
          <Alert type="error">{error}</Alert>
          <form onSubmit={handleUtilSubmit} className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Quantité utilisée *</label>
              <input
                type="number" step="0.001" min="0.001" required
                value={utilData.quantite_utilisee}
                onChange={(e) => setUtilData({ ...utilData, quantite_utilisee: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date d'utilisation *</label>
              <input
                type="date" required
                value={utilData.date_utilisation}
                onChange={(e) => setUtilData({ ...utilData, date_utilisation: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Objectif / Projet</label>
              <input
                value={utilData.objectif}
                onChange={(e) => setUtilData({ ...utilData, objectif: e.target.value })}
                placeholder="ex : Synthèse expérience #12"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Remarques</label>
              <textarea
                value={utilData.remarques}
                onChange={(e) => setUtilData({ ...utilData, remarques: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2 flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={() => { setUtilForm(null); setEditingUtilId(null); }}>Annuler</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Enregistrement...' : editingUtilId ? 'Corriger l\'Utilisation' : "Enregistrer l'Utilisation"}
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
                  <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                    {(user.role === 'admin' || a.enregistre_par === user.id) && (
                      <>
                        <button onClick={() => openAchatEdit(a)} className="text-xs text-primary-500 hover:underline">
                          Corriger
                        </button>
                        <button onClick={() => handleDeleteAchat(a.id)} className="text-xs text-red-600 hover:underline">
                          Supprimer
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <h2 className="text-sm font-semibold text-gray-700 px-4 pt-4">Historique des utilisations</h2>
        {autorisation.utilisations.length === 0 ? (
          <div className="px-4 py-4 text-sm text-gray-400">Aucune utilisation déclarée.</div>
        ) : (
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Produit</th>
                <th className="px-4 py-2">Quantité</th>
                <th className="px-4 py-2">Objectif</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {autorisation.utilisations.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2">{new Date(u.date_utilisation).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2">{u.designation_technique}</td>
                  <td className="px-4 py-2">{u.quantite_utilisee} {u.unite}</td>
                  <td className="px-4 py-2">{u.objectif || '-'}</td>
                  <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                    {(user.role === 'admin' || u.declare_par === user.id) && (
                      <>
                        <button onClick={() => openUtilEdit(u)} className="text-xs text-primary-500 hover:underline">
                          Corriger
                        </button>
                        <button onClick={() => handleDeleteUtil(u.id)} className="text-xs text-red-600 hover:underline">
                          Supprimer
                        </button>
                      </>
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
