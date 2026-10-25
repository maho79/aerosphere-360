import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquarePlus } from 'lucide-react';

interface FeedbackButtonProps {
  onClick: () => void;
  className?: string;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({ onClick, className = '' }) => {
  const { i18n } = useTranslation();
  const isSk = i18n.language.startsWith('sk');

  return (
    <button
      onClick={onClick}
      data-help="feedback_button"
      className={`group flex items-center gap-1.5 px-3 py-2 rounded-2xl glass-panel-elevated border border-cyan-500/40 text-cyan-300 hover:text-white hover:border-cyan-400 bg-zinc-950/80 hover:bg-cyan-500/20 shadow-xl shadow-cyan-950/40 backdrop-blur-xl transition-all cursor-pointer active:scale-95 text-xs font-bold ${className}`}
      title={isSk ? 'Odoslať feedback / pripomienku autorovi' : 'Send feedback to the author'}
      aria-label="Send feedback"
    >
      <div className="w-5 h-5 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
        <MessageSquarePlus className="w-3.5 h-3.5" />
      </div>
      <span className="hidden sm:inline tracking-wide">
        {isSk ? 'Feedback' : 'Feedback'}
      </span>
    </button>
  );
};
