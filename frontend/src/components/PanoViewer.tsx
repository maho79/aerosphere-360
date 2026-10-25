import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  ThreePanoViewer,
  type ThreePanoViewerRef,
  type ProjectionMode,
  type TextureState,
  type CalibrationOverlayConfig,
} from './ThreePanoViewer';
import { FilmstripMiniMap } from './FilmstripMiniMap';
import { cleanPanoPath, getResolutionCategory, getHorizontalK, getMegapixels, type Panorama, type PanoramaSunData } from '../types';
import { calculateSunPosition } from '../utils/solarCalculator';
import {
  getDistance,
  formatDistance,
  formatCoordinates,
  getGoogleMapsUrl,
  formatFileSize,
  formatPanoramaDate,
  getPanoramaAltitude,
  getPanoramaCity,
  generateExportFilename,
  applyHDRToCanvas,
} from '../utils/geo';
import { extractPanoramaTags } from '../utils/tags';
import { copyToClipboard, getPanoShareUrl, generateShareId, generateShareKey, resolveShareKey } from '../utils/share';
import { drawPanoramaWatermark } from '../utils/watermark';
import { buildTimelineClusters, getTimelineRepresentativesForCluster, type TimelineCluster } from '../utils/timelineClusters';
import { analytics } from '../utils/analytics';
import {
  isBrowserFullscreen,
  requestBrowserFullscreen,
  exitBrowserFullscreen,
  addFullscreenChangeListener,
} from '../utils/fullscreen';
import i18n from '../i18n';
import {
  X,
  Check,
  Play,
  Pause,
  Maximize,
  Minimize,
  Info,
  Share2,
  Download,
  Camera,
  Video,
  Film,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  HardDrive,
  Maximize2,
  Compass,
  Sparkles,
  Key,
  Lock,
  Unlock,
  Trash2,
  RotateCcw,
  RotateCw,
  FolderLock,
  Menu,
  MoreVertical,
  CheckSquare,
  Square,
  Globe2,
  HelpCircle,
  Heart,
  MessageSquare,
  Mail,
  Plus,
  Minus,
  Keyboard,
  Volume2,
  VolumeX,
  Sun,
  Tag,
  Navigation,
  Filter,
  Eye,
  EyeOff,
  Smartphone,
  Monitor,
  Mountain,
  Footprints,
  History,
  MinusCircle,
} from 'lucide-react';
import { getPanoramaHeritageStory } from '../utils/sceneIntel';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../context/AdminContext';
import { useViewMode } from '../context/ViewModeContext';
import { useUIHelp } from '../context/UIHelpContext';
import { AdminAvatar } from './AdminAvatar';
import { CommentsDrawer } from './CommentsDrawer';
import { FeedbackModal } from './FeedbackModal';
import { ActiveFiltersBar } from './ActiveFiltersBar';
import { SolarCompassHUD } from './SolarCompassHUD';
import { AdminTagEditorModal } from './AdminTagEditorModal';
import { AdminSmartGpsModal } from './AdminSmartGpsModal';
import { AdminClusterCalibrationModal } from './AdminClusterCalibrationModal';
import { SplitClusterCalibrationView } from './SplitClusterCalibrationView';
import { VerticalTimelineRuler } from './VerticalTimelineRuler';
import { VideoExportModal } from './VideoExportModal';
import {
  recordPanoramaShare,
  recordDetailedShare,
  isPanoramaFavorite,
  togglePanoramaFavorite,
  getPanoramaFavoriteCount,
  getPanoramaShareCount,
  getPanoramaCommentsCount,
} from '../utils/social';


interface PanoViewerProps {
  panorama: Panorama;
  allPanoramas: Panorama[];
  filteredPanoramas?: Panorama[];
  onClose: () => void;
  onSelectPanorama: (pano: Panorama) => void;
  onShowToast: (message: string) => void;
  isExplorerOpen?: boolean;
  onToggleExplorer?: () => void;
  onOpenMapAtCoords?: (lat: number, lon: number, zoom?: number) => void;
  showPublic?: boolean;
  showPrivate?: boolean;
  onlyFavorites?: boolean;
  onToggleOnlyFavorites?: () => void;
  onlyTimelineClusters?: boolean;
  onToggleOnlyTimelineClusters?: () => void;
  selectedYears?: string[];
  onToggleYear?: (year: string) => void;
  selectedMonths?: string[];
  onToggleMonth?: (month: string) => void;
  selectedResolutions?: string[];
  onToggleResolution?: (res: string) => void;
  selectedTags?: string[];
  onToggleTag?: (tag: string) => void;
  selectedMoods?: string[];
  onToggleMood?: (moodId: string) => void;
  searchQuery?: string;
  onClearSearch?: () => void;
  onResetAllFilters?: () => void;
  hasAnyFilterActive?: boolean;
  totalCount?: number;
  initialLon?: number;
  initialLat?: number;
  initialFov?: number;
  initialProjection?: ProjectionMode;
  currentProjectionMode?: ProjectionMode;
  onProjectionModeChange?: (mode: ProjectionMode) => void;
  initialOpenCalibration?: boolean;
  timelineCluster?: TimelineCluster;
}

