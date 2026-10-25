import { panoConfig } from './config/panoConfig';
import { AuthorCreditBadge } from './components/AuthorCreditBadge';
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapView } from './components/MapView';
import { About } from './components/About';
import { Stats } from './components/Stats';
import { WhatsNew } from './components/WhatsNew';
import { PublicHelp } from './components/PublicHelp';
import { AdminHelp } from './components/AdminHelp';
import { AdminTechSpec } from './components/AdminTechSpec';
import { ServiceMenu } from './components/ServiceMenu';
import type { Panorama } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { logger } from './utils/logger';
import { deduplicatePanoramas } from './utils/geo';
import { analytics } from './utils/analytics';
import {
  Compass,
  BarChart3,
  Sparkles,
  HelpCircle,
  Globe2,
  Lock,
  Unlock,
  BookOpen,
  ShieldAlert,
  Flame,
  Menu,
  Trash2,
  X,
  Mail,
  Share2,
  Maximize,
  Minimize,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { ViewModeProvider, useViewMode } from './context/ViewModeContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { AdminModal } from './components/AdminModal';
import { AdminAvatar } from './components/AdminAvatar';
import { UIHelpProvider, useUIHelp } from './context/UIHelpContext';
import { UIHelpOverlay } from './components/UIHelpOverlay';
import { FeedbackModal } from './components/FeedbackModal';
import { FeedbackButton } from './components/FeedbackButton';
import {
  isBrowserFullscreen,
  requestBrowserFullscreen,
  exitBrowserFullscreen,
  addFullscreenChangeListener,
} from './utils/fullscreen';

function Navigation({
  panoramas = [],
  onOpenFeedback,
  onShareMap,
}: {
  panoramas?: Panorama[];
  onOpenFeedback?: () => void;
  onShareMap?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { isAdmin, adminUser, setShowAdminModal, setShowServiceModal } = useAdmin();
  const { isHelpActive, toggleHelp } = useUIHelp();
  const { isMobileMode, toggleViewMode, isApp } = useViewMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(() => isBrowserFullscreen());

  useEffect(() => {
    return addFullscreenChangeListener((active) => {
      setIsFullscreen(active);
    });
  }, []);

  const toggleFullscreen = async () => {
    if (isBrowserFullscreen()) {
      await exitBrowserFullscreen();
      setIsFullscreen(false);
    } else {
      const ok = await requestBrowserFullscreen(document.documentElement);
      setIsFullscreen(ok);
    }
  };

  const deletedCount = useMemo(() => {
    return panoramas.filter((p) => p.is_deleted || p.folder === '!DELETED!').length;
  }, [panoramas]);

  const toggleLang = () => {
    const nextLang = i18n.language === 'en' ? 'sk' : 'en';
    i18n.changeLanguage(nextLang);
    logger.info(`Language changed to ${nextLang}`);
  };

  const navItemClass = (path: string) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
      location.pathname === path
        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/50'
        : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
    }`;

  return (
    <nav className="h-14 glass-panel border-b border-white/10 z-50 px-4 md:px-6 flex items-center justify-between select-none relative">
      {/* Brand */}
      <div className="flex items-center gap-3 md:gap-6 min-w-0">
        <Link to="/" data-help="nav_logo" className="flex items-center gap-2 sm:gap-2.5 group min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 p-0.5 shadow-lg shadow-cyan-950/60 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#090a0f] rounded-[10px] flex items-center justify-center p-0.5 overflow-hidden">
              <img src="/favicon.svg" alt="360°" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-black tracking-wider text-white uppercase group-hover:text-cyan-300 transition-colors truncate">
              360° Panoramas
            </span>
            <span className="hidden sm:block text-[9px] text-zinc-500 tracking-widest font-mono uppercase">
              Glass Noir Edition
            </span>
          </div>
        </Link>

        {/* Links */}
        <div className={isMobileMode ? 'hidden' : 'hidden md:flex items-center space-x-1.5'}>
          <Link to="/" data-help="nav_home" className={navItemClass('/')}>
            <Globe2 className="w-3.5 h-3.5" />
            <span>{t('home')}</span>
          </Link>
          <Link to="/stats" data-help="nav_stats" className={navItemClass('/stats')}>
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{t('stats')}</span>
          </Link>
          <Link to="/whatsnew" data-help="nav_whatsnew" className={navItemClass('/whatsnew')}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('whats_new')}</span>
          </Link>
          <Link to="/help" data-help="nav_help" className={navItemClass('/help')}>
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t('help')}</span>
          </Link>
          {isAdmin && (
            <Link
              to="/admin/help"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                location.pathname === '/admin/help'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-950/50'
                  : 'text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 border border-rose-500/20'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>{t('admin_help')}</span>
            </Link>
          )}
          <Link to="/about" data-help="nav_about" className={navItemClass('/about')}>
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{t('about')}</span>
          </Link>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Share Map View Button (visible on map page '/') */}
        {location.pathname === '/' && onShareMap && (
          <button
            onClick={onShareMap}
            data-help="nav_share_map"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl glass-panel-elevated border border-emerald-500/40 text-emerald-300 hover:text-white hover:border-emerald-400 bg-zinc-950/80 hover:bg-emerald-500/20 shadow-md shadow-emerald-950/40 text-xs font-bold transition-all cursor-pointer"
            title={i18n.language.startsWith('sk') ? 'Zdieľať mapu (skopíruje odkaz s filtrami a nastaveniami)' : 'Share map (copies link with filters and toggles)'}
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{i18n.language.startsWith('sk') ? 'Zdieľať' : 'Share'}</span>
          </button>
        )}

        {/* Send Feedback Button */}
        <button
          onClick={onOpenFeedback}
          data-help="nav_feedback"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl glass-panel-elevated border border-cyan-500/40 text-cyan-300 hover:text-white hover:border-cyan-400 bg-zinc-950/80 hover:bg-cyan-500/20 shadow-md shadow-cyan-950/40 text-xs font-bold transition-all cursor-pointer"
          title={i18n.language.startsWith('sk') ? 'Poslať feedback / pripomienku autorovi' : 'Send feedback to the author'}
        >
          <Mail className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Feedback</span>
        </button>

        {/* Language Switcher (desktop/tablet; on phones it lives in the hamburger menu) */}
        <button
          onClick={toggleLang}
          data-help="nav_lang"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-button text-xs font-bold text-zinc-300 hover:text-white"
          title="Switch language"
        >
          <span className="text-[10px] text-cyan-400">🌐</span>
          <span>{i18n.language.toUpperCase()}</span>
        </button>

        <AuthorCreditBadge variant="pill" className="hidden xl:flex mr-1" />
        {/* Prominent UI Help Guide Button (?) */}
        <button
          onClick={toggleHelp}
          data-help="nav_ui_help"
          className={`flex items-center justify-center w-8 h-8 rounded-xl font-black text-sm transition-all shadow-lg cursor-pointer ${
            isHelpActive
              ? 'bg-amber-400 text-zinc-950 ring-2 ring-amber-300 ring-offset-2 ring-offset-[#090a0f] shadow-amber-500/50 scale-105'
              : 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-zinc-950 shadow-md shadow-amber-500/30 hover:scale-110 active:scale-95'
          }`}
          title={t('ui_help_tooltip')}
          aria-label={t('ui_help_tooltip')}
        >
          <span className="font-extrabold text-base leading-none">?</span>
        </button>

        {/* Fullscreen Map Toggle Button (right next to ?) */}
        <button
          onClick={toggleFullscreen}
          className="flex items-center justify-center w-8 h-8 rounded-xl glass-button text-zinc-300 hover:text-white transition-all cursor-pointer hover:scale-105 active:scale-95"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4 text-cyan-400" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* Hamburger Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          data-help="nav_mobile_menu"
          className={`p-2 rounded-xl glass-button transition-all cursor-pointer ${
            menuOpen
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'text-zinc-300 hover:text-white'
          }`}
          title="Menu & !DELETED! Folder"
        >
          {menuOpen ? <X className="w-4 h-4 text-cyan-400" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Backdrop overlay to dismiss mobile menu when tapping outside */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[1950] bg-black/40 backdrop-blur-xs cursor-pointer"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Floating Hamburger Dropdown Menu Drawer */}
      {menuOpen && (
        <div className="absolute top-16 right-3 md:right-6 z-[2000] w-72 max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-5rem)] overflow-y-auto glass-panel-elevated rounded-3xl p-4 border border-white/15 shadow-2xl animate-slide-up text-white">
          <div className="space-y-1">
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className={navItemClass('/') + ' w-full justify-start py-2.5 px-3'}
            >
              <Globe2 className="w-4 h-4 text-cyan-400" />
              <span>{i18n.language.toLowerCase().startsWith('sk') ? 'Mapa' : 'Map'}</span>
            </Link>

            <Link
              to="/stats"
              onClick={() => setMenuOpen(false)}
              className={navItemClass('/stats') + ' w-full justify-start py-2.5 px-3'}
            >
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>{t('stats')}</span>
            </Link>

            <Link
              to="/whatsnew"
              onClick={() => setMenuOpen(false)}
              className={navItemClass('/whatsnew') + ' w-full justify-start py-2.5 px-3'}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{t('whats_new')}</span>
            </Link>

            <Link
              to="/help"
              onClick={() => setMenuOpen(false)}
              className={navItemClass('/help') + ' w-full justify-start py-2.5 px-3'}
            >
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>{t('help')}</span>
            </Link>

            <Link
              to="/about"
              onClick={() => setMenuOpen(false)}
              className={navItemClass('/about') + ' w-full justify-start py-2.5 px-3'}
            >
              <HelpCircle className="w-4 h-4 text-purple-400" />
              <span>{t('about')}</span>
            </Link>

            {/* Language switch (phones only — hidden in the top bar below sm) */}
            <button
              type="button"
              onClick={toggleLang}
              className="sm:hidden w-full flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent transition-all text-left cursor-pointer"
            >
              <span className="text-sm">🌐</span>
              <span>Language: {i18n.language.toUpperCase()}</span>
            </button>

            {/* Mobile Share Link (on map page) */}
            {location.pathname === '/' && onShareMap && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onShareMap();
                }}
                className="w-full flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold text-emerald-300 hover:text-white hover:bg-emerald-500/10 border border-emerald-500/20 transition-all text-left cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>{i18n.language.startsWith('sk') ? 'Zdieľať mapu' : 'Share Map'}</span>
              </button>
            )}

            <AuthorCreditBadge variant="footer" className="mt-2" />
            {/* Mobile Feedback Link */}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onOpenFeedback?.();
              }}
              className="w-full flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold text-cyan-300 hover:text-white hover:bg-cyan-500/10 border border-cyan-500/20 transition-all text-left cursor-pointer"
            >
              <Mail className="w-4 h-4 text-cyan-400" />
              <span>{i18n.language.startsWith('sk') ? 'Poslať feedback autorovi' : 'Send Feedback'}</span>
            </button>

            {/* View Mode Switcher Button (Mobile / Desktop) - hidden in standalone mobile app */}
            {!isApp && (
              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    toggleViewMode();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between py-2.5 px-3 rounded-2xl bg-zinc-900/90 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/30 text-xs font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer group"
                  title={isMobileMode ? t('switch_to_desktop') : t('switch_to_mobile')}
                >
                  <div className="flex items-center gap-2.5">
                    {isMobileMode ? (
                      <Smartphone className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                    ) : (
                      <Monitor className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                    )}
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-white text-xs">
                        {isMobileMode ? t('view_mode_mobile') : t('view_mode_desktop')}
                      </span>
                      <span className="text-[10px] text-zinc-400 group-hover:text-cyan-300 transition-colors">
                        {isMobileMode ? t('switch_to_desktop') : t('switch_to_mobile')}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] border border-cyan-500/30">
                    {isMobileMode ? 'Mobile' : 'Desktop'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {isAdmin && (
          <>
          {/* Section Divider */}
          <div className="my-2.5 border-t border-white/10" />

          {/* DELETED PANORAMAS (!DELETED!) LINK */}
          <Link
            to="/deleted"
            onClick={() => setMenuOpen(false)}
            className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              location.pathname === '/deleted'
                ? 'bg-rose-500/25 text-rose-200 border border-rose-500/50 shadow-sm shadow-rose-950/60'
                : 'text-rose-400 hover:text-rose-200 hover:bg-rose-500/15 border border-rose-500/20'
            }`}
            title="Open !DELETED! folder to see deleted panoramas"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Deleted (!DELETED!)</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[10px] border border-rose-500/30">
              {deletedCount}
            </span>
          </Link>
          </>
          )}

          {/* Admin Section in Menu */}
          {isAdmin ? (
            <div className="mt-2.5 pt-2.5 border-t border-white/10 space-y-1.5">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-zinc-900/90 border border-white/10">
                <AdminAvatar sizeClass="w-8 h-8" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">{adminUser?.name || 'Administrator'}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{adminUser?.email || adminUser?.initials || 'Admin'}</div>
                </div>
              </div>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowServiceModal(true);
                }}
                className="w-full flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-amber-300 hover:bg-amber-500/15 transition-all text-left cursor-pointer"
              >
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Service Menu</span>
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowAdminModal(true);
                }}
                className="w-full flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/15 transition-all text-left cursor-pointer"
              >
                <Lock className="w-4 h-4 text-rose-400" />
                <span>Admin Console</span>
              </button>
            </div>
          ) : (
            <div className="mt-2.5 pt-2.5 border-t border-white/10">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowAdminModal(true);
                }}
                className="w-full flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer"
              >
                <Lock className="w-4 h-4 text-zinc-500" />
                <span>Admin Login</span>
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

