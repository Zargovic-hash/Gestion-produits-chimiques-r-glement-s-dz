import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCanevas, getCanevasById } from '../api/canevas.api';
import { createAutorisation } from '../api/autorisation.api';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import ProduitRows, { emptyProduit } from '../components/common/ProduitRows';

export default function AutorisationForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCanevas = searchParams.get('canevas') || '';

  const [canevasList, setCanevasList] = useState([]);
  const [canevasId, setCanevasId] = useState(preselectedCanevas);
  const [numero, setNumero] = useState('');
  const [dateDelivrance, setDateDelivrance] = useState('');
  const [duree, setDuree] = useState(180);
  const [typeMarche, setTypeMarche] = useState('Local');
  const [notes, setNotes] = useState('');
  const [produits, setProduits] = useState([emptyProduit(true)]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCanevas().then((res) => setCanevasList(res.data));
  }, []);

  useEffect(() => {
    if (!canevasId) return;
    getCanevasById(canevasId).then((res) => {
      setProduits(
        res.data.produits.map((p) => ({
          product_code: p.product_code,
          designation_technique: p.designation_technique,
          numero_onu: p.numero_onu || '',
          numero_cas: p.numero_cas || '',
          numero_cee: p.numero_cee || '',
          designation_chimique: p.designation_chimique || '',
          autre_designation: p.autre_designation || '',
          unite: p.unite,
          departement: p.departement,
          quantite_autorisee: '',
        }))
      );
    });
  }, [canevasId]);

  const dateEcheance = (() => {
    if (!dateDelivrance || !duree) return null;
    const d = new Date(dateDelivrance);
    d.setDate(d.getDate() + parseInt(duree, 10));
    return d;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await createAutorisation({
        numero_autorisation: numero,
        date_delivrance: dateDelivrance,
        duree_validite_jours: parseInt(duree, 10),
        type_marche: typeMarche,
        canevas_id: canevasId || null,
        notes,
        produits,
      });
      navigate(`/autorisations/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Nouvelle Autorisation</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <Alert type="error">{error}</Alert>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Créer à partir d'un Canevas (recommandé)
          </label>
          <select
            value={canevasId}
            onChange={(e) => setCanevasId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">— Création manuelle —</option>
            {canevasList.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">N° Autorisation *</label>
            <input
              required
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="ex : AUT-2026-001"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de marché *</label>
            <select
              value={typeMarche}
              onChange={(e) => setTypeMarche(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="Local">Local</option>
              <option value="International">International</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de délivrance *</label>
            <input
              type="date"
              required
              value={dateDelivrance}
              onChange={(e) => setDateDelivrance(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durée de validité (jours) *</label>
            <select
              value={duree}
              onChange={(e) => setDuree(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value={180}>180 jours</option>
              <option value={365}>365 jours</option>
            </select>
          </div>
        </div>

        {dateEcheance && (
          <p className="text-sm text-gray-600">
            Date d'échéance calculée : <strong>{dateEcheance.toLocaleDateString('fr-FR')}</strong>
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Produits et quantités autorisées
          </label>
          <ProduitRows produits={produits} setProduits={setProduits} showQuantite />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/autorisations')}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Création...' : "Créer l'Autorisation"}
          </Button>
        </div>
      </form>
    </div>
  );
}
