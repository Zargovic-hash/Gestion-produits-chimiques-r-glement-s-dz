import { useState } from 'react';
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

const cellInputClass = 'w-full border-0 bg-transparent px-2 py-1.5 text-sm focus:ring-2 focus:ring-inset focus:ring-primary-500 focus:outline-none';

function TableView({ produits, update, removeRow, addRow, showQuantite }) {
  return (
    <div className="border border-gray-200 rounded-md overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-left text-xs text-gray-500">
            <th className="px-2 py-2 border-b border-gray-200 min-w-[110px]">Product ID *</th>
            <th className="px-2 py-2 border-b border-gray-200 min-w-[180px]">Désignation technique *</th>
            <th className="px-2 py-2 border-b border-gray-200 min-w-[90px]">N° ONU</th>
            <th className="px-2 py-2 border-b border-gray-200 min-w-[90px]">N° CAS</th>
            <th className="px-2 py-2 border-b border-gray-200 min-w-[90px]">N° CEE</th>
            <th className="px-2 py-2 border-b border-gray-200 min-w-[160px]">Désignation chimique</th>
            <th className="px-2 py-2 border-b border-gray-200 min-w-[80px]">Unité *</th>
            <th className="px-2 py-2 border-b border-gray-200 min-w-[110px]">Département *</th>
            {showQuantite && <th className="px-2 py-2 border-b border-gray-200 min-w-[110px]">Qté Autorisée *</th>}
            <th className="px-2 py-2 border-b border-gray-200 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {produits.map((p, i) => (
            <tr key={i} className="even:bg-gray-50/50 hover:bg-primary-50/40">
              <td className="border-b border-gray-100">
                <input required value={p.product_code} onChange={(e) => update(i, 'product_code', e.target.value)} className={cellInputClass} />
              </td>
              <td className="border-b border-gray-100">
                <input required value={p.designation_technique} onChange={(e) => update(i, 'designation_technique', e.target.value)} className={cellInputClass} />
              </td>
              <td className="border-b border-gray-100">
                <input value={p.numero_onu} onChange={(e) => update(i, 'numero_onu', e.target.value)} className={cellInputClass} />
              </td>
              <td className="border-b border-gray-100">
                <input value={p.numero_cas} onChange={(e) => update(i, 'numero_cas', e.target.value)} className={cellInputClass} />
              </td>
              <td className="border-b border-gray-100">
                <input value={p.numero_cee} onChange={(e) => update(i, 'numero_cee', e.target.value)} className={cellInputClass} />
              </td>
              <td className="border-b border-gray-100">
                <input value={p.designation_chimique} onChange={(e) => update(i, 'designation_chimique', e.target.value)} className={cellInputClass} />
              </td>
              <td className="border-b border-gray-100">
                <select required value={p.unite} onChange={(e) => update(i, 'unite', e.target.value)} className={cellInputClass}>
                  {UNITES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </td>
              <td className="border-b border-gray-100">
                <input required value={p.departement} onChange={(e) => update(i, 'departement', e.target.value)} className={cellInputClass} />
              </td>
              {showQuantite && (
                <td className="border-b border-gray-100">
                  <input
                    type="number" step="0.001" min="0.001" required
                    value={p.quantite_autorisee}
                    onChange={(e) => update(i, 'quantite_autorisee', e.target.value)}
                    className={cellInputClass}
                  />
                </td>
              )}
              <td className="border-b border-gray-100 text-center">
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  title="Retirer cette ligne"
                  className="text-red-500 hover:text-red-700 text-lg leading-none px-1"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={addRow}
        className="w-full text-left px-2 py-2 text-xs text-primary-600 hover:bg-primary-50 border-t border-gray-200"
      >
        + Ajouter une ligne
      </button>
    </div>
  );
}

function CardsView({ produits, update, removeRow, addRow, showQuantite }) {
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

export default function ProduitRows({ produits, setProduits, showQuantite = false }) {
  const [vue, setVue] = useState('table'); // 'table' (par défaut) ou 'cartes'

  const update = (index, field, value) => {
    const next = [...produits];
    next[index] = { ...next[index], [field]: value };
    setProduits(next);
  };

  const addRow = () => setProduits([...produits, emptyProduit(showQuantite)]);
  const removeRow = (index) => setProduits(produits.filter((_, i) => i !== index));

  const viewProps = { produits, update, removeRow, addRow, showQuantite };

  return (
    <div className="space-y-2">
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => setVue('table')}
          className={`text-xs px-2.5 py-1 rounded-md ${vue === 'table' ? 'bg-primary-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          Vue tableau
        </button>
        <button
          type="button"
          onClick={() => setVue('cartes')}
          className={`text-xs px-2.5 py-1 rounded-md ${vue === 'cartes' ? 'bg-primary-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          Vue cartes
        </button>
      </div>
      {vue === 'table' ? <TableView {...viewProps} /> : <CardsView {...viewProps} />}
    </div>
  );
}

export { emptyProduit };
