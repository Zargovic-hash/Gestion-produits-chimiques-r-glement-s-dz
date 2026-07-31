import { Link } from 'react-router-dom';

const ICONS = {
  renouveler: '⏳',
  achat: '🛒',
  rupture: '⛔',
  faible: '⚠️',
};

function ActionCard({ icon, title, subtitle, to, tone }) {
  const toneClass = {
    red: 'border-l-red-500',
    orange: 'border-l-orange-500',
    amber: 'border-l-amber-400',
  }[tone] || 'border-l-gray-300';

  const content = (
    <div className={`flex items-start gap-3 border-l-4 ${toneClass} bg-gray-50 rounded-r-md px-3 py-2.5 hover:bg-gray-100 transition-colors`}>
      <span className="text-lg leading-none mt-0.5">{icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">{title}</div>
        <div className="text-xs text-gray-500">{subtitle}</div>
      </div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

export default function DecisionList({ autorisations, stockCritique }) {
  const aRenouveler = autorisations
    .filter((a) => a.jours_restants <= 30)
    .sort((a, b) => a.jours_restants - b.jours_restants);

  const aFinaliserAchat = autorisations
    .filter((a) => a.jours_restants <= 60 && parseFloat(a.pourcentage_acquis) < 100)
    .sort((a, b) => a.jours_restants - b.jours_restants);

  const totalActions = aRenouveler.length + aFinaliserAchat.length + stockCritique.length;

  return (
    <div className="bg-white rounded-lg shadow p-4 h-full">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Décisions à prendre</h2>

      {totalActions === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">
          Rien d'urgent — tout est sous contrôle. 👍
        </div>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {aRenouveler.map((a) => (
            <ActionCard
              key={`ren-${a.id}`}
              icon={ICONS.renouveler}
              title={`Renouveler ${a.numero_autorisation}`}
              subtitle={`Expire dans ${a.jours_restants} jour(s) (le ${new Date(a.date_echeance).toLocaleDateString('fr-FR')})`}
              to={`/autorisations/${a.id}`}
              tone={a.jours_restants <= 7 ? 'red' : 'orange'}
            />
          ))}
          {aFinaliserAchat.map((a) => (
            <ActionCard
              key={`ach-${a.id}`}
              icon={ICONS.achat}
              title={`Finaliser les achats — ${a.numero_autorisation}`}
              subtitle={`${a.pourcentage_acquis}% acquis, expire dans ${a.jours_restants} jour(s)`}
              to={`/autorisations/${a.id}`}
              tone="amber"
            />
          ))}
          {stockCritique.map((s) => (
            <ActionCard
              key={`stock-${s.product_code}-${s.departement}`}
              icon={s.statut === 'CRITIQUE' ? ICONS.rupture : ICONS.faible}
              title={`${s.statut === 'CRITIQUE' ? 'Rupture de stock' : 'Stock faible'} — ${s.designation_technique}`}
              subtitle={`${s.departement} · ${s.stock_disponible} ${s.unite} disponible(s) (seuil : ${s.stock_minimum} ${s.unite})`}
              to="/stock"
              tone={s.statut === 'CRITIQUE' ? 'red' : 'amber'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
