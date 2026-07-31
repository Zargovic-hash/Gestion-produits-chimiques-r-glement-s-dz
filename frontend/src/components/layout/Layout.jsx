import { useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';
import { useIdleLogout } from '../../hooks/useIdleLogout';
import NotificationBell from '../notification/NotificationBell';

const navItemClass = ({ isActive }) =>
  `block px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleIdle = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  useIdleLogout(handleIdle);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-gray-200">
          <h1 className="text-base font-bold text-primary-500 leading-tight">
            Gestion Produits Chimiques
          </h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/" end className={navItemClass}>Tableau de bord</NavLink>
          <NavLink to="/autorisations" className={navItemClass}>Autorisations</NavLink>
          <NavLink to="/achats" className={navItemClass}>Achats</NavLink>
          <NavLink to="/stock" className={navItemClass}>Stock</NavLink>
          <NavLink to="/utilisations" className={navItemClass}>Utilisations</NavLink>
          <NavLink to="/rapports" className={navItemClass}>Rapports</NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/canevas" className={navItemClass}>Canevas</NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/utilisateurs" className={navItemClass}>Utilisateurs</NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/audit" className={navItemClass}>Piste d'audit</NavLink>
          )}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <div className="text-sm font-medium text-gray-900">{user?.prenom} {user?.nom}</div>
          <div className="text-xs text-gray-500 mb-2">{ROLE_LABELS[user?.role]}</div>
          <button
            onClick={logout}
            className="text-xs text-red-600 hover:underline"
          >
            Se déconnecter
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="flex justify-end px-6 pt-4">
          <NotificationBell />
        </div>
        <div className="p-6 pt-2">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
