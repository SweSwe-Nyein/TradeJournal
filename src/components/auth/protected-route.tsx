import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/src/hooks/useAuth';
import { LineChart } from 'lucide-react';

export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-3">
        <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center animate-pulse">
          <LineChart className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-xs font-mono tracking-wider uppercase text-zinc-500">
          Authenticating session...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
