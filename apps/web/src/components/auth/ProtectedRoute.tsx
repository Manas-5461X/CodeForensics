import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Skeleton } from '../ui/LoadingSkeleton.js';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 select-none font-mono">
        <div className="w-full max-w-md p-6 bg-surface border border-border-subtle rounded-lg shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-border-subtle pb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-link animate-ping" />
            <span className="text-xs text-primary font-semibold tracking-wider uppercase">
              Verifying Session Integrity
            </span>
          </div>
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-full mt-4" />
          </div>
          <p className="text-[11px] text-primary-muted text-center pt-2">
            Restoring authenticated cryptographic token...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Preserve current attempted location so user can be returned after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
