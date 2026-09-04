import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
        <span className="ml-3 text-sm font-medium text-slate-600">Verifying authentication...</span>
      </div>
    );
  }

  if (!user) {
    const destination = location.pathname + location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(destination)}`} replace />;
  }

  return children;
};

export default ProtectedRoute;
