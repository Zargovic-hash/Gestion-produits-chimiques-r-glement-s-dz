import { useEffect, useState } from 'react';
import { getAuditLogs } from '../api/audit.api';

const ACTION_STYLES = {
  CREATE: 'bg-emerald-100 text-emerald-800',
  UPDATE: 'bg-amber-100 text-amber-800',
  DELETE: 'bg-red-100 text-red-800',
};

const ENTITE_LABELS = {
  canevas: 'Canevas',
  autorisation: 'Autorisation',
  achat: 'Achat',
  utilisateur: 'Utilisateur',
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLogs().then((res) => setLogs(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Piste d'audit</h1>
      <p className="text-sm text-gray-500">
        Historique des créations, modifications et suppressions (200 dernières actions).
      </p>

      {loading ? (
        <div className="text-gray-500">Chargement...</div>
      ) : logs.length === 0 ? (
        <div className="text-gray-500">Aucune action enregistrée.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Utilisateur</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Entité</th>
                <th className="px-4 py-2">Détails</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(log.created_at).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-2">{log.nom ? `${log.prenom} ${log.nom}` : '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLES[log.action]}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2">{ENTITE_LABELS[log.entite] || log.entite}</td>
                  <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details) : '-'}
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
