import React from 'react';
import { motion } from 'framer-motion';
import { Lock, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const LoginRequiredModal = ({ featureName, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // If this modal is rendered inline by ProtectedRoute, onClose will be undefined.
  // In that case, we don't show the close button because we are blocking the page.
  // We'll capture the intended destination from the current URL if rendered via ProtectedRoute,
  // or use the current URL if rendered as an overlay in AppShell/Dashboard.
  const returnPath = location.pathname + location.search;

  return (
    <div 
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 20, scale: 0.98, opacity: 0 }}
        className="w-full max-w-md rounded-[28px] border border-stone-200 bg-white p-6 shadow-2xl relative"
        onClick={(event) => event.stopPropagation()}
      >
        {onClose && (
          <button 
            type="button" 
            onClick={onClose} 
            className="absolute top-4 right-4 rounded-full border border-stone-200 p-2 text-slate-500 transition hover:bg-stone-50"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="flex flex-col items-center text-center space-y-4 pt-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-2">
            <Lock className="h-8 w-8" />
          </div>
          
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Login Required
          </h2>
          
          <p className="text-sm text-slate-600 px-4">
            Please log in to access <span className="font-semibold text-slate-900">{featureName}</span>.
          </p>

          <div className="flex w-full flex-col gap-3 pt-6">
            <button
              onClick={() => navigate(`/login?redirect=${encodeURIComponent(returnPath)}`)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#16324f] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0f2438]"
            >
              Log In
            </button>
            <button
              onClick={() => navigate(`/signup?redirect=${encodeURIComponent(returnPath)}`)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-stone-50"
            >
              Create Account
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginRequiredModal;
