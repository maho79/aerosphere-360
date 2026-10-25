import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  X,
  Send,
  Trash2,
  ShieldCheck,
  User,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react';
import type { Panorama, PanoramaComment } from '../types';
import {
  fetchPanoramaComments,
  postPanoramaComment,
  deletePanoramaComment,
  getStoredCommenterName,
} from '../utils/social';
import { useAdmin } from '../context/AdminContext';

interface CommentsDrawerProps {
  panorama: Panorama;
  isOpen: boolean;
  onClose: () => void;
  onCommentsCountChange?: (count: number) => void;
  onShowToast: (msg: string) => void;
}

export const CommentsDrawer: React.FC<CommentsDrawerProps> = ({
  panorama,
  isOpen,
  onClose,
  onCommentsCountChange,
  onShowToast,
}) => {
  const { t, i18n } = useTranslation();
  const { isAdmin, adminUser, setShowAdminModal } = useAdmin();
  const isSk = i18n.language.toLowerCase().startsWith('sk');

  const [comments, setComments] = useState<PanoramaComment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [author, setAuthor] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Initialize author name from admin session or stored nickname
  useEffect(() => {
    if (isAdmin && adminUser?.name) {
      setAuthor(adminUser.name);
    } else {
      const stored = getStoredCommenterName();
      if (stored) setAuthor(stored);
    }
  }, [isAdmin, adminUser]);

  // Load comments whenever drawer is opened or panorama changes
  useEffect(() => {
    if (!isOpen || !panorama) return;
    setLoading(true);
    fetchPanoramaComments(panorama.id)
      .then((data) => {
        setComments(data);
        if (onCommentsCountChange) onCommentsCountChange(data.length);
      })
      .finally(() => setLoading(false));
  }, [isOpen, panorama.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = text.trim();
    if (!cleanText) return;

    setSubmitting(true);
    const authorName = author.trim() || (isAdmin ? (adminUser?.name || 'Admin') : isSk ? 'Návštevník' : 'Visitor');
    const res = await postPanoramaComment(panorama.id, cleanText, authorName, isAdmin);
    setSubmitting(false);

    if (res.success && res.comments) {
      setComments(res.comments);
      setText('');
      if (onCommentsCountChange) onCommentsCountChange(res.comments.length);
      onShowToast(isSk ? 'Komentár bol úspešne pridaný! 💬' : 'Comment posted successfully! 💬');
    } else {
      onShowToast(res.error || (isSk ? 'Nepodarilo sa odoslať komentár.' : 'Failed to post comment.'));
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!isAdmin || !adminUser?.token) {
      setShowAdminModal(true);
      onShowToast('Vymazať komentár môže iba prihlásený administrátor.');
      return;
    }
    if (!confirm(isSk ? 'Naozaj chcete vymazať tento komentár?' : 'Are you sure you want to delete this comment?')) {
      return;
    }
    setDeletingId(commentId);
    const res = await deletePanoramaComment(panorama.id, commentId, adminUser.token);
    setDeletingId(null);

    if (res.success && res.comments) {
      setComments(res.comments);
      if (onCommentsCountChange) onCommentsCountChange(res.comments.length);
      onShowToast(isSk ? 'Komentár bol vymazaný.' : 'Comment deleted.');
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString(isSk ? 'sk-SK' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const displayName = panorama.city || panorama.original_filename || panorama.filename;

  return (
    <div className="fixed inset-0 z-[2200] flex justify-end animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="relative z-10 w-full max-w-md bg-[#090a0f]/95 backdrop-blur-2xl border-l border-white/10 flex flex-col h-full shadow-2xl text-white">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-950/50">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide truncate">
                  {isSk ? 'Komentáre' : 'Comments'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {comments.length}
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate mt-0.5" title={displayName}>
                {displayName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={t('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <p className="text-xs font-medium tracking-wide">
                {isSk ? 'Načítavam komentáre...' : 'Loading comments...'}
              </p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400 space-y-3 px-4">
              <div className="w-14 h-14 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500">
                <Sparkles className="w-7 h-7 text-cyan-400/80" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-200">
                  {isSk ? 'Zatiaľ žiadne komentáre' : 'No comments yet'}
                </h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                  {isSk
                    ? 'Buďte prvý, kto napíše komentár alebo postreh k tejto 360° panoráme!'
                    : 'Be the first to share your thoughts or impression of this 360° panorama!'}
                </p>
              </div>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="group p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all flex flex-col space-y-2 shadow-sm"
              >
                {/* Comment Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0 ${
                        comment.is_admin
                          ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40 ring-1 ring-rose-400/50'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {comment.author ? comment.author.charAt(0) : <User className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-xs font-semibold text-zinc-200 truncate">
                      {comment.author}
                    </span>
                    {comment.is_admin && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
                        <ShieldCheck className="w-3 h-3 text-rose-400" />
                        Admin
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                      <Clock className="w-3 h-3 text-zinc-600" />
                      {formatDate(comment.created_at)}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        disabled={deletingId === comment.id}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                        title={isSk ? 'Vymazať komentár' : 'Delete comment'}
                      >
                        {deletingId === comment.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment Text */}
                <p className="text-xs sm:text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed break-words pl-9">
                  {comment.text}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Add Comment Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.02] shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={isSk ? 'Vaše meno (voliteľné)' : 'Your name (optional)'}
                maxLength={40}
                className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
              />
            </div>
            {isAdmin && (
              <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                Admin
              </span>
            )}
          </div>

          <div className="relative">
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                isSk
                  ? 'Napíšte komentár k tejto panoráme...'
                  : 'Write a comment about this panorama...'
              }
              maxLength={1000}
              className="w-full p-3 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60 transition-colors resize-none custom-scrollbar"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-zinc-500 font-mono">
                {text.length}/1000
              </span>
              <button
                type="submit"
                disabled={submitting || !text.trim()}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg ${
                  text.trim() && !submitting
                    ? 'bg-cyan-500 text-zinc-950 hover:bg-cyan-400 active:scale-95 shadow-cyan-500/30'
                    : 'bg-white/10 text-zinc-500 cursor-not-allowed border border-white/5'
                }`}
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{isSk ? 'Odoslať' : 'Post'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
