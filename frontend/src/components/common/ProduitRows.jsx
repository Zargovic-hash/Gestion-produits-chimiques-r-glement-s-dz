import Button from './Button';

const UNITES = ['L', 'mL', 'kg', 'g', 't', 'unite'];

const emptyProduit = (showQuantite) => ({
  product_code: '',
  designation_technique: '',
  numero_onu: '',
  numero_cas: '',
  numero_cee: '',
  designation_chimique: '',
  autre_designation: '',
  unite: 'L',
  departement: '',
  ...(showQuantite ? { quantite_autorisee: '' } : {}),
});

export default function ProduitRows({ produits, setProduits, showQuantite = false }) {
  const update = (index, field, value) => {
    const next = [...produits];
    next[index] = { ...next[index], [field]: value };
    setProduits(next);
  };

  const addRow = () => setProduits([...produits, emptyProduit(showQuantite)]);
  const removeRow = (index) => setProduits(produits.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      {produits.map((p, i) => (
        <div key={i} className="border border-gray-200 rounded-md p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <input
            placeholder="Product ID *"
            required
            value={p.product_code}
            onChange={(e) => update(i, 'product_code', e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Désignation technique *"
            required
            value={p.designation_technique}
            onChange={(e) => update(i, 'designation_technique', e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm md:col-span-2"
          />
          <select
            required
            value={p.unite}
            onChange={(e) => update(i, 'unite', e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            {UNITES.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <input
            placeholder="N° ONU"
            value={p.numero_onu}
            onChange={(e) => update(i, 'numero_onu', e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            placeholder="N° CAS"
            value={p.numero_cas}
            onChange={(e) => update(i, 'numero_cas', e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Département *"
            required
            value={p.departement}
            onChange={(e) => update(i, 'departement', e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          {showQuantite && (
            <input
              type="number"
              step="0.001"
              min="0.001"
              placeholder="Quantité autorisée *"
              required
              value={p.quantite_autorisee}
              onChange={(e) => update(i, 'quantite_autorisee', e.target.value)}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          )}
          <input
            placeholder="Désignation chimique"
            value={p.designation_chimique}
            onChange={(e) => update(i, 'designation_chimique', e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm md:col-span-2"
          />
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="text-xs text-red-600 hover:underline text-left"
          >
            Retirer ce produit
          </button>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={addRow}>
        + Ajouter un produit
      </Button>
    </div>
  );
}

export { emptyProduit };
