import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  downloadAutorisationsReport,
  downloadAchatsReport,
  downloadProduitsReport,
  downloadDepartementsReport,
} from '../api/report.api';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';

const ETATS = [
  { value: '', label: 'Tous' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PRESQUE_EPUISEE', label: 'Presque Épuisée' },
  { value: 'EPUISEE', label: 'Épuisée' },
  { value: 'PRESQUE_EXPIREE', label: 'Presque Expirée' },
  { value: 'EXPIREE', label: 'Expirée' },
];

function ReportCard({ title, description, children }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div>
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [loadingKey, setLoadingKey] = useState('');

  const [etat, setEtat] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  const runDownload = async (key, fn) => {
    setLoadingKey(key);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la génération du rapport');
    } finally {
      setLoadingKey('');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
      <Alert type="error">{error}</Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReportCard
          title="État des Autorisations"
          description="Toutes les autorisations avec leur état actuel, filtrable par état."
        >
          <select
            value={etat}
            onChange={(e) => setEtat(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {ETATS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={loadingKey === 'aut-pdf'}
              onClick={() => runDownload('aut-pdf', () => downloadAutorisationsReport({ etat, format: 'pdf' }))}
            >
              {loadingKey === 'aut-pdf' ? '...' : 'PDF'}
            </Button>
            <Button
              variant="secondary"
              disabled={loadingKey === 'aut-csv'}
              onClick={() => runDownload('aut-csv', () => downloadAutorisationsReport({ etat, format: 'csv' }))}
            >
              {loadingKey === 'aut-csv' ? '...' : 'CSV'}
            </Button>
          </div>
        </ReportCard>

        <ReportCard
          title="Historique des Achats"
          description="Liste détaillée des achats enregistrés, filtrable par période."
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
              placeholder="Date début"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)}
              placeholder="Date fin"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={loadingKey === 'ach-pdf'}
              onClick={() => runDownload('ach-pdf', () => downloadAchatsReport({ date_debut: dateDebut, date_fin: dateFin, format: 'pdf' }))}
            >
              {loadingKey === 'ach-pdf' ? '...' : 'PDF'}
            </Button>
            <Button
              variant="secondary"
              disabled={loadingKey === 'ach-csv'}
              onClick={() => runDownload('ach-csv', () => downloadAchatsReport({ date_debut: dateDebut, date_fin: dateFin, format: 'csv' }))}
            >
              {loadingKey === 'ach-csv' ? '...' : 'CSV'}
            </Button>
          </div>
        </ReportCard>

        <ReportCard
          title="Produits les Plus Acquis"
          description="Statistiques d'acquisition agrégées par produit, toutes autorisations confondues."
        >
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={loadingKey === 'prod-pdf'}
              onClick={() => runDownload('prod-pdf', () => downloadProduitsReport({ format: 'pdf' }))}
            >
              {loadingKey === 'prod-pdf' ? '...' : 'PDF'}
            </Button>
            <Button
              variant="secondary"
              disabled={loadingKey === 'prod-csv'}
              onClick={() => runDownload('prod-csv', () => downloadProduitsReport({ format: 'csv' }))}
            >
              {loadingKey === 'prod-csv' ? '...' : 'CSV'}
            </Button>
          </div>
        </ReportCard>

        {user.role !== 'responsable_stock' && (
          <ReportCard
            title="Performance par Département"
            description="Vue d'ensemble de l'activité d'acquisition par département."
          >
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={loadingKey === 'dep-pdf'}
                onClick={() => runDownload('dep-pdf', () => downloadDepartementsReport({ format: 'pdf' }))}
              >
                {loadingKey === 'dep-pdf' ? '...' : 'PDF'}
              </Button>
              <Button
                variant="secondary"
                disabled={loadingKey === 'dep-csv'}
                onClick={() => runDownload('dep-csv', () => downloadDepartementsReport({ format: 'csv' }))}
              >
                {loadingKey === 'dep-csv' ? '...' : 'CSV'}
              </Button>
            </div>
          </ReportCard>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Le rapport détaillé d'une autorisation spécifique est disponible depuis sa page de détail.
      </p>
    </div>
  );
}
