import { panoConfig } from '../config/panoConfig';
import React, { useMemo, useState, useEffect } from 'react';
import {
  cleanPanoPath,
  getResolutionCategory,
  getHorizontalK,
  getMegapixels,
  getPanoramaGpsStatus,
  type Panorama,
  type GpsStatus,
} from '../types';
import { useAdmin } from '../context/AdminContext';
import { useTranslation } from 'react-i18next';
import { getPopularTags, normalizeText, extractPanoramaTags } from '../utils/tags';
import { SCENE_MOODS } from '../utils/sceneIntel';
import { GpsStatusBadge } from './GpsStatusBadge';
import { AdminSmartGpsModal } from './AdminSmartGpsModal';
import { AdminTagEditorModal } from './AdminTagEditorModal';
import {
  Calendar,
  Layers,
  Search,
  ChevronLeft,
  Compass,
  Lock,
  FolderLock,
  Folder,
  FolderOpen,
  Eye,
  Maximize2,
  Sparkles,
  CheckSquare,
  Square,
  Globe2,
  Trash2,
  RotateCcw,
  Heart,
  Navigation,
  Tag,
  LayoutGrid,
  Filter,
  HardDrive,
  History,
} from 'lucide-react';

interface SidebarFilterProps {
  panoramas: Panorama[];
  allPanoramas?: Panorama[];
  filteredPanoramas?: Panorama[];
  onSelectPanorama?: (pano: Panorama) => void;
  selectedYears?: string[];
  onToggleYear?: (year: string) => void;
  onClearYears?: () => void;
  selectedMonths?: string[];
  onToggleMonth?: (month: string) => void;
  onClearMonths?: () => void;
  selectedResolutions?: string[];
  onToggleResolution?: (res: string) => void;
  onClearResolutions?: () => void;
  // Multi-tag selection filter props
  selectedTags?: string[];
  onToggleTag?: (tag: string) => void;
  onClearTags?: () => void;
  // AI Moods filter props
  selectedMoods?: string[];
  onToggleMood?: (moodId: string) => void;
  onClearMoods?: () => void;
  // Favorites filter props
  onlyFavorites?: boolean;
  onToggleOnlyFavorites?: () => void;
  favoritesCount?: number;
  // Timeline clusters filter props
  onlyTimelineClusters?: boolean;
  onToggleOnlyTimelineClusters?: () => void;
  timelineClustersCount?: number;
  // Backward compatibility props
  selectedYear?: string;
  onSelectYear?: (year: string) => void;
  selectedResolution?: string;
  onSelectResolution?: (res: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filteredCount: number;
  totalCount: number;
  onShareMap: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  isViewerOpen?: boolean;
  isDeletedMode?: boolean;
  onOpenSmartGps?: (panos: Panorama[]) => void;
}

const MONTH_KEYS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

export const SidebarFilter: React.FC<SidebarFilterProps> = ({
  panoramas,
  allPanoramas = [],
  filteredPanoramas,
  onSelectPanorama,
  selectedYears = [],
  onToggleYear,
  onClearYears,
  selectedMonths = [],
  onToggleMonth,
  onClearMonths,
  selectedResolutions = [],
  onToggleResolution,
  onClearResolutions,
  selectedTags = [],
  onToggleTag,
  onClearTags,
  selectedMoods = [],
  onToggleMood,
  onClearMoods,
  onlyFavorites = false,
  onToggleOnlyFavorites,
  favoritesCount = 0,
  onlyTimelineClusters = false,
  onToggleOnlyTimelineClusters,
  timelineClustersCount = 0,
  selectedYear,
  onSelectYear,
  selectedResolution,
  onSelectResolution,
  searchQuery,
  onSearchChange,
  filteredCount,
  totalCount,
  onShareMap,
  isOpen,
  onToggleOpen,
  isViewerOpen = false,
  isDeletedMode = false,
  onOpenSmartGps,
}) => {
  const { t, i18n } = useTranslation();
  const isSk = i18n.language.startsWith('sk');
  const {
    isAdmin,
    isPanoSelected,
    toggleSelectPano,
    selectPanos,
    deselectPanos,
    togglePanoramaPublic,
    batchUpdatePanoramas,
    deletePanorama,
    restorePanorama,
    setShowAdminModal,
  } = useAdmin();

  // Normalize multi-select states with fallback to single-select props
  const activeYears = useMemo(() => {
    if (selectedYears && selectedYears.length > 0) return selectedYears;
    if (selectedYear && selectedYear !== 'all') return [selectedYear];
    return [];
  }, [selectedYears, selectedYear]);

  const activeResolutions = useMemo(() => {
    if (selectedResolutions && selectedResolutions.length > 0) return selectedResolutions;
    if (selectedResolution && selectedResolution !== 'all') return [selectedResolution];
    return [];
  }, [selectedResolutions, selectedResolution]);

  const [activeTab, setActiveTab] = useState<'public' | 'private'>(() => {
    if (isDeletedMode) return 'private';
    return isAdmin && totalCount === 0 ? 'private' : 'public';
  });

  React.useEffect(() => {
    if (isDeletedMode) {
      setActiveTab('private');
    }
  }, [isDeletedMode]);

  const [visiblePhotosCount, setVisiblePhotosCount] = useState<number>(40);
  const [privateSearch, setPrivateSearch] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setVisiblePhotosCount(40);
  }, [searchQuery, activeYears, selectedMonths, selectedResolutions, onlyFavorites, onlyTimelineClusters, selectedTags]);

  // Compute available years and counts from GPS panoramas
  const yearCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    panoramas.forEach((p) => {
      if (p.lat !== null && p.lon !== null && !(p.lat === 0 && p.lon === 0) && p.date) {
        try {
          const yr = new Date(p.date).getFullYear().toString();
          if (yr && !isNaN(Number(yr))) {
            counts[yr] = (counts[yr] || 0) + 1;
          }
        } catch {}
      }
    });

    const sortedYears = Object.keys(counts).sort((a, b) => b.localeCompare(a));
    return { counts, sortedYears };
  }, [panoramas]);

  // Compute available months and counts from GPS panoramas
  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    panoramas.forEach((p) => {
      if (p.lat !== null && p.lon !== null && !(p.lat === 0 && p.lon === 0) && p.date) {
        try {
          const d = new Date(p.date);
          if (!isNaN(d.getTime())) {
            const m = String(d.getMonth() + 1).padStart(2, '0');
            counts[m] = (counts[m] || 0) + 1;
          }
        } catch {}
      }
    });
    return counts;
  }, [panoramas]);

  // Compute resolution counts for public panoramas
  const publicResCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    panoramas.forEach((p) => {
      const cat = getResolutionCategory(p.width);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const order = ['15K', '14K', '13K', '12K', '11K', '10K', '9K', '8K', '7K', '6K', '5K', '4K', '3K'];
    const sorted = order.filter((r) => counts[r]);
    return { counts, sorted };
  }, [panoramas]);

  // Compute popular and query-matching hashtags from panoramas for quick search suggestions (dynamic drill-down)
  const dynamicTags = useMemo(() => {
    // Source panoramas for sibling tags: filteredPanoramas (or panoramas if empty/initial)
    const sourcePanos = filteredPanoramas && filteredPanoramas.length > 0 ? filteredPanoramas : panoramas;
    const availableTags = getPopularTags(sourcePanos);
    const availableMap = new Map(availableTags.map((t) => [t.tag.toLowerCase(), t.count]));

    const q = searchQuery.toLowerCase().trim().replace(/^#/, '');
    const normalizedSelected = selectedTags.map((t) =>
      t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`
    );

    const result: { tag: string; count: number; isSelected: boolean }[] = [];

    // 1. Put all selected tags first with isSelected: true
    for (const selTag of selectedTags) {
      const norm = selTag.startsWith('#') ? selTag.toLowerCase() : `#${selTag.toLowerCase()}`;
      const count = availableMap.get(norm) ?? (filteredPanoramas ? filteredPanoramas.length : 0);
      result.push({
        tag: selTag.startsWith('#') ? selTag : `#${selTag}`,
        count,
        isSelected: true,
      });
    }

    // 2. Add available tags from current filtered pool that aren't already selected
    for (const { tag, count } of availableTags) {
      const norm = tag.toLowerCase();
      if (normalizedSelected.includes(norm)) continue;

      // If user typed search query, filter by query
      if (q) {
        const clean = norm.replace(/^#/, '');
        if (!clean.includes(q)) continue;
      }

      result.push({
        tag,
        count,
        isSelected: false,
      });

      if (result.length >= 60) break;
    }

    return result;
  }, [panoramas, filteredPanoramas, selectedTags, searchQuery]);

  const handleTagClick = (tag: string) => {
    if (onToggleTag) {
      onToggleTag(tag);
    } else {
      const isSelected = searchQuery.toLowerCase().trim() === tag.toLowerCase();
      onSearchChange(isSelected ? '' : tag);
    }
    if (searchQuery.trim().startsWith('#')) {
      onSearchChange('');
    }
  };

  const [selectedPrivateYear, setSelectedPrivateYear] = useState<string>('all');
  const [selectedPrivateMonth, setSelectedPrivateMonth] = useState<string>('all');
  const [selectedPrivateResolution, setSelectedPrivateResolution] = useState<string>('all');
  const [selectedPrivateGpsStatus, setSelectedPrivateGpsStatus] = useState<'all' | GpsStatus>('all');
  const [privateViewMode, setPrivateViewMode] = useState<'folders' | 'tiles'>('folders');
  const [smartGpsPanos, setSmartGpsPanos] = useState<Panorama[] | null>(null);
  const [showTagModal, setShowTagModal] = useState<boolean>(false);
  const [visiblePrivateTilesCount, setVisiblePrivateTilesCount] = useState<number>(40);

  // Raw list of private or deleted panoramas
  const rawPrivatePanoramas = useMemo(() => {
    return allPanoramas.filter((p) => {
      if (isDeletedMode) {
        return p.is_deleted || p.folder === '!DELETED!';
      }
      return p.is_private && !p.is_deleted && p.folder !== '!DELETED!';
    });
  }, [allPanoramas, isDeletedMode]);

  // Selected private panoramas
  const selectedPrivatePanos = useMemo(() => {
    return rawPrivatePanoramas.filter((p) => isPanoSelected(String(p.id)));
  }, [rawPrivatePanoramas, isPanoSelected]);

  // Selected public panoramas
  const selectedPublicPanos = useMemo(() => {
    return (filteredPanoramas || []).filter((p) => isPanoSelected(String(p.id)));
  }, [filteredPanoramas, isPanoSelected]);

  // Compute GPS status counts for private panoramas
  const privateGpsCounts = useMemo(() => {
    const counts: Record<GpsStatus, number> = {
      original_exif: 0,
      manual_editor: 0,
      auto_needs_review: 0,
      no_gps: 0,
    };
    rawPrivatePanoramas.forEach((p) => {
      const st = getPanoramaGpsStatus(p);
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [rawPrivatePanoramas]);

  // Compute resolution counts for private panoramas
  const privateResCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rawPrivatePanoramas.forEach((p) => {
      const cat = getResolutionCategory(p.width);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const order = ['15K', '14K', '13K', '12K', '11K', '10K', '9K', '8K', '7K', '6K', '5K', '4K', '3K', '2K', '1K'];
    const sorted = order.filter((r) => counts[r]);
    return { counts, sorted };
  }, [rawPrivatePanoramas]);

  // Extract unique years present in private panoramas
  const privateYears = useMemo(() => {
    const years = new Set<string>();
    rawPrivatePanoramas.forEach((p) => {
      if (p.folder) {
        const m = p.folder.match(/^(20\d\d)/);
        if (m) years.add(m[1]);
      }
      if (p.date) {
        const m = p.date.match(/^(20\d\d)/);
        if (m) years.add(m[1]);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [rawPrivatePanoramas]);

  // Extract unique months present in private panoramas
  const privateMonths = useMemo(() => {
    const months = new Set<string>();
    rawPrivatePanoramas.forEach((p) => {
      if (p.date) {
        try {
          const d = new Date(p.date);
          if (!isNaN(d.getTime())) {
            months.add(String(d.getMonth() + 1).padStart(2, '0'));
          }
        } catch {}
      }
    });
    return Array.from(months).sort();
  }, [rawPrivatePanoramas]);

  // Filter private panoramas across GPS status, year, month, resolution, and search
  const filteredPrivatePanoramas = useMemo(() => {
    let result = rawPrivatePanoramas;

    if (selectedPrivateGpsStatus !== 'all') {
      result = result.filter((p) => getPanoramaGpsStatus(p) === selectedPrivateGpsStatus);
    }

    if (selectedPrivateYear !== 'all') {
      result = result.filter((p) => {
        if (p.folder && p.folder.startsWith(selectedPrivateYear)) return true;
        if (p.date && p.date.startsWith(selectedPrivateYear)) return true;
        return false;
      });
    }

    if (selectedPrivateMonth !== 'all') {
      result = result.filter((p) => {
        if (!p.date) return false;
        try {
          const d = new Date(p.date);
          return String(d.getMonth() + 1).padStart(2, '0') === selectedPrivateMonth;
        } catch {
          return false;
        }
      });
    }

    if (selectedPrivateResolution !== 'all') {
      result = result.filter((p) => getResolutionCategory(p.width) === selectedPrivateResolution);
    }

    const q = normalizeText(privateSearch);
    if (q) {
      result = result.filter((p) => {
        const fn = normalizeText(p.filename || '');
        const origFn = normalizeText(p.original_filename || '');
        const folder = normalizeText(p.folder || '');
        const date = normalizeText(p.date || '');
        const city = normalizeText(p.city || '');
        const country = normalizeText(p.country || '');
        const cleanQuery = q.startsWith('#') ? q.slice(1) : q;
        const tags = extractPanoramaTags(p).map((t) => normalizeText(t));
        const tagMatch = tags.some((t) => t.includes(cleanQuery) || t === q);
        return (
          fn.includes(q) ||
          origFn.includes(q) ||
          folder.includes(q) ||
          date.includes(q) ||
          city.includes(q) ||
          country.includes(q) ||
          tagMatch
        );
      });
    }

    return result;
  }, [
    rawPrivatePanoramas,
    selectedPrivateGpsStatus,
    selectedPrivateYear,
    selectedPrivateMonth,
    selectedPrivateResolution,
    privateSearch,
  ]);

  // Deriving grouped folders from filteredPrivatePanoramas
  const filteredPrivateFolders = useMemo(() => {
    const folderMap = new Map<string, Panorama[]>();
    filteredPrivatePanoramas.forEach((p) => {
      let folder = p.folder;
      if (!folder || folder === 'Private Archive' || folder === 'Uncategorized') {
        if (p.city && p.city !== 'Unknown') {
          folder = p.city;
        } else {
          folder = isDeletedMode ? '!DELETED!' : (folder || 'Uncategorized');
        }
      }
      if (!folderMap.has(folder)) {
        folderMap.set(folder, []);
      }
      folderMap.get(folder)!.push(p);
    });

    return Array.from(folderMap.entries())
      .map(([folder, items]) => ({ folder, items }))
      .sort((a, b) => a.folder.localeCompare(b.folder));
  }, [filteredPrivatePanoramas, isDeletedMode]);

  const totalPrivateCount = rawPrivatePanoramas.length;
  const totalMatchedPhotos = filteredPrivatePanoramas.length;

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => {
      const current = privateSearch.trim() ? (prev[folderName] !== false) : !!prev[folderName];
      return {
        ...prev,
        [folderName]: !current,
      };
    });
  };

  const handleYearClick = (year: string) => {
    if (onToggleYear) {
      onToggleYear(year);
    } else if (onSelectYear) {
      onSelectYear(activeYears.includes(year) ? 'all' : year);
    }
  };

  const handleResolutionClick = (res: string) => {
    if (onToggleResolution) {
      onToggleResolution(res);
    } else if (onSelectResolution) {
      onSelectResolution(activeResolutions.includes(res) ? 'all' : res);
    }
  };

  return (
    <>
      {/* Toggle button when closed (hidden on mobile landscape due to lack of vertical space) */}
      {!isViewerOpen && (
        <button
          onClick={onToggleOpen}
          data-help="sidebar_toggle"
          className={`fixed top-20 left-4 z-[1000] p-3 rounded-2xl glass-panel text-white hover:text-cyan-400 hover:border-cyan-500/50 shadow-xl transition-all duration-300 max-md:landscape:hidden ${
            isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          title="Open Explorer Sidebar"
        >
          <Layers className="w-5 h-5" />
        </button>
      )}

      {/* Main Sidebar Panel */}
      <div
        className={`fixed ${
          isViewerOpen ? 'top-0 z-[2100]' : 'top-14 z-[1200]'
        } bottom-0 left-0 w-full max-w-[22rem] md:max-w-[24rem] bg-[#090a0f]/95 backdrop-blur-2xl border-r border-white/10 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-inner ${
                isDeletedMode
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : activeTab === 'private'
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
              }`}
            >
              {isDeletedMode ? (
                <Trash2 className="w-4 h-4" />
              ) : activeTab === 'private' ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Compass className="w-4 h-4 animate-spin-slow" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                {isDeletedMode
                  ? t('deleted_panos')
                  : activeTab === 'private'
                  ? t('private')
                  : t('app_title')}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {isDeletedMode
                  ? '!DELETED! Folder'
                  : activeTab === 'private'
                  ? 'Confidential Folders'
                  : t('gps_panos')}
              </p>
            </div>
          </div>
          <button
            onClick={onToggleOpen}
            className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title={t('close')}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher / Deleted Banner */}
        {isDeletedMode ? (
          <div className="flex p-2.5 bg-rose-950/40 border-b border-rose-500/30 items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold text-rose-200">{t('deleted_panos')}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
              {totalPrivateCount}
            </span>
          </div>
        ) : isAdmin && (
          <div className="flex p-2 bg-zinc-950/60 border-b border-white/10 gap-1.5 shrink-0">
            <button
              onClick={() => setActiveTab('public')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'public'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{t('tab_map_gps')} ({totalCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('private')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'private'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-rose-300 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>{t('tab_archive_folders')} ({totalPrivateCount})</span>
            </button>
          </div>
        )}

        {/* Scrollable Container for Tab Content on Mobile */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
          {/* Public Tab View */}
          {activeTab === 'public' ? (
          <>
            {/* Stats Counter Banner */}
            <div className="p-4 bg-gradient-to-br from-cyan-950/40 via-zinc-900/50 to-zinc-950/60 border-b border-white/10 shrink-0">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs text-zinc-400 font-medium">{t('gps_panos')}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {activeYears.length === 0
                    ? t('filter_all_years')
                    : activeYears.length === 1
                    ? activeYears[0]
                    : `${activeYears.length} ${t('filter_years').toLowerCase()}`}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {filteredCount.toLocaleString()}
                </span>
                {filteredCount !== totalCount && (
                  <span className="text-xs text-zinc-400">
                    of <span className="text-zinc-300">{totalCount.toLocaleString()}</span> total
                  </span>
                )}
              </div>
            </div>

            {/* If all panoramas are private and user is not admin, show informative sign-in banner */}
            {!isAdmin && totalPrivateCount > 0 && totalCount === 0 && (
              <div className="p-4 mx-3 my-3 rounded-2xl bg-gradient-to-br from-rose-950/40 via-zinc-900/60 to-black/60 border border-rose-500/30 text-center space-y-2.5 shadow-lg shrink-0">
                <div className="w-10 h-10 mx-auto rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white">{t('all_private_banner', { count: totalPrivateCount })}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdminModal(true)}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white shadow-md shadow-rose-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{t('admin_login')}</span>
                </button>
              </div>
            )}

            {/* Search input */}
            <div className="p-3 border-b border-white/10 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  data-help="filter_search"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={t('search_placeholder')}
                  className="w-full bg-zinc-900/80 border border-white/10 focus:border-cyan-500/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Dynamic Hashtag Suggestions (Dedicated 3 rows, Multi-Select AND filter) */}
              {dynamicTags.length > 0 && (
                <div className="mt-2.5 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium px-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
                      <span>Hashtags</span>
                      {selectedTags.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {selectedTags.length} aktívne
                        </span>
                      )}
                      {searchQuery.trim() && (
                        <span className="text-cyan-400 font-mono text-[9px]">• filter</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedTags.length > 0 && onClearTags && (
                        <button
                          type="button"
                          onClick={onClearTags}
                          className="text-cyan-400 hover:text-white transition-colors text-[9px] underline cursor-pointer"
                        >
                          {t('reset_filters', 'Reset')}
                        </button>
                      )}
                      <span className="text-[9px] text-zinc-500 font-mono">{dynamicTags.length} tagov</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar flex flex-nowrap items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5 whitespace-nowrap">
                    {dynamicTags.map(({ tag, count, isSelected }) => {
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleTagClick(tag)}
                          className={`h-6 px-2 py-0.5 rounded-lg shrink-0 font-mono text-[10px] transition-all cursor-pointer flex items-center gap-1 border ${
                            isSelected
                              ? 'bg-cyan-500 text-zinc-950 border-cyan-300 font-bold shadow-xs'
                              : 'bg-white/5 text-zinc-300 border-white/10 hover:border-cyan-400/50 hover:text-cyan-300 hover:bg-white/10'
                          }`}
                          title={`${tag} (${count} panoramas)`}
                        >
                          <span>{tag}</span>
                          <span className={`${isSelected ? 'text-zinc-900 font-bold' : 'opacity-60'} text-[9px]`}>
                            ({count})
                          </span>
                          {isSelected && (
                            <span className="ml-0.5 text-zinc-950 font-black">✕</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* AI Atmospheric Mood Chips */}
            <div className="px-3 py-1.5 border-b border-white/10 bg-zinc-950/30 shrink-0">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {isSk ? 'AI Nálada & Atmosféra' : 'AI Atmospheric Moods'}
                </span>
                {selectedMoods.length > 0 && (
                  <button
                    onClick={() => onClearMoods ? onClearMoods() : selectedMoods.forEach((m) => onToggleMood?.(m))}
                    className="text-amber-400 hover:text-white transition-colors text-[9px] underline cursor-pointer"
                  >
                    Reset ({selectedMoods.length})
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                {SCENE_MOODS.map((mood) => {
                  const isSelected = selectedMoods.includes(mood.id);
                  return (
                    <button
                      key={mood.id}
                      type="button"
                      onClick={() => onToggleMood?.(mood.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold shrink-0 transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-amber-500/25 text-amber-300 border-amber-400/80 shadow-xs ring-1 ring-amber-400/50'
                          : 'bg-white/5 text-zinc-300 border-white/10 hover:border-amber-400/40 hover:text-white hover:bg-white/10'
                      }`}
                      title={isSk ? mood.descriptionSk : mood.descriptionEn}
                    >
                      <span>{mood.icon}</span>
                      <span>{isSk ? mood.labelSk : mood.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Multi-Select Filters: Favorites, Resolution, Years & Months */}
            <div className="px-3 py-2 border-b border-white/10 space-y-2 bg-zinc-950/40 shrink-0">
              {/* Favorites toggle chip */}
              <div className="grid grid-cols-2 gap-1.5 pb-0.5">
                <button
                  type="button"
                  data-help="filter_favorites"
                  onClick={() => onToggleOnlyFavorites?.()}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer justify-between ${
                    onlyFavorites
                      ? 'bg-rose-500/25 text-rose-300 border border-rose-500/60 shadow-md shadow-rose-950/50'
                      : 'bg-white/5 text-zinc-300 border border-white/10 hover:border-rose-400/50 hover:text-white hover:bg-rose-500/10'
                  }`}
                  title={t('favorites_only')}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Heart className={`w-3.5 h-3.5 shrink-0 transition-transform ${onlyFavorites ? 'fill-rose-500 text-rose-500 scale-110' : 'text-rose-400'}`} />
                    <span className="truncate">{t('favorites_only')}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold border shrink-0 ${
                    onlyFavorites ? 'bg-rose-500/30 text-rose-200 border-rose-500/50' : 'bg-white/10 text-zinc-400 border-white/10'
                  }`}>
                    {favoritesCount}
                  </span>
                </button>

                <button
                  type="button"
                  data-help="filter_timeline_clusters"
                  onClick={() => onToggleOnlyTimelineClusters?.()}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer justify-between ${
                    onlyTimelineClusters
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 shadow-md shadow-amber-950/50'
                      : 'bg-white/5 text-zinc-300 border border-white/10 hover:border-amber-400/50 hover:text-white hover:bg-amber-500/10'
                  }`}
                  title={isSk ? 'Zobraziť len časové osi (lokality s viacerými zábermi)' : 'Timeline clusters only'}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <History className={`w-3.5 h-3.5 shrink-0 transition-transform ${onlyTimelineClusters ? 'text-amber-400 scale-110' : 'text-amber-400/70'}`} />
                    <span className="truncate">{isSk ? 'Časové osi' : 'Timeline'}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold border shrink-0 ${
                    onlyTimelineClusters ? 'bg-amber-500/30 text-amber-200 border-amber-500/50' : 'bg-white/10 text-zinc-400 border-white/10'
                  }`}>
                    {timelineClustersCount}
                  </span>
                </button>
              </div>

              {/* Resolution filter chips (multi-select) */}
              <div data-help="filter_resolutions" className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Maximize2 className="w-3 h-3 text-cyan-400" />
                    {t('filter_resolution')}
                  </span>
                  {activeResolutions.length > 0 && (
                    <button
                      onClick={() => onClearResolutions?.()}
                      className="text-cyan-400 hover:text-white transition-colors text-[9px] underline cursor-pointer"
                    >
                      {t('reset_filters', 'Reset')}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5">
                  <button
                    onClick={() => onClearResolutions?.()}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                      activeResolutions.length === 0
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {t('filter_all')}
                  </button>
                  {publicResCounts.sorted.map((res) => {
                    const isSelected = activeResolutions.includes(res);
                    const count = publicResCounts.counts[res];
                    if (res === '15K') {
                      return (
                        <button
                          key={res}
                          onClick={() => handleResolutionClick(res)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-zinc-950 shadow-md ring-1 ring-amber-300'
                              : 'bg-amber-400/15 text-amber-300 border border-amber-400/30 hover:bg-amber-400/25'
                          }`}
                          title="15K Ultra-Resolution Panoramas (15000-15999px wide)"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>15K</span>
                          <span className={`text-[9px] px-1 rounded-full ${isSelected ? 'bg-zinc-950/30 text-zinc-950' : 'bg-amber-400/20 text-amber-200'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    }
                    return (
                      <button
                        key={res}
                        onClick={() => handleResolutionClick(res)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                            : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <span>{res}</span>
                        <span className="text-[9px] text-zinc-500 font-normal">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Compressed Year filter chips (multi-select, single row scroll) */}
              <div data-help="filter_years" className="space-y-1 pt-1 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-cyan-400" />
                    {t('filter_years')}
                  </span>
                  {activeYears.length > 0 && (
                    <button
                      onClick={() => onClearYears?.()}
                      className="text-cyan-400 hover:text-white transition-colors text-[9px] underline cursor-pointer"
                    >
                      {t('reset_filters', 'Reset')}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5">
                  <button
                    onClick={() => onClearYears?.()}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                      activeYears.length === 0
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {t('filter_all')}
                  </button>
                  {yearCounts.sortedYears.map((year) => {
                    const isSelected = activeYears.includes(year);
                    const count = yearCounts.counts[year];
                    return (
                      <button
                        key={year}
                        onClick={() => handleYearClick(year)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                            : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <span>{year}</span>
                        <span className="text-[9px] text-zinc-500 font-normal">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Compressed Month filter chips (multi-select, single row scroll) */}
              <div data-help="filter_months" className="space-y-1 pt-1 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-cyan-400" />
                    {t('filter_months')}
                  </span>
                  {selectedMonths.length > 0 && (
                    <button
                      onClick={() => onClearMonths?.()}
                      className="text-cyan-400 hover:text-white transition-colors text-[9px] underline cursor-pointer"
                    >
                      {t('reset_filters', 'Reset')}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5">
                  <button
                    onClick={() => onClearMonths?.()}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                      selectedMonths.length === 0
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {t('filter_all')}
                  </button>
                  {MONTH_KEYS.map((m) => {
                    const isSelected = selectedMonths.includes(m);
                    const count = monthCounts[m] || 0;
                    const monthNum = parseInt(m, 10);
                    const label = t(`month_${monthNum}`);
                    return (
                      <button
                        key={m}
                        disabled={count === 0}
                        onClick={() => onToggleMonth?.(m)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                          count === 0
                            ? 'opacity-30 cursor-not-allowed bg-white/5 text-zinc-600'
                            : isSelected
                            ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm'
                            : 'bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10'
                        }`}
                        title={`${label} (${count})`}
                      >
                        <span className="truncate">{label}</span>
                        {count > 0 && <span className="text-[8px] text-zinc-400">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Selected Public Items Action Banner */}
            {isAdmin && selectedPublicPanos.length > 0 && (
              <div className="p-2.5 bg-gradient-to-r from-rose-500/20 via-cyan-500/15 to-zinc-900 border-b border-rose-500/30 flex items-center justify-between gap-1.5 shrink-0 text-xs animate-slide-up">
                <div className="flex items-center gap-1.5 font-bold text-white text-[11px] truncate">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                  <span>Vybrané: {selectedPublicPanos.length}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenSmartGps) onOpenSmartGps(selectedPublicPanos);
                      else setSmartGpsPanos(selectedPublicPanos);
                    }}
                    className="px-2 py-1 rounded-lg bg-amber-500 text-zinc-950 font-bold text-[10px] flex items-center gap-1 shadow-md hover:bg-amber-400 cursor-pointer transition-all"
                    title="Otvoriť Smart GPS editor pre vybrané panorámy"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Smart GPS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTagModal(true)}
                    className="px-2 py-1 rounded-lg bg-purple-500/25 hover:bg-purple-500/40 text-purple-200 border border-purple-500/40 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                    title="Upraviť tagy pre vybrané (Kláves T)"
                  >
                    <Tag className="w-3 h-3 text-purple-300" />
                    <span>Tagy</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ids = selectedPublicPanos.map((p) => String(p.id));
                      const res = await batchUpdatePanoramas({ ids, is_private: true });
                      if (res.success && res.count > 0) {
                        deselectPanos(ids);
                      }
                    }}
                    className="px-2 py-1 rounded-lg bg-rose-500/25 hover:bg-rose-500/40 text-rose-200 border border-rose-500/40 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                    title={t('make_private', 'Presunúť do súkromných')}
                  >
                    <Lock className="w-3 h-3 text-rose-400" />
                    <span>Súkromné</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deselectPanos(selectedPublicPanos.map((p) => String(p.id)))}
                    className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
                    title="Zrušiť výber"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Filtered Photos List View */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                {filteredPanoramas && filteredPanoramas.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {filteredPanoramas.slice(0, visiblePhotosCount).map((pano) => {
                        const cleanFilename = cleanPanoPath(pano.filename);
                        const thumbPath = `/thumbnails/${cleanFilename}`;
                        const resCat = getResolutionCategory(pano.width);

                        return (
                          <div
                            key={pano.id}
                            onClick={() => onSelectPanorama?.(pano)}
                            className="group relative aspect-[16/10] rounded-xl overflow-hidden bg-zinc-900 border border-white/10 hover:border-cyan-400/60 transition-all text-left flex flex-col justify-end p-2 cursor-pointer shadow-md"
                          >
                            {/* Offline Archive Fallback Badge & Placeholder */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 p-2 text-center pointer-events-none">
                              <div className="w-7 h-7 rounded-lg bg-zinc-800/90 border border-white/10 flex items-center justify-center mb-1 text-zinc-400 group-hover:text-cyan-400 group-hover:border-cyan-400/40 transition-colors">
                                <HardDrive className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-bold text-zinc-300 line-clamp-1">{pano.folder || pano.filename.split('/').pop()}</span>
                              <span className="text-[8px] text-zinc-400 font-medium">Offline archív ({pano.original_filepath ? pano.original_filepath.slice(0, 2) : 'E:'})</span>
                            </div>

                            <img
                              src={thumbPath}
                              alt={pano.filename}
                              onError={(e) => {
                                const target = e.currentTarget;
                                const clean = cleanPanoPath(pano.filename);
                                if (!target.src.includes('/panoramas_2k/')) {
                                  target.src = `/panoramas_2k/${clean}`;
                                } else if (!target.src.includes('r2-panoramas.trusik.link')) {
                                  target.src = `${panoConfig.storage.thumbnailsUrl}/${clean}`;
                                } else {
                                  target.style.display = 'none';
                                }
                              }}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none" />

                            {/* Top info & badges */}
                            <div className="relative z-10 flex items-start justify-between gap-1.5">
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-white truncate drop-shadow-md">
                                  {pano.city && pano.city !== 'Unknown' ? pano.city : pano.original_filename || pano.filename}
                                </p>
                                <p className="text-[9px] text-zinc-300 truncate drop-shadow-sm">
                                  {pano.country && pano.country !== 'Unknown' ? pano.country : ''}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {resCat === '15K' ? (
                                  <div className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-400 to-yellow-400 text-zinc-950 font-black text-[9px] flex items-center gap-0.5 shadow-md border border-amber-300">
                                    <Sparkles className="w-2.5 h-2.5 text-zinc-950 fill-zinc-950" />
                                    <span>15K</span>
                                  </div>
                                ) : (
                                  <div className="px-1 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-zinc-200 border border-white/20 text-[9px] font-bold">
                                    {resCat}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Admin Multi-select Checkbox */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleSelectPano(String(pano.id));
                                }}
                                className={`absolute bottom-1.5 left-1.5 z-20 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                  isPanoSelected(String(pano.id))
                                    ? 'bg-cyan-500 text-zinc-950 shadow-md ring-2 ring-cyan-300'
                                    : 'bg-black/60 text-white/70 hover:text-white border border-white/30 hover:border-cyan-400'
                                }`}
                                title={isPanoSelected(String(pano.id)) ? 'Deselect panorama' : 'Select panorama'}
                              >
                                {isPanoSelected(String(pano.id)) ? (
                                  <CheckSquare className="w-3.5 h-3.5" />
                                ) : (
                                  <Square className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {/* Direct Quick Actions: GPS & Make Private */}
                            {isAdmin && (
                              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (onOpenSmartGps) onOpenSmartGps([pano]);
                                    else setSmartGpsPanos([pano]);
                                  }}
                                  className="px-1.5 py-0.5 rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[9px] flex items-center gap-0.5 shadow-md border border-amber-300 transition-all cursor-pointer"
                                  title="Upraviť GPS polohu tejto panorámy"
                                >
                                  <Navigation className="w-2.5 h-2.5" />
                                  <span>GPS</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    togglePanoramaPublic(pano.id, false);
                                  }}
                                  className="px-1.5 py-0.5 rounded-md bg-rose-600/95 hover:bg-rose-500 text-white font-bold text-[9px] flex items-center gap-0.5 shadow-md backdrop-blur-md border border-rose-400 transition-all cursor-pointer"
                                  title={t('make_private', 'Presunúť do súkromných')}
                                >
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Priv</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {filteredPanoramas.length > visiblePhotosCount && (
                      <button
                        onClick={() => setVisiblePhotosCount((prev) => prev + 40)}
                        className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-cyan-300 border border-white/10 transition-colors mt-2 cursor-pointer"
                      >
                        Load More ({filteredPanoramas.length - visiblePhotosCount} remaining)
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-zinc-500 text-xs space-y-2">
                    <p>{t('no_panos_match')}</p>
                    <button
                      onClick={() => {
                        onClearYears?.();
                        onClearMonths?.();
                        onClearResolutions?.();
                        onSearchChange('');
                      }}
                      className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold cursor-pointer"
                    >
                      {t('reset_filters')}
                    </button>
                  </div>
                )}
              </div>
          </>
        ) : (
          /* Private Tab View (Admin Mode) */
          <>
            <div className="p-3 border-b border-white/10 space-y-2.5 shrink-0 bg-zinc-950/40">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={privateSearch}
                  onChange={(e) => setPrivateSearch(e.target.value)}
                  placeholder="Filter private folders & files..."
                  className="w-full bg-zinc-900/80 border border-white/10 focus:border-rose-500/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500/40 transition-all"
                />
                {privateSearch && (
                  <button
                    onClick={() => setPrivateSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* View Mode Toggle: Real Folders vs Filtered Tiles */}
              <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setPrivateViewMode('folders')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    privateViewMode === 'folders'
                      ? 'bg-rose-500/30 text-rose-200 border border-rose-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Reálne Zložky ({filteredPrivateFolders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrivateViewMode('tiles')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    privateViewMode === 'tiles'
                      ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Dlaždice ({filteredPrivatePanoramas.length})</span>
                </button>
              </div>

              {/* 4-State GPS Status Filters */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium px-0.5">
                  <span className="font-semibold text-zinc-300">Stav GPS</span>
                  {selectedPrivateGpsStatus !== 'all' && (
                    <button
                      onClick={() => setSelectedPrivateGpsStatus('all')}
                      className="text-cyan-400 hover:underline cursor-pointer"
                    >
                      Reset GPS
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 text-[10px]">
                  <button
                    onClick={() => setSelectedPrivateGpsStatus('all')}
                    className={`px-2 py-0.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                      selectedPrivateGpsStatus === 'all'
                        ? 'bg-white/20 text-white border border-white/30 shadow-sm'
                        : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Všetky ({totalPrivateCount})
                  </button>
                  <button
                    onClick={() => setSelectedPrivateGpsStatus(selectedPrivateGpsStatus === 'no_gps' ? 'all' : 'no_gps')}
                    className={`px-2 py-0.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                      selectedPrivateGpsStatus === 'no_gps'
                        ? 'bg-rose-500 text-white shadow-md ring-1 ring-white/30'
                        : 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30'
                    }`}
                  >
                    <span>🔴 Bez GPS</span>
                    <span className="font-mono font-semibold">({privateGpsCounts.no_gps})</span>
                  </button>
                  <button
                    onClick={() => setSelectedPrivateGpsStatus(selectedPrivateGpsStatus === 'auto_needs_review' ? 'all' : 'auto_needs_review')}
                    className={`px-2 py-0.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                      selectedPrivateGpsStatus === 'auto_needs_review'
                        ? 'bg-amber-500 text-zinc-950 shadow-md ring-1 ring-white/30'
                        : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30'
                    }`}
                  >
                    <span>🟡 Na review</span>
                    <span className="font-mono font-semibold">({privateGpsCounts.auto_needs_review})</span>
                  </button>
                  <button
                    onClick={() => setSelectedPrivateGpsStatus(selectedPrivateGpsStatus === 'manual_editor' ? 'all' : 'manual_editor')}
                    className={`px-2 py-0.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                      selectedPrivateGpsStatus === 'manual_editor'
                        ? 'bg-cyan-500 text-zinc-950 shadow-md ring-1 ring-white/30'
                        : 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30'
                    }`}
                  >
                    <span>🔵 Editor</span>
                    <span className="font-mono font-semibold">({privateGpsCounts.manual_editor})</span>
                  </button>
                  <button
                    onClick={() => setSelectedPrivateGpsStatus(selectedPrivateGpsStatus === 'original_exif' ? 'all' : 'original_exif')}
                    className={`px-2 py-0.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                      selectedPrivateGpsStatus === 'original_exif'
                        ? 'bg-emerald-500 text-zinc-950 shadow-md ring-1 ring-white/30'
                        : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
                    }`}
                  >
                    <span>🟢 EXIF</span>
                    <span className="font-mono font-semibold">({privateGpsCounts.original_exif})</span>
                  </button>
                </div>
              </div>

              {/* Private Quick Filters: Year, Month & Resolution */}
              <div className="space-y-1.5 pt-0.5 border-t border-white/5">
                {/* Years Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
                  <button
                    onClick={() => setSelectedPrivateYear('all')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                      selectedPrivateYear === 'all'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                        : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    All Years
                  </button>
                  {privateYears.map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setSelectedPrivateYear(selectedPrivateYear === yr ? 'all' : yr)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold shrink-0 transition-all cursor-pointer ${
                        selectedPrivateYear === yr
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm font-bold'
                          : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>

                {/* Months Chips (if present) */}
                {privateMonths.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5 text-[9px]">
                    <button
                      onClick={() => setSelectedPrivateMonth('all')}
                      className={`px-1.5 py-0.5 rounded-md font-bold shrink-0 transition-all cursor-pointer ${
                        selectedPrivateMonth === 'all'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Mesiace
                    </button>
                    {privateMonths.map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelectedPrivateMonth(selectedPrivateMonth === m ? 'all' : m)}
                        className={`px-1.5 py-0.5 rounded-md font-semibold shrink-0 transition-all cursor-pointer ${
                          selectedPrivateMonth === m
                            ? 'bg-rose-500/30 text-rose-200 border border-rose-500/40 font-bold'
                            : 'bg-white/5 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}

                {/* Resolution Chips */}
                {privateResCounts.sorted.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5 text-[9px]">
                    <button
                      onClick={() => setSelectedPrivateResolution('all')}
                      className={`px-1.5 py-0.5 rounded-md font-bold shrink-0 transition-all cursor-pointer ${
                        selectedPrivateResolution === 'all'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Rozlíšenie
                    </button>
                    {privateResCounts.sorted.map((res) => (
                      <button
                        key={res}
                        onClick={() => setSelectedPrivateResolution(selectedPrivateResolution === res ? 'all' : res)}
                        className={`px-1.5 py-0.5 rounded-md font-semibold shrink-0 transition-all cursor-pointer ${
                          selectedPrivateResolution === res
                            ? 'bg-rose-500/30 text-rose-200 border border-rose-500/40 font-bold'
                            : 'bg-white/5 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Private Items Action Banner */}
            {isAdmin && selectedPrivatePanos.length > 0 && (
              <div className="p-2.5 bg-gradient-to-r from-amber-500/20 via-cyan-500/15 to-zinc-900 border-b border-cyan-500/30 flex items-center justify-between gap-1.5 shrink-0 text-xs animate-slide-up">
                <div className="flex items-center gap-1.5 font-bold text-white text-[11px] truncate">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                  <span>Vybrané: {selectedPrivatePanos.length}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenSmartGps) onOpenSmartGps(selectedPrivatePanos);
                      else setSmartGpsPanos(selectedPrivatePanos);
                    }}
                    className="px-2 py-1 rounded-lg bg-amber-500 text-zinc-950 font-bold text-[10px] flex items-center gap-1 shadow-md hover:bg-amber-400 cursor-pointer transition-all"
                    title="Otvoriť Smart GPS editor pre vybrané panorámy"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Smart GPS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTagModal(true)}
                    className="px-2 py-1 rounded-lg bg-purple-500/25 hover:bg-purple-500/40 text-purple-200 border border-purple-500/40 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                    title="Upraviť tagy pre vybrané (Kláves T)"
                  >
                    <Tag className="w-3 h-3 text-purple-300" />
                    <span>Tagy</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ids = selectedPrivatePanos.map((p) => String(p.id));
                      const res = await batchUpdatePanoramas({ ids, is_private: false, folder: null });
                      if (res.success && res.count > 0) {
                        deselectPanos(ids);
                      }
                    }}
                    className="px-2 py-1 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-500/40 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                    title="Publikovať vybrané"
                  >
                    <Globe2 className="w-3 h-3" />
                    <span>Publikovať</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deselectPanos(selectedPrivatePanos.map((p) => String(p.id)))}
                    className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
                    title="Zrušiť výber"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Content Area: Folders Mode OR Filtered Tiles Mode */}
            {privateViewMode === 'tiles' ? (
              /* Flat Filtered Tiles View */
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                {filteredPrivatePanoramas.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs space-y-2">
                    <p>Žiadne súkromné panorámy nezodpovedajú filtrom.</p>
                    <button
                      onClick={() => {
                        setSelectedPrivateGpsStatus('all');
                        setSelectedPrivateYear('all');
                        setSelectedPrivateMonth('all');
                        setSelectedPrivateResolution('all');
                        setPrivateSearch('');
                      }}
                      className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-semibold cursor-pointer"
                    >
                      Resetovať filtre
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {filteredPrivatePanoramas.slice(0, visiblePrivateTilesCount).map((p) => {
                        const cleanFilename = cleanPanoPath(p.filename);
                        const thumbPath = `/thumbnails/${cleanFilename}`;
                        const resCat = getResolutionCategory(p.width);
                        const gpsStatus = getPanoramaGpsStatus(p);

                        return (
                          <div
                            key={p.id}
                            onClick={() => onSelectPanorama?.(p)}
                            className="group relative aspect-[16/10] rounded-xl overflow-hidden bg-zinc-900 border border-white/10 hover:border-rose-400/60 transition-all text-left flex flex-col justify-end p-2 cursor-pointer shadow-md"
                          >
                            {/* Offline Archive Fallback Badge & Placeholder */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 p-2 text-center pointer-events-none">
                              <div className="w-7 h-7 rounded-lg bg-zinc-800/90 border border-white/10 flex items-center justify-center mb-1 text-zinc-400 group-hover:text-amber-400 group-hover:border-amber-400/40 transition-colors">
                                <HardDrive className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-bold text-zinc-300 line-clamp-1">{p.folder || p.filename.split('/').pop()}</span>
                              <span className="text-[8px] text-amber-400/90 font-medium">Offline archív ({p.original_filepath ? p.original_filepath.slice(0, 2) : 'E:'})</span>
                            </div>

                            <img
                              src={thumbPath}
                              alt={p.filename}
                              onError={(e) => {
                                const target = e.currentTarget;
                                const clean = cleanPanoPath(p.filename);
                                if (!target.src.includes('/panoramas_2k/')) {
                                  target.src = `/panoramas_2k/${clean}`;
                                } else if (!target.src.includes('r2-panoramas.trusik.link')) {
                                  target.src = `${panoConfig.storage.thumbnailsUrl}/${clean}`;
                                } else {
                                  target.style.display = 'none';
                                }
                              }}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent pointer-events-none" />

                            {/* Admin Multi-select Checkbox */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleSelectPano(String(p.id));
                                }}
                                className={`absolute top-1.5 left-1.5 z-20 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                  isPanoSelected(String(p.id))
                                    ? 'bg-cyan-500 text-zinc-950 shadow-md ring-2 ring-cyan-300'
                                    : 'bg-black/60 text-white/70 hover:text-white border border-white/30 hover:border-cyan-400'
                                }`}
                                title={isPanoSelected(String(p.id)) ? 'Deselect panorama' : 'Select panorama'}
                              >
                                {isPanoSelected(String(p.id)) ? (
                                  <CheckSquare className="w-3.5 h-3.5" />
                                ) : (
                                  <Square className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {/* Top-Right Badges: GPS Status & Resolution */}
                            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-20">
                              <GpsStatusBadge status={gpsStatus} size="xs" showLabel={false} />
                              <div className="px-1 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-zinc-200 border border-white/20 text-[9px] font-bold">
                                {resCat}
                              </div>
                            </div>

                            {/* Direct Quick Actions: GPS & Public */}
                            <div className="absolute bottom-7 right-1.5 flex items-center gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onOpenSmartGps) onOpenSmartGps([p]);
                                  else setSmartGpsPanos([p]);
                                }}
                                className="px-1.5 py-0.5 rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[9px] flex items-center gap-0.5 shadow-md border border-amber-300 transition-all cursor-pointer"
                                title="Upraviť GPS polohu tejto panorámy"
                              >
                                <Navigation className="w-2.5 h-2.5" />
                                <span>GPS</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  togglePanoramaPublic(p.id, true);
                                }}
                                className="px-1.5 py-0.5 rounded-md bg-emerald-600/95 hover:bg-emerald-500 text-white font-bold text-[9px] flex items-center gap-0.5 shadow-md backdrop-blur-md border border-emerald-400 transition-all cursor-pointer"
                                title="Publikovať do verejnej galérie"
                              >
                                <Globe2 className="w-2.5 h-2.5" />
                                <span>Pub</span>
                              </button>
                            </div>

                            <div className="relative z-10 space-y-0.5">
                              <p className="text-[10px] font-semibold text-white truncate drop-shadow-sm">
                                {p.city && p.city !== 'Unknown' ? p.city : p.original_filename || p.filename}
                              </p>
                              <div className="flex items-center justify-between text-[9px] text-zinc-400">
                                <span className="truncate">{p.folder || p.date}</span>
                                {p.views ? <span>{p.views} views</span> : null}
                              </div>
                              {(() => {
                                const pTags = extractPanoramaTags(p);
                                if (pTags.length === 0) return null;
                                return (
                                  <div className="flex items-center flex-wrap gap-1 pt-0.5 overflow-hidden max-h-8 pointer-events-auto">
                                    {pTags.map((tg) => (
                                      <span
                                        key={tg}
                                        className="px-1.5 py-0.2 rounded bg-rose-500/25 text-rose-300 border border-rose-500/40 font-mono text-[8px] font-medium truncate"
                                      >
                                        {tg}
                                      </span>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {filteredPrivatePanoramas.length > visiblePrivateTilesCount && (
                      <button
                        onClick={() => setVisiblePrivateTilesCount((prev) => prev + 40)}
                        className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-rose-300 border border-white/10 transition-colors mt-2 cursor-pointer"
                      >
                        Načítať ďalšie ({filteredPrivatePanoramas.length - visiblePrivateTilesCount} zostáva)
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* Folders List View */
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {filteredPrivateFolders.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs space-y-2">
                    <p>Žiadne súkromné zložky nezodpovedajú filtrom.</p>
                    <button
                      onClick={() => {
                        setSelectedPrivateGpsStatus('all');
                        setSelectedPrivateYear('all');
                        setSelectedPrivateMonth('all');
                        setSelectedPrivateResolution('all');
                        setPrivateSearch('');
                      }}
                      className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-semibold cursor-pointer"
                    >
                      Resetovať filtre
                    </button>
                  </div>
                ) : (
                  filteredPrivateFolders.map(({ folder, items }) => {
                    const isExpanded = privateSearch.trim() ? expandedFolders[folder] !== false : !!expandedFolders[folder];
                    const allSelectedInFolder = items.length > 0 && items.every((p) => isPanoSelected(String(p.id)));
                    const someSelectedInFolder = items.some((p) => isPanoSelected(String(p.id)));

                    return (
                      <div
                        key={folder}
                        className="rounded-xl border border-white/10 overflow-hidden bg-zinc-950/40"
                      >
                        <div className="w-full flex items-center justify-between p-2.5 hover:bg-white/5 transition-colors gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleFolder(folder)}
                            className="flex items-center gap-2 text-left cursor-pointer flex-1 min-w-0"
                          >
                            {isExpanded ? (
                              <FolderOpen className="w-4 h-4 text-rose-400 shrink-0" />
                            ) : (
                              <Folder className="w-4 h-4 text-zinc-400 shrink-0" />
                            )}
                            <span className="text-xs font-semibold text-zinc-200 truncate">
                              {folder}
                            </span>
                          </button>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Folder-level Smart GPS action button */}
                            {isAdmin && items.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onOpenSmartGps) onOpenSmartGps(items);
                                  else setSmartGpsPanos(items);
                                }}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 flex items-center gap-1 transition-all cursor-pointer"
                                title={`Smart GPS pre celú zložku (${items.length} panorám)`}
                              >
                                <Navigation className="w-3 h-3 text-amber-400" />
                                <span>GPS</span>
                              </button>
                            )}

                            {/* Select All in Folder Checkbox */}
                            {isAdmin && items.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const ids = items.map((p) => String(p.id));
                                  if (allSelectedInFolder) {
                                    deselectPanos(ids);
                                  } else {
                                    selectPanos(ids);
                                  }
                                }}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                  allSelectedInFolder
                                    ? 'bg-cyan-500 text-zinc-950 shadow-md ring-1 ring-cyan-300'
                                    : someSelectedInFolder
                                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50'
                                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10'
                                }`}
                                title={allSelectedInFolder ? 'Zrušiť výber v zložke' : 'Vybrať všetky v zložke'}
                              >
                                {allSelectedInFolder ? (
                                  <CheckSquare className="w-3 h-3" />
                                ) : (
                                  <Square className="w-3 h-3" />
                                )}
                                <span className="hidden sm:inline">{allSelectedInFolder ? 'Všetko' : 'Vybrať'}</span>
                              </button>
                            )}

                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                              {items.length}
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-2 border-t border-white/5 grid grid-cols-2 gap-2 bg-black/20">
                            {items.map((p) => {
                              const cleanFilename = cleanPanoPath(p.filename);
                              const thumbPath = `/thumbnails/${cleanFilename}`;
                              const resCat = getResolutionCategory(p.width);
                              const gpsStatus = getPanoramaGpsStatus(p);

                              return (
                                <div
                                  key={p.id}
                                  onClick={() => onSelectPanorama?.(p)}
                                  className="group relative aspect-[16/10] rounded-xl overflow-hidden bg-zinc-900 border border-white/10 hover:border-rose-400/60 transition-all text-left flex flex-col justify-end p-2 cursor-pointer shadow-md"
                                >
                                  {/* Offline Archive Fallback Badge & Placeholder */}
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 p-2 text-center pointer-events-none">
                                    <div className="w-7 h-7 rounded-lg bg-zinc-800/90 border border-white/10 flex items-center justify-center mb-1 text-zinc-400 group-hover:text-amber-400 group-hover:border-amber-400/40 transition-colors">
                                      <HardDrive className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[10px] font-bold text-zinc-300 line-clamp-1">{p.folder || p.filename.split('/').pop()}</span>
                                    <span className="text-[8px] text-amber-400/90 font-medium">Offline archív ({p.original_filepath ? p.original_filepath.slice(0, 2) : 'E:'})</span>
                                  </div>

                                  <img
                                    src={thumbPath}
                                    alt={p.filename}
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      const clean = cleanPanoPath(p.filename);
                                      if (!target.src.includes('/panoramas_2k/')) {
                                        target.src = `/panoramas_2k/${clean}`;
                                      } else if (!target.src.includes('r2-panoramas.trusik.link')) {
                                        target.src = `${panoConfig.storage.thumbnailsUrl}/${clean}`;
                                      } else {
                                        target.style.display = 'none';
                                      }
                                    }}
                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent pointer-events-none" />

                                  {/* Admin Multi-select Checkbox */}
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleSelectPano(String(p.id));
                                      }}
                                      className={`absolute top-1.5 left-1.5 z-20 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                        isPanoSelected(String(p.id))
                                          ? 'bg-cyan-500 text-zinc-950 shadow-md ring-2 ring-cyan-300'
                                          : 'bg-black/60 text-white/70 hover:text-white border border-white/30 hover:border-cyan-400'
                                      }`}
                                      title={isPanoSelected(String(p.id)) ? 'Deselect panorama' : 'Select panorama'}
                                    >
                                      {isPanoSelected(String(p.id)) ? (
                                        <CheckSquare className="w-3.5 h-3.5" />
                                      ) : (
                                        <Square className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  )}

                                  {/* Top-Right Badges: GPS Status & Resolution */}
                                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-20">
                                    <GpsStatusBadge status={gpsStatus} size="xs" showLabel={false} />
                                    <div className="px-1 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-zinc-200 border border-white/20 text-[9px] font-bold">
                                      {resCat}
                                    </div>
                                  </div>

                                  {/* Direct Quick Actions: GPS & Public */}
                                  <div className="absolute bottom-7 right-1.5 flex items-center gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (onOpenSmartGps) onOpenSmartGps([p]);
                                        else setSmartGpsPanos([p]);
                                      }}
                                      className="px-1.5 py-0.5 rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[9px] flex items-center gap-0.5 shadow-md border border-amber-300 transition-all cursor-pointer"
                                      title="Upraviť GPS polohu tejto panorámy"
                                    >
                                      <Navigation className="w-2.5 h-2.5" />
                                      <span>GPS</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        togglePanoramaPublic(p.id, true);
                                      }}
                                      className="px-1.5 py-0.5 rounded-md bg-emerald-600/95 hover:bg-emerald-500 text-white font-bold text-[9px] flex items-center gap-0.5 shadow-md backdrop-blur-md border border-emerald-400 transition-all cursor-pointer"
                                      title="Publikovať do verejnej galérie"
                                    >
                                      <Globe2 className="w-2.5 h-2.5" />
                                      <span>Pub</span>
                                    </button>
                                  </div>

                                  <div className="relative z-10 space-y-0.5">
                                    <p className="text-[10px] font-semibold text-white truncate drop-shadow-sm">
                                      {p.city && p.city !== 'Unknown' ? p.city : p.original_filename || p.filename}
                                    </p>
                                    <div className="flex items-center justify-between text-[9px] text-zinc-400">
                                      <span>{resCat}</span>
                                      {p.views ? <span>{p.views} views</span> : null}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {/* Internal Smart GPS Modal Fallback */}
      {isAdmin && smartGpsPanos && (
        <AdminSmartGpsModal
          isOpen={true}
          onClose={() => setSmartGpsPanos(null)}
          targetPanoramas={smartGpsPanos}
          allPanoramas={allPanoramas}
        />
      )}

      {/* Internal Tag Editor Modal Fallback */}
      {isAdmin && showTagModal && (selectedPrivatePanos.length > 0 || selectedPublicPanos.length > 0) && (
        <AdminTagEditorModal
          isOpen={true}
          onClose={() => setShowTagModal(false)}
          panoramas={selectedPrivatePanos.length > 0 ? selectedPrivatePanos : selectedPublicPanos}
          allPanoramas={allPanoramas}
        />
      )}
    </>
  );
};
