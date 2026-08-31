import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import type { UserRole } from '@nabta/types';

export function RequireAuth({ roles }: { roles?: UserRole[] }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="p-8 text-sm text-muted">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
