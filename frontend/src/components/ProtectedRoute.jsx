import React from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import LoginRequiredModal from './LoginRequiredModal.jsx';

const ProtectedRoute = ({ children, featureName = "this feature" }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    // Minimal short loading state during initial auth resolution. No large text.
    return (
      <div className="flex h-screen w-full items-center justify-center p-8 bg-[radial-gradient(circle_at_top_left,_#fff9ef_0%,_#f7f1e7_44%,_#f0eadf_100%)]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) {
    // Render the Login Required screen inline to block navigation and initialization
    // without redirecting away from the intended route.
    return <LoginRequiredModal featureName={featureName} />;
  }

  return children;
};

export default ProtectedRoute;