function isLocalAdminSessionActive(): boolean {
  try {
    const adminSessionStr = localStorage.getItem('pano_admin_session') || sessionStorage.getItem('pano_admin_session');
    if (!adminSessionStr) return false;
    const sess = JSON.parse(adminSessionStr);
    return Boolean(sess?.token && sess?.email);
  } catch {
    return false;
  }
}

function applyAdminOverrides(items: Panorama[], isFromD1: boolean = false): Panorama[] {
  try {
    const rawViews = localStorage.getItem('pano_views_cache');
    const viewsMap: Record<string, number> = rawViews ? JSON.parse(rawViews) : {};
    const rawShares = localStorage.getItem('pano_shares_cache');
    const sharesMap: Record<string, number> = rawShares ? JSON.parse(rawShares) : {};

    // D1 is the primary authoritative source of truth.
    // When items come from D1 (isFromD1 === true), D1's is_private and metadata are canonical
    // and MUST NOT be overridden by stale localStorage overrides. This guarantees public/private status
    // is 100% aligned between logged-in and incognito/public browsers.
    // Local overrides are ONLY applied when falling back to static panoramas.json (last resort).
    const isAdminActive = isLocalAdminSessionActive();
    const rawOverrides = (isAdminActive && !isFromD1) ? localStorage.getItem('pano_admin_overrides') : null;
    const overrides: Record<string, Partial<Panorama>> = rawOverrides ? JSON.parse(rawOverrides) : {};

    // When D1 is connected, clean up any conflicting is_private in pano_admin_overrides
    if (isFromD1 && isAdminActive) {
      try {
        const storedOverridesStr = localStorage.getItem('pano_admin_overrides');
        if (storedOverridesStr) {
          const stored = JSON.parse(storedOverridesStr);
          let changed = false;
          for (const id of Object.keys(stored)) {
            if (stored[id]?.is_private !== undefined) {
              delete stored[id].is_private;
              changed = true;
            }
          }
          if (changed) {
            localStorage.setItem('pano_admin_overrides', JSON.stringify(stored));
          }
        }
      } catch (_) {}
    }

    return items.map((p) => {
      const over = overrides[p.id];
      const views = Math.max(viewsMap[p.id] || 0, p.views || 0);
      const shares = sharesMap[p.id] ?? p.shares ?? 0;
      const isPrivate = !isFromD1 && isAdminActive && over?.is_private !== undefined
        ? over.is_private
        : Boolean(p.is_private);
      let folder = !isFromD1 && isAdminActive && over?.folder !== undefined ? over.folder : p.folder;
      // If panorama is public and folder was a private archive folder, don't retain private folder name
      if (!isPrivate && folder && typeof folder === 'string' && folder.toLowerCase().includes('private')) {
        folder = p.folder && !p.folder.toLowerCase().includes('private') ? p.folder : null;
      }
      let item = { ...p, views, shares, is_private: isPrivate, folder };
      if (over && isAdminActive && !isFromD1) {
        item = { ...item, ...over, is_private: isPrivate, folder, city: p.city && p.city !== 'Unknown' ? p.city : (over.city || p.city) };
      }
      return item;
    });
  } catch {
    return items.map((p) => ({ ...p, is_private: Boolean(p.is_private) }));
  }
}

