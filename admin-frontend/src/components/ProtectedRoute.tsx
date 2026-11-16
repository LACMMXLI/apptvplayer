import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="page-loading">Cargando…</div>;
  // Remember where the user was headed (e.g. a pairing link scanned from a
  // TV's QR code) so login can send them back there.
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}
