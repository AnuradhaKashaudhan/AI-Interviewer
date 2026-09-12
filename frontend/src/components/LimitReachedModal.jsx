import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LimitReachedModal = ({ featureName, used, limit, onClose }) => {
  const navigate = useNavigate();

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
        <button 
          type="button" 
          onClick={onClose} 
          className="absolute top-4 right-4 rounded-full border border-stone-200 p-2 text-slate-500 transition hover:bg-stone-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4 pt-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-700 mb-2">
            <AlertTriangle className="h-8 w-8" />
          </div>
          
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Limit Reached
          </h2>
          
          <p className="text-sm text-slate-600 px-4 leading-relaxed">
            You've used all {limit} {featureName} included in the Free plan. Upgrade to Pro for increased limits.
          </p>

          <div className="flex w-full flex-col gap-3 pt-6">
            <button
              onClick={() => {
                onClose();
                navigate(`/upgrade?plan=pro`);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#16324f] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0f2438]"
            >
              Upgrade to Pro
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LimitReachedModal;
