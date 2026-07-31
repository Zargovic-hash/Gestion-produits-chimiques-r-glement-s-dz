export default function ProgressBar({ pourcentage }) {
  const pct = Math.min(100, Math.max(0, parseFloat(pourcentage) || 0));
  let colorClass = 'bg-emerald-500';
  if (pct >= 100) colorClass = 'bg-red-500';
  else if (pct >= 80) colorClass = 'bg-orange-500';
  else if (pct >= 50) colorClass = 'bg-amber-500';

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1 text-gray-500">
        <span>Acquis</span>
        <span className="font-semibold text-gray-700">{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div className={`h-full ${colorClass} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
