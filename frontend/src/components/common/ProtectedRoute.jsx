import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RoleGuard({ roles, children }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return (
      <div className="text-center py-16 text-gray-500">
        Accès refusé — cette page nécessite le rôle : {roles.join(' ou ')}
      </div>
    );
  }
  return children;
}
