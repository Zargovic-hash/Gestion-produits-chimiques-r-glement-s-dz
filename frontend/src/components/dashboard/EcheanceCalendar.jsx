import { useState } from 'react';
import { Link } from 'react-router-dom';

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MOIS_LABEL = (date) => date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

const colorForJours = (jours) => {
  if (jours <= 7) return { dot: 'bg-red-500', ring: 'ring-red-200', text: 'text-red-700' };
  if (jours <= 30) return { dot: 'bg-orange-500', ring: 'ring-orange-200', text: 'text-orange-700' };
  if (jours <= 60) return { dot: 'bg-amber-400', ring: 'ring-amber-200', text: 'text-amber-700' };
  return { dot: 'bg-blue-400', ring: 'ring-blue-200', text: 'text-blue-700' };
};

function MonthGrid({ baseDate, eventsByDay }) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="flex-1 min-w-[240px]">
      <div className="text-sm font-semibold text-gray-700 capitalize mb-2">{MOIS_LABEL(baseDate)}</div>
      <div className="grid grid-cols-7 gap-1 text-[10px] text-gray-400 mb-1">
        {JOURS.map((j, i) => <div key={i} className="text-center">{j}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const events = eventsByDay[key] || [];
          const isToday = key === today.toISOString().split('T')[0];
          const colors = events.length > 0 ? colorForJours(events[0].jours_restants) : null;
          return (
            <div
              key={i}
              title={events.map((e) => `${e.numero_autorisation} (${e.jours_restants}j)`).join('\n')}
              className={`aspect-square rounded-md flex flex-col items-center justify-center text-[11px] relative
                ${isToday ? 'ring-2 ring-primary-400' : ''}
                ${events.length > 0 ? `${colors.ring} ring-1 font-semibold ${colors.text}` : 'text-gray-400'}`}
            >
              {d}
              {events.length > 0 && (
                <span className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${colors.dot}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EcheanceCalendar({ autorisations }) {
  const [offset, setOffset] = useState(0);

  const eventsByDay = {};
  autorisations.forEach((a) => {
    const key = new Date(a.date_echeance).toISOString().split('T')[0];
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(a);
  });

  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + offset);
  const next = new Date(base);
  next.setMonth(next.getMonth() + 1);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Calendrier des échéances</h2>
        <div className="flex gap-1">
          <button onClick={() => setOffset((o) => o - 1)} className="text-xs px-2 py-1 rounded hover:bg-gray-100 text-gray-500">‹</button>
          <button onClick={() => setOffset(0)} className="text-xs px-2 py-1 rounded hover:bg-gray-100 text-gray-500">Aujourd'hui</button>
          <button onClick={() => setOffset((o) => o + 1)} className="text-xs px-2 py-1 rounded hover:bg-gray-100 text-gray-500">›</button>
        </div>
      </div>
      <div className="flex gap-6 flex-wrap">
        <MonthGrid baseDate={base} eventsByDay={eventsByDay} />
        <MonthGrid baseDate={next} eventsByDay={eventsByDay} />
      </div>
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> ≤ 7 jours</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> ≤ 30 jours</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> ≤ 60 jours</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> ≤ 90 jours</span>
      </div>
    </div>
  );
}
