import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCanevas } from '../api/canevas.api';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import ProduitRows, { emptyProduit } from '../components/common/ProduitRows';

export default function CanevasForm() {
  const navigate = useNavigate();
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [produits, setProduits] = useState([emptyProduit(false)]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !window.confirm(
        'Attention : une fois créé, ce Canevas ne pourra plus être modifié. Voulez-vous continuer ?'
      )
    ) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await createCanevas({ nom, description, produits });
      navigate(`/canevas/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Nouveau Canevas</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <Alert type="error">{error}</Alert>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom du canevas *</label>
          <input
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="ex : Canevas Laboratoire Chimie Organique"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Produits</label>
          <ProduitRows produits={produits} setProduits={setProduits} showQuantite={false} />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/canevas')}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Création...' : 'Sauvegarder le Canevas'}
          </Button>
        </div>
      </form>
    </div>
  );
}
