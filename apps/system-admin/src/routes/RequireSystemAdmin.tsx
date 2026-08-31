import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';

export function RequireSystemAdmin() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="p-8 text-sm text-muted">Loading…</div>;
  }
  if (!user || user.role !== 'SYSTEM_ADMIN') {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
