import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, RoleGuard } from './components/common/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CanevasList from './pages/CanevasList';
import CanevasForm from './pages/CanevasForm';
import CanevasDetail from './pages/CanevasDetail';
import AutorisationsList from './pages/AutorisationsList';
import AutorisationForm from './pages/AutorisationForm';
import AutorisationDetail from './pages/AutorisationDetail';
import AchatsList from './pages/AchatsList';
import UsersList from './pages/UsersList';
import Reports from './pages/Reports';
import AuditLog from './pages/AuditLog';
import Stock from './pages/Stock';
import UtilisationsList from './pages/UtilisationsList';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/autorisations" element={<AutorisationsList />} />
              <Route
                path="/autorisations/nouveau"
                element={<RoleGuard roles={['admin']}><AutorisationForm /></RoleGuard>}
              />
              <Route path="/autorisations/:id" element={<AutorisationDetail />} />
              <Route path="/achats" element={<AchatsList />} />
              <Route path="/stock" element={<Stock />} />
              <Route path="/utilisations" element={<UtilisationsList />} />
              <Route path="/rapports" element={<Reports />} />
              <Route
                path="/canevas"
                element={<RoleGuard roles={['admin']}><CanevasList /></RoleGuard>}
              />
              <Route
                path="/canevas/nouveau"
                element={<RoleGuard roles={['admin']}><CanevasForm /></RoleGuard>}
              />
              <Route path="/canevas/:id" element={<RoleGuard roles={['admin']}><CanevasDetail /></RoleGuard>} />
              <Route
                path="/utilisateurs"
                element={<RoleGuard roles={['admin']}><UsersList /></RoleGuard>}
              />
              <Route
                path="/audit"
                element={<RoleGuard roles={['admin']}><AuditLog /></RoleGuard>}
              />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
