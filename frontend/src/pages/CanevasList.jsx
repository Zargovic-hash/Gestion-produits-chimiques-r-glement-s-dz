import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCanevas } from '../api/canevas.api';
import Button from '../components/common/Button';

export default function CanevasList() {
  const [canevas, setCanevas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCanevas().then((res) => setCanevas(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Canevas</h1>
        <Link to="/canevas/nouveau">
          <Button>+ Nouveau Canevas</Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-gray-500">Chargement...</div>
      ) : canevas.length === 0 ? (
        <div className="text-gray-500">Aucun canevas pour le moment.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {canevas.map((c) => (
            <Link
              key={c.id}
              to={`/canevas/${c.id}`}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <h2 className="font-semibold text-gray-900">{c.nom}</h2>
                {c.is_default && (
                  <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">
                    Par défaut
                  </span>
                )}
              </div>
              {c.description && <p className="text-sm text-gray-500 mt-1">{c.description}</p>}
              <p className="text-xs text-gray-400 mt-3">{c.nombre_produits} produit(s)</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
