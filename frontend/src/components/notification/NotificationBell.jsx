import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../api/notification.api';

const PRIORITY_DOT = {
  LOW: 'bg-gray-400',
  MEDIUM: 'bg-blue-400',
  HIGH: 'bg-amber-500',
  CRITICAL: 'bg-red-500',
};

const POLL_INTERVAL_MS = 60 * 1000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [nonLues, setNonLues] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  const load = () => {
    getNotifications().then((res) => {
      setNotifications(res.data);
      setNonLues(res.non_lues);
    });
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = async (n) => {
    if (!n.est_lue) {
      await markNotificationRead(n.id);
      load();
    }
    if (n.autorisation_id) {
      navigate(`/autorisations/${n.autorisation_id}`);
      setOpen(false);
    }
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {nonLues > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-96 overflow-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Notifications</span>
            {nonLues > 0 && (
              <button onClick={handleMarkAll} className="text-xs text-primary-500 hover:underline">
                Tout marquer comme lu
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="px-3 py-6 text-sm text-gray-400 text-center">Aucune notification.</div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 flex gap-2 ${
                  n.est_lue ? 'opacity-60' : ''
                }`}
              >
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[n.priorite]}`} />
                <span>
                  <div className="text-sm font-medium text-gray-900">{n.titre}</div>
                  <div className="text-xs text-gray-500">{n.message}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(n.created_at).toLocaleString('fr-FR')}
                  </div>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