function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // If not looking at an individual panorama detail (PanoViewer manages its own detail title & event)
    if (!location.search.includes('pano=')) {
      let title: string = panoConfig.branding.appName || 'AeroSphere 360';
      if (location.pathname === '/stats') {
        title = 'Stats - AeroSphere 360';
      } else if (location.pathname === '/whatsnew') {
        title = "What's New - AeroSphere 360";
      } else if (location.pathname === '/about') {
        title = 'About - AeroSphere 360';
      } else if (location.pathname === '/help') {
        title = 'Help - AeroSphere 360';
      } else if (location.pathname === '/admin/help' || location.pathname === '/admin-help') {
        title = 'Admin Help - AeroSphere 360';
      } else if (location.pathname === '/deleted') {
        title = 'Deleted Archive - AeroSphere 360';
      }
      document.title = title;
      analytics.trackPageView(location.pathname + location.search, title);
    }
  }, [location.pathname, location.search]);

  return null;
}

function MainContent({
  panoramas,
  onRefresh,
}: {
  panoramas: Panorama[];
  onRefresh: () => void;
}) {
  const { setOnPanoramaUpdated } = useAdmin();
  const [activeSelectedPano, setActiveSelectedPano] = useState<Panorama | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);
  const mapShareHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setOnPanoramaUpdated(onRefresh);
  }, [onRefresh, setOnPanoramaUpdated]);

  return (
    <Router>
      <AnalyticsTracker />
      <UIHelpProvider>
        <div className="h-screen h-[100dvh] w-screen flex flex-col bg-[#090a0f] text-slate-100 overflow-hidden">
          <Navigation
            panoramas={panoramas}
            onOpenFeedback={() => setIsFeedbackOpen(true)}
            onShareMap={() => mapShareHandlerRef.current?.()}
          />
          <main className="flex-1 min-h-0 w-full relative overflow-hidden">
            <Routes>
              <Route
                path="/"
                element={
                  <ErrorBoundary fallbackTitle="Nepodarilo sa načítať mapu panorám">
                    <MapView
                      panoramas={panoramas}
                      onRefreshPanoramas={onRefresh}
                      onExternalSelectPano={(p) => setActiveSelectedPano(p)}
                      isDeletedView={false}
                      onRegisterShareHandler={(handler) => {
                        mapShareHandlerRef.current = handler || null;
                      }}
                    />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/deleted"
                element={
                  <ErrorBoundary fallbackTitle="Nepodarilo sa načítať archív zmazaných panorám">
                    <MapView
                      panoramas={panoramas}
                      onRefreshPanoramas={onRefresh}
                      onExternalSelectPano={(p) => setActiveSelectedPano(p)}
                      isDeletedView={true}
                      onRegisterShareHandler={(handler) => {
                        mapShareHandlerRef.current = handler || null;
                      }}
                    />
                  </ErrorBoundary>
                }
              />
              <Route path="/help" element={<PublicHelp />} />
              <Route path="/admin/help" element={<AdminHelp />} />
              <Route path="/admin-help" element={<AdminHelp />} />
              <Route path="/admin/tech-spec" element={<AdminTechSpec standalone={true} />} />
              <Route path="/admin/architecture" element={<AdminTechSpec standalone={true} />} />
              <Route path="/about" element={<About />} />
              <Route path="/stats" element={<Stats panoramas={panoramas} onRefresh={onRefresh} />} />
              <Route path="/whatsnew" element={<WhatsNew panoramas={panoramas} />} />
            </Routes>
          </main>
          <AdminModal />
          <ServiceMenu
            panoramas={panoramas}
            onSelectPanorama={(p) => setActiveSelectedPano(p)}
            onRefresh={onRefresh}
          />
          <FeedbackModal
            isOpen={isFeedbackOpen}
            onClose={() => setIsFeedbackOpen(false)}
            defaultSubject={window.location.href}
            defaultUrl={window.location.href}
          />
          <UIHelpOverlay />
        </div>
      </UIHelpProvider>
    </Router>
  );
}

