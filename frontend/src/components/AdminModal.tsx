import { panoConfig } from '../config/panoConfig';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAdmin, GOOGLE_CLIENT_ID } from '../context/AdminContext';
import {
  Lock,
  Unlock,
  X,
  ShieldAlert,
  Download,
  BookOpen,
  BarChart3,
  ShieldCheck,
  Globe2,
  FileCode2,
} from 'lucide-react';

declare global {
  interface Window {
    google?: any;
    handleGoogleCredentialResponse?: (response: any) => void;
  }
}

export const AdminModal: React.FC = () => {
  const {
    showAdminModal,
    setShowAdminModal,
    loginWithGoogle,
    isAdmin,
    adminUser,
    logout,
    setShowServiceModal,
  } = useAdmin();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const [mountNode, setMountNode] = useState<Element | null>(() => {
    if (typeof document === 'undefined') return null;
    return document.fullscreenElement || document.body;
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const updateMountNode = () => {
      const fsEl = document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;
      setMountNode(fsEl || document.body);
    };

    updateMountNode();
    document.addEventListener('fullscreenchange', updateMountNode);
    document.addEventListener('webkitfullscreenchange', updateMountNode);
    return () => {
      document.removeEventListener('fullscreenchange', updateMountNode);
      document.removeEventListener('webkitfullscreenchange', updateMountNode);
    };
  }, [showAdminModal]);

  // Initialize Google Identity Services button inside the modal
  useEffect(() => {
    if (!showAdminModal || isAdmin) return;

    const setupGoogleSignIn = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response: any) => {
              if (response?.credential) {
                setIsAuthenticating(true);
                setErrorMsg(null);
                const res = await loginWithGoogle(response.credential);
                setIsAuthenticating(false);
                if (!res.success) {
                  setErrorMsg(res.error || 'Authentication failed');
                }
              }
            },
            auto_select: false,
          });

          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            text: 'signin_with',
            logo_alignment: 'left',
            width: 280,
          });
        } catch (e) {
          console.warn('GIS render error:', e);
        }
      }
    };

    const timer = setTimeout(setupGoogleSignIn, 150);
    return () => clearTimeout(timer);
  }, [showAdminModal, isAdmin, loginWithGoogle]);

  if (!showAdminModal || !mountNode) return null;

  const handleDownloadPanoramasJson = async () => {
    try {
      const res = await fetch('/panoramas.json?t=' + Date.now());
      const raw = await res.json();
      const overridesRaw = localStorage.getItem('pano_admin_overrides');
      const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
      const viewsRaw = localStorage.getItem('pano_views_cache');
      const views = viewsRaw ? JSON.parse(viewsRaw) : {};

      const merged = raw.map((item: any) => ({
        ...item,
        ...(overrides[item.id] || {}),
        views: views[item.id] ?? item.views ?? 0,
      }));

      const blob = new Blob([JSON.stringify(merged, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `panoramas_${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading JSON:', err);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in pointer-events-auto"
      onClick={() => setShowAdminModal(false)}
    >
      <div
        className="w-full max-w-md glass-panel-elevated rounded-3xl p-6 border border-white/20 shadow-2xl relative animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => setShowAdminModal(false)}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/50">
            {isAdmin ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                {isAdmin ? 'Admin Console' : 'Administrator Sign-In'}
              </h3>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                  {adminUser?.initials || 'M.T.'}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              {isAdmin
                ? `Authorized as ${adminUser?.initials || 'M.T.'} • Cloudflare KV Enabled`
                : 'Locked to authorized administrator (${panoConfig.auth.allowedAdminEmail})'}
            </p>
          </div>
        </div>

        {isAdmin ? (
          <div className="space-y-4">
            {/* Logged in badge */}
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-rose-300 font-bold text-xs">
                  {adminUser?.initials || 'M.T.'}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Admin Mode Active</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {adminUser?.initials || 'M.T.'}
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-black/40 text-emerald-300 border border-emerald-500/30">
                CF KV ONLINE
              </span>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              {/* Special Service Menu Button */}
              <button
                type="button"
                onClick={() => {
                  setShowAdminModal(false);
                  setShowServiceModal(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-gradient-to-r from-rose-500/25 to-amber-500/25 hover:from-rose-500/35 hover:to-amber-500/35 text-xs font-bold text-white border border-rose-500/40 transition-all shadow-lg shadow-rose-950/40 group"
              >
                <BarChart3 className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>Open Service Menu & Popularity Stats</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPanoramasJson}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl glass-button text-xs font-semibold text-cyan-300 hover:text-white group border border-cyan-500/30 hover:border-cyan-400"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Export / Backup Database JSON</span>
              </button>

              <Link
                to="/admin/help"
                onClick={() => setShowAdminModal(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white border border-white/10 transition-all group"
              >
                <BookOpen className="w-3.5 h-3.5 text-zinc-400 group-hover:text-cyan-300 transition-colors" />
                <span>Admin Operations Guide</span>
              </Link>

              <Link
                to="/admin/tech-spec"
                onClick={() => setShowAdminModal(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-bold text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400 transition-all group"
              >
                <FileCode2 className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>System Architecture & Tech Spec</span>
              </Link>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="px-4 py-2.5 rounded-xl glass-button text-xs font-semibold text-zinc-300 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setShowAdminModal(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all"
              >
                Lock & Log Out
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Notice */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-zinc-300 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Prístup vyhradený pre <strong>M. T.</strong> cez Google OAuth.
              </span>
            </div>

            {/* Google OAuth Button Container */}
            <div className="flex flex-col items-center justify-center py-2 min-h-[48px]">
              <div ref={googleBtnRef} className="flex justify-center" />
              {isAuthenticating && (
                <div className="flex items-center gap-2 text-xs text-cyan-300 mt-2 animate-pulse">
                  <div className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  <span>Verifying Google account...</span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

          </div>
        )}
      </div>
    </div>,
    mountNode
  );
};
