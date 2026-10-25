import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIHelp } from '../context/UIHelpContext';
import { HELP_DEFINITIONS } from '../utils/helpDictionary';
import {
  X,
  HelpCircle,
  Keyboard,
  Search,
  Compass,
  Eye,
  SlidersHorizontal,
  Navigation,
  Globe,
  Camera,
  Maximize2,
  Share2,
  Heart,
  MessageSquare,
  RotateCw,
  Film,
  Layers,
  MapPin,
  Info,
  Calendar,
  Sparkles,
  MousePointerClick,
} from 'lucide-react';
import { KeyboardControlsContent } from './KeyboardControlsModal';

interface ActiveElementItem {
  key: string;
  title: string;
  desc: string;
  category: 'viewer' | 'map' | 'nav' | 'filter' | 'other';
  icon: React.ReactNode;
}

export const UIHelpOverlay: React.FC = () => {
  const { isHelpActive, closeHelp } = useUIHelp();
  const { i18n } = useTranslation();
  const [activeMainTab, setActiveMainTab] = useState<'keys' | 'elements'>('keys');
  const [activeItems, setActiveItems] = useState<ActiveElementItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const lang = (i18n.language === 'sk' ? 'sk' : 'en') as 'sk' | 'en';

  // Always reset to 'keys' tab when help opens so keys guide comes first
  useEffect(() => {
    if (isHelpActive) {
      setActiveMainTab('keys');
    }
  }, [isHelpActive]);

  const getElementIcon = (key: string): React.ReactNode => {
    switch (key) {
      case 'nav_logo':
        return <Compass className="w-4 h-4 text-cyan-400" />;
      case 'nav_home':
        return <Globe className="w-4 h-4 text-cyan-400" />;
      case 'nav_stats':
      case 'nav_whatsnew':
      case 'nav_help':
      case 'nav_about':
        return <Info className="w-4 h-4 text-cyan-400" />;
      case 'nav_lang':
        return <Globe className="w-4 h-4 text-amber-400" />;
      case 'nav_ui_help':
        return <HelpCircle className="w-4 h-4 text-amber-400" />;
      case 'sidebar_toggle':
      case 'filter_search':
      case 'filter_years':
      case 'filter_months':
      case 'filter_resolutions':
        return <SlidersHorizontal className="w-4 h-4 text-cyan-400" />;
      case 'filter_favorites':
      case 'viewer_favorite':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'status_chips':
        return <Info className="w-4 h-4 text-cyan-400" />;
      case 'map_tiles_toggle':
        return <Layers className="w-4 h-4 text-cyan-400" />;
      case 'map_menu_dots':
        return <Layers className="w-4 h-4 text-cyan-400" />;
      case 'map_reset_filters':
        return <RotateCw className="w-4 h-4 text-rose-400" />;
      case 'map_box_select':
        return <MousePointerClick className="w-4 h-4 text-cyan-400" />;
      case 'viewer_title':
        return <MapPin className="w-4 h-4 text-cyan-400" />;
      case 'viewer_resolution':
        return <Sparkles className="w-4 h-4 text-cyan-400" />;
      case 'viewer_info':
        return <Info className="w-4 h-4 text-amber-400" />;
      case 'viewer_little_planet':
        return <Globe className="w-4 h-4 text-purple-400" />;
      case 'viewer_export':
        return <Camera className="w-4 h-4 text-cyan-400" />;
      case 'viewer_share':
        return <Share2 className="w-4 h-4 text-cyan-400" />;
      case 'viewer_comments':
        return <MessageSquare className="w-4 h-4 text-amber-400" />;
      case 'viewer_autopan':
        return <RotateCw className="w-4 h-4 text-cyan-400" />;
      case 'viewer_fullscreen':
        return <Maximize2 className="w-4 h-4 text-cyan-400" />;
      case 'viewer_filmstrip':
        return <Film className="w-4 h-4 text-cyan-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getElementCategory = (key: string): 'viewer' | 'map' | 'nav' | 'filter' | 'other' => {
    if (key.startsWith('viewer_')) return 'viewer';
    if (key.startsWith('map_')) return 'map';
    if (key.startsWith('filter_') || key === 'sidebar_toggle' || key === 'status_chips') return 'filter';
    if (key.startsWith('nav_')) return 'nav';
    return 'other';
  };

  const scanActiveElements = useCallback(() => {
    if (!isHelpActive) {
      setActiveItems([]);
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const elements = document.querySelectorAll<HTMLElement>('[data-help]');
    const seen = new Set<string>();
    const found: ActiveElementItem[] = [];

    elements.forEach((el) => {
      const key = el.getAttribute('data-help');
      if (!key || seen.has(key) || !HELP_DEFINITIONS[key]) return;

      const rect = el.getBoundingClientRect();
      // Only include elements that exist and are visible on the screen
      if (rect.width <= 0 || rect.height <= 0) return;
      if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) return;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

      seen.add(key);
      const def = HELP_DEFINITIONS[key];
      found.push({
        key,
        title: def.title[lang],
        desc: def.desc[lang],
        category: getElementCategory(key),
        icon: getElementIcon(key),
      });
    });

    setActiveItems(found);
  }, [isHelpActive, lang]);

  useEffect(() => {
    if (!isHelpActive) {
      setSearchQuery('');
      setSelectedCategory('all');
      return;
    }

    scanActiveElements();
    const timer = setTimeout(scanActiveElements, 100);

    window.addEventListener('resize', scanActiveElements);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', scanActiveElements);
    };
  }, [isHelpActive, scanActiveElements]);

  // Categories present in the current active items
  const availableCategories = useMemo(() => {
    const cats = new Set(activeItems.map((item) => item.category));
    return cats;
  }, [activeItems]);

  const filteredItems = useMemo(() => {
    return activeItems.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
    });
  }, [activeItems, selectedCategory, searchQuery]);

  if (!isHelpActive) return null;

  const categoryLabels: Record<string, { sk: string; en: string }> = {
    all: { sk: 'Všetky prvky', en: 'All Elements' },
    viewer: { sk: '360° Prehliadač', en: '360° Viewer' },
    map: { sk: 'Mapa', en: 'Map' },
    filter: { sk: 'Filtre a hľadanie', en: 'Filters & Search' },
    nav: { sk: 'Navigácia', en: 'Navigation' },
  };

  return (
    <div
      onClick={closeHelp}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/75 backdrop-blur-md animate-fade-in cursor-pointer select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-zinc-950/98 border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 text-slate-100 overflow-hidden cursor-default animate-scale-in"
      >
        {/* Header with Unified Main Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-zinc-900/70 gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold shadow-lg shrink-0 ${
              activeMainTab === 'keys'
                ? 'bg-gradient-to-tr from-cyan-500 to-blue-500 text-zinc-950 shadow-cyan-500/30'
                : 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-zinc-950 shadow-amber-500/30'
            }`}>
              {activeMainTab === 'keys' ? (
                <Keyboard className="w-5 h-5 text-zinc-950" />
              ) : (
                <span className="text-xl leading-none font-black">?</span>
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>
                  {activeMainTab === 'keys'
                    ? (lang === 'sk' ? 'Herné ovládanie klávesnicou' : 'Keyboard Controls Guide')
                    : (lang === 'sk' ? 'Popis prvkov na obrazovke' : 'Screen Elements Guide')}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 text-[10px] font-mono font-bold">
                  {activeMainTab === 'keys' ? 'HUD MAP' : `${activeItems.length} ${lang === 'sk' ? 'prvkov' : 'items'}`}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                {activeMainTab === 'keys'
                  ? (lang === 'sk' ? 'Kompletná mapa kláves pre bleskurýchle ovládanie 360° panorámy' : 'Fast keyboard mapping for ultra-smooth 360° panoramic navigation')
                  : (lang === 'sk' ? 'Prehľad a vysvetlenie ovládacích prvkov na aktuálnej obrazovke' : 'Overview of controls currently visible on this screen')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {/* Primary Main Tab Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/60 border border-white/15 shadow-inner">
              <button
                onClick={() => setActiveMainTab('keys')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeMainTab === 'keys'
                    ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400 shadow-md shadow-cyan-950/60'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'sk' ? 'Klávesy (H)' : 'Keys (H)'}</span>
              </button>

              <button
                onClick={() => setActiveMainTab('elements')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeMainTab === 'elements'
                    ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <HelpCircle className={`w-3.5 h-3.5 ${activeMainTab === 'elements' ? 'text-zinc-950' : 'text-amber-400'}`} />
                <span>{lang === 'sk' ? 'Popis prvkov (?)' : 'Elements (?)'}</span>
              </button>
            </div>

            <button
              onClick={closeHelp}
              className="p-2 rounded-2xl bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/10 hover:border-rose-400/40 transition-all cursor-pointer"
              title={lang === 'sk' ? 'Zavrieť (Esc)' : 'Close (Esc)'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TAB 1: KEYS GUIDE (Active by default) */}
        {activeMainTab === 'keys' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            <KeyboardControlsContent isSk={lang === 'sk'} />
          </div>
        )}

        {/* TAB 2: SCREEN ELEMENTS GUIDE */}
        {activeMainTab === 'elements' && (
          <>
            {/* Filter bar & Quick Search */}
            <div className="px-5 sm:px-6 py-3 border-b border-white/10 bg-zinc-900/30 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              {/* Category Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/30'
                      : 'bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {categoryLabels.all[lang]} ({activeItems.length})
                </button>
                {(['viewer', 'map', 'filter', 'nav'] as const).map((cat) => {
                  if (!availableCategories.has(cat)) return null;
                  const count = activeItems.filter((i) => i.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/30'
                          : 'bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {categoryLabels[cat][lang]} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Search Input */}
              <div className="relative min-w-[200px] sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'sk' ? 'Hľadať v popiskoch...' : 'Filter elements...'}
                  className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-xl bg-white/5 border border-white/10 focus:border-amber-400/60 focus:outline-none text-white placeholder-zinc-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Elements Grid List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-2.5">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-sm">
                  {lang === 'sk' ? 'Žiadne prvky nevyhovujú zadanému filtru.' : 'No elements match your search filter.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredItems.map((item) => (
                    <div
                      key={item.key}
                      className="p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/10 hover:border-amber-400/40 transition-all flex items-start gap-3 group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-amber-400/30 transition-transform">
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                            {item.title}
                          </h3>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 shrink-0">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-white/10 bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-zinc-400">
          {activeMainTab === 'keys' ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-zinc-300">
                  {lang === 'sk'
                    ? 'Klávesy sú aktívne počas prezerania panorámy (WASD, 1-2-3, 0, C, M, P, /)'
                    : 'Keys are active while exploring a panorama (WASD, 1-2-3, 0, C, M, P, /)'}
                </span>
              </div>
              <button
                onClick={() => setActiveMainTab('elements')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 hover:text-white border border-amber-400/40 font-bold transition-all cursor-pointer shadow-md"
              >
                <span>{lang === 'sk' ? 'Popis prvkov na obrazovke' : 'Screen Elements Guide'}</span>
                <span>→</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => setActiveMainTab('keys')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 hover:text-white border border-cyan-500/40 font-bold transition-all cursor-pointer shadow-md"
              >
                <span>←</span>
                <span>{lang === 'sk' ? 'Späť na klávesové skratky' : 'Back to Keyboard Controls'}</span>
              </button>
              <button
                onClick={closeHelp}
                className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                {lang === 'sk' ? 'Rozumiem (OK)' : 'Got it (OK)'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