function App() {
  const [panoramas, setPanoramas] = useState<Panorama[]>(() => {
    try {
      const cached = sessionStorage.getItem('panoramas_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const cached = sessionStorage.getItem('panoramas_cache');
      return !cached;
    } catch {
      return true;
    }
  });
  const [error, setError] = useState<string | null>(null);

  const fetchPanoramas = async (retryCount = 0) => {
    try {
      let rawData: Panorama[] | null = null;
      let isFromD1 = false;

      // 1. First choice: Cloudflare D1 SQL API (/api/panoramas)
      try {
        const adminSessionStr = localStorage.getItem('pano_admin_session') || sessionStorage.getItem('pano_admin_session');
        let adminToken: string | undefined;
        if (adminSessionStr) {
          try {
            adminToken = JSON.parse(adminSessionStr)?.token;
          } catch (_) {}
        }
        const headers: Record<string, string> = {};
        if (adminToken) {
          headers['Authorization'] = `Bearer ${adminToken}`;
          headers['x-admin-token'] = adminToken;
        }

        const apiEndpoint = adminToken
          ? `/api/panoramas?admin=true&_=${Date.now()}`
          : `/api/panoramas?_=${Date.now()}`;
        const kvRes = await fetch(apiEndpoint, {
          headers: {
            ...headers,
            'Cache-Control': 'no-cache',
          },
          cache: 'no-store',
        });
        if (kvRes.ok) {
          const kvJson = await kvRes.json();
          if (kvJson.success && Array.isArray(kvJson.panoramas) && kvJson.panoramas.length > 0) {
            rawData = kvJson.panoramas;
            isFromD1 = true;
            if (kvJson.shares && typeof kvJson.shares === 'object') {
              try {
                localStorage.setItem('pano_shares_cache', JSON.stringify(kvJson.shares));
              } catch (_) {}
            }
            if (kvJson.views && typeof kvJson.views === 'object') {
              try {
                localStorage.setItem('pano_views_cache', JSON.stringify(kvJson.views));
              } catch (_) {}
            }
          }
        }
      } catch {}

      // 2. Fallback to static panoramas.json (last resort)
      if (!rawData) {
        const candidates = window.location.pathname.startsWith('/panoramas')
          ? ['/panoramas/panoramas.json', '/panoramas.json', './panoramas.json']
          : ['/panoramas.json', '/panoramas/panoramas.json', './panoramas.json'];
        
        let loadedText: string | null = null;
        for (const candidate of candidates) {
          try {
            const cacheBuster = `?t=${Date.now()}`;
            const res = await fetch(`${candidate}${cacheBuster}`, {
              cache: 'no-cache',
              headers: { 'Cache-Control': 'no-cache' },
            });
            if (res.ok) {
              const text = await res.text();
              if (text && text.trim().length > 0) {
                loadedText = text;
                break;
              }
            }
          } catch {}
        }

        if (!loadedText) {
          throw new Error('Could not load panoramas.json from any known path');
        }
        rawData = JSON.parse(loadedText);
        isFromD1 = false;
      }

      if (Array.isArray(rawData) && rawData.length > 0) {
        const merged = applyAdminOverrides(rawData, isFromD1);
        const uniqueData = deduplicatePanoramas(merged);
        const newPublicCount = uniqueData.filter((p) => p.is_private === false && !p.is_deleted).length;

        // Safeguard: Never replace an active public list with a 0-public degraded list (e.g. network failure)
        setPanoramas((prev) => {
          const prevPublicCount = prev.filter((p) => p.is_private === false && !p.is_deleted).length;
          if (prevPublicCount > 0 && newPublicCount === 0) {
            logger.warn(`Preserving current panoramas: rejected degraded update with 0 public items (previously ${prevPublicCount})`);
            return prev;
          }
          return uniqueData;
        });

        setError(null);
        if (newPublicCount > 0) {
          try {
            sessionStorage.setItem('panoramas_cache', JSON.stringify(uniqueData));
          } catch {
            // ignore
          }
        }
      }
      setLoading(false);
    } catch (err) {
      if (retryCount < 3) {
        setTimeout(() => fetchPanoramas(retryCount + 1), 600);
        return;
      }
      logger.error('Failed to load panoramas data', err);
      setPanoramas((prev) => {
        if (prev.length === 0) {
          setError('Could not load panorama data. Retrying...');
        }
        return prev;
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    logger.info('Application starting, initiating panorama fetch...');
    fetchPanoramas();
  }, []);

  useEffect(() => {
    const handleViewRecorded = (e: CustomEvent<{ id: string; views: number }>) => {
      const { id, views } = e.detail || {};
      if (!id || typeof views !== 'number') return;
      setPanoramas((prev) =>
        prev.map((p) => (String(p.id) === String(id) ? { ...p, views: Math.max(p.views || 0, views) } : p))
      );
    };
    window.addEventListener('pano_view_recorded', handleViewRecorded as EventListener);
    return () => window.removeEventListener('pano_view_recorded', handleViewRecorded as EventListener);
  }, []);

  const handleUpdatePanoramasLocally = useCallback((updater: (prev: Panorama[]) => Panorama[]) => {
    setPanoramas((prev) => {
      const updated = updater(prev);
      try {
        sessionStorage.setItem('panoramas_cache', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  }, []);

  if (loading && panoramas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#090a0f] text-white space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <Compass className="w-6 h-6 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-sm font-semibold tracking-wide text-zinc-300 animate-pulse">
          Loading 360° Panoramas...
        </p>
      </div>
    );
  }

  if (error && panoramas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#090a0f] text-white p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
          <Compass className="w-6 h-6 text-rose-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Database temporarily unavailable</h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm">{error}</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            fetchPanoramas();
          }}
          className="px-5 py-2.5 rounded-xl glass-button text-xs font-semibold text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/20"
        >
          Retry Now
        </button>
      </div>
    );
  }

  return (
    <ViewModeProvider>
      <AdminProvider
        onRefreshPanoramas={() => fetchPanoramas()}
        onUpdatePanoramasLocally={handleUpdatePanoramasLocally}
      >
        <MainContent panoramas={panoramas} onRefresh={() => fetchPanoramas()} />
      </AdminProvider>
    </ViewModeProvider>
  );
}

export default App;
