import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Mail, Link as LinkIcon, MessageSquare, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { submitFeedback } from '../utils/feedback';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSubject?: string;
  defaultUrl?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  defaultSubject,
  defaultUrl,
}) => {
  const { t, i18n } = useTranslation();
  const isSk = i18n.language.startsWith('sk');

  const [subject, setSubject] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Update defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      const currentUrl = defaultUrl || window.location.href;
      setSubject(defaultSubject || currentUrl);
      setMessage('');
      setStatus('idle');
      setErrorMessage('');
    }
  }, [isOpen, defaultSubject, defaultUrl]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMessage(isSk ? 'Prosím zadajte text správy.' : 'Please enter your message.');
      return;
    }

    setIsSubmitting(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const currentUrl = defaultUrl || window.location.href;
      const res = await submitFeedback({
        subject: subject.trim() || currentUrl,
        email: email.trim(),
        message: message.trim(),
        url: currentUrl,
      });

      if (res.success) {
        setStatus('success');
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setStatus('error');
        setErrorMessage(res.error || (isSk ? 'Odoslanie zlyhalo.' : 'Submission failed.'));
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || (isSk ? 'Chyba pripojenia.' : 'Network error.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[4000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg glass-panel-elevated rounded-3xl border border-white/20 shadow-2xl p-5 sm:p-6 text-white animate-slide-up relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/60">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {isSk ? 'Poslať feedback / správu' : 'Send Feedback'}
              </h3>
              <p className="text-xs text-zinc-400">
                {isSk ? 'Správa dorazí priamo administrátorovi' : 'Message will be delivered to the author'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {status === 'success' ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-emerald-300">
              {isSk ? 'Feedback bol úspešne odoslaný!' : 'Feedback sent successfully!'}
            </h4>
            <p className="text-xs text-zinc-400 max-w-sm">
              {isSk
                ? 'Ďakujeme za spätnú väzbu. Správa bola odoslaná a uložená aj do administrátorskej zóny.'
                : 'Thank you for your feedback! It was delivered and logged in the admin console.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {status === 'error' && errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Subject (Pre-filled Link) */}
            <div>
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isSk ? 'Predmet / Link na stránku' : 'Subject / Page Link'}</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 font-mono transition-all"
              />
            </div>

            {/* Optional Email */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isSk ? 'Váš E-mail' : 'Your Email'}</span>
                </label>
                <span className="text-[10px] text-zinc-500">
                  {isSk ? '(nepovinné pre odpoveď)' : '(optional for reply)'}
                </span>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="meno@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition-all"
              />
            </div>

            {/* Feedback Message (Free text) */}
            <div>
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>{isSk ? 'Vaša správa / pripomienka' : 'Your Message / Feedback'} *</span>
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  isSk
                    ? 'Popíšte váš postreh, nápad na vylepšenie, chybu v zobrazení alebo otázku k panoráme...'
                    : 'Describe your idea, suggestion, issue, or question...'
                }
                className="w-full p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 resize-none transition-all leading-relaxed"
              />
            </div>

            {/* Submit button */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl glass-button text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
              >
                {isSk ? 'Zrušiť' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/60 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isSk ? 'Odosielam...' : 'Sending...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSk ? 'Odoslať feedback' : 'Send Feedback'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
