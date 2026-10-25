import React, { useEffect } from 'react';
import { CheckCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type?: 'success' | 'info';
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900/90 backdrop-blur-xl border border-cyan-500/30 text-white shadow-2xl shadow-cyan-950/40 animate-slide-up">
      {toast.type === 'info' ? (
        <Info className="w-5 h-5 text-cyan-400 shrink-0" />
      ) : (
        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
      )}
      <span className="text-sm font-medium pr-2">{toast.message}</span>
      <button
        onClick={onClose}
        className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