export const PanoViewer: React.FC<PanoViewerProps> = ({
  panorama,
  allPanoramas,
  filteredPanoramas = [],
  onClose,
  onSelectPanorama,
  onShowToast,
  isExplorerOpen,
  onToggleExplorer,
  onOpenMapAtCoords,
  showPublic = true,
  showPrivate = true,
  timelineCluster,
  onlyFavorites = false,
  onToggleOnlyFavorites,
  onlyTimelineClusters = false,
  onToggleOnlyTimelineClusters,
  selectedYears = [],
  onToggleYear,
  selectedMonths = [],
  onToggleMonth,
  selectedResolutions = [],
  onToggleResolution,
  selectedTags = [],
  onToggleTag,
  selectedMoods = [],
  onToggleMood,
  searchQuery = '',
  onClearSearch,
  onResetAllFilters,
  hasAnyFilterActive = false,
  totalCount,
  initialLon,
  initialLat,
  initialFov,
  initialProjection,
  currentProjectionMode,
  onProjectionModeChange,
  initialOpenCalibration = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const filmRollRef = useRef<HTMLDivElement>(null);
  const threeViewerRef = useRef<ThreePanoViewerRef>(null);
  const { t } = useTranslation();
  const isSk = i18n.language.startsWith('sk');
  const { isMobileMode, toggleViewMode } = useViewMode();
  const [autoPanMode, setAutoPanMode] = useState<'stopped' | 'right' | 'left'>('stopped');
  const [lastPanDirection, setLastPanDirection] = useState<'right' | 'left'>('left');
  const isAutoPanning = autoPanMode !== 'stopped';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImmersive, setIsImmersive] = useState(
    () => typeof window !== 'undefined' && !!(window as any).__panoImmersive && (isMobileMode || window.matchMedia('(max-width: 767px)').matches)
  );
  const [immersiveStrip, setImmersiveStrip] = useState(false);
  useEffect(() => {
    (window as any).__panoImmersive = isImmersive;
  }, [isImmersive]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const headerContainerRef = useRef<HTMLDivElement>(null);
  const [headerWidth, setHeaderWidth] = useState<number>(() => typeof window !== 'undefined' ? window.innerWidth : 1920);

  useEffect(() => {
    const updateHeaderWidth = () => {
      if (headerContainerRef.current) {
        setHeaderWidth(headerContainerRef.current.clientWidth);
      } else {
        setHeaderWidth(window.innerWidth);
      }
    };
    updateHeaderWidth();
    window.addEventListener('resize', updateHeaderWidth);
    return () => window.removeEventListener('resize', updateHeaderWidth);
  }, []);
  const [isFilmRollVisible, setIsFilmRollVisible] = useState(true);
  const [hoveredFilmIndex, setHoveredFilmIndex] = useState<number | null>(null);
  const [showHoverPreview, setShowHoverPreview] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pano_filmstrip_hover_preview');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleHoverPreview = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowHoverPreview((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pano_filmstrip_hover_preview', String(next));
      } catch {}
      if (!next) {
        setHoveredFilmIndex(null);
      }
      onShowToast(
        next
          ? (isSk ? 'Zväčšené náhľady pri prejdení myšou: ZAPNUTÉ' : 'Hover zoom previews: ON')
          : (isSk ? 'Zväčšené náhľady pri prejdení myšou: VYPNUTÉ' : 'Hover zoom previews: OFF')
      );
      return next;
    });
  }, [isSk, onShowToast]);

  const [isLoading, setIsLoading] = useState(true);
  const [textureState, setTextureState] = useState<TextureState>('loading');
  const [isHighResReady, setIsHighResReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExportingView, setIsExportingView] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [projectionMode, setProjectionModeState] = useState<ProjectionMode>(() => {
    if (currentProjectionMode && ['rectilinear', 'curved', 'little_planet'].includes(currentProjectionMode)) {
      return currentProjectionMode;
    }
    if (initialProjection && ['rectilinear', 'curved', 'little_planet'].includes(initialProjection)) {
      return initialProjection;
    }
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pano_projection_mode') : null;
    if (saved && ['rectilinear', 'curved', 'little_planet'].includes(saved)) {
      return saved as ProjectionMode;
    }
    return 'rectilinear';
  });

  const setProjectionMode = useCallback((mode: ProjectionMode) => {
    setProjectionModeState(mode);
    try {
      localStorage.setItem('pano_projection_mode', mode);
    } catch {}
    onProjectionModeChange?.(mode);
  }, [onProjectionModeChange]);

  useEffect(() => {
    if (currentProjectionMode && currentProjectionMode !== projectionMode) {
      setProjectionModeState(currentProjectionMode);
    }
  }, [currentProjectionMode]);
  const [isHdr, setIsHdr] = useState<boolean>(false);
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return isMobileMode || window.innerWidth < 768 || window.innerHeight < 550 || ('ontouchstart' in window && Math.min(window.innerWidth, window.innerHeight) < 600);
  });
  const [filmstripSize, setFilmstripSize] = useState<'mini' | 'normal' | 'large'>(() => {
    if (typeof window === 'undefined') return 'normal';
    const isMobile = isMobileMode || window.innerWidth < 768 || window.innerHeight < 550 || ('ontouchstart' in window && Math.min(window.innerWidth, window.innerHeight) < 600);
    return isMobile ? 'mini' : 'normal';
  });
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false;
  });

  const handleCycleProjection = useCallback(() => {
    if (projectionMode === 'rectilinear') {
      setProjectionMode('curved');
      onShowToast(isSk ? 'Režim projekcie: Zaoblené' : 'Projection Mode: Curved');
    } else if (projectionMode === 'curved') {
      setProjectionMode('little_planet');
      onShowToast(isSk ? 'Režim projekcie: Malá planéta (Planet)' : 'Projection Mode: Little Planet');
    } else {
      setProjectionMode('rectilinear');
      onShowToast(isSk ? 'Režim projekcie: Štandard' : 'Projection Mode: Standard');
    }
  }, [projectionMode, isSk, onShowToast]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (onlyFavorites) count++;
    if (selectedYears && selectedYears.length > 0) count += selectedYears.length;
    if (selectedMonths && selectedMonths.length > 0) count += selectedMonths.length;
    if (selectedResolutions && selectedResolutions.length > 0) count += selectedResolutions.length;
    if (selectedTags && selectedTags.length > 0) count += selectedTags.length;
    if (searchQuery && searchQuery.trim()) count++;
    return count;
  }, [onlyFavorites, selectedYears, selectedMonths, selectedResolutions, selectedTags, searchQuery]);
  useEffect(() => {
    const checkOrientation = () => {
      const isPort = window.innerHeight > window.innerWidth;
      setIsPortrait(isPort);
      const isMobile = isMobileMode || window.innerWidth < 768 || window.innerHeight < 550 || ('ontouchstart' in window && Math.min(window.innerWidth, window.innerHeight) < 600);
      setIsMobileScreen(isMobile);
      if (isMobile) {
        setFilmstripSize('mini');
      }
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [isMobileMode]);
  const isLittlePlanet = projectionMode === 'little_planet';
  const [filmResFilter, setFilmResFilter] = useState<'all' | '15K' | '8K+'>('all');
  const { isHelpActive, toggleHelp, closeHelp } = useUIHelp();

  // Social states: favorites, shares, and comments
  const [isFavorite, setIsFavorite] = useState<boolean>(() => isPanoramaFavorite(panorama.id));
  const [favoriteCount, setFavoriteCount] = useState<number>(() => panorama.favorites || getPanoramaFavoriteCount(panorama.id));
  const [shareCount, setShareCount] = useState<number>(() => panorama.shares || getPanoramaShareCount(panorama.id));
  const [commentsCount, setCommentsCount] = useState<number>(() => panorama.comments_count || getPanoramaCommentsCount(panorama.id));
  const [showComments, setShowComments] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [isCleanView, setIsCleanView] = useState<boolean>(false);
  const [zoomText, setZoomText] = useState<string>('100%');
  const [is1to1, setIs1to1] = useState<boolean>(false);
  const [filmstripPlaylist, setFilmstripPlaylist] = useState<Panorama[]>([]);
  const [isMovieMode, setIsMovieMode] = useState<boolean>(false);
  const [showTagEditorModal, setShowTagEditorModal] = useState<boolean>(false);
  const [showSmartGpsModal, setShowSmartGpsModal] = useState<boolean>(false);
  const [showClusterCalibrationModal, setShowClusterCalibrationModal] = useState<boolean>(!!initialOpenCalibration);
  const [isSplitCalibrationOpen, setIsSplitCalibrationOpen] = useState<boolean>(false);
  const [calibrationOverlay, setCalibrationOverlay] = useState<CalibrationOverlayConfig | null>(null);

  // Experimental Features: Spatial Audio Engine & Solar Azimuth Compass
  const [isSpatialAudioEnabled, setIsSpatialAudioEnabled] = useState<boolean>(() => {
    return localStorage.getItem('pano_spatial_audio') === 'true';
  });
  const [spatialAudioVolume, setSpatialAudioVolume] = useState<number>(() => {
    const saved = localStorage.getItem('pano_spatial_audio_volume');
    if (saved !== null) {
      const val = Number(saved);
      return val > 0.5 ? 0.5 : val;
    }
    return 0.5;
  });
  const [isSolarCompassEnabled, setIsSolarCompassEnabled] = useState<boolean>(() => {
    return localStorage.getItem('pano_solar_compass') === 'true';
  });
  const [currentHeadingDeg, setCurrentHeadingDeg] = useState<number>(0);
  const [currentLonDeg, setCurrentLonDeg] = useState<number>(0);
  const [currentLatDeg, setCurrentLatDeg] = useState<number>(0);
  const [currentFovDeg, setCurrentFovDeg] = useState<number>(75);

  const handleToggleSpatialAudio = () => {
    setIsSpatialAudioEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('pano_spatial_audio', String(next));
      onShowToast(
        next
          ? (isSk ? 'Hudobný doprovod zapnutý (Relaxačný ambient)' : 'Soundtrack enabled (Relaxing ambient)')
          : (isSk ? 'Hudobný doprovod vypnutý' : 'Soundtrack disabled')
      );
      return next;
    });
  };

  const handleToggleSolarCompass = () => {
    if (projectionMode !== 'rectilinear') {
      // Auto-switch to standard mode so compass is enabled
      setProjectionMode('rectilinear');
      setIsSolarCompassEnabled(true);
      localStorage.setItem('pano_solar_compass', 'true');
      onShowToast(
        isSk
          ? 'Prepnuté na štandardný režim: Solárny kompas [EXP] zapnutý (AR azimut v oblakoch + radar)'
          : 'Switched to standard view: Solar Compass [EXP] enabled (AR cloud azimuth + radar)'
      );
      return;
    }
    setIsSolarCompassEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('pano_solar_compass', String(next));
      onShowToast(
        next
          ? (isSk ? 'Solárny kompas [EXP] zapnutý (AR azimut v oblakoch + satelitný radar)' : 'Solar Compass [EXP] enabled (AR cloud azimuth + satellite radar)')
          : (isSk ? 'Solárny kompas [EXP] vypnutý' : 'Solar Compass [EXP] disabled')
      );
      return next;
    });
  };

  const {
    isAdmin,
    setShowAdminModal,
    selectedPanoIds,
    isPanoSelected,
    toggleSelectPano,
    selectPanos,
    deselectPanos,
    batchUpdatePanoramas,
    togglePanoramaPublic,
    deletePanorama,
    restorePanorama,
    updatePanoramaSunData,
    recordPanoramaView,
  } = useAdmin();

  const [isPeakFinderEnabled, setIsPeakFinderEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('pano_peak_finder') === 'true';
  });
  const [isWalkthroughEnabled, setIsWalkthroughEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('pano_walkthrough') === 'true';
  });
  const [isGyroscopeActive, setIsGyroscopeActive] = useState<boolean>(false);
  const [filmstripTab, setFilmstripTab] = useState<'nearby' | 'timeline'>(() => {
    if (onlyTimelineClusters) return 'timeline';
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('pano_filmstrip_tab') : null;
      if (saved === 'timeline') return 'timeline';
      if (saved === 'nearby') return 'nearby';
    } catch {}
    return 'timeline';
  });

  const [isTimelinePlaying, setIsTimelinePlaying] = useState<boolean>(false);

  // Standalone fallback: if timelineCluster wasn't passed from parent, compute cluster mapping for allPanoramas
  const { panoToCluster } = useMemo(() => {
    if (timelineCluster) return { panoToCluster: new Map<string, TimelineCluster>() };
    return buildTimelineClusters(allPanoramas, 120);
  }, [allPanoramas, timelineCluster]);

  const effectiveCluster = timelineCluster || panoToCluster.get(panorama.id);

  // Time-Travel: Chronological panoramas across distinct dates for this cluster (consistent across all cluster members)
  const timeTravelPanos = useMemo<(Panorama & { distance?: number })[]>(() => {
    if (!effectiveCluster) return [];
    return getTimelineRepresentativesForCluster(panorama, effectiveCluster, {
      isAdmin,
      showPublic,
      showPrivate,
      filteredPanoramas,
    });
  }, [effectiveCluster, panorama.id, isAdmin, showPublic, showPrivate, filteredPanoramas]);

  // Track initial mount so we don't re-force filmstrip visibility when navigating between cluster captures
  const isInitialTimelineMountRef = useRef(true);

  // Timeline mode handling:
  // 1. When onlyTimelineClusters is active on the map, default to timeline mode & show filmstrip ONCE on initial open.
  // 2. Locations with 2 or more captures (timeTravelPanos.length >= 2) qualify for timeline mode.
  // 3. Once in timeline mode, NEVER automatically switch back to 'nearby' (preserve user preference).
  // 4. If the user explicitly collapsed/minimized the filmstrip, DO NOT force it back open when navigating captures!
  useEffect(() => {
    if (onlyTimelineClusters) {
      setFilmstripTab('timeline');
      if (isInitialTimelineMountRef.current) {
        isInitialTimelineMountRef.current = false;
        setIsFilmRollVisible(true);
      }
      try {
        localStorage.setItem('pano_filmstrip_tab', 'timeline');
      } catch {}
      return;
    }

    if (timeTravelPanos.length >= 2) {
      try {
        const saved = localStorage.getItem('pano_filmstrip_tab');
        if (saved !== 'nearby') {
          setFilmstripTab('timeline');
        }
      } catch {
        setFilmstripTab('timeline');
      }
    }
  }, [onlyTimelineClusters, panorama.id, timeTravelPanos.length]);

  const handleTimeTravelSelect = (targetPano: Panorama) => {
    if (targetPano.id === panorama.id) return;
    onSelectPanorama(targetPano);
  };

  const handleToggleExcludePano = async (targetPano: Panorama) => {
    const isCurrentlyExcluded = Boolean(targetPano.exclude_timeline);
    const nextExclude = !isCurrentlyExcluded;

    if (nextExclude) {
      // Find closest newer panorama in the cluster, or closest older if there is no newer one
      const pool = (timeTravelPanos && timeTravelPanos.length > 0)
        ? timeTravelPanos
        : (effectiveCluster ? effectiveCluster.members : []);

      const remaining = pool.filter((p) => String(p.id) !== String(targetPano.id) && !p.exclude_timeline && !p.is_deleted);

      if (remaining.length > 0) {
        const targetDate = targetPano.date ? new Date(targetPano.date).getTime() : 0;

        // 1. Closest newer candidates (date >= targetDate) sorted ascending
        const newerCandidates = remaining
          .filter((p) => {
            const pDate = p.date ? new Date(p.date).getTime() : 0;
            return pDate >= targetDate;
          })
          .sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db = b.date ? new Date(b.date).getTime() : 0;
            return da - db;
          });

        // 2. Closest older candidates (date < targetDate) sorted descending
        const olderCandidates = remaining
          .filter((p) => {
            const pDate = p.date ? new Date(p.date).getTime() : 0;
            return pDate < targetDate;
          })
          .sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db = b.date ? new Date(b.date).getTime() : 0;
            return db - da;
          });

        const closestPano = newerCandidates[0] || olderCandidates[0] || remaining[0];

        // Switch to closest newer panorama to maintain timeline cluster context
        setFilmstripTab('timeline');
        try {
          localStorage.setItem('pano_filmstrip_tab', 'timeline');
        } catch {}
        onSelectPanorama(closestPano);
      }

      const res = await batchUpdatePanoramas({ ids: [String(targetPano.id)], exclude_timeline: true });
      if (res.success) {
        onShowToast(
          isSk
            ? 'Panoráma bola vyradená z klastra časovej osi'
            : 'Panorama excluded from timeline cluster'
        );
      }
    } else {
      const res = await batchUpdatePanoramas({ ids: [String(targetPano.id)], exclude_timeline: false });
      if (res.success) {
        onShowToast(
          isSk
            ? 'Panoráma bola zaradená späť do klastra časovej osi'
            : 'Panorama included in timeline cluster'
        );
      }
    }
  };

  const handleToggleTimeTravel = () => {
    if (timeTravelPanos.length < 2) {
      onShowToast(isSk ? 'Pre túto lokalitu nie je dostupná časová os (iba 1 záber v okruhu 100 m)' : 'No timeline captures at this location');
      return;
    }
    setIsFilmRollVisible(true);
    setImmersiveStrip(true);
    setFilmstripTab((prev) => {
      const next = prev === 'timeline' ? 'nearby' : 'timeline';
      try {
        localStorage.setItem('pano_filmstrip_tab', next);
      } catch {}
      onShowToast(
        next === 'timeline'
          ? (isSk ? 'Filmový pás: Časová os lokácie (do 100 m)' : 'Filmstrip: Location timeline (within 100m)')
          : (isSk ? 'Filmový pás: Blízke panorámy' : 'Filmstrip: Nearby panoramas')
      );
      return next;
    });
  };

  const timeTravelPanosRef = useRef(timeTravelPanos);
  timeTravelPanosRef.current = timeTravelPanos;

  const handleToggleTimelinePlay = useCallback(() => {
    if (timeTravelPanos.length < 2) {
      onShowToast(isSk ? 'Pre prehrávanie časovej osi sú potrebné aspoň 2 zábery' : 'At least 2 captures required for timeline playback');
      return;
    }
    setIsTimelinePlaying((prev) => {
      const next = !prev;
      if (next) {
        if (filmstripTab !== 'timeline') {
          setFilmstripTab('timeline');
          try {
            localStorage.setItem('pano_filmstrip_tab', 'timeline');
          } catch {}
        }
        setIsFilmRollVisible(true);
        onShowToast(isSk ? 'Prehrávanie časovej osi spustené (2s interval)' : 'Timeline playback started (2s interval)');
      } else {
        onShowToast(isSk ? 'Prehrávanie časovej osi zastavené' : 'Timeline playback stopped');
      }
      return next;
    });
  }, [timeTravelPanos.length, filmstripTab, isSk, onShowToast]);

  // Timeline auto-play timer: cycles through all cluster captures at 2s interval
  useEffect(() => {
    if (!isTimelinePlaying) return;
    if (timeTravelPanos.length < 2) {
      setIsTimelinePlaying(false);
      return;
    }

    const timer = setInterval(() => {
      const list = timeTravelPanosRef.current;
      if (!list || list.length < 2) {
        setIsTimelinePlaying(false);
        return;
      }
      const curIdx = list.findIndex((p) => p.id === panorama.id);
      const nextIdx = curIdx === -1 ? 0 : (curIdx + 1) % list.length;
      const nextPano = list[nextIdx];
      if (nextPano && nextPano.id !== panorama.id) {
        handleTimeTravelSelect(nextPano);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [isTimelinePlaying, panorama.id, timeTravelPanos.length]);


  const handleTogglePeakFinder = () => {
    if (projectionMode !== 'rectilinear') {
      setProjectionMode('rectilinear');
    }
    setIsPeakFinderEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('pano_peak_finder', String(next));
      onShowToast(
        next
          ? (isSk ? 'Peak Finder zapnutý (Vrcholy a dominanty na horizonte)' : 'Peak Finder enabled (Horizon peaks & landmarks)')
          : (isSk ? 'Peak Finder vypnutý' : 'Peak Finder disabled')
      );
      return next;
    });
  };

  const handleToggleWalkthrough = () => {
    if (projectionMode !== 'rectilinear') {
      setProjectionMode('rectilinear');
    }
    setIsWalkthroughEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('pano_walkthrough', String(next));
      onShowToast(
        next
          ? (isSk ? '3D Virtuálna prechádzka zapnutá (Navigačné šípky na zemi)' : '3D Walkthrough enabled (Navigation floor chevrons)')
          : (isSk ? '3D Virtuálna prechádzka vypnutá' : '3D Walkthrough disabled')
      );
      return next;
    });
  };

  const handleToggleGyroscope = async () => {
    const next = await threeViewerRef.current?.toggleGyroscope?.();
    setIsGyroscopeActive(!!next);
    onShowToast(
      next
        ? (isSk ? 'Gyroskop / Pohybové ovládanie zapnuté' : 'Gyroscope / Motion controls enabled')
        : (isSk ? 'Gyroskop vypnutý' : 'Gyroscope disabled')
    );
  };

  const handleResetCamera = () => {
    threeViewerRef.current?.resetView?.();
    onShowToast(isSk ? 'Pohľad kamery resetovaný na východzí' : 'Camera view reset to default');
  };

  useEffect(() => {
    setIsFavorite(isPanoramaFavorite(panorama.id));
    setFavoriteCount(panorama.favorites || getPanoramaFavoriteCount(panorama.id));
    setShareCount(panorama.shares || getPanoramaShareCount(panorama.id));
    setCommentsCount(panorama.comments_count || getPanoramaCommentsCount(panorama.id));
  }, [panorama.id, panorama.favorites, panorama.shares, panorama.comments_count]);

  useEffect(() => {
    const handleFavChange = (e: any) => {
      if (e.detail?.id === String(panorama.id)) {
        setIsFavorite(e.detail.isFavorite);
        setFavoriteCount(e.detail.favoritesCount);
      }
    };
    const handleShareChange = (e: any) => {
      if (e.detail?.id === String(panorama.id)) {
        setShareCount(e.detail.shares);
      }
    };
    const handleCommentAdded = (e: any) => {
      if (e.detail?.id === String(panorama.id)) {
        setCommentsCount(e.detail.count);
      }
    };
    const handleCommentDeleted = (e: any) => {
      if (e.detail?.id === String(panorama.id)) {
        setCommentsCount(e.detail.count);
      }
    };
    window.addEventListener('pano_favorites_changed', handleFavChange);
    window.addEventListener('pano_shares_changed', handleShareChange);
    window.addEventListener('pano_comment_added', handleCommentAdded);
    window.addEventListener('pano_comment_deleted', handleCommentDeleted);
    return () => {
      window.removeEventListener('pano_favorites_changed', handleFavChange);
      window.removeEventListener('pano_shares_changed', handleShareChange);
      window.removeEventListener('pano_comment_added', handleCommentAdded);
      window.removeEventListener('pano_comment_deleted', handleCommentDeleted);
    };
  }, [panorama.id]);

  const handleToggleFavorite = async () => {
    const res = await togglePanoramaFavorite(panorama.id);
    setIsFavorite(res.isFavorite);
    setFavoriteCount(res.count);
    if (res.isFavorite) {
      onShowToast(t('added_to_favorites'));
    } else {
      onShowToast(t('removed_from_favorites'));
    }
  };

  // Selected panoramas available for batch video rendering
  const batchPanoramas = useMemo(() => {
    if (!selectedPanoIds || selectedPanoIds.size === 0) return [];
    const list = (allPanoramas || []).filter((p) => selectedPanoIds.has(String(p.id)));
    if (selectedPanoIds.has(String(panorama.id))) {
      return [panorama, ...list.filter((p) => String(p.id) !== String(panorama.id))];
    }
    return list;
  }, [allPanoramas, selectedPanoIds, panorama]);

  // Track panorama views in D1 and update local view count
  const [currentViews, setCurrentViews] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('pano_views_cache');
      const viewsMap = raw ? JSON.parse(raw) : {};
      return Math.max(viewsMap[String(panorama.id)] || 0, panorama.views || 0);
    } catch {
      return panorama.views || 0;
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pano_views_cache');
      const viewsMap = raw ? JSON.parse(raw) : {};
      setCurrentViews(Math.max(viewsMap[String(panorama.id)] || 0, panorama.views || 0));
    } catch {
      setCurrentViews(panorama.views || 0);
    }
    if (panorama?.id) {
      recordPanoramaView(String(panorama.id)).catch(() => {});
    }
  }, [panorama.id, panorama.views, recordPanoramaView]);

  useEffect(() => {
    const handleViewRecorded = (e: CustomEvent<{ id: string; views: number }>) => {
      if (e.detail && String(e.detail.id) === String(panorama.id)) {
        setCurrentViews(e.detail.views);
      }
    };
    window.addEventListener('pano_view_recorded', handleViewRecorded as EventListener);
    return () => window.removeEventListener('pano_view_recorded', handleViewRecorded as EventListener);
  }, [panorama.id]);

  const [isCalibratingSun, setIsCalibratingSun] = useState<boolean>(false);
  const [isRadarLocked, setIsRadarLocked] = useState<boolean>(false);
  const lockedRadarHeadingRef = useRef<number>(0);

  // Calibration method 1: Double click on Sun in panorama
  const handleCalibrateSunPoint = async (coords: { imgLon: number; imgLat: number }) => {
    if (!isAdmin) return;
    try {
      const lat = panorama.lat ?? 48.29527;
      const lon = panorama.lon ?? 16.92618;
      const astro = calculateSunPosition(panorama.date, lat, lon);

      // North offset:
      // img_azimuth = (astro_azimuth - north_offset + 360) % 360
      // => north_offset = (astro_azimuth - img_azimuth + 360) % 360
      const northOffset = Math.round(((astro.azimuthDeg - coords.imgLon + 360) % 360) * 10) / 10;

      const newSunData: PanoramaSunData = {
        astro_azimuth: Math.round(astro.azimuthDeg * 10) / 10,
        astro_elevation: Math.round(astro.altitudeDeg * 10) / 10,
        img_azimuth: Math.round(coords.imgLon * 10) / 10,
        img_elevation: Math.round(coords.imgLat * 10) / 10,
        north_offset: northOffset,
        sun_detected: true,
        confidence: 1.0,
      };

      panorama.sun_data = newSunData;
      await updatePanoramaSunData(panorama.id, newSunData);

      setIsCalibratingSun(false);
      onShowToast(
        isSk
          ? `Poloha Slnka nakalibrovaná a uložená do KV! (Sever: ${northOffset}°, Slnko azimut: ${Math.round(coords.imgLon)}°)`
          : `Sun position calibrated & saved to KV! (North offset: ${northOffset}°, Sun azimuth: ${Math.round(coords.imgLon)}°)`
      );
    } catch (e: any) {
      console.error('Calibration error:', e);
      onShowToast(isSk ? 'Chyba pri ukladaní kalibrácie Slnka' : 'Error saving sun calibration');
    }
  };

  const handleToggleRadarLock = () => {
    if (!isAdmin) return;
    if (!isRadarLocked) {
      // 1. ZAMKNÚŤ: zafixovať orientáciu radaru na aktuálny smer
      lockedRadarHeadingRef.current = currentHeadingDeg;
      setIsRadarLocked(true);
      onShowToast(
        isSk
          ? `Radar ZAMKNUTÝ (${Math.round(currentHeadingDeg)}°). Otočte panorámu na zhodný objekt a kliknite znova na tlačidlo pre uloženie do KV.`
          : `Radar LOCKED (${Math.round(currentHeadingDeg)}°). Rotate panorama and click button again to save to KV.`
      );
    } else {
      // 2. ODOMKNÚŤ & APLIKOVAŤ: uložiť prepočet do KV
      const headingToApply = lockedRadarHeadingRef.current;
      setIsRadarLocked(false);
      handleLockHeadingCalibrate(headingToApply);
    }
  };

  // Calibration method 2: Lock radar rotation and align panorama heading
  const handleLockHeadingCalibrate = async (lockedHeadingDeg: number) => {
    if (!isAdmin) return;
    try {
      // Current panorama view heading = currentLonDeg
      // Align this view with lockedHeadingDeg:
      // lockedHeadingDeg = (currentLonDeg + newNorthOffset) % 360
      // => newNorthOffset = (lockedHeadingDeg - currentLonDeg + 360) % 360
      const newNorthOffset = Math.round(((lockedHeadingDeg - currentLonDeg + 360) % 360) * 10) / 10;

      const lat = panorama.lat ?? 48.29527;
      const lon = panorama.lon ?? 16.92618;
      const astro = calculateSunPosition(panorama.date, lat, lon);
      const newImgAzimuth = Math.round(((astro.azimuthDeg - newNorthOffset + 360) % 360) * 10) / 10;

      const newSunData: PanoramaSunData = {
        astro_azimuth: Math.round(astro.azimuthDeg * 10) / 10,
        astro_elevation: Math.round(astro.altitudeDeg * 10) / 10,
        img_azimuth: newImgAzimuth,
        img_elevation: Math.round(astro.altitudeDeg * 10) / 10,
        north_offset: newNorthOffset,
        sun_detected: true,
        confidence: 1.0,
      };

      panorama.sun_data = newSunData;
      await updatePanoramaSunData(panorama.id, newSunData);

      onShowToast(
        isSk
          ? `Smer radaru nakalibrovaný a uložený do KV! (Sever: ${newNorthOffset}°, zosúladené s ${Math.round(lockedHeadingDeg)}°)`
          : `Radar heading calibrated & saved to KV! (North offset: ${newNorthOffset}°, aligned with ${Math.round(lockedHeadingDeg)}°)`
      );
    } catch (e: any) {
      console.error('Lock calibration error:', e);
      onShowToast(isSk ? 'Chyba pri ukladaní kalibrácie radaru' : 'Error saving radar calibration');
    }
  };



  const isDeleted = Boolean(panorama.is_deleted || panorama.folder === '!DELETED!');

  const handleDeletePano = async () => {
    if (!isAdmin) return;
    const confirmDelete = window.confirm(
      'Move this panorama to "!DELETED!" folder? It will be hidden from public and normal private views.'
    );
    if (!confirmDelete) return;
    const ok = await deletePanorama(panorama.id);
    if (ok) {
      onShowToast('Moved panorama to "!DELETED!" folder');
      if (nearby.length > 0) {
        onSelectPanorama(nearby[0]);
      } else {
        onClose();
      }
    }
  };

  const handleRestorePano = async () => {
    if (!isAdmin) return;
    const ok = await restorePanorama(panorama.id, 'Restored');
    if (ok) {
      onShowToast('Restored panorama from "!DELETED!"');
    }
  };

  const [privacyOverrides, setPrivacyOverrides] = useState<Record<string, boolean>>({});

  const isItemPrivate = (p: Panorama): boolean => {
    if (privacyOverrides[p.id] !== undefined) {
      return privacyOverrides[p.id];
    }
    return Boolean(p.is_private);
  };

  const handleTogglePanoPublic = async (e: React.MouseEvent, p: Panorama) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAdmin) return;
    const currentlyPrivate = isItemPrivate(p);
    const nextPrivate = !currentlyPrivate;
    setPrivacyOverrides((prev) => ({ ...prev, [p.id]: nextPrivate }));
    if (p.id === panorama.id) {
      panorama.is_private = nextPrivate;
    }
    try {
      await togglePanoramaPublic(p.id, currentlyPrivate);
      onShowToast(
        nextPrivate
          ? (i18n.language.startsWith('sk') ? 'Nastavené ako súkromné (Private)' : 'Moved to Private archive')
          : (i18n.language.startsWith('sk') ? 'Pridané do public (Verejné)!' : 'Published as Public!')
      );
    } catch (err) {
      console.error('Error toggling panorama public:', err);
      setPrivacyOverrides((prev) => ({ ...prev, [p.id]: currentlyPrivate }));
    }
  };

  const handleTogglePrivacy = async () => {
    if (!isAdmin) return;
    const currentlyPrivate = isItemPrivate(panorama);
    const nextPrivate = !currentlyPrivate;
    setPrivacyOverrides((prev) => ({ ...prev, [panorama.id]: nextPrivate }));
    panorama.is_private = nextPrivate;
    const ok = await togglePanoramaPublic(panorama.id, currentlyPrivate);
    if (ok) {
      onShowToast(
        nextPrivate
          ? (i18n.language.startsWith('sk') ? 'Nastavené ako súkromné (Private)' : 'Moved to Private archive')
          : (i18n.language.startsWith('sk') ? 'Pridané do public (Verejné)!' : 'Panorama is now Public!')
      );
    }
  };

  const [downloadCooldown, setDownloadCooldown] = useState<number>(0);

  // Monitor and tick 60s download cooldown for non-admin visitors
  useEffect(() => {
    if (isAdmin) {
      setDownloadCooldown(0);
      return;
    }
    const updateCooldown = () => {
      try {
        const lastTs = localStorage.getItem('last_pano_download_ts');
        if (!lastTs) {
          setDownloadCooldown(0);
          return;
        }
        const diff = Date.now() - Number(lastTs);
        if (diff < 60000) {
          setDownloadCooldown(Math.ceil((60000 - diff) / 1000));
        } else {
          setDownloadCooldown(0);
        }
      } catch {
        setDownloadCooldown(0);
      }
    };

    updateCooldown();
    const timer = setInterval(updateCooldown, 1000);
    return () => clearInterval(timer);
  }, [isAdmin]);

  // Reset states and track view when panorama changes (preserves autoPanMode, tilt, and projection mode)
  useEffect(() => {
    setTextureState('loading');
    setIsHighResReady(false);
    setIsLoading(true);
    setLoadError(null);
    const locName = getPanoramaCity(panorama) || panorama.city || panorama.filename;
    let dateStr = '';
    if (panorama.date) {
      const match = panorama.date.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        dateStr = `${parseInt(match[3], 10)}. ${parseInt(match[2], 10)}. ${match[1]}`;
      } else {
        dateStr = formatPanoramaDate(panorama.date);
      }
    }
    const panoTitle = dateStr
      ? `${locName} (${dateStr}) - 360° Panorama | trusik.link`
      : `${locName} - 360° Panorama | trusik.link`;
    document.title = panoTitle;
    analytics.trackPageView(window.location.pathname + window.location.search, panoTitle);
    analytics.viewPanorama(panorama.id, panorama.city, panorama.filename);

    // If a share key is present in the URL, fetch stored camera view parameters from DB and apply them
    const urlParams = new URLSearchParams(window.location.search);
    const keyInUrl = urlParams.get('key');
    if (keyInUrl) {
      resolveShareKey(keyInUrl, panorama.id).then((resolved) => {
        if (resolved?.found && resolved.params) {
          const p = resolved.params;
          if (p.lon !== undefined && !isNaN(p.lon) && p.lat !== undefined && !isNaN(p.lat)) {
            threeViewerRef.current?.setOrientation?.(p.lon, p.lat, p.fov);
          }
          if (p.proj && ['rectilinear', 'curved', 'little_planet'].includes(p.proj)) {
            setProjectionMode(p.proj as ProjectionMode);
          }
        }
      });
    }
  }, [panorama.id, i18n.language]);

  // Compute nearby panoramas (always up to 30 closest, respecting active filters)
  const nearby = useMemo<(Panorama & { distance?: number })[]>(() => {
    // If active filters are passed from MapView, use them as candidate pool; otherwise use allPanoramas
    const candidatePool = filteredPanoramas && filteredPanoramas.length > 0 ? filteredPanoramas : allPanoramas;

    if (panorama.is_private && panorama.folder) {
      return candidatePool
        .filter((p) => p.id !== panorama.id && p.folder === panorama.folder)
        .slice(0, 30);
    }

    if (panorama.lat === null || panorama.lon === null || (panorama.lat === 0 && panorama.lon === 0)) {
      return [];
    }

    return candidatePool
      .filter((p) => {
        if (p.id === panorama.id || p.lat === null || p.lon === null || (p.lat === 0 && p.lon === 0)) return false;
        if (!isAdmin && p.is_private) return false;
        if (isAdmin) {
          if (!showPublic && !p.is_private) return false;
          if (!showPrivate && p.is_private) return false;
        }
        if (filmResFilter === '15K' && getResolutionCategory(p.width) !== '15K') return false;
        if (filmResFilter === '8K+' && (p.width || 0) < 7500) return false;
        return true;
      })
      .map((p) => ({
        ...p,
        distance: getDistance(panorama.lat!, panorama.lon!, p.lat!, p.lon!),
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
      .slice(0, 30);
  }, [panorama, allPanoramas, filteredPanoramas, filmResFilter, isAdmin, showPublic, showPrivate]);

  const filteredNearby = nearby;
  const isTimelineTab = filmstripTab === 'timeline' && timeTravelPanos.length > 1;
  const currentFilmItems = isTimelineTab ? timeTravelPanos : filteredNearby;

// Candidate cluster panoramas for Split Calibration View
  const calibrationClusterPanos = useMemo(() => {
    if (timeTravelPanos.length > 1) {
      return timeTravelPanos;
    }
    if (panorama.lat !== null && panorama.lon !== null && allPanoramas && allPanoramas.length > 0) {
      const matched = allPanoramas.filter((p) => {
        if (p.is_deleted || p.folder === '!DELETED!') return false;
        if (!isAdmin && p.is_private) return false;
        if (p.lat === null || p.lon === null || (p.lat === 0 && p.lon === 0)) return false;
        const d = getDistance(panorama.lat!, panorama.lon!, p.lat, p.lon);
        return d <= 120;
      });
      if (matched.length > 1) {
        return matched.sort((a, b) => {
          const da = a.date ? new Date(a.date).getTime() : 0;
          const db = b.date ? new Date(b.date).getTime() : 0;
          return da - db;
        });
      }
    }
    return [panorama, ...nearby];
  }, [timeTravelPanos, panorama, allPanoramas, isAdmin, nearby]);

  const handleToggleSplitCalibration = useCallback(() => {
    if (!isAdmin) return;
    setIsSplitCalibrationOpen((prev) => {
      const next = !prev;
      if (next) {
        if (calibrationClusterPanos.length < 2) {
          onShowToast(
            isSk
              ? 'V tomto clustri nie sú žiadne ďalšie panorámy na kalibráciu (potrebné aspoň 2)'
              : 'No other panoramas in this cluster to calibrate (at least 2 required)'
          );
          return false;
        }
        onShowToast(
          isSk
            ? 'Režim kalibrácie smeru v clustri: Stlačte Shift+C pre návrat'
            : 'Cluster calibration mode: Press Shift+C to exit'
        );
      }
      return next;
    });
  }, [isAdmin, calibrationClusterPanos.length, isSk, onShowToast]);

  const handleSaveSplitAlignment = async (
    leftP: Panorama,
    leftOffset: number,
    rightP: Panorama,
    rightOffset: number
  ): Promise<boolean> => {
    const leftSunData: PanoramaSunData = {
      ...(leftP.sun_data || {
        astro_azimuth: 0,
        astro_elevation: 0,
        img_azimuth: 0,
        img_elevation: 0,
        sun_detected: false,
      }),
      north_offset: Number(leftOffset.toFixed(2)),
      manual_aligned: true,
      visual_aligned: true,
      is_visual_anchor: true,
      alignment_confidence: 1.0,
    };
    leftP.sun_data = leftSunData;

    const rightSunData: PanoramaSunData = {
      ...(rightP.sun_data || {
        astro_azimuth: 0,
        astro_elevation: 0,
        img_azimuth: 0,
        img_elevation: 0,
        sun_detected: false,
      }),
      north_offset: Number(rightOffset.toFixed(2)),
      manual_aligned: true,
      visual_aligned: true,
      ref_pano_id: String(leftP.id),
      alignment_confidence: 1.0,
    };
    rightP.sun_data = rightSunData;

    const [resLeft, resRight] = await Promise.all([
      updatePanoramaSunData(String(leftP.id), leftSunData),
      updatePanoramaSunData(String(rightP.id), rightSunData),
    ]);

    if (String(panorama.id) === String(leftP.id)) {
      panorama.sun_data = leftSunData;
    } else if (String(panorama.id) === String(rightP.id)) {
      panorama.sun_data = rightSunData;
    }

    return resRight.success;
  };



  // Track active filmstrip sequence so PgUp/PgDn sequentially moves through the strip items
  useEffect(() => {
    setFilmstripPlaylist((prev) => {
      if (prev.length > 0 && prev.some((p) => p.id === panorama.id)) {
        return prev;
      }
      return [panorama, ...nearby];
    });
  }, [panorama.id, nearby]);

  const currentPlaylist = useMemo(() => {
    if (isTimelineTab) {
      return timeTravelPanos;
    }
    return filmstripPlaylist.length > 1
      ? filmstripPlaylist
      : nearby.length > 0
      ? [panorama, ...nearby]
      : filteredPanoramas && filteredPanoramas.length > 0
      ? filteredPanoramas
      : allPanoramas;
  }, [isTimelineTab, timeTravelPanos, filmstripPlaylist, nearby, panorama, filteredPanoramas, allPanoramas]);

  const { nextPanorama, prevPanorama } = useMemo(() => {
    const idx = currentPlaylist.findIndex((p) => p.id === panorama.id);
    if (idx !== -1 && currentPlaylist.length > 1) {
      return {
        nextPanorama: currentPlaylist[(idx + 1) % currentPlaylist.length],
        prevPanorama: currentPlaylist[(idx - 1 + currentPlaylist.length) % currentPlaylist.length],
      };
    } else if (nearby.length > 0) {
      return {
        nextPanorama: nearby[0],
        prevPanorama: nearby[nearby.length - 1],
      };
    }
    return { nextPanorama: null, prevPanorama: null };
  }, [currentPlaylist, panorama.id, nearby]);

  const handleNextPanorama = useCallback(() => {
    if (nextPanorama) {
      if (isTimelineTab) {
        handleTimeTravelSelect(nextPanorama);
      } else {
        onSelectPanorama(nextPanorama);
      }
      if (!isMovieMode) {
        const idx = currentPlaylist.findIndex((p) => p.id === nextPanorama.id);
        const posText = idx !== -1 ? `${idx + 1}/${currentPlaylist.length}` : '';
        onShowToast(`${i18n.language.startsWith('sk') ? (isTimelineTab ? 'Časová os' : 'Panoráma') : (isTimelineTab ? 'Timeline' : 'Panorama')} ${posText}`);
      }
    }
  }, [nextPanorama, currentPlaylist, onSelectPanorama, onShowToast, isMovieMode, i18n.language, isTimelineTab]);

  const handlePrevPanorama = useCallback(() => {
    if (prevPanorama) {
      if (isTimelineTab) {
        handleTimeTravelSelect(prevPanorama);
      } else {
        onSelectPanorama(prevPanorama);
      }
      if (!isMovieMode) {
        const idx = currentPlaylist.findIndex((p) => p.id === prevPanorama.id);
        const posText = idx !== -1 ? `${idx + 1}/${currentPlaylist.length}` : '';
        onShowToast(`${i18n.language.startsWith('sk') ? (isTimelineTab ? 'Časová os' : 'Panoráma') : (isTimelineTab ? 'Timeline' : 'Panorama')} ${posText}`);
      }
    }
  }, [prevPanorama, currentPlaylist, onSelectPanorama, onShowToast, isMovieMode, i18n.language, isTimelineTab]);

  // Toggle Movie Mode (Key 'M'): 360° circle on each panorama across filmstrip in fullscreen clean mode
  const handleToggleMovieMode = useCallback(() => {
    if (isMovieMode) {
      setIsMovieMode(false);
      setAutoPanMode('stopped');
      if (document.fullscreenElement) {
        Promise.resolve(document.exitFullscreen?.()).catch(() => {});
      }
      onShowToast(isSk ? 'Režim filmu ukončený' : 'Movie mode exited');
    } else {
      setIsTimelinePlaying(false);
      setIsMovieMode(true);
      if (autoPanMode === 'stopped') {
        setAutoPanMode('right');
      }
      setIsCleanView(false);
      setShowMobileMenu(false);
      setShowComments(false);
      setShowFeedback(false);
      closeHelp();
      setShowInfo(false);
      setImmersiveStrip(false);

      // Switch to browser fullscreen for clean movie mode
      if (!isBrowserFullscreen()) {
        requestBrowserFullscreen(containerRef.current || document.documentElement);
      }

      onShowToast(isSk ? 'Režim filmu: Celá obrazovka • M alebo ESC pre návrat' : 'Movie mode: Fullscreen • Press M or ESC to exit');
    }
  }, [isMovieMode, autoPanMode, isSk, onShowToast]);

  const handleFullCircleComplete = useCallback(() => {
    if (!isMovieMode) return;
    handleNextPanorama();
  }, [isMovieMode, handleNextPanorama]);

  const moviePlaylistCounter = useMemo(() => {
    const idx = currentPlaylist.findIndex((p) => p.id === panorama.id);
    if (idx !== -1) {
      return `${idx + 1}/${currentPlaylist.length}`;
    }
    return '';
  }, [currentPlaylist, panorama.id]);

  const zoomControlsBottom = useMemo(() => {
    const isFilmstripHidden = !isFilmRollVisible || ((isFullscreen || isImmersive) && isMobileScreen && !immersiveStrip);
    if (isCleanView || nearby.length === 0 || isFilmstripHidden) {
      return 'bottom-5 md:bottom-6';
    }
    if (filmstripSize === 'large') {
      return hasAnyFilterActive ? 'bottom-96 md:bottom-96' : 'bottom-96 md:bottom-88';
    }
    if (filmstripSize === 'mini') {
      return hasAnyFilterActive ? 'bottom-80 md:bottom-64' : 'bottom-72 md:bottom-56';
    }
    return hasAnyFilterActive ? 'bottom-96 md:bottom-80' : 'bottom-80 md:bottom-72';
  }, [isCleanView, nearby.length, isFilmRollVisible, isFullscreen, isImmersive, isMobileScreen, immersiveStrip, hasAnyFilterActive, filmstripSize]);

  // Listen to fullscreen changes (leaving browser fullscreen also leaves immersive mode and movie mode)
  useEffect(() => {
    return addFullscreenChangeListener((active) => {
      setIsFullscreen(active);
      if (!active) {
        setIsImmersive(false);
        setImmersiveStrip(false);
        setIsMovieMode((curr) => {
          if (curr) {
            setAutoPanMode('stopped');
          }
          return false;
        });
      } else if (isMobileScreen) {
        setIsImmersive(true);
        setImmersiveStrip(false);
      }
    });
  }, [isMobileScreen]);

  // Cycle Auto-rotation: 1st click -> rotating right, 2nd click -> stop, 3rd click -> rotating left, 4th click -> stop ...
  const handleToggleAutoPan = () => {
    if (autoPanMode === 'right' || autoPanMode === 'left') {
      setAutoPanMode('stopped');
      onShowToast(isSk ? 'Rotácia zastavená' : 'Auto-Rotation Stopped');
    } else {
      const nextDir: 'right' | 'left' = lastPanDirection === 'right' ? 'left' : 'right';
      setAutoPanMode(nextDir);
      setLastPanDirection(nextDir);
      onShowToast(
        nextDir === 'right'
          ? (isSk ? 'Pomalá rotácia doprava' : 'Auto-Rotating Right')
          : (isSk ? 'Pomalá rotácia doľava' : 'Auto-Rotating Left')
      );
    }
  };

  // Toggle fullscreen. Browser Fullscreen API is used when available (desktop / Android);
  // the "immersive" state additionally hides every overlay on phones and also covers
  // iOS Safari, where element fullscreen is not supported.
  const handleToggleFullscreen = () => {
    if (isImmersive || isBrowserFullscreen()) {
      setIsImmersive(false);
      setImmersiveStrip(false);
      exitBrowserFullscreen();
      return;
    }

    setImmersiveStrip(false);
    setIsImmersive(true);
    setShowMobileMenu(false);
    if (isMobileScreen) {
      setShowInfo(false);
      if (isExplorerOpen) onToggleExplorer?.();
    }
    requestBrowserFullscreen(containerRef.current || document.documentElement);
  };

  // Share current panorama with camera view parameters, clean 3-char key, and trackable SID
  const handleShare = async () => {
    const camView = threeViewerRef.current?.getViewState?.() || {
      lon: currentLonDeg,
      lat: currentLatDeg,
      fov: currentFovDeg,
      projectionMode,
    };
    const key = generateShareKey();
    const sid = `${panorama.id}_${key}`;
    const camParams = {
      lon: camView.lon,
      lat: camView.lat,
      fov: camView.fov,
      proj: camView.projectionMode,
      lang: i18n.language,
    };
    const shareUrl = getPanoShareUrl(panorama.id, undefined, key);
    const success = await copyToClipboard(shareUrl);
    if (success) {
      analytics.share('panorama', shareUrl);
      const locName = getPanoramaCity(panorama) || panorama.city || panorama.filename;
      recordDetailedShare(panorama.id, sid, shareUrl, `${locName} (#${panorama.id})`, key, camParams).then((newShares) => {
        setShareCount(newShares);
      });
      onShowToast(t('share_pano_copied'));
    } else {
      onShowToast(t('unable_copy'));
    }
  };

  // Export current 360 perspective view or Little Planet globe (4K 3840x2160, 16:9 aspect ratio, pure photo with subtle link watermark & QR code)
  const handleExportCurrentView = async () => {
    if (isExportingView) return;
    setIsExportingView(true);
    onShowToast(projectionMode === 'little_planet' ? t('rendering_little_planet') : t('rendering_4k'));
    try {
      const exportType = projectionMode === 'little_planet' ? 'little_planet' : projectionMode === 'curved' ? 'curved_crop' : '4k_crop';

      // Generate 3-char key so the exported photo & QR watermark link to the exact view angle and zoom!
      const key = generateShareKey();
      const exportFilename = generateExportFilename(panorama, exportType, isHdr, key);
      const sid = `${panorama.id}_${key}`;
      const camView = threeViewerRef.current?.getViewState?.() || {
        lon: currentLonDeg,
        lat: currentLatDeg,
        fov: currentFovDeg,
        projectionMode,
      };
      const camParams = {
        lon: camView.lon,
        lat: camView.lat,
        fov: camView.fov,
        proj: camView.projectionMode,
        lang: i18n.language,
      };
      const cleanShareUrl = getPanoShareUrl(panorama.id, undefined, key);
      const locName = getPanoramaCity(panorama) || panorama.city || panorama.filename;

      // Save share record asynchronously to D1 / KV
      recordDetailedShare(panorama.id, sid, cleanShareUrl, `${locName} (#${panorama.id} - Camera Export)`, key, camParams).catch(() => {});

      const success = await threeViewerRef.current?.captureCurrentView(exportFilename, cleanShareUrl, {
        title: panorama.city && panorama.city !== 'Unknown' ? panorama.city : (panorama.original_filename || panorama.filename),
        country: panorama.country && panorama.country !== 'Unknown' ? panorama.country : undefined,
        date: formatPanoramaDate(panorama.date),
        lat: panorama.lat,
        lon: panorama.lon,
      });
      if (success) {
        analytics.exportImage(panorama.id, exportFilename);
        onShowToast(projectionMode === 'little_planet' ? t('exported_little_planet_success') : t('exported_4k_success'));
      } else {
        onShowToast(t('exported_4k_error'));
      }
    } catch (err) {
      console.error('Failed to export 4K view:', err);
      onShowToast(t('exported_4k_error'));
    } finally {
      setIsExportingView(false);
    }
  };

  // Comprehensive Keyboard Navigation (WASD/Arrows, 1/2/3, 0, +/-, PgUp/PgDn, C, /, H, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        if (isHelpActive) {
          closeHelp();
        } else if (isTimelinePlaying) {
          setIsTimelinePlaying(false);
          onShowToast(isSk ? 'Prehrávanie časovej osi zastavené' : 'Timeline playback stopped');
        } else if (isMovieMode) {
          setIsMovieMode(false);
          setAutoPanMode('stopped');
          if (document.fullscreenElement) {
            Promise.resolve(document.exitFullscreen?.()).catch(() => {});
          }
          onShowToast(isSk ? 'Režim filmu ukončený' : 'Movie mode exited');
        } else if (isCleanView) {
          setIsCleanView(false);
        } else if (isExplorerOpen && onToggleExplorer) {
          onToggleExplorer();
        } else if (showMobileMenu) {
          setShowMobileMenu(false);
        } else if (showInfo) {
          setShowInfo(false);
        } else if (isImmersive) {
          setIsImmersive(false);
        } else {
          onClose();
        }
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMovieMode();
      } else if (e.key === 'h' || e.key === 'H' || e.key === '?') {
        e.preventDefault();
        toggleHelp();
      } else if (e.key === '/') {
        e.preventDefault();
        setIsCleanView((prev) => {
          const next = !prev;
          if (next) {
            onShowToast(
              i18n.language.startsWith('sk')
                ? "Čistý režim: Stlačte '/' pre návrat"
                : "Clean View: Press '/' to exit"
            );
          }
          return next;
        });
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        if (e.shiftKey && isAdmin) {
          handleToggleSplitCalibration();
        } else {
          handleExportCurrentView();
        }
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setIsVideoModalOpen(true);
      } else if (e.key === 't' || e.key === 'T') {
        if (isAdmin) {
          e.preventDefault();
          setShowTagEditorModal(true);
        }
      } else if (e.key === '1') {
        e.preventDefault();
        setProjectionMode('rectilinear');
        onShowToast(i18n.language.startsWith('sk') ? 'Štandardné zobrazenie' : 'Standard View');
      } else if (e.key === '2') {
        e.preventDefault();
        setProjectionMode('curved');
        onShowToast(i18n.language.startsWith('sk') ? 'Zaoblené zobrazenie' : 'Curved View');
      } else if (e.key === '3') {
        e.preventDefault();
        setProjectionMode('little_planet');
        onShowToast('Little Planet');
      } else if (e.key === '0') {
        e.preventDefault();
        threeViewerRef.current?.setOneToOneZoom();
        onShowToast(i18n.language.startsWith('sk') ? '1:1 Zoom (100% natívne pixely)' : '1:1 Zoom (100% native pixels)');
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        threeViewerRef.current?.zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        threeViewerRef.current?.zoomOut();
      } else if (e.key === 'PageUp' || e.key === ']' || e.key === '.') {
        e.preventDefault();
        handleNextPanorama();
      } else if (e.key === 'PageDown' || e.key === '[' || e.key === ',') {
        e.preventDefault();
        handlePrevPanorama();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleToggleAutoPan();
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        handleToggleSpatialAudio();
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handleToggleSolarCompass();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleToggleFullscreen();
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setShowInfo((prev) => !prev);
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        onToggleExplorer?.();
      } else if (e.key === 'l' || e.key === 'L') {
        if (panorama.lat !== null && panorama.lon !== null && onOpenMapAtCoords) {
          e.preventDefault();
          onOpenMapAtCoords(panorama.lat, panorama.lon, 16);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleResetCamera();
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        handleToggleGyroscope();
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleTogglePeakFinder();
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        handleToggleWalkthrough();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        if (e.shiftKey) {
          handleToggleTimelinePlay();
        } else {
          handleToggleTimeTravel();
        }
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        handleShare();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        threeViewerRef.current?.panBy(-6, 0);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        threeViewerRef.current?.panBy(6, 0);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        threeViewerRef.current?.panBy(0, 5);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        threeViewerRef.current?.panBy(0, -5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isExplorerOpen,
    onToggleExplorer,
    showInfo,
    showMobileMenu,
    isImmersive,
    onClose,
    isHelpActive,
    toggleHelp,
    closeHelp,
    isCleanView,
    isMovieMode,
    handleToggleMovieMode,
    isTimelinePlaying,
    handleToggleTimelinePlay,
    handleToggleTimeTravel,
    autoPanMode,
    lastPanDirection,
    filmstripPlaylist,
    nearby,
    filteredPanoramas,
    allPanoramas,
    panorama.id,
    panorama.lat,
    panorama.lon,
    onOpenMapAtCoords,
    handleExportCurrentView,
    handleToggleFullscreen,
    handleResetCamera,
    handleToggleGyroscope,
    handleTogglePeakFinder,
    handleToggleWalkthrough,
    handleShare,
    onShowToast,
  ]);

  // Full panorama download with center-sky watermark (Rate-limited: 1 per minute for non-admin, unlimited for admin)
  const handleDownloadFullPanorama = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      try {
        const lastTs = localStorage.getItem('last_pano_download_ts');
        if (lastTs) {
          const diff = Date.now() - Number(lastTs);
          if (diff < 60000) {
            const remaining = Math.ceil((60000 - diff) / 1000);
            onShowToast(t('download_limit', { seconds: remaining }));
            return;
          }
        }
        localStorage.setItem('last_pano_download_ts', String(Date.now()));
        setDownloadCooldown(60);
      } catch (_) {}
    }

    analytics.downloadPanorama(panorama.id);
    const cleanFilename = cleanPanoPath(panorama.filename);
    const downloadName = generateExportFilename(panorama, 'full', isHdr);
    const shareUrl = getPanoShareUrl(panorama.id);

    onShowToast(
      i18n.language.startsWith('sk')
        ? 'Pripravujem stiahnutie plnej panorámy s vodotlačou...'
        : 'Preparing full panorama download with watermark...'
    );

    try {
      const candidates = [
        `https://r2-panoramas.trusik.link/panoramas_web/${cleanFilename}`,
        `/r2/panoramas_web/${cleanFilename}`,
        `/panoramas_web/${cleanFilename}`,
        `https://ag.trusik.link/panoramas_web/${cleanFilename}`,
        `https://ag.trusik.link/panoramas/${cleanFilename}`,
        ...(cleanFilename.startsWith('private/') ? [] : [`https://ag.trusik.link/panoramas/private/${cleanFilename}`]),
        `/api/panoramas/asset?path=${encodeURIComponent(cleanFilename)}`,
        `/panoramas/${cleanFilename}`
      ];

      const img = new Image();
      img.crossOrigin = 'anonymous';

      let candidateIdx = 0;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => {
          candidateIdx++;
          if (candidateIdx < candidates.length) {
            img.src = candidates[candidateIdx];
          } else {
            reject(new Error('Failed to load panorama image'));
          }
        };
        img.src = candidates[0];
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2d canvas context');

      ctx.drawImage(img, 0, 0);

      // Apply HDR if active before applying watermark
      if (isHdr) {
        applyHDRToCanvas(canvas);
      }

      // Watermark in exact horizontal center, in the sky above the horizon
      await drawPanoramaWatermark(ctx, {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        shareUrl,
        title: panorama.city && panorama.city !== 'Unknown' ? panorama.city : (panorama.original_filename || panorama.filename),
        country: panorama.country && panorama.country !== 'Unknown' ? panorama.country : undefined,
        date: formatPanoramaDate(panorama.date),
        lat: panorama.lat,
        lon: panorama.lon,
        position: 'center-sky',
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95)
      );

      if (!blob) throw new Error('toBlob failed');

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

      onShowToast(
        isAdmin
          ? (i18n.language.startsWith('sk')
              ? 'Plná panoráma s vodotlačou stiahnutá (Admin - neobmedzene)!'
              : 'Full panorama with watermark downloaded (Admin)!')
          : (i18n.language.startsWith('sk')
              ? 'Plná panoráma s vodotlačou stiahnutá! Ďalšie stiahnutie o 60s.'
              : 'Full panorama downloaded! Next download in 60s.')
      );
    } catch (err) {
      console.warn('Canvas watermarking fallback to direct download:', err);
      const link = document.createElement('a');
      link.href = `/panoramas_web/${cleanFilename}`;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onShowToast(
        isAdmin
          ? 'Downloading full 360° panorama (Admin)...'
          : 'Download started! Next full download available in 60s.'
      );
    }
  };

  // Scroll film roll horizontally
  const handleScrollFilmRoll = (direction: 'left' | 'right') => {
    if (filmRollRef.current) {
      const scrollAmount = 360;
      filmRollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Auto-scroll filmstrip horizontally so that the active panorama card is always centered in view
  useEffect(() => {
    if (!isFilmRollVisible) return;
    const scrollContainer = filmRollRef.current;
    if (!scrollContainer) return;

    // Small delay to allow DOM nodes to settle if filmstrip tab or items just changed
    const timer = setTimeout(() => {
      const activeEl = scrollContainer.querySelector(`[data-pano-id="${panorama.id}"]`) as HTMLElement | null;
      if (activeEl) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        const offset = activeRect.left - containerRect.left;
        const targetScrollLeft =
          scrollContainer.scrollLeft + offset - (containerRect.width / 2) + (activeRect.width / 2);
        scrollContainer.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: 'smooth',
        });
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [panorama.id, isFilmRollVisible, filmstripTab]);

  const isFs = isFullscreen || isImmersive;
  // In fullscreen / immersive mode or clean view, regular top toolbar is hidden in favor of fullscreen controls
  const hideOnImmersive = isCleanView ? 'hidden' : (isFs ? 'hidden' : '');

  // Reusable mobile dropdown menu for both regular toolbar and fullscreen mode
  const renderMobileMenuDropdown = () => (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setShowMobileMenu(false);
        }}
      />
      <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-7rem)] overflow-y-auto glass-panel-elevated rounded-3xl p-2.5 border border-white/15 shadow-2xl animate-slide-up space-y-1 z-50 text-white">
        <div className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3" />
        <span>
          {textureState === 'ultra_hd'
            ? `${getHorizontalK(panorama.width)} Ultra-HD`
            : textureState === 'hd_8k'
            ? `8K HD (streaming ${getHorizontalK(panorama.width)}…)`
            : textureState === 'preview_2k_final'
            ? '2K HD'
            : textureState === 'preview_2k'
            ? `${getHorizontalK(panorama.width)} (streaming…)`
            : getHorizontalK(panorama.width)}
        </span>
      </div>

      <button
        onClick={() => { handleToggleAutoPan(); setShowMobileMenu(false); }}
        className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-semibold text-cyan-200 hover:bg-white/10 text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          {autoPanMode === 'right' ? (
            <RotateCw className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          ) : autoPanMode === 'left' ? (
            <RotateCcw className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          ) : (
            <RotateCw className="w-4 h-4 text-cyan-400" />
          )}
          <span>
            {autoPanMode === 'right'
              ? (isSk ? 'Rotácia doprava (klik = stop)' : 'Rotating Right (click to stop)')
              : autoPanMode === 'left'
              ? (isSk ? 'Rotácia doľava (klik = stop)' : 'Rotating Left (click to stop)')
              : (isSk ? (lastPanDirection === 'right' ? 'Automatická rotácia doľava (P)' : 'Automatická rotácia doprava (P)') : (lastPanDirection === 'right' ? 'Auto-Rotate Left (P)' : 'Auto-Rotate Right (P)'))}
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-400">P</span>
      </button>
      <button
        onClick={() => { handleToggleMovieMode(); setShowMobileMenu(false); }}
        className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-semibold text-left cursor-pointer transition-colors ${
          isMovieMode ? 'text-amber-300 bg-amber-500/20' : 'text-zinc-200 hover:bg-white/10'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Film className="w-4 h-4 text-amber-400" />
          <span>{isMovieMode ? (isSk ? 'Zastaviť film (M)' : 'Stop Movie (M)') : (isSk ? 'Kino / Režim filmu (M)' : 'Movie Mode (M)')}</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-400">M</span>
      </button>
      <button
        onClick={() => { setShowInfo(true); setShowMobileMenu(false); }}
        className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold text-amber-200 hover:bg-white/10 text-left cursor-pointer"
      >
        <Info className="w-4 h-4 text-amber-400" />
        <span>Panorama details</span>
      </button>
      <button
        onClick={() => { setShowMobileMenu(false); toggleHelp(); }}
        className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-semibold text-cyan-200 hover:bg-white/10 text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span>{isSk ? 'Sprievodca & Klávesy' : 'Guide & Shortcuts'}</span>
        </div>
        <span className="text-[10px] font-mono text-cyan-400">? / H</span>
      </button>

      {/* 3-way Projection Mode Switcher in Mobile Menu */}
      <div className="p-1 bg-white/5 rounded-2xl border border-white/10 my-1 space-y-1">
        <div className="px-2 pt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
          {i18n.language.startsWith('sk') ? 'Režim projekcie' : 'Projection Mode'}
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => { setProjectionMode('rectilinear'); setShowMobileMenu(false); }}
            className={`py-1.5 px-1 rounded-xl text-[11px] font-bold text-center cursor-pointer ${
              projectionMode === 'rectilinear' ? 'bg-cyan-500 text-zinc-950 font-extrabold shadow-sm' : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            {i18n.language.startsWith('sk') ? 'Štandard' : 'Standard'}
          </button>
          <button
            onClick={() => { setProjectionMode('curved'); setShowMobileMenu(false); }}
            className={`py-1.5 px-1 rounded-xl text-[11px] font-bold text-center cursor-pointer ${
              projectionMode === 'curved' ? 'bg-cyan-500 text-zinc-950 font-extrabold shadow-sm' : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            {i18n.language.startsWith('sk') ? 'Zaoblené' : 'Curved'}
          </button>
          <button
            onClick={() => { setProjectionMode('little_planet'); setShowMobileMenu(false); }}
            className={`py-1.5 px-1 rounded-xl text-[11px] font-bold text-center cursor-pointer ${
              projectionMode === 'little_planet' ? 'bg-cyan-500 text-zinc-950 font-extrabold shadow-sm' : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            Planet
          </button>
        </div>
      </div>

      {/* HDR Mode Switcher in Menu */}
      <div className="p-1 bg-white/5 rounded-2xl border border-white/10 my-1 space-y-1">
        <div className="px-2 pt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
          {i18n.language.startsWith('sk') ? 'Obrazový profil' : 'Color Profile'}
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => { setIsHdr(false); setShowMobileMenu(false); }}
            className={`py-1.5 px-1 rounded-xl text-[11px] font-bold text-center cursor-pointer ${
              !isHdr ? 'bg-zinc-700 text-white font-extrabold shadow-sm' : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            Normal
          </button>
          <button
            onClick={() => { setIsHdr(true); setShowMobileMenu(false); }}
            className={`py-1.5 px-1 rounded-xl text-[11px] font-bold text-center cursor-pointer flex items-center justify-center gap-1 ${
              isHdr ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-extrabold shadow-sm' : 'text-amber-400 hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>HDR</span>
          </button>
        </div>
      </div>

      {/* Sensors & Exploration Tools in Menu */}
      <div className="p-1 bg-white/5 rounded-2xl border border-white/10 my-1 space-y-1">
        <div className="px-2 pt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
          {isSk ? 'Senzory & Nástroje' : 'Sensors & Tools'}
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => { handleToggleSpatialAudio(); setShowMobileMenu(false); }}
            className={`py-1.5 px-1 rounded-xl text-[11px] font-bold text-center cursor-pointer flex items-center justify-center gap-1.5 ${
              isSpatialAudioEnabled
                ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400 shadow-sm'
                : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            {isSpatialAudioEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-300" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-400" />}
            <span>{isSk ? 'Hudba (O)' : 'Music (O)'}</span>
          </button>
          <button
            onClick={() => { handleToggleSolarCompass(); setShowMobileMenu(false); }}
            className={`py-1.5 px-1 rounded-xl text-[11px] font-bold text-center cursor-pointer flex items-center justify-center gap-1.5 ${
              isSolarCompassEnabled && projectionMode === 'rectilinear'
                ? 'bg-amber-500/30 text-amber-200 border border-amber-400 shadow-sm'
                : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>{isSk ? 'Kompas (K)' : 'Compass (K)'}</span>
          </button>
          <button
            onClick={() => { handleToggleGyroscope(); setShowMobileMenu(false); }}
            className={`py-1.5 px-1 rounded-xl text-[11px] font-bold text-center cursor-pointer flex items-center justify-center gap-1.5 ${
              isGyroscopeActive
                ? 'bg-violet-500/30 text-violet-200 border border-violet-400 shadow-sm'
                : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-violet-400" />
            <span>{isSk ? 'Gyroskop (G)' : 'Gyro (G)'}</span>
          </button>
          <button
            onClick={() => { handleResetCamera(); setShowMobileMenu(false); }}
            className="py-1.5 px-1 rounded-xl text-[11px] font-bold text-center cursor-pointer flex items-center justify-center gap-1.5 text-zinc-300 hover:bg-white/10"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>{isSk ? 'Reset (R)' : 'Reset (R)'}</span>
          </button>
          {timeTravelPanos.length > 1 && (
            <button
              onClick={() => {
                setShowMobileMenu(false);
                handleToggleTimeTravel();
              }}
              className={`col-span-2 py-1.5 px-1 rounded-xl text-[11px] font-bold text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                filmstripTab === 'timeline'
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-400 shadow-sm'
                  : 'text-zinc-300 hover:bg-white/10'
              }`}
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>{isSk ? 'Časová os lokácie (Y)' : 'Time Travel History (Y)'}</span>
            </button>
          )}
        </div>
      </div>

      <button
        onClick={() => { setShowMobileMenu(false); handleExportCurrentView(); }}
        disabled={isExportingView}
        className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold text-emerald-200 hover:bg-white/10 text-left disabled:opacity-50 cursor-pointer"
      >
        <Camera className="w-4 h-4 text-emerald-400" />
        <span>{isLittlePlanet ? `${t('export_4k')} (Little Planet)` : t('export_4k')}</span>
      </button>
      <button
        onClick={() => { setShowMobileMenu(false); setIsVideoModalOpen(true); }}
        className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold text-rose-200 hover:bg-white/10 text-left cursor-pointer"
      >
        <Video className="w-4 h-4 text-rose-400" />
        <span>{isSk ? 'Export 360° Videa (MP4)' : 'Export 360° Video (MP4)'}</span>
      </button>
      <button
        onClick={() => { setShowMobileMenu(false); handleShare(); }}
        className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-semibold text-violet-200 hover:bg-white/10 text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Share2 className="w-4 h-4 text-violet-400" />
          <span>{t('shares')}</span>
        </div>
        {shareCount > 0 && (
          <span className="text-[11px] font-mono text-zinc-400">({shareCount}×)</span>
        )}
      </button>

      <button
        onClick={() => { setShowMobileMenu(false); handleToggleFavorite(); }}
        className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-semibold text-left cursor-pointer transition-colors ${
          isFavorite ? 'text-rose-300 bg-rose-500/15' : 'text-zinc-200 hover:bg-white/10'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-rose-400'}`} />
          <span>{isFavorite ? t('remove_from_favorites') : t('add_to_favorites')}</span>
        </div>
        {favoriteCount > 0 && (
          <span className="text-[11px] font-mono text-zinc-400">({favoriteCount})</span>
        )}
      </button>

      <button
        onClick={() => { setShowMobileMenu(false); setShowComments(true); }}
        className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-semibold text-amber-200 hover:bg-white/10 text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span>{t('comments')}</span>
        </div>
        {commentsCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
            {commentsCount}
          </span>
        )}
      </button>
      <button
        onClick={() => { setShowMobileMenu(false); setShowFeedback(true); }}
        className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold text-cyan-200 hover:bg-white/10 text-left cursor-pointer"
      >
        <Mail className="w-4 h-4 text-cyan-400" />
        <span>{i18n.language.startsWith('sk') ? 'Poslať feedback autorovi' : 'Send feedback'}</span>
      </button>

      {/* Experimental Features Section in Menu */}
      <div className="p-1.5 bg-amber-500/5 rounded-2xl border border-amber-500/20 my-1 space-y-1">
        <div className="px-2 pt-0.5 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-amber-300">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{isSk ? 'Experimentálne funkcie' : 'Experimental Features'}</span>
          </span>
          <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-extrabold">BETA</span>
        </div>

        {/* 3D Walkthrough Ground Arrows */}
        <button
          onClick={() => { handleToggleWalkthrough(); setShowMobileMenu(false); }}
          className={`w-full flex items-center justify-between py-2 px-2.5 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer ${
            isWalkthroughEnabled && projectionMode === 'rectilinear'
              ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
              : 'text-zinc-300 hover:bg-white/10'
          }`}
          title={
            isSk
              ? (isWalkthroughEnabled
                  ? '3D Virtuálna prechádzka zapnutá (Kláves X)'
                  : 'Zapnúť 3D Virtuálnu prechádzku — Navigačné šípky na zemi (Kláves X)')
              : (isWalkthroughEnabled
                  ? '3D Virtual Walkthrough enabled (Key X)'
                  : 'Enable 3D Virtual Walkthrough — Navigation ground chevrons (Key X)')
          }
        >
          <div className="flex items-center gap-2">
            <Footprints className="w-4 h-4 text-emerald-400" />
            <span>{isSk ? 'Prechody medzi panorámami (Šípky)' : '3D Walkthrough (Ground arrows)'}</span>
          </div>
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
            isWalkthroughEnabled && projectionMode === 'rectilinear'
              ? 'bg-emerald-400 text-zinc-950 font-black'
              : 'bg-white/10 text-zinc-400'
          }`}>
            {isWalkthroughEnabled && projectionMode === 'rectilinear' ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Filmstrip Hover 2K Zoom Preview Toggle */}
        <button
          onClick={(e) => { handleToggleHoverPreview(e); setShowMobileMenu(false); }}
          className={`w-full flex items-center justify-between py-2 px-2.5 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer ${
            showHoverPreview
              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
              : 'text-zinc-300 hover:bg-white/10'
          }`}
          title={
            isSk
              ? (showHoverPreview
                  ? 'Zväčšené 2K náhľady na filmovom páse zapnuté'
                  : 'Zapnúť zväčšené 2K náhľady na filmovom páse pri prejdení myšou')
              : (showHoverPreview
                  ? 'Filmstrip hover 2K zoom previews enabled'
                  : 'Enable filmstrip hover 2K zoom previews on mouse hover')
          }
        >
          <div className="flex items-center gap-2">
            {showHoverPreview ? <Eye className="w-4 h-4 text-cyan-400" /> : <EyeOff className="w-4 h-4 text-zinc-400" />}
            <span>{isSk ? 'Hover náhľad na filmovom páse' : 'Filmstrip hover 2K preview'}</span>
          </div>
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
            showHoverPreview
              ? 'bg-cyan-400 text-zinc-950 font-black'
              : 'bg-white/10 text-zinc-400'
          }`}>
            {showHoverPreview ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Peak Finder (Horizon POIs) */}
        <button
          onClick={() => { handleTogglePeakFinder(); setShowMobileMenu(false); }}
          className={`w-full flex items-center justify-between py-2 px-2.5 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer ${
            isPeakFinderEnabled && projectionMode === 'rectilinear'
              ? 'bg-sky-500/20 text-sky-200 border border-sky-500/40'
              : 'text-zinc-300 hover:bg-white/10'
          }`}
          title={
            isSk
              ? (isPeakFinderEnabled
                  ? 'Peak Finder zapnutý — Vrcholy na horizonte (Kláves B)'
                  : 'Zapnúť Peak Finder — Zobraziť vrchy a dominanty na horizonte (Kláves B)')
              : (isPeakFinderEnabled
                  ? 'Peak Finder enabled — Horizon peaks (Key B)'
                  : 'Enable Peak Finder — Show peaks & landmarks on horizon (Key B)')
          }
        >
          <div className="flex items-center gap-2">
            <Mountain className="w-4 h-4 text-sky-400" />
            <span>{isSk ? 'Peak Finder (Vrcholy na horizonte)' : 'Peak Finder (Horizon peaks)'}</span>
          </div>
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
            isPeakFinderEnabled && projectionMode === 'rectilinear'
              ? 'bg-sky-400 text-zinc-950 font-black'
              : 'bg-white/10 text-zinc-400'
          }`}>
            {isPeakFinderEnabled && projectionMode === 'rectilinear' ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {/* View Mode Switcher in Menu */}
      <div className="p-1 bg-white/5 rounded-2xl border border-white/10 my-1">
        <button
          type="button"
          onClick={() => {
            toggleViewMode();
            setShowMobileMenu(false);
            onShowToast(
              isMobileMode ? t('view_mode_toast_desktop') : t('view_mode_toast_mobile')
            );
          }}
          className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer group"
          title={isMobileMode ? t('switch_to_desktop') : t('switch_to_mobile')}
        >
          <div className="flex items-center gap-2">
            {isMobileMode ? (
              <Smartphone className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            ) : (
              <Monitor className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            )}
            <span>{isMobileMode ? t('switch_to_desktop') : t('switch_to_mobile')}</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[9px] border border-cyan-500/30">
            {isMobileMode ? 'Mobile' : 'Desktop'}
          </span>
        </button>
      </div>

      {isAdmin && (
        <div className="pt-1.5 mt-1.5 border-t border-white/10 space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Admin</div>
          <button
            onClick={() => { toggleSelectPano(panorama.id); setShowMobileMenu(false); }}
            className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold text-zinc-100 hover:bg-white/10 text-left cursor-pointer"
          >
            {isPanoSelected(panorama.id) ? <CheckSquare className="w-4 h-4 text-cyan-400" /> : <Square className="w-4 h-4 text-cyan-400" />}
            <span>{isPanoSelected(panorama.id) ? 'Deselect' : 'Select for bulk edit'}</span>
          </button>
          <button
            onClick={() => {
              setShowMobileMenu(false);
              const next = !isCalibratingSun;
              setIsCalibratingSun(next);
              if (next) {
                onShowToast(
                  isSk
                    ? 'Režim kalibrácie Slnka aktívny: Dvojkliknite (double-click) na Slnko v panoráme.'
                    : 'Sun calibration active: Double-click on the Sun in panorama.'
                );
              }
            }}
            className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold text-amber-300 hover:bg-white/10 text-left cursor-pointer"
          >
            <Sun className={`w-4 h-4 ${isCalibratingSun ? 'animate-spin' : ''} text-amber-400`} />
            <span>
              {isCalibratingSun
                ? (isSk ? 'Zrušiť kalibráciu Slnka' : 'Cancel Sun Calibration')
                : (isSk ? 'Kalibrácia Slnka (Dvojklik)' : 'Calibrate Sun (Double-click)')}
            </span>
          </button>
          <button
            onClick={() => {
              setShowMobileMenu(false);
              handleToggleSplitCalibration();
            }}
            className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold text-cyan-300 hover:bg-white/10 text-left cursor-pointer"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>{isSk ? 'Kalibrovať zarovnanie (Cluster)' : 'Calibrate Alignment (Cluster)'}</span>
          </button>
          <button
            onClick={() => {
              setShowMobileMenu(false);
              handleToggleRadarLock();
            }}
            className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold text-amber-300 hover:bg-white/10 text-left cursor-pointer"
          >
            {isRadarLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-amber-400" />}
            <span>
              {isRadarLocked
                ? (isSk ? 'Uložiť Radar' : 'Save Radar')
                : (isSk ? 'Kalibrácia Radaru' : 'Calibrate Radar')}
            </span>
          </button>
          <button
            onClick={async () => { setShowMobileMenu(false); await handleTogglePrivacy(); }}
            className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold text-zinc-100 hover:bg-white/10 text-left cursor-pointer"
          >
            {panorama.is_private ? <Globe2 className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-rose-400" />}
            <span>{panorama.is_private ? 'Make Public' : 'Make Private'}</span>
          </button>
          {isDeleted ? (
            <button
              onClick={async () => { setShowMobileMenu(false); await handleRestorePano(); }}
              className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-white/10 text-left cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              <span>Restore from !DELETED!</span>
            </button>
          ) : (
            <button
              onClick={async () => { setShowMobileMenu(false); await handleDeletePano(); }}
              className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold text-rose-300 hover:bg-white/10 text-left cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Delete (move to !DELETED!)</span>
            </button>
          )}
        </div>
      )}

      {!isAdmin && (
        <div className="pt-1 border-t border-white/10">
          <button
            onClick={() => {
              setShowMobileMenu(false);
              setShowAdminModal(true);
            }}
            className="w-full flex items-center gap-2.5 py-2 px-3 rounded-xl text-xs font-semibold text-zinc-400 hover:text-amber-300 hover:bg-white/10 text-left cursor-pointer transition-colors"
          >
            <Key className="w-4 h-4 text-zinc-500 hover:text-amber-400" />
            <span>{isSk ? 'Admin prihlásenie' : 'Admin Login'}</span>
          </button>
        </div>
      )}
    </div>
    </>
  );

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[2000] flex flex-col bg-black overflow-hidden select-none animate-fade-in"
    >
      {/* 360 WebGL Canvas Container: Three.js (Google Photos style) */}
      <div
        className="flex-1 w-full h-full relative overflow-hidden"
        onPointerDown={() => {
          if (showMobileMenu) setShowMobileMenu(false);
          if (immersiveStrip) setImmersiveStrip(false);
        }}
      >
        <ThreePanoViewer
          ref={threeViewerRef}
          panorama={panorama}
          nextPanorama={nextPanorama}
          prevPanorama={prevPanorama}
          initialLon={initialLon}
          initialLat={initialLat}
          initialFov={initialFov}
          isAutoPanning={isAutoPanning}
          autoPanDirection={autoPanMode === 'stopped' ? 'none' : autoPanMode}
          projectionMode={projectionMode}
          isLittlePlanet={isLittlePlanet}
          isHdr={isHdr}
          isMovieMode={isMovieMode}
          isSpatialAudioEnabled={isSpatialAudioEnabled}
          spatialAudioVolume={spatialAudioVolume}
          isSolarCompassEnabled={isSolarCompassEnabled}
          isPeakFinderEnabled={isPeakFinderEnabled}
          isWalkthroughEnabled={isWalkthroughEnabled}
          isGyroscopeEnabled={isGyroscopeActive}
          onToggleGyroscope={(act) => setIsGyroscopeActive(act)}
          isCalibratingSun={isCalibratingSun}
          onCalibrateSunPoint={handleCalibrateSunPoint}
          calibrationOverlay={calibrationOverlay}
          filmstripPanoramas={filteredNearby}
          onSelectPanorama={onSelectPanorama}
          onHeadingChange={(headingDeg, lon, lat, fov) => {
            setCurrentHeadingDeg(headingDeg);
            setCurrentLonDeg(lon);
            setCurrentLatDeg(lat);
            if (fov !== undefined && !isNaN(fov)) {
              setCurrentFovDeg(fov);
            }
          }}
          onFullCircleComplete={handleFullCircleComplete}
          onAutoPanStop={() => setAutoPanMode('stopped')}
          onHighResLoaded={() => setIsHighResReady(true)}
          onTextureStateChange={(state, details) => {
            setTextureState(state);
            if (details?.width && (!panorama.width || panorama.width <= 0)) {
              panorama.width = details.width;
              if (details.height) panorama.height = details.height;
            }
            if (state === 'ultra_hd' || state === 'hd_8k' || state === 'preview_2k_final') {
              setIsHighResReady(true);
            }
          }}
          onLoadingChange={(loading) => setIsLoading(loading)}
          onError={(err) => setLoadError(err)}
          onZoomChange={(info) => {
            setZoomText(info.text);
            setIs1to1(info.is1to1);
          }}
        />

        {/* Floating Admin Sun Calibration Hint Banner */}
        {isCalibratingSun && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-2xl bg-amber-500 text-zinc-950 backdrop-blur-xl shadow-2xl border-2 border-amber-300 font-bold text-xs flex items-center gap-3 animate-in fade-in zoom-in-95 pointer-events-auto select-none">
            <Sun className="w-4 h-4 text-zinc-950 animate-spin shrink-0" />
            <span>
              {isSk
                ? 'Dvojkliknite (double-click) na skutočné Slnko v panoráme pre okamžité prekalibrovanie a uloženie do KV.'
                : 'Double-click anywhere on the Sun in the panorama to calibrate and persist to KV.'}
            </span>
            <button
              type="button"
              onClick={() => setIsCalibratingSun(false)}
              className="ml-2 px-2.5 py-0.5 rounded-lg bg-zinc-950/20 hover:bg-zinc-950/40 text-zinc-950 font-black text-[11px] cursor-pointer"
            >
              ✕ {isSk ? 'Zrušiť' : 'Cancel'}
            </button>
          </div>
        )}

        {/* Floating Admin Radar Lock Calibration Hint Banner */}
        {isRadarLocked && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-2xl bg-amber-500 text-zinc-950 backdrop-blur-xl shadow-2xl border-2 border-amber-300 font-bold text-xs flex items-center gap-3 animate-in fade-in zoom-in-95 pointer-events-auto select-none">
            <Lock className="w-4 h-4 text-zinc-950 animate-pulse shrink-0" />
            <span>
              {isSk
                ? `Radar je zamknutý na ${Math.round(lockedRadarHeadingRef.current)}°. Otočte panorámu presne na daný objekt a kliknite na "Uložiť Radar" hore.`
                : `Radar is locked to ${Math.round(lockedRadarHeadingRef.current)}°. Rotate panorama to match the target and click "Save Radar" above.`}
            </span>
            <button
              type="button"
              onClick={handleToggleRadarLock}
              className="ml-2 px-2.5 py-0.5 rounded-lg bg-zinc-950 text-amber-300 hover:text-white font-black text-[11px] cursor-pointer shadow-md"
            >
              ✓ {isSk ? 'Uložiť do KV' : 'Save to KV'}
            </button>
            <button
              type="button"
              onClick={() => setIsRadarLocked(false)}
              className="px-2 py-0.5 rounded-lg bg-zinc-950/20 hover:bg-zinc-950/40 text-zinc-950 font-black text-[11px] cursor-pointer"
            >
              ✕ {isSk ? 'Zrušiť' : 'Cancel'}
            </button>
          </div>
        )}

        {/* Solar Azimuth Compass HUD [EXPERIMENTAL] - Active only in standard projection mode */}
        {isSolarCompassEnabled && !isCleanView && projectionMode === 'rectilinear' && (
          <SolarCompassHUD
            panorama={panorama}
            currentLonDeg={currentLonDeg}
            currentLatDeg={currentLatDeg}
            cameraFov={currentFovDeg}
            isFilmstripOpen={!isCleanView && !isMovieMode && nearby.length > 0}
            onClose={() => setIsSolarCompassEnabled(false)}
            isSk={isSk}
            onRotateToHeading={(headingDeg) => {
              threeViewerRef.current?.lookAtHeading(headingDeg);
            }}
            isAdmin={isAdmin}
            isHeadingLocked={isRadarLocked}
            onToggleHeadingLock={handleToggleRadarLock}
            onLockHeadingCalibrate={handleLockHeadingCalibrate}
            nearbyPanoramas={filteredNearby}
            onSelectPanorama={onSelectPanorama}
          />
        )}

        {/* Vertical Timeline Ruler Scale (active in timeline cluster mode) */}
        {isTimelineTab && !isCleanView && !isMovieMode && !isSplitCalibrationOpen && (
          <VerticalTimelineRuler
            currentPanorama={panorama}
            timelinePanoramas={timeTravelPanos}
            onSelectPanorama={handleTimeTravelSelect}
            isFs={isFs}
            isFilmstripVisible={isFilmRollVisible && !((isFullscreen || isImmersive) && isMobileScreen && !immersiveStrip)}
            filmstripSize={filmstripSize}
            hasFilter={hasAnyFilterActive}
            isSk={isSk}
            isPortrait={isPortrait}
            isMobile={isMobileScreen}
          />
        )}

        {/* Floating Zoom Controls (+ / -), 1:1 Pixel Mapping, and Keyboard Shortcut Helper */}
        {!isCleanView && !isMovieMode && (
          <div
            className={`absolute right-3 md:right-4 ${zoomControlsBottom} z-30 flex flex-col items-center gap-1 bg-zinc-950/85 backdrop-blur-xl p-1 rounded-2xl border border-white/20 shadow-2xl transition-all pointer-events-auto`}
          >
            <button
              type="button"
              onClick={() => threeViewerRef.current?.zoomIn()}
              className="p-2 md:p-2.5 rounded-xl bg-white/10 hover:bg-white/25 text-white active:scale-95 transition-all cursor-pointer"
              title={isSk ? 'Priblížiť (+)' : 'Zoom In (+)'}
              aria-label="Zoom in"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                threeViewerRef.current?.setOneToOneZoom();
                onShowToast(isSk ? '1:1 Zoom (100% natívne pixely)' : '1:1 Zoom (100% native pixels)');
              }}
              className={`px-1.5 py-1 rounded-lg text-[10px] font-mono font-bold tracking-tight transition-all cursor-pointer border ${
                is1to1
                  ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 ring-1 ring-cyan-500/50'
                  : 'bg-white/5 hover:bg-white/15 text-zinc-300 border-white/10 hover:text-white'
              }`}
              title={isSk ? 'Kliknite pre 1:1 natívne pixely (Kláves 0)' : 'Click for 1:1 native pixels (Key 0)'}
            >
              {zoomText}
            </button>
            <button
              type="button"
              onClick={() => threeViewerRef.current?.zoomOut()}
              className="p-2 md:p-2.5 rounded-xl bg-white/10 hover:bg-white/25 text-white active:scale-95 transition-all cursor-pointer"
              title={isSk ? 'Oddialiť / Širší záber (-)' : 'Zoom Out / Wider Shot (-)'}
              aria-label="Zoom out"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Clean View Exit Hint */}
      {isCleanView && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-2xl bg-zinc-950/85 backdrop-blur-xl border border-white/20 text-xs font-semibold text-zinc-200 shadow-2xl animate-fade-in pointer-events-auto">
          <span>{isSk ? "Čistý režim: Stlačte '/' pre návrat" : "Clean View: Press '/' to return"}</span>
          <button
            onClick={() => setIsCleanView(false)}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/25 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title={isSk ? "Ukončiť čistý režim" : "Exit Clean View"}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Fullscreen Mode Controls (phone and desktop): Movie, Play, Share, Camera, Exit Fullscreen, Three dots */}
      {isFs && !isCleanView && !isMovieMode && (
        <div
          className="absolute right-3 md:right-4 z-30 flex items-center gap-1.5 sm:gap-2 pointer-events-auto animate-fade-in"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
        >
          {autoPanMode !== 'stopped' ? (
            /* When rotation is active: SHOW ONLY the Rotate button */
            <button
              onClick={handleToggleAutoPan}
              className="p-2.5 rounded-2xl bg-cyan-500/40 text-cyan-200 border border-cyan-400 ring-2 ring-cyan-500/30 shadow-2xl backdrop-blur-xl transition-all cursor-pointer flex items-center gap-2"
              title={isSk ? 'Zastaviť rotáciu (P)' : 'Stop rotation (P)'}
            >
              <RotateCw className="w-4 h-4 text-cyan-200 animate-spin-slow" />
              <span className="text-xs font-bold sm:inline hidden">{isSk ? 'Zastaviť' : 'Stop'}</span>
            </button>
          ) : (
            <>
              {/* 1. Movie button */}
              <button
                onClick={handleToggleMovieMode}
                className={`p-2.5 rounded-2xl border shadow-xl backdrop-blur-xl transition-all cursor-pointer ${
                  isMovieMode
                    ? 'bg-amber-500/35 text-amber-200 border-amber-400 ring-2 ring-amber-500/30'
                    : 'bg-zinc-950/85 text-amber-400 border-amber-500/50 hover:bg-amber-500/20 hover:text-white'
                }`}
                title={isSk ? 'Režim filmu (M)' : 'Movie Mode (M)'}
              >
                <Film className="w-4 h-4" />
              </button>

              {/* 2. Rotate button */}
              <button
                onClick={handleToggleAutoPan}
                className="p-2.5 rounded-2xl bg-zinc-950/85 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-white shadow-xl backdrop-blur-xl transition-all cursor-pointer"
                title={isSk ? 'Automatická rotácia (P)' : 'Auto-Rotate (P)'}
              >
                <RotateCw className="w-4 h-4 text-cyan-400" />
              </button>

              {/* 3. Share button */}
              <button
                onClick={handleShare}
                className="p-2.5 rounded-2xl bg-zinc-950/85 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/20 hover:border-emerald-400 hover:text-white shadow-xl backdrop-blur-xl transition-all cursor-pointer"
                title={isSk ? 'Zdieľať panorámu' : 'Share panorama'}
              >
                <Share2 className="w-4 h-4" />
              </button>

              {/* 4. Camera (c) button */}
              <button
                onClick={handleExportCurrentView}
                disabled={isExportingView}
                className={`p-2.5 rounded-2xl bg-zinc-950/85 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-white shadow-xl backdrop-blur-xl transition-all cursor-pointer ${
                  isExportingView ? 'opacity-50 cursor-wait' : ''
                }`}
                title={isSk ? 'Stiahnuť záber (C)' : 'Capture Snapshot (C)'}
              >
                <Camera className="w-4 h-4" />
              </button>

              {/* 4b. Video export button (V) */}
              <button
                onClick={() => setIsVideoModalOpen(true)}
                className="p-2.5 rounded-2xl bg-zinc-950/85 text-rose-400 border border-rose-500/50 hover:bg-rose-500/20 hover:border-rose-400 hover:text-white shadow-xl backdrop-blur-xl transition-all cursor-pointer"
                title={isSk ? 'Exportovať 360° video (V)' : 'Export 360° Video (V)'}
              >
                <Video className="w-4 h-4" />
              </button>

              {/* 5. Fullscreen off button */}
              <button
                onClick={handleToggleFullscreen}
                className="p-2.5 rounded-2xl bg-zinc-950/85 text-blue-400 border border-blue-500/50 hover:bg-blue-500/20 hover:border-blue-400 hover:text-white shadow-xl backdrop-blur-xl transition-all cursor-pointer"
                title={isSk ? 'Ukončiť celú obrazovku' : 'Exit fullscreen'}
              >
                <Minimize className="w-4 h-4" />
              </button>

              {/* 6. Three dots menu (...) */}
              <div className="relative">
                <button
                  onClick={() => setShowMobileMenu((v) => !v)}
                  className={`p-2.5 rounded-2xl backdrop-blur-xl border shadow-xl transition-all flex items-center justify-center cursor-pointer ${
                    showMobileMenu
                      ? 'bg-cyan-500/40 text-cyan-200 border-cyan-400 ring-2 ring-cyan-500/30'
                      : 'bg-zinc-950/85 text-zinc-200 border-white/25 hover:border-white/50 hover:text-white'
                  }`}
                  title={isSk ? 'Ďalšie nástroje (⋮)' : 'More tools (⋮)'}
                >
                  {showMobileMenu ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
                </button>
                {showMobileMenu && renderMobileMenuDropdown()}
              </div>

              {/* Admin profile icon or inconspicuous admin key login button */}
              {isAdmin ? (
                <AdminAvatar sizeClass="w-9 h-9" />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAdminModal(true)}
                  className="p-2.5 rounded-2xl bg-zinc-950/70 hover:bg-zinc-900/90 text-zinc-500 hover:text-amber-400 border border-white/10 hover:border-amber-400/40 shadow-xl backdrop-blur-xl transition-all cursor-pointer"
                  title={isSk ? 'Admin prihlásenie' : 'Admin Login'}
                  aria-label="Admin Login"
                >
                  <Key className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Progressive Streaming Pill Indicator (shown while 2K or 8K is active and higher-res is actively streaming) */}
      {(textureState === 'preview_2k' || textureState === 'hd_8k') && !loadError && (
        <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-2xl glass-panel-elevated border border-cyan-500/30 text-xs font-semibold text-cyan-300 pointer-events-none shadow-2xl backdrop-blur-md animate-fade-in ${hideOnImmersive}`}>
          <div className="w-3 h-3 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
          <span>
            {textureState === 'hd_8k'
              ? (isSk ? `8K Ready • Dočítavam ${getHorizontalK(panorama.width)} Ultra-HD...` : `8K Ready • Streaming ${getHorizontalK(panorama.width)} Ultra-HD...`)
              : (isSk ? `2K Ready • Dočítavam 8K / Ultra-HD...` : `2K Ready • Streaming 8K / Ultra-HD...`)}
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {loadError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#090a0f]/95 backdrop-blur-xl p-4 sm:p-6 text-center animate-fade-in">
          {panorama.is_private || panorama.original_filepath ? (
            <div className="max-w-md sm:max-w-lg w-full bg-zinc-900/90 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <HardDrive className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>{isSk ? 'Súkromný offline archív' : 'Private Offline Archive'}</span>
                  </div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    {isSk ? 'Panoráma nie je dostupná na serveri' : 'Panorama asset not on server'}
                  </h3>
                </div>
              </div>

              <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
                {isSk
                  ? 'Tento súbor sa nachádza v súkromnom archíve na externom disku alebo inom počítači. Lokálny 2K náhľad ani webový originál zatiaľ neboli vygenerované na serveri.'
                  : 'This file resides in a private archive on an external disk or another computer. A 2K preview has not yet been generated on the server.'}
              </p>

              <div className="bg-black/50 border border-white/10 rounded-xl p-3 space-y-2 mb-4 font-mono text-[11px]">
                {panorama.folder && (
                  <div className="flex justify-between items-center text-zinc-400">
                    <span className="text-zinc-500">{isSk ? 'Zložka:' : 'Folder:'}</span>
                    <span className="text-zinc-200 font-sans font-semibold">{panorama.folder}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-zinc-400">
                  <span className="text-zinc-500">{isSk ? 'Rozlíšenie:' : 'Resolution:'}</span>
                  <span className="text-cyan-400 font-bold">{getResolutionCategory(panorama.width)} ({panorama.width} × {panorama.height}px)</span>
                </div>
                {panorama.original_filepath && (
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-zinc-500 block mb-1">{isSk ? 'Cesta k originálu na disku:' : 'Original disk path:'}</span>
                    <div className="bg-zinc-950 px-2 py-1.5 rounded border border-white/10 text-[10px] text-amber-200/90 break-all select-all flex items-center justify-between gap-2">
                      <span className="truncate">{panorama.original_filepath}</span>
                      <button
                        type="button"
                        onClick={() => {
                          copyToClipboard(panorama.original_filepath || '');
                          onShowToast(isSk ? 'Cesta skopírovaná do schránky' : 'Path copied to clipboard');
                        }}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white shrink-0 text-[10px] font-sans font-semibold transition-colors cursor-pointer"
                      >
                        {isSk ? 'Kopírovať' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-5 text-[11px] text-amber-200/80 leading-relaxed">
                <span className="font-bold text-amber-300 block mb-0.5">{isSk ? 'Ako to vyriešiť:' : 'How to resolve:'}</span>
                {isSk
                  ? `Pripojte externý disk (${panorama.original_filepath ? panorama.original_filepath.slice(0, 2) : 'E:'}) a spustite v termináli: python scripts/generate_2k.py --all`
                  : `Connect external drive (${panorama.original_filepath ? panorama.original_filepath.slice(0, 2) : 'E:'}) and run: python scripts/generate_2k.py --all`}
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  {isSk ? 'Späť na mapu' : 'Back to Map'}
                </button>
                <button
                  onClick={() => {
                    setLoadError(null);
                    setIsLoading(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-all cursor-pointer shadow-lg shadow-cyan-900/30"
                >
                  {isSk ? 'Skúsiť znova' : 'Retry'}
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-md w-full bg-zinc-900/90 border border-rose-500/30 rounded-2xl p-6 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-3 mx-auto">
                <X className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                {isSk ? 'Chyba načítania panorámy' : 'Failed to load panorama'}
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mb-4">{loadError}</p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => {
                    setLoadError(null);
                    setIsLoading(true);
                  }}
                  className="px-4 py-2 rounded-xl glass-button text-xs font-semibold text-white hover:text-cyan-300 cursor-pointer"
                >
                  {isSk ? 'Skúsiť znova' : 'Retry'}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl glass-button text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
                >
                  {isSk ? 'Späť na mapu' : 'Back to Map'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}


      {/* Movie Mode Dedicated Clean Top Bar (Title Only) */}
      {isMovieMode && (
        <div className="absolute top-3 md:top-4 left-3 right-3 md:left-4 md:right-4 z-30 flex items-center justify-between gap-3 pointer-events-none animate-fade-in">
          {/* Top Left: Title, Location, Date & Playlist Counter with subtle close button */}
          <div className="pointer-events-auto flex items-center gap-2 max-w-[calc(100vw-2rem)]">
            <div className="flex items-center gap-2.5 px-3.5 py-2 md:py-2.5 rounded-2xl bg-zinc-950/85 backdrop-blur-xl border border-white/20 shadow-2xl text-white truncate">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                <Film className="w-4 h-4 animate-pulse" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold text-white tracking-wide truncate">
                    {getPanoramaCity(panorama)}
                  </h1>
                  {panorama.country && panorama.country !== 'Unknown' && (
                    <span className="text-xs text-zinc-400 font-normal shrink-0">
                      • {panorama.country}
                    </span>
                  )}
                  {moviePlaylistCounter && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold shrink-0">
                      {moviePlaylistCounter}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                  <span>{formatPanoramaDate(panorama.date)}</span>
                  <span>•</span>
                  <span className="text-amber-300/90">{getHorizontalK(panorama.width)}</span>
                </div>
              </div>
              <button
                onClick={handleToggleMovieMode}
                className="ml-2 p-1.5 rounded-xl bg-white/10 hover:bg-rose-500/30 text-zinc-400 hover:text-white transition-all cursor-pointer shrink-0"
                title={isSk ? "Ukončiť kino (M / ESC)" : "Exit Movie Mode (M / ESC)"}
                aria-label="Exit Movie Mode"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Floating Glass Header Toolbar (Non-fullscreen, non-movie mode) */}
      {!isFs && !isMovieMode && (
        autoPanMode !== 'stopped' ? (
          /* When rotation is active: SHOW ONLY the Rotate button */
          <div
            className="absolute right-3 md:right-4 z-30 pointer-events-auto animate-fade-in"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
          >
            <button
              onClick={handleToggleAutoPan}
              className="p-2.5 rounded-2xl bg-cyan-500/40 text-cyan-200 border border-cyan-400 ring-2 ring-cyan-500/30 shadow-2xl backdrop-blur-xl transition-all cursor-pointer flex items-center gap-2"
              title={isSk ? 'Zastaviť rotáciu (P)' : 'Stop rotation (P)'}
            >
              <RotateCw className="w-4 h-4 text-cyan-200 animate-spin-slow" />
              <span className="text-xs font-bold sm:inline hidden">{isSk ? 'Zastaviť' : 'Stop'}</span>
            </button>
          </div>
        ) : (isMobileMode || headerWidth < 768) && isPortrait ? (
          /* Mobile Portrait 2-Row Header */
          <div
            ref={headerContainerRef}
            className="absolute left-3 right-3 z-20 flex flex-col gap-2 pointer-events-none animate-fade-in"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
          >
            {/* Row 1: Title and Date in one row, clicking it triggers (i) details */}
            <div
              onClick={() => setShowInfo(!showInfo)}
              className="pointer-events-auto flex items-center justify-between px-3.5 py-2 rounded-2xl glass-panel-elevated border border-white/15 shadow-xl text-white cursor-pointer active:scale-[0.99] transition-transform"
              title={isSk ? 'Kliknite pre detaily panorámy (i)' : 'Click for panorama details (i)'}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-xs font-bold tracking-wide truncate">
                  {getPanoramaCity(panorama)}
                  {panorama.country && panorama.country !== 'Unknown' ? ` • ${panorama.country}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono shrink-0 ml-2">
                <span>{formatPanoramaDate(panorama.date)}</span>
                <Info className="w-3.5 h-3.5 text-amber-400 ml-0.5" />
              </div>
            </div>

            {/* Row 2: Controls: Rotate, Music, Projection, Info, Share, Camera, Fullscreen, More, Close */}
            <div className="pointer-events-auto flex items-center justify-between gap-1">
              <button
                onClick={handleToggleAutoPan}
                className="flex-1 py-2 rounded-xl sm:rounded-2xl bg-zinc-950/85 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-white shadow-xl backdrop-blur-xl transition-all flex items-center justify-center cursor-pointer"
                title={isSk ? 'Automatická rotácia (P)' : 'Auto-Rotate (P)'}
              >
                <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
              </button>

              <button
                onClick={handleToggleSpatialAudio}
                className={`flex-1 py-2 rounded-xl sm:rounded-2xl border shadow-xl backdrop-blur-xl transition-all flex items-center justify-center cursor-pointer ${
                  isSpatialAudioEnabled
                    ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 ring-1 ring-emerald-500/30'
                    : 'bg-zinc-950/85 text-zinc-400 border-white/20 hover:border-emerald-400 hover:text-emerald-300'
                }`}
                title={isSk ? 'Hudobný doprovod (Relaxačný ambient)' : 'Soundtrack (Relaxing ambient)'}
              >
                {isSpatialAudioEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
                )}
              </button>

              <button
                onClick={handleCycleProjection}
                className={`flex-1 py-2 rounded-xl sm:rounded-2xl border shadow-xl backdrop-blur-xl transition-all flex items-center justify-center cursor-pointer ${
                  projectionMode !== 'rectilinear'
                    ? 'bg-purple-500/30 text-purple-200 border-purple-400 ring-1 ring-purple-500/30'
                    : 'bg-zinc-950/85 text-purple-400 border-purple-500/50 hover:bg-purple-500/20 hover:text-white'
                }`}
                title={
                  projectionMode === 'curved'
                    ? (isSk ? 'Projekcia: Zaoblené' : 'Projection: Curved')
                    : projectionMode === 'little_planet'
                    ? (isSk ? 'Projekcia: Malá planéta' : 'Projection: Little Planet')
                    : (isSk ? 'Projekcia: Štandard' : 'Projection: Standard')
                }
              >
                <Globe2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-300" />
              </button>

              <button
                onClick={() => setShowInfo((v) => !v)}
                className={`flex-1 py-2 rounded-xl sm:rounded-2xl border shadow-xl backdrop-blur-xl transition-all flex items-center justify-center cursor-pointer ${
                  showInfo
                    ? 'bg-amber-500/30 text-amber-200 border-amber-400 ring-1 ring-amber-500/30'
                    : 'bg-zinc-950/85 text-amber-400 border-amber-500/50 hover:bg-amber-500/20 hover:text-white'
                }`}
                title={isSk ? 'Informácie o panoráme (I)' : 'Panorama info (I)'}
              >
                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              </button>

              <button
                onClick={handleShare}
                className="flex-1 py-2 rounded-xl sm:rounded-2xl bg-zinc-950/85 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/20 hover:border-emerald-400 hover:text-white shadow-xl backdrop-blur-xl transition-all flex items-center justify-center cursor-pointer"
                title={isSk ? 'Zdieľať panorámu' : 'Share panorama'}
              >
                <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                onClick={handleExportCurrentView}
                disabled={isExportingView}
                className={`flex-1 py-2 rounded-xl sm:rounded-2xl bg-zinc-950/85 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-white shadow-xl backdrop-blur-xl transition-all flex items-center justify-center cursor-pointer ${
                  isExportingView ? 'opacity-50 cursor-wait' : ''
                }`}
                title={isSk ? 'Stiahnuť záber (C)' : 'Capture Snapshot (C)'}
              >
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                onClick={() => setIsVideoModalOpen(true)}
                className="flex-1 py-2 rounded-xl sm:rounded-2xl bg-zinc-950/85 text-rose-400 border border-rose-500/50 hover:bg-rose-500/20 hover:border-rose-400 hover:text-white shadow-xl backdrop-blur-xl transition-all flex items-center justify-center cursor-pointer"
                title={isSk ? 'Exportovať 360° video (V)' : 'Export 360° Video (V)'}
              >
                <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                onClick={handleToggleFullscreen}
                className="flex-1 py-2 rounded-xl sm:rounded-2xl bg-zinc-950/85 text-blue-400 border border-blue-500/50 hover:bg-blue-500/20 hover:border-blue-400 hover:text-white shadow-xl backdrop-blur-xl transition-all flex items-center justify-center cursor-pointer"
                title={isSk ? 'Celá obrazovka' : 'Fullscreen'}
              >
                <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <div className="relative flex-1">
                <button
                  onClick={() => setShowMobileMenu((v) => !v)}
                  className={`w-full py-2 rounded-xl sm:rounded-2xl border shadow-xl backdrop-blur-xl transition-all flex items-center justify-center cursor-pointer ${
                    showMobileMenu
                      ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 ring-1 ring-cyan-500/30'
                      : 'bg-zinc-950/85 text-zinc-200 border-white/25 hover:border-cyan-400 hover:text-white'
                  }`}
                  title={isSk ? 'Ďalšie nástroje (⋮)' : 'More tools (⋮)'}
                >
                  {showMobileMenu ? <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" /> : <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
                {showMobileMenu && renderMobileMenuDropdown()}
              </div>

              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-xl sm:rounded-2xl bg-zinc-950/85 text-rose-400 border border-rose-500/50 hover:bg-rose-500/25 hover:border-rose-400 hover:text-white shadow-xl backdrop-blur-xl transition-all flex items-center justify-center cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        ) : (isMobileMode || headerWidth < 768) && !isPortrait ? (
          /* Mobile Landscape Single-Row Header */
          <div
            ref={headerContainerRef}
            className="absolute left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none animate-fade-in"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
          >
            {/* Left: Floating Title Bubble (no hamburger) */}
            <div
              onClick={() => setShowInfo(!showInfo)}
              className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-2xl glass-panel-elevated truncate min-w-0 max-w-[45%] cursor-pointer border border-white/15 shadow-xl text-white active:scale-[0.99] transition-transform"
              title={isSk ? 'Kliknite pre detaily panorámy (i)' : 'Click for panorama details (i)'}
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div className="truncate text-xs">
                <span className="font-bold">{getPanoramaCity(panorama)}</span>
                {panorama.country && panorama.country !== 'Unknown' && (
                  <span className="text-[10px] text-zinc-400 ml-1">• {panorama.country}</span>
                )}
              </div>
            </div>

            {/* Right: Buttons: Rotate, Share, Camera (c), Fullscreen, Three dots, Close X */}
            <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleToggleAutoPan}
                className="p-2 rounded-2xl bg-zinc-950/85 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-white shadow-xl backdrop-blur-xl transition-all cursor-pointer"
                title={isSk ? 'Automatická rotácia (P)' : 'Auto-Rotate (P)'}
              >
                <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              </button>

              <button
                onClick={handleShare}
                className="p-2 rounded-2xl bg-zinc-950/85 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/20 hover:border-emerald-400 hover:text-white shadow-xl backdrop-blur-xl transition-all cursor-pointer"
                title={isSk ? 'Zdieľať panorámu' : 'Share panorama'}
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleExportCurrentView}
                disabled={isExportingView}
                className={`p-2 rounded-2xl bg-zinc-950/85 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-white shadow-xl backdrop-blur-xl transition-all cursor-pointer ${
                  isExportingView ? 'opacity-50 cursor-wait' : ''
                }`}
                title={isSk ? 'Stiahnuť záber (C)' : 'Capture Snapshot (C)'}
              >
                <Camera className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsVideoModalOpen(true)}
                className="p-2 rounded-2xl bg-zinc-950/85 text-rose-400 border border-rose-500/50 hover:bg-rose-500/20 hover:border-rose-400 hover:text-white shadow-xl backdrop-blur-xl transition-all cursor-pointer"
                title={isSk ? 'Exportovať 360° video (V)' : 'Export 360° Video (V)'}
              >
                <Video className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleToggleFullscreen}
                className="p-2 rounded-2xl bg-zinc-950/85 text-blue-400 border border-blue-500/50 hover:bg-blue-500/20 hover:border-blue-400 hover:text-white shadow-xl backdrop-blur-xl transition-all cursor-pointer"
                title={isSk ? 'Celá obrazovka' : 'Fullscreen'}
              >
                <Maximize className="w-3.5 h-3.5" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowMobileMenu((v) => !v)}
                  className={`p-2 rounded-2xl border shadow-xl backdrop-blur-xl transition-all cursor-pointer ${
                    showMobileMenu
                      ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 ring-2 ring-cyan-500/30'
                      : 'bg-zinc-950/85 text-zinc-200 border-white/25 hover:border-cyan-400 hover:text-white'
                  }`}
                  title={isSk ? 'Ďalšie nástroje (⋮)' : 'More tools (⋮)'}
                >
                  {showMobileMenu ? <X className="w-3.5 h-3.5 text-cyan-300" /> : <MoreVertical className="w-3.5 h-3.5" />}
                </button>
                {showMobileMenu && renderMobileMenuDropdown()}
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-2xl bg-zinc-950/85 text-rose-400 border border-rose-500/50 hover:bg-rose-500/25 hover:border-rose-400 hover:text-white shadow-xl backdrop-blur-xl transition-all cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Desktop Header Toolbar (>= 768px) */
          <div ref={headerContainerRef} className={`absolute top-3 md:top-4 left-3 right-3 md:left-4 md:right-4 z-20 flex items-center justify-between gap-2 pointer-events-none ${hideOnImmersive}`}>
        {/* Left: Explorer Hamburger + Panorama Location & Title */}
        <div className="pointer-events-auto flex items-center gap-2 min-w-0 flex-1 md:flex-none max-w-[45%] md:max-w-[24rem] xl:max-w-[28rem]">
          {onToggleExplorer && (
            <button
              onClick={onToggleExplorer}
              className={`p-2.5 rounded-2xl glass-panel border transition-all flex items-center justify-center shrink-0 shadow-xl ${
                isExplorerOpen
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 ring-2 ring-cyan-500/30 shadow-cyan-950/60'
                  : 'bg-zinc-950/85 border-white/15 text-zinc-300 hover:text-white hover:border-cyan-500/50 hover:bg-white/10'
              }`}
              title={isExplorerOpen ? 'Close Panoramas Explorer' : 'Open Panoramas Explorer (Menu)'}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div data-help="viewer_title" className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-2xl glass-panel-elevated truncate min-w-0">
            <div className={`hidden sm:flex w-9 h-9 rounded-xl items-center justify-center shrink-0 ${panorama.is_private ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400' : 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400'}`}>
              {panorama.is_private ? <Lock className="w-5 h-5 text-rose-400" /> : <Compass className="w-5 h-5 text-cyan-400" />}
            </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide truncate">
                {getPanoramaCity(panorama)}
              </h1>
              {panorama.is_private && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-300 border border-rose-500/40 text-[10px] font-bold shrink-0 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>PRIVATE</span>
                </span>
              )}
              {!panorama.is_private && panorama.country && panorama.country !== 'Unknown' && (
                <span className="text-xs text-zinc-400 font-normal shrink-0">
                  • {panorama.country}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span>{formatPanoramaDate(panorama.date)}</span>
              {panorama.lat !== null && panorama.lon !== null && !(panorama.lat === 0 && panorama.lon === 0) ? (
                <a
                  href={getGoogleMapsUrl(panorama.lat, panorama.lon)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-200 font-mono hover:underline flex items-center gap-1 transition-colors cursor-pointer group/gps"
                  title="Open GPS coordinates in Google Maps (new window)"
                >
                  <span>{formatCoordinates(panorama.lat, panorama.lon)}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover/gps:opacity-100 transition-opacity shrink-0" />
                </a>
              ) : (
                <span className="text-rose-400/90 font-medium">
                  {panorama.folder ? `Folder: ${panorama.folder}` : 'Private Archive (No GPS)'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>


        {/* Right: Actions, Quality Badge & Controls */}
        {/* Right: Actions, Quality Badge & Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Admin Panorama Multi-Selection Toggle (Ultra-wide desktop) */}
          {isAdmin && headerWidth >= 1700 && (
            <button
              onClick={() => toggleSelectPano(panorama.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-xl transition-all ${
                isPanoSelected(panorama.id)
                  ? 'bg-cyan-500 text-zinc-950 border border-cyan-300 ring-2 ring-cyan-400 shadow-cyan-950/80'
                  : 'bg-zinc-950/85 text-zinc-300 border border-white/20 hover:border-cyan-400 hover:text-white'
              }`}
              title={isPanoSelected(panorama.id) ? 'Deselect this panorama' : 'Select this panorama for bulk edit'}
            >
              {isPanoSelected(panorama.id) ? (
                <CheckSquare className="w-4 h-4 text-zinc-950" />
              ) : (
                <Square className="w-4 h-4 text-cyan-400" />
              )}
              <span className="hidden sm:inline">
                {isPanoSelected(panorama.id) ? 'Selected' : 'Select'}
              </span>
            </button>
          )}

          {/* Admin Single-Click Toggle: Make Public / Private (Ultra-wide desktop) */}
          {isAdmin && headerWidth >= 1700 && (
            <button
              onClick={handleTogglePrivacy}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-xl transition-all cursor-pointer ${
                isItemPrivate(panorama)
                  ? 'bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400'
                  : 'bg-rose-500/25 hover:bg-rose-500/35 text-rose-300 border border-rose-500/40 hover:border-rose-400'
              }`}
              title={isItemPrivate(panorama) ? 'Make this panorama Public' : 'Make this panorama Private'}
            >
              {isItemPrivate(panorama) ? (
                <>
                  <Globe2 className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Make Public</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline">Make Private</span>
                </>
              )}
            </button>
          )}

          {/* Admin Quick Tag Editor (T) */}
          {isAdmin && (
            <button
              onClick={() => setShowTagEditorModal(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-xl transition-all cursor-pointer bg-purple-500/20 hover:bg-purple-500/35 text-purple-300 border border-purple-500/40 hover:border-purple-300"
              title="Edit custom hashtags (Shortcut: T)"
            >
              <Tag className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Tagy (T)</span>
            </button>
          )}

          {/* Admin Smart GPS (if missing GPS) */}
          {isAdmin && (panorama.lat === null || panorama.lon === null || (panorama.lat === 0 && panorama.lon === 0)) && (
            <button
              onClick={() => setShowSmartGpsModal(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-xl transition-all cursor-pointer bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 border border-amber-500/50 hover:border-amber-400 animate-pulse"
              title="Smart GPS auto-copy from same date / map placement"
            >
              <Navigation className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Smart GPS</span>
            </button>
          )}

          {/* Admin Solar Alignment Calibration Toggle (Ultra-wide desktop) */}
          {isAdmin && headerWidth >= 1700 && (
            <button
              onClick={() => {
                const next = !isCalibratingSun;
                setIsCalibratingSun(next);
                if (next) {
                  onShowToast(
                    isSk
                      ? 'Režim kalibrácie Slnka aktívny: Dvojkliknite (double-click) na Slnko v panoráme.'
                      : 'Sun calibration active: Double-click on the Sun in panorama.'
                  );
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-xl transition-all cursor-pointer ${
                isCalibratingSun
                  ? 'bg-amber-400 text-zinc-950 border border-amber-300 ring-2 ring-amber-400 shadow-amber-950/80 animate-pulse'
                  : 'bg-zinc-950/85 text-amber-300 border border-amber-500/40 hover:border-amber-400 hover:text-white'
              }`}
              title={
                isCalibratingSun
                  ? (isSk ? 'Kalibrácia Slnka aktívna — Dvojkliknite na Slnko (alebo kliknite sem pre zrušenie)' : 'Sun calibration active — Double click on Sun (click to cancel)')
                  : (isSk ? 'Kalibrovať polohu Slnka (Dvojklik v panoráme)' : 'Calibrate Sun Position (Double click in panorama)')
              }
            >
              <Sun className={`w-4 h-4 ${isCalibratingSun ? 'text-zinc-950 animate-spin' : 'text-amber-400'}`} />
              <span className="hidden lg:inline">
                {isCalibratingSun
                  ? (isSk ? 'Kalibrujem...' : 'Calibrating...')
                  : (isSk ? 'Kalibrácia Slnka' : 'Calibrate Sun')}
              </span>
            </button>
          )}

          {/* Admin Radar Alignment Calibration Toggle (Ultra-wide desktop) */}
          {isAdmin && headerWidth >= 1700 && (
            <button
              onClick={handleToggleRadarLock}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-xl transition-all cursor-pointer ${
                isRadarLocked
                  ? 'bg-amber-500 text-zinc-950 border-2 border-amber-300 ring-2 ring-amber-400 shadow-amber-950/80 animate-pulse'
                  : 'bg-zinc-950/85 text-amber-300 border border-amber-500/40 hover:border-amber-400 hover:text-white'
              }`}
              title={
                isRadarLocked
                  ? (isSk ? `Radar ZAMKNUTÝ (${Math.round(lockedRadarHeadingRef.current)}°) — Otočte panorámu a kliknite sem pre uloženie do KV` : `Radar LOCKED (${Math.round(lockedRadarHeadingRef.current)}°) — Rotate panorama and click to save to KV`)
                  : (isSk ? 'Kalibrovať radar (Zamknúť rotáciu a priradiť smer panorámy)' : 'Calibrate Radar (Lock rotation & assign heading)')
              }
            >
              {isRadarLocked ? (
                <Lock className="w-4 h-4 text-zinc-950" />
              ) : (
                <Unlock className="w-4 h-4 text-amber-300" />
              )}
              <span className="hidden lg:inline">
                {isRadarLocked
                  ? (isSk ? 'Uložiť Radar' : 'Save Radar')
                  : (isSk ? 'Kalibrácia Radaru' : 'Calibrate Radar')}
              </span>
            </button>
          )}

          {/* Admin Cluster Timeline Exclusion Toggle */}
          {isAdmin && (
            <button
              onClick={() => handleToggleExcludePano(panorama)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-xl transition-all cursor-pointer ${
                panorama.exclude_timeline
                  ? 'bg-rose-500/25 hover:bg-rose-500/40 text-rose-300 border border-rose-500/50 hover:border-rose-400'
                  : 'bg-zinc-950/85 text-zinc-400 hover:text-amber-300 border border-white/10 hover:border-amber-400/50'
              }`}
              title={
                panorama.exclude_timeline
                  ? (isSk ? 'Panoráma je vyradená z klastra časovej osi. Kliknite pre zaradenie späť.' : 'Excluded from timeline cluster. Click to include.')
                  : (isSk ? 'Vyradiť túto panorámu z klastra časovej osi (zostane verejná)' : 'Exclude this panorama from timeline cluster (remains public)')
              }
            >
              {panorama.exclude_timeline ? (
                <EyeOff className="w-4 h-4 text-rose-400" />
              ) : (
                <MinusCircle className="w-4 h-4 text-zinc-400" />
              )}
              <span className="hidden sm:inline">
                {panorama.exclude_timeline
                  ? (isSk ? 'Vyradená z osi' : 'Excluded from timeline')
                  : (isSk ? 'Vyradiť z klastra' : 'Exclude from cluster')}
              </span>
            </button>
          )}

          {/* Admin Cluster Alignment Calibration Button (Shift+C) */}
          {isAdmin && (
            <button
              onClick={handleToggleSplitCalibration}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-xl transition-all cursor-pointer ${
                isSplitCalibrationOpen
                  ? 'bg-amber-500 text-zinc-950 border border-amber-300 ring-2 ring-amber-400/50'
                  : 'bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 border border-cyan-500/40 hover:border-cyan-300'
              }`}
              title={isSk ? 'Kalibrácia smeru v clustri (Shift+C)' : 'Cluster direction calibration (Shift+C)'}
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="hidden lg:inline">{isSk ? 'Zarovnať v clustri' : 'Align Cluster'}</span>
            </button>
          )}

          {/* Movie Mode Button (Kino / Režim filmu) — visible on wide desktop >= 1600px */}
          {headerWidth >= 1600 && (
            <button
              onClick={handleToggleMovieMode}
              data-help="viewer_movie"
              className={`p-2.5 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-xl transition-all cursor-pointer flex items-center justify-center ${
                isMovieMode
                  ? 'bg-amber-500/35 text-amber-200 border border-amber-400 ring-2 ring-amber-500/30 shadow-amber-950/60'
                  : 'bg-zinc-950/85 text-amber-400 border border-white/20 hover:border-amber-400 hover:bg-amber-500/10'
              }`}
              title={
                isSk
                  ? (isMovieMode ? 'Ukončiť režim filmu (M / ESC)' : 'Spustiť kino / Režim filmu (M) — 360° rotácia + automatické prepínanie')
                  : (isMovieMode ? 'Exit Movie Mode (M / ESC)' : 'Start Movie Mode (M) — 360° circle tour with auto-advance')
              }
              aria-label="Toggle Movie Mode"
            >
              <Film className="w-4 h-4 text-amber-400" />
            </button>
          )}

          {/* Spatial Audio Engine — visible on wide desktop >= 1550px */}
          {headerWidth >= 1550 && (
            <button
              onClick={handleToggleSpatialAudio}
              data-help="viewer_spatial_audio"
              className={`p-2.5 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-xl transition-all cursor-pointer flex items-center justify-center ${
                isSpatialAudioEnabled
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400 ring-2 ring-cyan-500/30 shadow-cyan-950/60'
                  : 'bg-zinc-950/85 text-zinc-400 border border-white/20 hover:border-cyan-400 hover:text-white hover:bg-cyan-500/10'
              }`}
              title={
                isSk
                  ? (isSpatialAudioEnabled
                      ? 'Hudobný doprovod zapnutý — Kliknite pre vypnutie (Kláves O)'
                      : 'Zapnúť hudobný doprovod — Relaxačný ambient (Kláves O)')
                  : (isSpatialAudioEnabled
                      ? 'Soundtrack enabled — Click to disable (Key O)'
                      : 'Enable soundtrack — Relaxing ambient music (Key O)')
              }
              aria-label="Toggle Spatial Audio"
            >
              {isSpatialAudioEnabled ? (
                <Volume2 className="w-4 h-4 text-cyan-300" />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-400" />
              )}
            </button>
          )}

          {/* Solar Compass & Sun Tracking — visible on wide desktop >= 1550px */}
          {headerWidth >= 1550 && (
            <button
              onClick={handleToggleSolarCompass}
              data-help="viewer_solar_compass"
              className={`p-2.5 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-xl transition-all cursor-pointer flex items-center justify-center ${
                isSolarCompassEnabled && projectionMode === 'rectilinear'
                  ? 'bg-amber-500/25 text-amber-200 border border-amber-400 ring-2 ring-amber-500/30 shadow-amber-950/60'
                  : 'bg-zinc-950/85 text-zinc-400 border border-white/20 hover:border-amber-400 hover:text-white hover:bg-amber-500/10'
              }`}
              title={
                isSk
                  ? (isSolarCompassEnabled
                      ? 'Solárny kompas zapnutý — Kliknite pre vypnutie (Kláves K)'
                      : 'Zapnúť Solárny kompas — AR azimut v oblakoch, radarová mapka & výška (Kláves K)')
                  : (isSolarCompassEnabled
                      ? 'Solar Compass enabled — Click to disable (Key K)'
                      : 'Enable Solar Compass — AR cloud azimuth, radar minimap & elevation (Key K)')
              }
              aria-label="Toggle Solar Compass"
            >
              <Compass className="w-4 h-4 text-amber-400" />
            </button>
          )}

          {/* Time-Travel History (Časová os lokácie) & Mini Play button — visible when multiple captures exist */}
          {timeTravelPanos.length > 1 && (
            <div className="flex items-center bg-zinc-950/85 border border-white/20 rounded-2xl p-0.5 shadow-xl backdrop-blur-xl gap-0.5">
              <button
                onClick={handleToggleTimeTravel}
                className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                  filmstripTab === 'timeline' && isFilmRollVisible
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-400/80 ring-1 ring-amber-500/30'
                    : 'text-zinc-400 hover:text-white hover:bg-amber-500/10'
                }`}
                title={
                  isSk
                    ? `Časová os lokácie — ${timeTravelPanos.length} záberov v okruhu 100 m (Kláves Y)`
                    : `Location Timeline — ${timeTravelPanos.length} captures within 100m (Key Y)`
                }
                aria-label="Toggle Time Travel"
              >
                <History className="w-4 h-4 text-amber-400" />
              </button>
              <button
                onClick={handleToggleTimelinePlay}
                className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                  isTimelinePlaying
                    ? 'bg-amber-400 text-zinc-950 shadow-md ring-1 ring-amber-300 animate-pulse'
                    : 'text-amber-300 hover:text-white hover:bg-amber-500/20'
                }`}
                title={
                  isTimelinePlaying
                    ? (isSk ? 'Zastaviť prehrávanie časovej osi' : 'Stop timeline playback')
                    : (isSk ? 'Prehrávať časovú os — 2s cyklus (Shift+Y)' : 'Play timeline — 2s cycle (Shift+Y)')
                }
                aria-label="Toggle Timeline Auto-Play"
              >
                {isTimelinePlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
              </button>
            </div>
          )}

          {/* Reset Camera View — visible on desktop >= 1550px */}
          {headerWidth >= 1550 && (
            <button
              onClick={handleResetCamera}
              className="p-2.5 rounded-2xl bg-zinc-950/85 text-zinc-400 border border-white/20 hover:border-cyan-400 hover:text-white hover:bg-white/10 shadow-xl backdrop-blur-xl transition-all cursor-pointer flex items-center justify-center"
              title={isSk ? 'Resetovať pohľad kamery na východzí (Kláves R)' : 'Reset camera view to default (Key R)'}
              aria-label="Reset Camera View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {/* Gyroscope Mode Button (touch/mobile devices or wide screens) */}
          {(isMobileScreen || (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window)) && (
            <button
              onClick={handleToggleGyroscope}
              className={`p-2.5 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-xl transition-all cursor-pointer flex items-center justify-center ${
                isGyroscopeActive
                  ? 'bg-violet-500/25 text-violet-200 border border-violet-400 ring-2 ring-violet-500/30 shadow-violet-950/60'
                  : 'bg-zinc-950/85 text-zinc-400 border border-white/20 hover:border-violet-400 hover:text-white hover:bg-violet-500/10'
              }`}
              title={
                isSk
                  ? (isGyroscopeActive
                      ? 'Gyroskop / Pohybové ovládanie zapnuté (Kláves G)'
                      : 'Zapnúť Gyroskop / Pohybové ovládanie (Kláves G)')
                  : (isGyroscopeActive
                      ? 'Gyroscope / Motion controls enabled (Key G)'
                      : 'Enable Gyroscope / Motion controls (Key G)')
              }
              aria-label="Toggle Gyroscope"
            >
              <Smartphone className="w-4 h-4 text-violet-400" />
            </button>
          )}

          {/* Send Feedback Button — visible on desktop >= 1520px */}
          {headerWidth >= 1520 && (
            <button
              onClick={() => setShowFeedback(true)}
              data-help="viewer_feedback"
              className="p-2.5 rounded-2xl bg-zinc-950/85 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-white shadow-xl backdrop-blur-xl transition-all cursor-pointer flex items-center gap-1.5"
              title={i18n.language.startsWith('sk') ? 'Poslať feedback autorovi k tejto panoráme' : 'Send feedback about this panorama'}
              aria-label="Send feedback"
            >
              <Mail className="w-4 h-4" />
            </button>
          )}

          {/* Comments Button — visible on desktop >= 1440px */}
          {headerWidth >= 1440 && (
            <button
              onClick={() => setShowComments(true)}
              data-help="viewer_comments"
              className={`p-2.5 rounded-2xl shadow-xl backdrop-blur-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                showComments
                  ? 'bg-amber-500/25 text-amber-200 border border-amber-400 shadow-amber-950/60'
                  : 'bg-zinc-950/85 text-amber-400 border border-amber-500/40 hover:bg-amber-500/20 hover:border-amber-400 hover:text-white'
              }`}
              title={t('comments')}
              aria-label="Comments"
            >
              <MessageSquare className="w-4 h-4" />
              {commentsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/25 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/40 leading-tight">
                  {commentsCount}
                </span>
              )}
            </button>
          )}

          {/* Favorite Button (Rose Accent) — visible on desktop >= 1360px */}
          {headerWidth >= 1360 && (
            <button
              onClick={handleToggleFavorite}
              data-help="viewer_favorite"
              className={`p-2.5 rounded-2xl shadow-xl backdrop-blur-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                isFavorite
                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/60 shadow-rose-950/60 scale-105'
                  : 'bg-zinc-950/85 text-zinc-300 border border-white/20 hover:border-rose-400 hover:text-rose-400 hover:bg-rose-500/10'
              }`}
              title={isFavorite ? t('remove_from_favorites') : t('add_to_favorites')}
              aria-label="Toggle Favorite"
            >
              <Heart className={`w-4 h-4 transition-transform ${isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : ''}`} />
              {favoriteCount > 0 && (
                <span className="text-[11px] font-mono font-bold leading-none hidden lg:inline">
                  {favoriteCount}
                </span>
              )}
            </button>
          )}

          {/* Share Button (Violet Accent) — visible on desktop >= 1280px */}
          {headerWidth >= 1280 && (
            <button
              onClick={handleShare}
              data-help="viewer_share"
              className="p-2.5 rounded-2xl bg-zinc-950/85 text-violet-400 border border-violet-500/50 hover:bg-violet-500/20 hover:border-violet-400 hover:text-white shadow-xl backdrop-blur-xl transition-all flex items-center gap-1.5"
              title={shareCount > 0 ? `${t('shares')}: ${shareCount}` : 'Share Panorama Link'}
            >
              <Share2 className="w-4 h-4" />
              {shareCount > 0 && (
                <span className="text-[11px] font-mono font-bold leading-none hidden lg:inline">
                  {shareCount}
                </span>
              )}
            </button>
          )}

          {/* Pic Download Button: Export Snapshot — visible on desktop >= 1200px */}
          {headerWidth >= 1200 && (
            <button
              onClick={handleExportCurrentView}
              disabled={isExportingView}
              data-help="viewer_export"
              className={`p-2.5 rounded-2xl bg-zinc-950/85 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/20 hover:border-emerald-400 hover:text-white shadow-xl backdrop-blur-xl transition-all ${
                isExportingView ? 'opacity-50 cursor-wait' : ''
              }`}
              title={isLittlePlanet ? `${t('export_4k')} (Little Planet 4K)` : t('export_4k')}
            >
              <Camera className="w-4 h-4" />
            </button>
          )}

          {/* Video Export Button — visible on desktop >= 1200px */}
          {headerWidth >= 1200 && (
            <button
              onClick={() => setIsVideoModalOpen(true)}
              className="p-2.5 rounded-2xl bg-zinc-950/85 text-rose-400 border border-rose-500/50 hover:bg-rose-500/20 hover:border-rose-400 hover:text-white shadow-xl backdrop-blur-xl transition-all cursor-pointer"
              title={isSk ? 'Exportovať 360° video (V)' : 'Export 360° Video (V)'}
            >
              <Video className="w-4 h-4" />
            </button>
          )}

          {/* 3-way Projection Mode Switcher — visible on desktop >= 1060px */}
          {headerWidth >= 1060 && (
            <div className="flex items-center bg-black/60 p-0.5 rounded-2xl border border-white/15 text-xs shadow-xl backdrop-blur-xl">
              <button
                onClick={() => setProjectionMode('rectilinear')}
                className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  projectionMode === 'rectilinear'
                    ? 'bg-cyan-500 text-zinc-950 shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title={i18n.language.startsWith('sk') ? 'Štandardné zobrazenie (Rectilinear)' : 'Standard View'}
              >
                {i18n.language.startsWith('sk') ? 'Štandard' : 'Standard'}
              </button>
              <button
                onClick={() => setProjectionMode('curved')}
                className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  projectionMode === 'curved'
                    ? 'bg-cyan-500 text-zinc-950 shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title={i18n.language.startsWith('sk') ? 'Zaoblené zobrazenie (Stereographic)' : 'Curved View'}
              >
                {i18n.language.startsWith('sk') ? 'Zaoblené' : 'Curved'}
              </button>
              <button
                onClick={() => setProjectionMode('little_planet')}
                className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  projectionMode === 'little_planet'
                    ? 'bg-cyan-500 text-zinc-950 shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title={i18n.language.startsWith('sk') ? 'Little Planet (Planéta)' : 'Little Planet'}
              >
                <Globe2 className="w-3.5 h-3.5" />
                <span>Planet</span>
              </button>
            </div>
          )}

          {/* HDR Mode Switcher — visible on desktop >= 880px */}
          {headerWidth >= 880 && (
            <button
              onClick={() => setIsHdr((prev) => !prev)}
              data-help="viewer_hdr"
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                isHdr
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 border border-amber-300 shadow-md font-extrabold ring-2 ring-amber-500/30'
                  : 'bg-zinc-950/85 text-zinc-400 border border-white/20 hover:border-amber-400 hover:text-white'
              }`}
              title={
                isSk
                  ? (isHdr ? 'HDR profil aktívny — Kliknite pre štandardné farby' : 'Zapnúť HDR profil — vyšší kontrast a sýtejšie farby')
                  : (isHdr ? 'HDR Profile Active — Click for Standard' : 'Enable HDR Profile')
              }
              aria-label="Toggle HDR Profile"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isHdr ? 'text-zinc-950' : 'text-amber-400'}`} />
              <span>HDR</span>
            </button>
          )}

          {/* Quality Indicator with Horizontal Resolution — visible on screens >= 640px */}
          {headerWidth >= 640 && (
            textureState === 'ultra_hd' ? (
              <div
                data-help="viewer_resolution"
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-zinc-950/85 backdrop-blur-xl border border-emerald-500/60 text-xs font-bold text-emerald-400 shadow-xl shadow-emerald-950/50"
                title={`Horizontal Resolution: ${panorama.width.toLocaleString()}px (${getHorizontalK(panorama.width)}) | Total: ${getMegapixels(panorama.width, panorama.height)}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-mono whitespace-nowrap">{getHorizontalK(panorama.width)}</span>
              </div>
            ) : textureState === 'hd_8k' ? (
              <div
                data-help="viewer_resolution"
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-zinc-950/85 backdrop-blur-xl border border-sky-500/60 text-xs font-bold text-sky-300 shadow-xl shadow-sky-950/50"
                title={`8K HD Ready • Streaming ${getHorizontalK(panorama.width)} Ultra-HD in background...`}
              >
                <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping shrink-0" />
                <span className="font-mono whitespace-nowrap">8K HD</span>
              </div>
            ) : textureState === 'preview_2k_final' ? (
              <div
                data-help="viewer_resolution"
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-zinc-950/85 backdrop-blur-xl border border-cyan-500/60 text-xs font-bold text-cyan-300 shadow-xl shadow-cyan-950/50"
                title={`2K HD Preview (Optimized for device) | Source: ${getHorizontalK(panorama.width)}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                <span className="font-mono whitespace-nowrap">2K HD</span>
              </div>
            ) : (
              <div
                data-help="viewer_resolution"
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-zinc-950/85 backdrop-blur-xl border border-amber-500/60 text-xs font-bold text-amber-300 shadow-xl shadow-amber-950/50"
                title={`2K HD Ready • Streaming ${getHorizontalK(panorama.width)} Ultra-HD...`}
              >
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span className="font-mono">{getHorizontalK(panorama.width)}</span>
              </div>
            )
          )}

          {/* Info Details Button (Amber/Gold Accent) — ALWAYS visible */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            data-help="viewer_info"
            className={`p-2.5 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-xl transition-all cursor-pointer ${
              showInfo
                ? 'bg-amber-500/35 text-amber-200 border border-amber-400 ring-2 ring-amber-500/30 shadow-amber-950/60'
                : 'bg-zinc-950/85 text-amber-400 border border-amber-500/50 hover:bg-amber-500/20 hover:border-amber-400 hover:text-white'
            }`}
            title="Panorama Details & Location (i)"
            aria-label="Panorama Details"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Auto-rotation button (RotateCw icon) — ALWAYS visible */}
          <button
            onClick={handleToggleAutoPan}
            data-help="viewer_autopan"
            className={`p-2.5 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-xl transition-all flex items-center justify-center cursor-pointer ${
              autoPanMode !== 'stopped'
                ? 'bg-cyan-500/35 text-cyan-200 border border-cyan-400 shadow-cyan-950/80 ring-2 ring-cyan-500/30'
                : 'bg-zinc-950/85 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-white'
            }`}
            title={
              autoPanMode !== 'stopped'
                ? (isSk ? 'Zastaviť rotáciu (P)' : 'Stop rotation (P)')
                : (isSk ? (lastPanDirection === 'right' ? 'Automatická rotácia doľava (P)' : 'Automatická rotácia doprava (P)') : (lastPanDirection === 'right' ? 'Auto-Rotate Left (P)' : 'Auto-Rotate Right (P)'))
            }
            aria-label="Toggle Auto-Rotation"
          >
            <RotateCw className={`w-4 h-4 text-cyan-400 ${autoPanMode !== 'stopped' ? 'animate-spin-slow' : ''}`} />
          </button>

          {/* Unified Help Guide & Keyboard Shortcuts Button (?) — ALWAYS visible in top header */}
          <button
            onClick={toggleHelp}
            data-help="nav_ui_help"
            className={`p-2.5 rounded-2xl text-xs font-bold shadow-xl backdrop-blur-xl transition-all cursor-pointer flex items-center justify-center min-w-[38px] ${
              isHelpActive
                ? 'bg-amber-400 text-zinc-950 ring-2 ring-amber-300 ring-offset-2 ring-offset-black shadow-amber-500/50 scale-105'
                : 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-zinc-950 shadow-md shadow-amber-500/30 hover:scale-105 active:scale-95'
            }`}
            title={isSk ? 'Klávesové skratky & Sprievodca ovládaním (? / H)' : 'Keyboard Shortcuts & Guide (? / H)'}
            aria-label="Help Guide & Shortcuts"
          >
            <span className="font-extrabold text-sm leading-none">?</span>
          </button>

          {/* Fullscreen Button — ALWAYS visible */}
          <button
            onClick={handleToggleFullscreen}
            data-help="viewer_fullscreen"
            className="p-2.5 rounded-2xl bg-zinc-950/85 text-blue-400 border border-blue-500/50 hover:bg-blue-500/20 hover:border-blue-400 hover:text-white shadow-xl backdrop-blur-xl transition-all cursor-pointer"
            title={isFullscreen || isImmersive ? 'Exit Fullscreen' : 'Fullscreen (hides all controls on mobile)'}
            aria-label="Toggle fullscreen"
          >
            {isFullscreen || isImmersive ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* "More actions & tools" menu (three dots) in top-right corner — houses all collapsed icons whenever space is constrained */}
          {headerWidth < 1700 && (
            <div className="relative">
              <button
                onClick={() => setShowMobileMenu((v) => !v)}
                data-help="viewer_more"
                className={`p-2.5 rounded-2xl border shadow-xl backdrop-blur-xl transition-all cursor-pointer ${
                  showMobileMenu
                    ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 ring-2 ring-cyan-500/30'
                    : 'bg-zinc-950/85 text-zinc-200 border-white/25 hover:border-cyan-400 hover:text-white'
                }`}
                title={isSk ? 'Ďalšie nástroje a funkcie (⋮)' : 'More actions & tools (⋮)'}
                aria-label="More actions & tools"
              >
                {showMobileMenu ? <X className="w-4 h-4 text-cyan-300" /> : <MoreVertical className="w-4 h-4" />}
              </button>

              {showMobileMenu && renderMobileMenuDropdown()}
            </div>
          )}

          {/* Close Button (Rose/Red Accent) — ALWAYS visible */}
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-zinc-950/85 text-rose-400 border border-rose-500/50 hover:bg-rose-500/25 hover:border-rose-400 hover:text-white shadow-xl backdrop-blur-xl transition-all cursor-pointer"
            title="Close Viewer (Esc)"
            aria-label="Close viewer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Admin profile icon or inconspicuous admin key login button */}
          {isAdmin ? (
            <AdminAvatar sizeClass="w-10 h-10" />
          ) : (
            <button
              type="button"
              onClick={() => setShowAdminModal(true)}
              className="p-2.5 rounded-2xl bg-zinc-950/70 hover:bg-zinc-900/90 text-zinc-500 hover:text-amber-400 border border-white/10 hover:border-amber-400/40 shadow-xl backdrop-blur-xl transition-all cursor-pointer"
              title={isSk ? 'Admin prihlásenie' : 'Admin Login'}
              aria-label="Admin Login"
            >
              <Key className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
        )
      )}

      {/* Info Details Modal / Drawer */}
      {showInfo && (
        <>
          <div
            className="fixed inset-0 z-25 bg-black/40 backdrop-blur-xs cursor-pointer"
            onClick={() => setShowInfo(false)}
          />
          <div className="absolute top-16 md:top-20 right-3 md:right-4 z-30 w-88 max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-8rem)] overflow-y-auto custom-scrollbar glass-panel-elevated rounded-3xl p-4 md:p-5 text-white animate-slide-up shadow-2xl border border-white/20">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold tracking-wide">{isSk ? 'Detaily panorámy' : 'Panorama Information'}</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {!isAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowAdminModal(true)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-white/10 transition-colors cursor-pointer"
                  title={isSk ? 'Admin prihlásenie' : 'Admin Login'}
                  aria-label="Admin Login"
                >
                  <Key className="w-3.5 h-3.5" />
                </button>
              ) : (
                <AdminAvatar sizeClass="w-6 h-6" />
              )}
              <button
                onClick={() => setShowInfo(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={isSk ? 'Zavrieť detaily' : 'Close Details'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {/* AI Local Heritage & Story Card */}
            {(() => {
              const heritage = getPanoramaHeritageStory(panorama);
              return (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-zinc-200 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <h4 className="font-bold text-amber-300 text-xs">{heritage.title}</h4>
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-300">{heritage.story}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {heritage.highlights.map((hl) => (
                      <span
                        key={hl}
                        className="px-2 py-0.5 rounded-lg bg-black/40 border border-amber-400/30 text-amber-200 text-[10px] font-medium"
                      >
                        {hl}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Location */}
            <div>
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider block mb-1">
                Location
              </span>
              <div className="flex items-start gap-1.5 text-zinc-200 font-medium">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  {panorama.city !== 'Unknown' ? panorama.city : 'Unknown City'}
                  {panorama.country !== 'Unknown' && `, ${panorama.country}`}
                </span>
              </div>
            </div>

            {/* Coordinates */}
            {panorama.lat !== null && panorama.lon !== null && (
              <div>
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider block mb-1">
                  GPS Coordinates
                </span>
                <a
                  href={getGoogleMapsUrl(panorama.lat, panorama.lon)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-cyan-300 hover:text-white font-medium bg-zinc-900/60 hover:bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-white/10 hover:border-cyan-400/50 flex items-center gap-1.5 w-fit transition-all group/gpsinfo"
                  title="Open GPS coordinates in Google Maps (new window)"
                >
                  <span>{formatCoordinates(panorama.lat, panorama.lon)}</span>
                  <ExternalLink className="w-3 h-3 text-cyan-400 group-hover/gpsinfo:translate-x-0.5 transition-transform" />
                </a>
              </div>
            )}

            {/* Date (Strictly yyyy-MM-dd format across SK/EN) */}
            <div>
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider block mb-1">
                Date
              </span>
              <div className="flex items-center gap-1.5 text-zinc-200">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-mono text-xs">{formatPanoramaDate(panorama.date)}</span>
              </div>
            </div>

            {/* Auto-generated Hashtags */}
            {(() => {
              const tags = extractPanoramaTags(panorama);
              if (tags.length === 0) return null;
              return (
                <div>
                  <span className="text-[11px] text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Hashtags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono text-[10px] font-semibold"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Dimensions, Resolution & Megapixels */}
            <div className="space-y-2 pt-1">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-zinc-400 uppercase tracking-wider font-semibold">
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Resolution</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-extrabold text-xs border border-cyan-500/30 font-mono" title="Horizontal Resolution (Width)">
                      {getHorizontalK(panorama.width)}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 font-extrabold text-xs border border-amber-400/30 font-mono" title="Total Megapixels">
                      {getMegapixels(panorama.width, panorama.height)}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between pt-1 border-t border-white/5 text-xs">
                  <div>
                    <span className="text-zinc-400 text-[10px] block">Dimensions (W × H):</span>
                    <span className="font-bold text-white font-mono text-xs">
                      {panorama.width.toLocaleString()} × {panorama.height.toLocaleString()} px
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-400 text-[10px] block">Total Megapixels:</span>
                    <span className="font-bold text-amber-300 font-mono text-xs">
                      {getMegapixels(panorama.width, panorama.height)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 uppercase mb-0.5">
                    <HardDrive className="w-3 h-3 text-cyan-400" />
                    <span>File Size</span>
                  </div>
                  <span className="font-semibold text-cyan-300 font-mono text-xs">
                    {formatFileSize(panorama.size)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 uppercase mb-0.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Aspect Ratio</span>
                  </div>
                  <span className="font-semibold text-zinc-200 font-mono text-xs">
                    2:1 (360° Spherical)
                  </span>
                </div>
              </div>
            </div>

            {/* Engine & Performance info */}
            <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-zinc-400">Active Engine</span>
                <span className="text-cyan-300 font-semibold">
                  Google Photos (Three.js WebGL)
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Texture Quality</span>
                <span className="font-semibold">
                  {textureState === 'ultra_hd' ? (
                    <span className="text-emerald-400">
                      {getHorizontalK(panorama.width)} Ultra-HD ({getMegapixels(panorama.width, panorama.height)} • {panorama.width.toLocaleString()}×{panorama.height.toLocaleString()})
                    </span>
                  ) : textureState === 'hd_8k' ? (
                    <span className="text-sky-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                      {isSk
                        ? `8K HD Ready (dočítava sa ${getHorizontalK(panorama.width)} Ultra-HD na pozadí...)`
                        : `8K HD Ready (streaming ${getHorizontalK(panorama.width)} Ultra-HD in background...)`}
                    </span>
                  ) : textureState === 'preview_2k_final' ? (
                    <span className="text-cyan-300">
                      2K HD ({isSk ? 'Optimalizované pre zariadenie' : 'Optimized for device'} • {getMegapixels(2048, 1024)})
                    </span>
                  ) : textureState === 'preview_2k' ? (
                    <span className="text-amber-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      {isSk
                        ? `2K HD Ready (dočítava sa 8K / Ultra-HD...)`
                        : `2K HD Ready (streaming 8K / Ultra-HD...)`}
                    </span>
                  ) : (
                    <span className="text-zinc-400">
                      {isSk ? 'Načítava sa...' : 'Loading...'}
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Community Activity / Stats */}
            <div className="grid grid-cols-4 gap-1.5 p-2 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
              <div className="flex flex-col items-center p-1.5 rounded-xl bg-white/[0.03]">
                <span className="text-[10px] text-zinc-400 block mb-0.5">{t('views')}</span>
                <span className="font-bold text-cyan-300 font-mono text-xs">{currentViews || panorama.views || 0}</span>
              </div>
              <div className="flex flex-col items-center p-1.5 rounded-xl bg-white/[0.03]">
                <span className="text-[10px] text-zinc-400 block mb-0.5">{t('shares')}</span>
                <span className="font-bold text-violet-300 font-mono text-xs">{shareCount}</span>
              </div>
              <div className="flex flex-col items-center p-1.5 rounded-xl bg-white/[0.03]">
                <span className="text-[10px] text-zinc-400 block mb-0.5">{t('favorites')}</span>
                <span className="font-bold text-rose-300 font-mono text-xs">{favoriteCount}</span>
              </div>
              <button
                type="button"
                onClick={() => { setShowInfo(false); setShowComments(true); }}
                className="flex flex-col items-center p-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer transition-colors"
                title="Open Comments"
              >
                <span className="text-[10px] text-amber-300 block mb-0.5">{t('comments')}</span>
                <span className="font-bold text-amber-400 font-mono text-xs">{commentsCount}</span>
              </button>
            </div>

            {/* File info */}
            <div>
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider block mb-1">
                Filename
              </span>
              <span className="text-zinc-400 text-[11px] break-all font-mono">
                {panorama.original_filename || panorama.filename}
              </span>
            </div>

            {/* Pro Tips Section in Info Modal */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-cyan-500/10 to-transparent border border-amber-500/35 text-xs shadow-lg space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-extrabold text-[11px] uppercase tracking-wider font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{isSk ? 'Pro Tip: Kľúčové funkcie' : 'Pro Tip: Key Features'}</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-zinc-300 leading-snug">
                <li className="flex items-start gap-2">
                  <span className="font-mono font-extrabold text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded border border-amber-400/30 text-[10px] shrink-0">
                    M
                  </span>
                  <span>{isSk ? 'Režim filmu (Kino): celoobrazovková 360° prehliadka cez pás' : 'Movie mode: 360° hands-free tour across strip'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-extrabold text-emerald-400 bg-emerald-400/15 px-1.5 py-0.5 rounded border border-emerald-400/30 text-[10px] shrink-0">
                    C
                  </span>
                  <span>{isSk ? 'Čistá 4K fotka: okamžité stiahnutie výrezu bez UI prvkov' : 'Pure 4K snapshot: instant download of view without UI'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-extrabold text-cyan-400 bg-cyan-400/15 px-1.5 py-0.5 rounded border border-cyan-400/30 text-[10px] shrink-0">
                    H
                  </span>
                  <span>{isSk ? 'Herný sprievodca klávesov: WASD, 1-2-3 projekcie, 0 natívny pixel zoom' : 'Gaming keyboard HUD: WASD, 1-2-3 projections, 0 1:1 zoom'}</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons in Info Modal */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              {/* Google Maps link */}
              {panorama.lat !== null && panorama.lon !== null && !(panorama.lat === 0 && panorama.lon === 0) && (
                <a
                  href={getGoogleMapsUrl(panorama.lat, panorama.lon)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl glass-button text-xs font-semibold text-white hover:text-cyan-300 group"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span>View in Google Maps</span>
                </a>
              )}

              {/* Export Current View Snapshot Button */}
              <button
                onClick={handleExportCurrentView}
                disabled={isExportingView}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl glass-button text-xs font-semibold text-white hover:text-emerald-300 group disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Export Current View (Pure Photo)</span>
              </button>

              {/* Download Panorama Button (Rate limited to 1 per minute for non-admin) */}
              <button
                type="button"
                onClick={handleDownloadFullPanorama}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl glass-button text-xs font-semibold text-white transition-all group ${
                  downloadCooldown > 0 && !isAdmin
                    ? 'border-amber-500/50 text-amber-300 hover:bg-amber-500/15'
                    : 'hover:text-cyan-300'
                }`}
              >
                <Download className={`w-3.5 h-3.5 ${downloadCooldown > 0 && !isAdmin ? 'text-amber-400' : 'text-cyan-400'} group-hover:scale-110 transition-transform`} />
                <span>
                  {downloadCooldown > 0 && !isAdmin
                    ? `Download Full 360° (Cooldown ${downloadCooldown}s)`
                    : 'Download High-Res Panorama (Full 360°)'}
                </span>
              </button>

              {/* Share Panorama */}
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl glass-button text-xs font-semibold text-white hover:text-cyan-300 group"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Share This Panorama</span>
              </button>

              {/* Send Feedback */}
              <button
                onClick={() => {
                  setShowInfo(false);
                  setShowFeedback(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl glass-button text-xs font-semibold text-white hover:text-cyan-300 group"
              >
                <Mail className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>{i18n.language.startsWith('sk') ? 'Poslať feedback autorovi' : 'Send Feedback'}</span>
              </button>

              {/* Admin Actions in Info Modal */}
              {isAdmin && (
                <div className="pt-3 mt-3 border-t border-white/10 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Administrator Controls
                  </div>
                  <button
                    onClick={handleTogglePrivacy}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl glass-button text-xs font-semibold text-white hover:text-cyan-300"
                  >
                    {panorama.is_private ? <Globe2 className="w-3.5 h-3.5 text-cyan-400" /> : <Lock className="w-3.5 h-3.5 text-rose-400" />}
                    <span>{panorama.is_private ? 'Make Public' : 'Make Private'}</span>
                  </button>
                  {isDeleted ? (
                    <button
                      onClick={handleRestorePano}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Restore from !DELETED!</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleDeletePano}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 hover:border-rose-500/60 text-xs font-bold transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Delete (Move to !DELETED!)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        </>
      )}

      {/* Bottom Film Roll of Nearby Panoramas / Timeline */}
      {!isCleanView && !isMovieMode && (nearby.length > 0 || timeTravelPanos.length > 1) && isFs && isMobileScreen && !immersiveStrip && (
        <button
          type="button"
          onClick={() => setImmersiveStrip(true)}
          className={`absolute bottom-3 left-3 z-30 w-10 h-10 rounded-full glass-panel-elevated border ${
            isTimelineTab ? 'border-amber-500/40 text-amber-300' : 'border-white/20 text-cyan-300'
          } flex items-center justify-center shadow-xl pointer-events-auto hover:scale-105 active:scale-95 transition-all`}
          title={isSk ? 'Zobraziť filmový pás' : 'Show film strip'}
        >
          {isTimelineTab ? <History className="w-4 h-4" /> : <Film className="w-4 h-4" />}
        </button>
      )}
      {!isCleanView && !isMovieMode && (nearby.length > 0 || timeTravelPanos.length > 1) && (
        <div className={`absolute bottom-3 md:bottom-4 left-3 right-3 md:left-4 md:right-4 z-20 pointer-events-none transition-all duration-300 ${isFs && isMobileScreen && !immersiveStrip ? 'hidden' : ''}`}>
          {isFilmRollVisible ? (
            <div data-help="viewer_filmstrip" className="pointer-events-auto glass-panel-elevated rounded-3xl p-3 border border-white/15 animate-slide-up">
              <div className="flex items-center justify-between px-2 mb-2">
                {timeTravelPanos.length >= 2 ? (
                  <div className="flex items-center bg-black/60 p-0.5 rounded-xl border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setFilmstripTab('timeline');
                        try {
                          localStorage.setItem('pano_filmstrip_tab', 'timeline');
                        } catch {}
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        filmstripTab === 'timeline'
                          ? 'bg-amber-500 text-zinc-950 shadow-md ring-1 ring-amber-300'
                          : 'text-zinc-400 hover:text-amber-300'
                      }`}
                      title={isSk ? 'Časová os lokácie (do 100 m)' : 'Location timeline (within 100m)'}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>{isSk ? 'Časová os' : 'Timeline'}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${filmstripTab === 'timeline' ? 'bg-black/40 text-amber-200' : 'bg-white/10 text-zinc-300'}`}>
                        {timeTravelPanos.length}
                      </span>
                    </button>
                    {/* Small Play/Pause Button on Timeline */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTimelinePlay();
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        isTimelinePlaying
                          ? 'bg-amber-400 text-zinc-950 shadow-md ring-1 ring-amber-300 animate-pulse'
                          : 'text-amber-300 hover:text-white hover:bg-amber-500/20'
                      }`}
                      title={
                        isTimelinePlaying
                          ? (isSk ? 'Zastaviť prehrávanie časovej osi' : 'Stop timeline playback')
                          : (isSk ? 'Automaticky prehrávať časovú os (2s interval)' : 'Auto-play timeline (2s interval)')
                      }
                      aria-label="Toggle Timeline Auto-Play"
                    >
                      {isTimelinePlaying ? (
                        <>
                          <Pause className="w-3 h-3 fill-current" />
                          <span className="text-[10px] font-mono">2s</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          <span className="text-[10px] font-mono hidden sm:inline">{isSk ? 'Play' : 'Play'}</span>
                        </>
                      )}
                    </button>
                    {/* Admin Select All in Cluster Button */}
                    {isAdmin && effectiveCluster && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const clusterIds = effectiveCluster.members.map((m) => String(m.id));
                          const allSelected = clusterIds.every((id) => selectedPanoIds.has(id));
                          if (allSelected) {
                            deselectPanos(clusterIds);
                            onShowToast(isSk ? 'Výber klastra zrušený' : 'Cluster deselected');
                          } else {
                            selectPanos(clusterIds);
                            onShowToast(
                              isSk
                                ? `Označených všetkých ${clusterIds.length} panorám v klastri`
                                : `Selected all ${clusterIds.length} panos in cluster`
                            );
                          }
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          effectiveCluster.members.every((m) => selectedPanoIds.has(String(m.id)))
                            ? 'bg-cyan-500 text-zinc-950 shadow-md ring-1 ring-cyan-300'
                            : 'bg-white/10 text-cyan-300 hover:bg-white/20 hover:text-white border border-white/20'
                        }`}
                        title={isSk ? 'Označiť / Odznačiť všetky panorámy v tomto klastri' : 'Select / deselect all panoramas in this cluster'}
                      >
                        <CheckSquare className="w-3 h-3" />
                        <span className="text-[10px] hidden sm:inline">
                          {effectiveCluster.members.every((m) => selectedPanoIds.has(String(m.id)))
                            ? (isSk ? 'Odznačiť klaster' : 'Deselect cluster')
                            : (isSk ? `Označiť všetky (${effectiveCluster.members.length})` : `Select all (${effectiveCluster.members.length})`)}
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setFilmstripTab('nearby');
                        try {
                          localStorage.setItem('pano_filmstrip_tab', 'nearby');
                        } catch {}
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        filmstripTab === 'nearby'
                          ? (panorama.is_private ? 'bg-rose-500 text-white shadow-md ring-1 ring-rose-300' : 'bg-cyan-500 text-zinc-950 shadow-md ring-1 ring-cyan-300')
                          : (panorama.is_private ? 'text-zinc-400 hover:text-rose-300' : 'text-zinc-400 hover:text-cyan-300')
                      }`}
                      title={panorama.is_private ? (panorama.folder || 'Private Archive') : (isSk ? 'Blízke panorámy' : 'Nearby panoramas')}
                    >
                      {panorama.is_private ? <FolderLock className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                      <span>{panorama.is_private ? (panorama.folder || 'Folder') : (isSk ? 'Blízke' : 'Nearby')}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${filmstripTab === 'nearby' ? (panorama.is_private ? 'bg-black/40 text-rose-200' : 'bg-black/40 text-cyan-200') : 'bg-white/10 text-zinc-300'}`}>
                        {nearby.length}
                      </span>
                    </button>
                  </div>
                ) : panorama.is_private ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                      <FolderLock className="w-3.5 h-3.5 text-rose-400" />
                      <span>{panorama.folder || 'Private Archive'}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30">
                      {nearby.length} in folder
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Nearby Panoramas
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-semibold border border-cyan-500/30">
                      {nearby.length} nearby
                    </span>
                  </div>
                )}

                {/* Active Global Filters in Filmstrip Header */}
                {hasAnyFilterActive && (
                  <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar px-2 max-w-xs md:max-w-md lg:max-w-lg">
                    <ActiveFiltersBar
                      filteredCount={filteredPanoramas.length}
                      hideCount={true}
                      onlyFavorites={onlyFavorites}
                      onToggleOnlyFavorites={onToggleOnlyFavorites}
                      selectedYears={selectedYears}
                      onToggleYear={onToggleYear}
                      selectedMonths={selectedMonths}
                      onToggleMonth={onToggleMonth}
                      selectedResolutions={selectedResolutions}
                      onToggleResolution={onToggleResolution}
                      selectedTags={selectedTags}
                      onToggleTag={onToggleTag}
                      selectedMoods={selectedMoods}
                      onToggleMood={onToggleMood}
                      searchQuery={searchQuery}
                      onClearSearch={onClearSearch}
                      onResetAllFilters={onResetAllFilters}
                      hasAnyFilterActive={hasAnyFilterActive}
                    />
                  </div>
                )}

                {/* Filmstrip Quick Filters (Resolution & Environment) */}
                <div className="hidden lg:flex items-center gap-2 mx-auto">
                  {/* Resolution Quick Filter */}
                  <div className="flex items-center bg-black/50 p-0.5 rounded-xl border border-white/10 text-[10px]">
                    <button
                      onClick={() => setFilmResFilter('all')}
                      className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                        filmResFilter === 'all'
                          ? 'bg-white/20 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      All Res
                    </button>
                    <button
                      onClick={() => setFilmResFilter('15K')}
                      className={`px-2 py-0.5 rounded-lg font-black transition-all flex items-center gap-1 ${
                        filmResFilter === '15K'
                          ? 'bg-amber-400 text-zinc-950 shadow-md ring-1 ring-amber-300'
                          : 'text-amber-400 hover:text-amber-300'
                      }`}
                      title="Filter 15K Ultra-Resolution Panoramas (15000-15999px)"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>15K</span>
                    </button>
                    <button
                      onClick={() => setFilmResFilter('8K+')}
                      className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                        filmResFilter === '8K+'
                          ? 'bg-cyan-500 text-zinc-950 shadow-md'
                          : 'text-cyan-400 hover:text-cyan-300'
                      }`}
                    >
                      8K+
                    </button>
                  </div>

                  {/* Filmstrip Card Size Switcher (Desktop Mini / Normal / Large) */}
                  <div className="hidden xl:flex items-center bg-black/50 p-0.5 rounded-xl border border-white/10 text-[10px]">
                    <button
                      onClick={() => setFilmstripSize('mini')}
                      className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                        filmstripSize === 'mini' ? 'bg-white/20 text-white font-extrabold' : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Miniatúrny pás (Mini)"
                    >
                      Mini
                    </button>
                    <button
                      onClick={() => setFilmstripSize('normal')}
                      className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                        filmstripSize === 'normal' ? 'bg-white/20 text-white font-extrabold' : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Normálny pás (Normal)"
                    >
                      Normal
                    </button>
                    <button
                      onClick={() => setFilmstripSize('large')}
                      className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                        filmstripSize === 'large' ? 'bg-white/20 text-white font-extrabold' : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Veľký pás (Large)"
                    >
                      Large
                    </button>
                  </div>

                  {/* Admin Quick Switch for Active Panorama in Filmstrip Header */}
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-black/50 border border-white/10 text-[10px]">
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {i18n.language.startsWith('sk') ? 'Aktuálna:' : 'Active:'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleTogglePanoPublic(e, panorama)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-pointer font-bold text-[10px] ${
                          isItemPrivate(panorama)
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                        }`}
                        title={
                          isItemPrivate(panorama)
                            ? (i18n.language.startsWith('sk') ? 'Súkromná • Kliknite pre zverejnenie' : 'Private • Click to Make Public')
                            : (i18n.language.startsWith('sk') ? 'Verejná • Kliknite pre skrytie' : 'Public • Click to Make Private')
                        }
                      >
                        <div
                          className={`w-5 h-2.5 rounded-full p-0.5 transition-colors flex items-center ${
                            isItemPrivate(panorama) ? 'bg-zinc-700 justify-start' : 'bg-emerald-500 justify-end'
                          }`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                        </div>
                        <span>
                          {isItemPrivate(panorama)
                            ? (i18n.language.startsWith('sk') ? 'Súkromná' : 'Private')
                            : (i18n.language.startsWith('sk') ? 'Verejná' : 'Public')}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Film roll controls */}
                <div className="flex items-center gap-1.5">
                  {/* Desktop Hover Zoom Preview Toggle Button (Works for both Timeline & Proximity strips) */}
                  <button
                    type="button"
                    onClick={handleToggleHoverPreview}
                    className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer select-none ${
                      showHoverPreview
                        ? isTimelineTab
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-xs'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30 shadow-xs'
                        : 'bg-black/50 text-zinc-400 border-white/10 hover:text-zinc-200 hover:bg-white/10'
                    }`}
                    title={
                      showHoverPreview
                        ? (isSk ? 'Zväčšený 2K náhľad pri prejdení myšou: ZAPNUTÝ (kliknutím vypnete)' : 'Hover 2K Zoom Preview: ON (click to disable)')
                        : (isSk ? 'Zväčšený 2K náhľad pri prejdení myšou: VYPNUTÝ (kliknutím zapnete)' : 'Hover 2K Zoom Preview: OFF (click to enable)')
                    }
                    aria-label="Toggle Filmstrip Hover Preview"
                  >
                    {showHoverPreview ? (
                      <Eye className={`w-3.5 h-3.5 ${isTimelineTab ? 'text-amber-300' : 'text-cyan-300'}`} />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                    <span className="hidden lg:inline text-[10px]">
                      {isSk ? 'Hover náhľad' : 'Hover preview'}
                    </span>
                    <div
                      className={`w-6 h-3 rounded-full p-0.5 transition-colors flex items-center ${
                        showHoverPreview
                          ? isTimelineTab ? 'bg-amber-400 justify-end' : 'bg-cyan-400 justify-end'
                          : 'bg-zinc-700 justify-start'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-white shadow-xs" />
                    </div>
                  </button>

                  <button
                    onClick={() => handleScrollFilmRoll('left')}
                    className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                    title="Scroll Left"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleScrollFilmRoll('right')}
                    className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                    title="Scroll Right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsFilmRollVisible(false);
                      setImmersiveStrip(false);
                    }}
                    className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-rose-400 transition-colors ml-1"
                    title="Minimize Nearby Strip"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Desktop Hover 2K Detail Popover Card (2-3x larger) */}
              {showHoverPreview && hoveredFilmIndex !== null && currentFilmItems[hoveredFilmIndex] && (
                <div className="hidden md:block absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-slide-up">
                  {(() => {
                    const hp = currentFilmItems[hoveredFilmIndex];
                    const hpTags = extractPanoramaTags(hp);
                    const itemNumber = hoveredFilmIndex + 1;
                    return (
                      <div className="w-[680px] lg:w-[780px] max-w-[94vw] max-h-[calc(100vh-14rem)] rounded-3xl glass-panel-elevated p-4 border border-cyan-400/40 shadow-2xl shadow-black/95 text-white space-y-3 backdrop-blur-3xl ring-1 ring-white/10">
                        {/* High-Resolution 2K Preview Image */}
                        <div className="relative aspect-[2/1] w-full rounded-2xl overflow-hidden bg-zinc-900 border border-white/15 shadow-xl">
                          <img
                            src={`/panoramas_2k/${cleanPanoPath(hp.filename)}`}
                            alt={hp.city || hp.filename}
                            onError={(e) => {
                              const target = e.currentTarget;
                              const clean = cleanPanoPath(hp.filename);
                              const thumbFallback = `/thumbnails/${clean}`;
                              const webFallback = `/panoramas_web/${clean}`;
                              const tunnelFallback = `https://ag.trusik.link/panoramas_web/${clean}`;
                              const fullFallback = `/panoramas/${clean}`;
                              if (!target.src.includes('/thumbnails/')) {
                                target.src = thumbFallback;
                              } else if (!target.src.includes('/panoramas_web/') && !target.src.includes('ag.trusik.link')) {
                                target.src = webFallback;
                              } else if (!target.src.includes('ag.trusik.link')) {
                                target.src = tunnelFallback;
                              } else if (!target.src.includes('/panoramas/')) {
                                target.src = fullFallback;
                              }
                            }}
                            className="w-full h-full object-cover"
                          />

                          {/* Item number badge */}
                          <div className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-xl ${
                            isTimelineTab ? 'bg-amber-500 text-zinc-950' : 'bg-cyan-500 text-zinc-950'
                          } font-black text-xs shadow-lg border border-white/40 font-mono`}>
                            #{itemNumber}
                          </div>

                          {/* Resolution & Megapixels badge */}
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                            <div className="px-2.5 py-1 rounded-xl bg-black/85 backdrop-blur-md text-cyan-300 font-mono text-xs font-black border border-cyan-500/40 shadow-lg flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{getHorizontalK(hp.width)}</span>
                            </div>
                            <div className="px-2 py-1 rounded-xl bg-black/75 backdrop-blur-md text-zinc-300 font-mono text-[11px] font-semibold border border-white/20 shadow-md">
                              {getMegapixels(hp.width, hp.height)}
                            </div>
                          </div>

                          {/* Distance badge */}
                          {(hp.distance !== undefined || isTimelineTab) && (
                            <div className={`absolute bottom-2.5 left-2.5 px-3 py-1 rounded-full bg-zinc-950/90 backdrop-blur-md ${
                              isTimelineTab ? 'text-amber-300 border-amber-400/40' : 'text-cyan-300 border-cyan-500/40'
                            } font-bold text-xs border shadow-lg`}>
                              {isTimelineTab ? `${hp.distance ?? 0} m` : formatDistance(hp.distance ?? 0)}
                            </div>
                          )}

                          {/* Aligned badge in hover preview (Admin timeline mode) */}
                          {isAdmin && isTimelineTab && (hp.sun_data?.manual_aligned || hp.sun_data?.visual_aligned) && (
                            <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-full bg-emerald-500/90 text-zinc-950 font-black text-xs flex items-center gap-1 shadow-lg border border-emerald-300">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>{i18n.language.startsWith('sk') ? 'Zarovnané' : 'Aligned'}</span>
                            </div>
                          )}

                          <div className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] text-zinc-400 font-mono">
                            2K Preview
                          </div>
                        </div>

                        {/* Title, Date & Dimensions */}
                        <div className="flex items-center justify-between gap-3 px-1">
                          <div className="min-w-0">
                            <div className="text-base font-bold text-white truncate flex items-center gap-2">
                              <span>{isTimelineTab ? `📅 ${formatPanoramaDate(hp.date)}` : getPanoramaCity(hp)}</span>
                              {hp.country && hp.country !== 'Unknown' && (
                                <span className="text-xs text-zinc-400 font-normal truncate">• {hp.country}</span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate font-mono">
                              {isTimelineTab ? getPanoramaCity(hp) : (hp.original_filename || hp.filename)}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold text-zinc-200 font-mono">
                              {formatPanoramaDate(hp.date)}
                            </div>
                            <div className="text-[11px] text-cyan-300/80 font-mono">
                              {hp.width.toLocaleString()} × {hp.height.toLocaleString()} px
                            </div>
                          </div>
                        </div>

                        {/* Hashtags */}
                        {hpTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/10 px-1">
                            {hpTags.slice(0, 8).map((tg) => (
                              <span
                                key={tg}
                                className="px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 font-mono text-[10px] font-semibold border border-cyan-500/30"
                              >
                                {tg}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Horizontal Film Strip */}
              <div
                ref={filmRollRef}
                className="flex gap-3 overflow-x-auto pb-1 pt-0.5 px-1 custom-scrollbar scroll-smooth"
              >
                {/* 1st Item: Mini Map overview with numbered pins (hidden on mobile) */}
                {headerWidth >= 768 && (
                  <FilmstripMiniMap
                    currentPanorama={panorama}
                    nearbyPanoramas={currentFilmItems}
                    onSelectPanorama={isTimelineTab ? handleTimeTravelSelect : onSelectPanorama}
                    hoveredIndex={hoveredFilmIndex}
                    onOpenMap={onOpenMapAtCoords}
                  />
                )}

                {/* Numbered panorama cards */}
                {currentFilmItems.map((p, index) => {
                  const itemNumber = index + 1;
                  const resCat = getResolutionCategory(p.width);
                  const isPriv = isItemPrivate(p);
                  const isCurrent = p.id === panorama.id;
                  const cardWidthClass =
                    filmstripSize === 'mini' ? (isTimelineTab ? 'w-32' : 'w-28') : filmstripSize === 'large' ? 'w-64' : 'w-48';
                  const thumbHeightClass =
                    filmstripSize === 'mini' ? (isTimelineTab ? 'h-18' : 'h-16') : filmstripSize === 'large' ? 'h-32' : 'h-24';
                  return (
                    <div
                      key={p.id}
                      data-pano-id={p.id}
                      onClick={() => {
                        if (isTimelineTab) {
                          handleTimeTravelSelect(p);
                        } else {
                          onSelectPanorama(p);
                        }
                      }}
                      onMouseEnter={() => {
                        if (showHoverPreview) {
                          setHoveredFilmIndex(index);
                        }
                      }}
                      onMouseLeave={() => setHoveredFilmIndex(null)}
                      className={`flex-none ${cardWidthClass} group cursor-pointer rounded-2xl overflow-hidden glass-panel transition-all duration-300 text-left relative ${
                        isCurrent
                          ? isTimelineTab
                            ? 'border-amber-400 ring-2 ring-amber-400 shadow-xl shadow-amber-950/80 bg-amber-950/30'
                            : 'border-cyan-400 ring-2 ring-cyan-400 shadow-xl shadow-cyan-950/80 bg-cyan-950/30'
                          : isPanoSelected(p.id)
                          ? 'border-cyan-400 ring-2 ring-cyan-400 shadow-xl shadow-cyan-950/80 bg-cyan-950/30'
                          : isPriv
                          ? 'hover:border-rose-500/60 hover:bg-rose-950/20'
                          : isTimelineTab
                          ? 'hover:border-amber-400/60 hover:bg-amber-950/20'
                          : 'hover:border-cyan-500/60 hover:bg-zinc-800/80'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className={`relative w-full ${thumbHeightClass} bg-zinc-900 overflow-hidden`}>
                        <img
                          src={`/thumbnails/${cleanPanoPath(p.filename)}`}
                          alt={p.city || 'Panorama thumbnail'}
                          onError={(e) => {
                            const target = e.currentTarget;
                            const clean = cleanPanoPath(p.filename);
                            const p2kFallback = `/panoramas_2k/${clean}`;
                            const webFallback = `/panoramas_web/${clean}`;
                            const tunnelFallback = `https://ag.trusik.link/panoramas_web/${clean}`;
                            const fullFallback = `/panoramas/${clean}`;
                            if (!target.src.includes('/panoramas_2k/') && !target.src.includes('/panoramas_web/') && !target.src.includes('ag.trusik.link') && !target.src.includes('/panoramas/')) {
                              target.src = p2kFallback;
                            } else if (!target.src.includes('/panoramas_web/') && !target.src.includes('ag.trusik.link') && !target.src.includes('/panoramas/')) {
                              target.src = webFallback;
                            } else if (!target.src.includes('ag.trusik.link') && !target.src.includes('/panoramas/')) {
                              target.src = tunnelFallback;
                            } else if (!target.src.includes('/panoramas/')) {
                              target.src = fullFallback;
                            }
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />

                        {/* Admin Multi-select Checkbox (in both nearby and timeline modes) */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectPano(p.id);
                            }}
                            className={`absolute top-1.5 left-1.5 z-20 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                              isPanoSelected(p.id)
                                ? 'bg-cyan-500 text-zinc-950 shadow-md ring-2 ring-cyan-300'
                                : 'bg-black/60 text-white/70 hover:text-white border border-white/30 hover:border-cyan-400'
                            }`}
                            title={isPanoSelected(p.id) ? 'Deselect panorama' : 'Select panorama for bulk edit'}
                          >
                            {isPanoSelected(p.id) ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        {isTimelineTab ? (
                          /* In Timeline mode: date in center, plus admin 'zarovnané' badge if aligned */
                          <>
                            <div className={`absolute top-1.5 inset-x-1.5 flex justify-center pointer-events-none z-10 ${isAdmin ? 'pl-7 pr-16' : ''}`}>
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-extrabold tracking-tight shadow-md border backdrop-blur-md ${
                                  isCurrent
                                    ? 'bg-amber-400 text-zinc-950 border-amber-300 ring-1 ring-amber-300 shadow-amber-950/60'
                                    : 'bg-black/80 text-amber-200 border-amber-400/40'
                                }`}
                              >
                                {formatPanoramaDate(p.date)}
                              </span>
                            </div>

                            {/* Admin mode: Aligned icon 'zarovnané' in timeline mode */}
                            {isAdmin && (p.sun_data?.manual_aligned || p.sun_data?.visual_aligned) && (
                              <div
                                className="absolute top-1.5 right-1.5 z-20 px-1.5 py-0.5 rounded-md bg-emerald-500/90 text-zinc-950 font-black text-[9px] flex items-center gap-1 shadow-md border border-emerald-300 ring-1 ring-emerald-400/50 backdrop-blur-sm"
                                title={i18n.language.startsWith('sk') ? `Zarovnané (offset: ${p.sun_data?.north_offset ?? 0}°)` : `Aligned (offset: ${p.sun_data?.north_offset ?? 0}°)`}
                              >
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                <span>{i18n.language.startsWith('sk') ? 'Zarovnané' : 'Aligned'}</span>
                              </div>
                            )}

                            {/* Admin mode: Exclude from cluster button */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleExcludePano(p);
                                }}
                                className={`absolute top-1.5 z-20 p-1 rounded-md transition-all shadow-md ${
                                  p.exclude_timeline
                                    ? 'bg-rose-500 text-white border border-rose-300'
                                    : 'bg-black/70 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/70 border border-white/20'
                                }`}
                                style={{ right: (p.sun_data?.manual_aligned || p.sun_data?.visual_aligned) ? '5.2rem' : '0.375rem' }}
                                title={
                                  p.exclude_timeline
                                    ? (isSk ? 'Panoráma je vyradená z klastra (kliknite pre zaradenie späť)' : 'Excluded from cluster (click to include)')
                                    : (isSk ? 'Vyradiť z klastra časovej osi (ponechať public)' : 'Exclude from timeline cluster (remains public)')
                                }
                              >
                                {p.exclude_timeline ? <EyeOff className="w-3 h-3" /> : <MinusCircle className="w-3 h-3" />}
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Number Badge (Matching Mini-Map Pin #1, #2, #3...) */}
                            <div
                              className={`absolute top-1.5 ${isAdmin ? 'left-8.5' : 'left-1.5'} min-w-6 h-6 px-1.5 rounded-lg ${
                                isPriv ? 'bg-rose-500 text-white' : 'bg-cyan-500 text-zinc-950'
                              } font-extrabold text-xs flex items-center justify-center shadow-lg border border-white/40`}
                            >
                              #{itemNumber}
                            </div>

                            {/* Top-Right Badges: Lock + Resolution (15K highlight) + Environment */}
                            <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                              {isPriv && (
                                <div className="w-5 h-5 rounded-md bg-rose-500/90 text-white flex items-center justify-center shadow-md">
                                  <Lock className="w-2.5 h-2.5" />
                                </div>
                              )}

                              {resCat === '15K' ? (
                                <div
                                  className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-400 to-yellow-400 text-zinc-950 font-black text-[10px] flex items-center gap-0.5 shadow-md border border-amber-300 ring-1 ring-amber-400/50"
                                  title="Ultra-Resolution 15K Panorama (15000-15999px wide)"
                                >
                                  <Sparkles className="w-2.5 h-2.5 text-zinc-950 fill-zinc-950" />
                                  <span>15K</span>
                                </div>
                              ) : (
                                <div
                                  className="px-1 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-zinc-200 border border-white/20 text-[9px] font-bold shadow-sm"
                                  title={`Resolution: ${p.width}×${p.height}`}
                                >
                                  <span>{resCat}</span>
                                </div>
                              )}
                            </div>

                            {/* Distance or Folder Badge */}
                            <div
                              className={`absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-zinc-950/85 backdrop-blur-md border ${
                                isPriv ? 'border-rose-500/40 text-rose-300' : 'border-cyan-500/40 text-cyan-300'
                              } text-[10px] font-bold`}
                            >
                              {p.distance !== undefined ? formatDistance(p.distance) : (p.folder || 'Private')}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Info & Admin Switch - hide in mini mode to keep it as a clean single-row strip of thumbnails */}
                      {filmstripSize !== 'mini' && (
                        <div className="p-2 space-y-1">
                          <div
                            className={`text-xs font-semibold text-white truncate ${
                              isTimelineTab
                                ? 'group-hover:text-amber-300'
                                : isPriv
                                ? 'group-hover:text-rose-300'
                                : 'group-hover:text-cyan-300'
                            } transition-colors`}
                          >
                            {isTimelineTab ? `📅 ${formatPanoramaDate(p.date)}` : getPanoramaCity(p)}
                          </div>
                          <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-400">
                            <span className="truncate flex items-center gap-1">
                              <span>{isTimelineTab ? getPanoramaCity(p) : formatPanoramaDate(p.date)}</span>
                              {isAdmin && isTimelineTab && (p.sun_data?.manual_aligned || p.sun_data?.visual_aligned) && (
                                <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-semibold flex items-center gap-0.5">
                                  <Check className="w-2 h-2 stroke-[2.5]" />
                                  <span>{i18n.language.startsWith('sk') ? 'Zarovnané' : 'Aligned'}</span>
                                </span>
                              )}
                            </span>

                            {/* Admin simple switch for public/private */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => handleTogglePanoPublic(e, p)}
                                className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                                  isPriv
                                    ? 'bg-zinc-800/90 text-rose-300 border-rose-500/40 hover:bg-rose-500/20 shadow-sm'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-sm'
                                }`}
                                title={
                                  isPriv
                                    ? (i18n.language.startsWith('sk') ? 'Súkromné • Kliknite pre zverejnenie' : 'Private • Click to Make Public')
                                    : (i18n.language.startsWith('sk') ? 'Verejné • Kliknite pre skrytie' : 'Public • Click to Make Private')
                                }
                              >
                                {/* Sleek iOS-style Toggle Switch Slider */}
                                <div
                                  className={`w-5 h-2.5 rounded-full p-0.5 transition-colors flex items-center ${
                                    isPriv ? 'bg-zinc-700 justify-start' : 'bg-emerald-500 justify-end'
                                  }`}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                                </div>
                                <span className="text-[9px] font-extrabold uppercase">
                                  {isPriv ? 'Priv' : 'Pub'}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              </div>
            </div>
          ) : (
            <div
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                setIsFilmRollVisible(true);
              }}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl glass-panel-elevated border ${
                isTimelineTab ? 'border-amber-500/30 hover:border-amber-400/60' : 'border-white/20 hover:border-cyan-500/40'
              } bg-zinc-950/90 backdrop-blur-xl shadow-2xl transition-all cursor-pointer group max-w-4xl mx-auto animate-slide-up`}
              title="Click anywhere to expand Film Strip"
            >
              {/* Left: Filmstrip Icon & Title */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    isTimelineTab
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : panorama.is_private
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}
                >
                  {isTimelineTab ? (
                    <History className="w-3.5 h-3.5" />
                  ) : panorama.is_private ? (
                    <FolderLock className="w-3.5 h-3.5" />
                  ) : (
                    <Film className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide truncate max-w-[120px] sm:max-w-xs">
                    {isTimelineTab
                      ? (isSk ? 'Časová os' : 'Timeline')
                      : panorama.is_private
                      ? (panorama.folder || 'Private Archive')
                      : (isSk ? 'Blízke panorámy' : 'Nearby Strip')}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isTimelineTab
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : panorama.is_private
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    }`}
                  >
                    {currentFilmItems.length}
                  </span>
                </div>
              </div>

              {/* Center: Quick Peek Mini-Thumbnails */}
              <div className="hidden sm:flex items-center gap-1.5 overflow-hidden py-0.5">
                {currentFilmItems.slice(0, 8).map((p, idx) => {
                  const is15K = getResolutionCategory(p.width) === '15K';
                  const isCurrent = p.id === panorama.id;
                  return (
                    <button
                      key={`mini-${p.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isTimelineTab) {
                          handleTimeTravelSelect(p);
                        } else {
                          onSelectPanorama(p);
                        }
                      }}
                      className={`w-7 h-7 rounded-lg overflow-hidden border ${
                        isCurrent && isTimelineTab
                          ? 'border-amber-400 ring-2 ring-amber-400 shadow-md shadow-amber-950/60'
                          : is15K
                          ? 'border-amber-400 ring-1 ring-amber-400/80 shadow-md shadow-amber-950/50'
                          : p.is_private
                          ? 'border-rose-500/40 hover:border-rose-400'
                          : 'border-white/20 hover:border-cyan-400'
                      } hover:scale-110 transition-transform relative shrink-0 group/mini`}
                      title={`${isTimelineTab ? `📅 ${formatPanoramaDate(p.date)} - ` : ''}#${idx + 1} - ${p.city || p.original_filename} (${getResolutionCategory(p.width)}${
                        p.distance !== undefined ? `, ${formatDistance(p.distance)}` : ''
                      })`}
                    >
                      <img
                        src={`/thumbnails/${cleanPanoPath(p.filename)}`}
                        alt=""
                      onError={(e) => {
                        const target = e.currentTarget;
                        const clean = cleanPanoPath(p.filename);
                        const p2kFallback = `/panoramas_2k/${clean}`;
                        const webFallback = `/panoramas_web/${clean}`;
                        const tunnelFallback = `https://ag.trusik.link/panoramas_web/${clean}`;
                        const fullFallback = `/panoramas/${clean}`;
                        if (!target.src.includes('/panoramas_2k/') && !target.src.includes('/panoramas_web/') && !target.src.includes('ag.trusik.link') && !target.src.includes('/panoramas/')) {
                          target.src = p2kFallback;
                        } else if (!target.src.includes('/panoramas_web/') && !target.src.includes('ag.trusik.link') && !target.src.includes('/panoramas/')) {
                          target.src = webFallback;
                        } else if (!target.src.includes('ag.trusik.link') && !target.src.includes('/panoramas/')) {
                          target.src = tunnelFallback;
                        } else if (!target.src.includes('/panoramas/')) {
                          target.src = fullFallback;
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover/mini:bg-transparent" />
                    <span className="absolute bottom-0 right-0 px-0.5 text-[8px] font-extrabold text-white bg-black/75 rounded-tl">
                      {idx + 1}
                    </span>
                  </button>
                  );
                })}
                {currentFilmItems.length > 8 && (
                  <span className="text-[10px] text-zinc-400 font-semibold px-1 shrink-0">
                    +{currentFilmItems.length - 8}
                  </span>
                )}
              </div>

              {/* Right: Expand Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFilmRollVisible(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${
                  isTimelineTab
                    ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 hover:border-amber-400 text-amber-300 hover:text-white'
                    : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/30 hover:border-cyan-400 text-cyan-300 hover:text-white'
                } border text-xs font-semibold shadow transition-all shrink-0 ml-auto sm:ml-0`}
                title="Expand Film Strip ( ^ )"
              >
                <ChevronUp className={`w-3.5 h-3.5 ${isTimelineTab ? 'text-amber-400' : 'text-cyan-400'} group-hover:-translate-y-0.5 transition-transform`} />
                <span>Expand Strip</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Panorama Comments Slide-over Drawer */}
      <CommentsDrawer
        panorama={panorama}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        onCommentsCountChange={(cnt) => setCommentsCount(cnt)}
        onShowToast={onShowToast}
      />

      {/* Panorama Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        defaultSubject={`Panorama #${panorama.id}: ${getPanoramaCity(panorama)} (${window.location.href})`}
        defaultUrl={window.location.href}
      />

      {/* Admin Tag Editor Modal */}
      {isAdmin && (
        <AdminTagEditorModal
          isOpen={showTagEditorModal}
          onClose={() => setShowTagEditorModal(false)}
          panoramas={[panorama]}
          allPanoramas={allPanoramas}
          onSaved={() => {
            onShowToast(i18n.language.startsWith('sk') ? 'Tagy úspešne uložené do D1' : 'Tags saved to D1');
          }}
        />
      )}

      {/* Admin Smart GPS Modal */}
      {isAdmin && (
        <AdminSmartGpsModal
          isOpen={showSmartGpsModal}
          onClose={() => setShowSmartGpsModal(false)}
          targetPanoramas={[panorama]}
          allPanoramas={allPanoramas || []}
          onSaved={() => {
            onShowToast(i18n.language.startsWith('sk') ? 'GPS úspešne priradené a uložené do D1' : 'GPS assigned and saved to D1');
          }}
        />
      )}

      {/* Admin Split-Screen Cluster Calibration View (Shift + C) */}
      {isAdmin && isSplitCalibrationOpen && (
        <SplitClusterCalibrationView
          isOpen={isSplitCalibrationOpen}
          onClose={() => setIsSplitCalibrationOpen(false)}
          targetPanorama={panorama}
          clusterPanoramas={calibrationClusterPanos}
          onSaveAlignment={handleSaveSplitAlignment}
          onShowToast={onShowToast}
          isSk={isSk}
        />
      )}

      {/* Admin Cluster Alignment Calibration Modal */}
      {isAdmin && (
        <AdminClusterCalibrationModal
          isOpen={showClusterCalibrationModal}
          onClose={() => setShowClusterCalibrationModal(false)}
          targetPanorama={panorama}
          allPanoramas={allPanoramas || []}
          selectedPanoramas={batchPanoramas.length === 2 ? batchPanoramas : undefined}
          onSaveAlignment={async (targetId, newOffset, refId) => {
            const target = allPanoramas.find((p) => String(p.id) === String(targetId)) || panorama;
            const newSunData: PanoramaSunData = {
              ...(target.sun_data || {
                astro_azimuth: 0,
                astro_elevation: 0,
                img_azimuth: 0,
                img_elevation: 0,
                sun_detected: false,
              }),
              north_offset: Number(newOffset.toFixed(2)),
              visual_aligned: true,
              ref_pano_id: String(refId),
              alignment_confidence: 1.0,
            };
            target.sun_data = newSunData;
            const res = await updatePanoramaSunData(String(targetId), newSunData);
            if (res.success) {
              onShowToast?.(
                isSk
                  ? `Zarovnanie úspešne uložené! (Severný offset: ${newOffset.toFixed(2)}° voči #${refId})`
                  : `Alignment successfully saved! (North offset: ${newOffset.toFixed(2)}° relative to #${refId})`
              );
              return true;
            } else {
              onShowToast?.(isSk ? 'Chyba pri ukladaní zarovnania' : 'Error saving alignment');
              return false;
            }
          }}
          onUpdateCalibrationOverlay={setCalibrationOverlay}
          onShowToast={onShowToast}
        />
      )}

      {/* 360 Video Panning Export Modal */}
      {isVideoModalOpen && (
        <VideoExportModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          panorama={panorama}
          getCurrentView={() => threeViewerRef.current?.getViewState?.() || null}
          createVideoRenderer={(w, h, opt) => threeViewerRef.current?.createVideoRenderer?.(w, h, opt) || null}
          onShowToast={onShowToast}
          isAdmin={isAdmin}
          isHighResReady={isHighResReady}
          selectedPanoramas={batchPanoramas}
          onSelectPanorama={onSelectPanorama}
          waitForPanoReady={(id, timeout) => threeViewerRef.current?.waitForPanoReady?.(id, timeout) || Promise.resolve(true)}
          waitForTopResolution={(id, timeout, onStatus) =>
            threeViewerRef.current?.waitForTopResolution
              ? threeViewerRef.current.waitForTopResolution(id, timeout, onStatus)
              : Promise.resolve({
                  success: true,
                  textureInfo: {
                    tier: 'full',
                    width: 0,
                    height: 0,
                    isMaxQuality: true,
                    label: '',
                    sourceWidth: 0,
                    sourceHeight: 0,
                  },
                })
          }
          getActiveTextureInfo={() => threeViewerRef.current?.getActiveTextureInfo?.()}
        />
      )}
    </div>
  );
};
