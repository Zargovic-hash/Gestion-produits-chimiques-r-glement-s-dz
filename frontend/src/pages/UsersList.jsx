import { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser } from '../api/user.api';
import { ROLE_LABELS } from '../context/AuthContext';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';

const ROLES = ['admin', 'responsable_stock', 'visiteur'];
const emptyForm = { email: '', password: '', nom: '', prenom: '', role: 'visiteur', departement: '' };

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    getUsers().then((res) => setUsers(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await createUser(form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (u) => {
    await updateUser(u.id, { is_active: !u.is_active });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
        <Button onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Annuler' : '+ Nouvel Utilisateur'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 grid grid-cols-2 gap-3">
          <Alert type="error">{error}</Alert>
          <input required placeholder="Email" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input required placeholder="Mot de passe (min. 8 caractères)" type="password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input required placeholder="Prénom" value={form.prenom}
            onChange={(e) => setForm({ ...form, prenom: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input required placeholder="Nom" value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <input placeholder="Département (optionnel)" value={form.departement}
            onChange={(e) => setForm({ ...form, departement: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <div className="col-span-2 flex justify-end">
            <Button type="submit" disabled={submitting}>{submitting ? 'Création...' : 'Créer'}</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-gray-500">Chargement...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Rôle</th>
                <th className="px-4 py-2">Département</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2">{u.prenom} {u.nom}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-2">{u.departement || '-'}</td>
                  <td className="px-4 py-2">
                    <span className={u.is_active ? 'text-emerald-600' : 'text-gray-400'}>
                      {u.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button onClick={() => toggleActive(u)} className="text-xs text-primary-500 hover:underline">
                      {u.is_active ? 'Désactiver' : 'Réactiver'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
