import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCanevasById, duplicateCanevas, deleteCanevas } from '../api/canevas.api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';

export default function CanevasDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [canevas, setCanevas] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCanevasById(id).then((res) => setCanevas(res.data)).finally(() => setLoading(false));
  }, [id]);

  const handleDuplicate = async () => {
    const nom = window.prompt('Nom du nouveau canevas :', `${canevas.nom} (copie)`);
    if (!nom) return;
    const res = await duplicateCanevas(id, nom);
    navigate(`/canevas/${res.data.id}`);
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer définitivement ce canevas ?')) return;
    await deleteCanevas(id);
    navigate('/canevas');
  };

  if (loading) return <div className="text-gray-500">Chargement...</div>;
  if (!canevas) return <div className="text-gray-500">Canevas introuvable.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{canevas.nom}</h1>
          {canevas.description && <p className="text-sm text-gray-500">{canevas.description}</p>}
        </div>
        {user.role === 'admin' && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleDuplicate}>Dupliquer</Button>
            <Link to={`/autorisations/nouveau?canevas=${id}`}>
              <Button>Utiliser pour une autorisation</Button>
            </Link>
            {!canevas.is_default && (
              <Button variant="danger" onClick={handleDelete}>Supprimer</Button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
              <th className="px-4 py-2">Product ID</th>
              <th className="px-4 py-2">Désignation</th>
              <th className="px-4 py-2">N° ONU</th>
              <th className="px-4 py-2">Unité</th>
              <th className="px-4 py-2">Département</th>
            </tr>
          </thead>
          <tbody>
            {canevas.produits.map((p) => (
              <tr key={p.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2 font-mono text-xs">{p.product_code}</td>
                <td className="px-4 py-2">{p.designation_technique}</td>
                <td className="px-4 py-2">{p.numero_onu || '-'}</td>
                <td className="px-4 py-2">{p.unite}</td>
                <td className="px-4 py-2">{p.departement}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
