import React, { useMemo, useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Minimize2, Calendar } from 'lucide-react';
import type { Panorama } from '../types';
import { formatPanoramaDate } from '../utils/geo';

export interface VerticalTimelineRulerProps {
  currentPanorama: Panorama;
  timelinePanoramas: (Panorama & { distance?: number })[];
  onSelectPanorama: (p: Panorama) => void;
  isFs?: boolean;
  isFilmstripVisible?: boolean;
  filmstripSize?: 'mini' | 'normal' | 'large';
  hasFilter?: boolean;
  isSk?: boolean;
  isPortrait?: boolean;
  isMobile?: boolean;
}

export const VerticalTimelineRuler: React.FC<VerticalTimelineRulerProps> = ({
  currentPanorama,
  timelinePanoramas,
  onSelectPanorama,
  isFs = false,
  isFilmstripVisible = true,
  filmstripSize = 'normal',
  hasFilter = false,
  isSk = true,
  isPortrait: isPortraitProp,
  isMobile: isMobileProp,
}) => {
  // Collapse state: can be toggled by user, remembers preference
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('timeline_ruler_collapsed') === 'true';
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('timeline_ruler_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Detect short screens and orientation
  const [localIsShort, setLocalIsShort] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight < 540;
  });

  const [localIsMobile, setLocalIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || window.innerHeight < 540;
  });

  const [localIsPortrait, setLocalIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const handleResize = () => {
      setLocalIsShort(window.innerHeight < 540);
      setLocalIsMobile(window.innerWidth < 768 || window.innerHeight < 540);
      setLocalIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeIsPortrait = isPortraitProp !== undefined ? isPortraitProp : localIsPortrait;
  const activeIsMobile = isMobileProp !== undefined ? isMobileProp : localIsMobile;
  const isShortScreen = localIsShort;
  // Only display when there are at least 2 captures in the cluster timeline
  if (!timelinePanoramas || timelinePanoramas.length < 2) {
    return null;
  }

  // Calculate stable chronological boundaries (newest at TOP, oldest at BOTTOM)
  const { sortedItems, minTime, maxTime, years } = useMemo(() => {
    // Sort from NEWEST (index 0) to OLDEST (index length - 1)
    const sorted = [...timelinePanoramas].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da; // Newest first
    });

    const times = sorted.map((p) => {
      const t = p.date ? new Date(p.date).getTime() : 0;
      return isNaN(t) ? 0 : t;
    }).filter((t) => t > 0);

    let minT = times.length > 0 ? Math.min(...times) : Date.now();
    let maxT = times.length > 0 ? Math.max(...times) : Date.now();

    // If all captures on same day, add a 1-month buffer
    if (minT === maxT) {
      minT -= 30 * 24 * 60 * 60 * 1000;
      maxT += 30 * 24 * 60 * 60 * 1000;
    }

    const startYear = new Date(minT).getFullYear();
    const endYear = new Date(maxT).getFullYear();

    // Generate years from newest (top) to oldest (bottom)
    const yrList: { year: number; percent: number }[] = [];
    for (let yr = endYear; yr >= startYear; yr--) {
      const yrTime = new Date(`${yr}-01-01T00:00:00Z`).getTime();
      // Percent: maxTime is 4% (top), minTime is 96% (bottom)
      const pct = 4 + Math.max(0, Math.min(1, (maxT - yrTime) / (maxT - minT))) * 92;
      yrList.push({ year: yr, percent: pct });
    }

    return {
      sortedItems: sorted,
      minTime: minT,
      maxTime: maxT,
      years: yrList,
    };
  }, [timelinePanoramas]);

  // Current item index in newest-to-oldest array
  const currentIdx = sortedItems.findIndex((p) => p.id === currentPanorama.id);

  // Compute position for each panorama (newest at top, oldest at bottom)
  const placedItems = useMemo(() => {
    const range = maxTime - minTime || 1;
    const count = sortedItems.length;
    // Minimum gap between adjacent labels so larger font never collides
    const minGap = isShortScreen
      ? Math.min(5.5, 88 / Math.max(count, 1))
      : Math.min(8.5, 88 / Math.max(count, 1));

    // 1. Calculate raw mathematical percentage: maxTime = 4% (top), minTime = 96% (bottom)
    const items = sortedItems.map((p) => {
      const t = p.date ? new Date(p.date).getTime() : 0;
      const rawPct = 4 + Math.max(0, Math.min(1, (maxTime - t) / range)) * 92;
      return {
        pano: p,
        rawPct,
        labelPct: rawPct,
        isCurrent: p.id === currentPanorama.id,
      };
    });

    // 2. Prevent overlapping labels: push downwards if gap is too small
    let curY = 4;
    for (let i = 0; i < items.length; i++) {
      items[i].labelPct = Math.max(items[i].rawPct, curY);
      curY = items[i].labelPct + minGap;
    }

    // 3. If bottom label exceeded 96%, push back upwards from the bottom
    if (items.length > 0 && items[items.length - 1].labelPct > 96) {
      let bottomY = 96;
      for (let i = items.length - 1; i >= 0; i--) {
        items[i].labelPct = Math.min(items[i].labelPct, bottomY);
        bottomY = items[i].labelPct - minGap;
      }
    }

    return items;
  }, [sortedItems, minTime, maxTime, currentPanorama.id, isShortScreen]);

  // Navigate UP = towards newer panorama (index - 1)
  const handleNavNewer = () => {
    if (currentIdx > 0) {
      onSelectPanorama(sortedItems[currentIdx - 1]);
    } else if (sortedItems.length > 1) {
      onSelectPanorama(sortedItems[sortedItems.length - 1]);
    }
  };

  // Navigate DOWN = towards older panorama (index + 1)
  const handleNavOlder = () => {
    if (currentIdx !== -1 && currentIdx < sortedItems.length - 1) {
      onSelectPanorama(sortedItems[currentIdx + 1]);
    } else if (sortedItems.length > 1) {
      onSelectPanorama(sortedItems[0]);
    }
  };

  // Dynamic top and bottom positioning
  // Dynamic top positioning style (ensures exact clearance below notch/safe area and fullscreen controls)
  const topStyle = useMemo(() => {
    if (activeIsMobile && activeIsPortrait) {
      return {
        top: isFs
          ? 'calc(env(safe-area-inset-top, 0px) + 4.25rem)'
          : 'calc(env(safe-area-inset-top, 0px) + 6.75rem)',
      };
    }
    return undefined;
  }, [activeIsMobile, activeIsPortrait, isFs]);

  // Dynamic top and bottom positioning
  const positionClasses = useMemo(() => {
    // 1. TOP positioning (guarantee zero overlap with top controls / headers)
    let topClass = 'top-16 sm:top-20';
    if (isFs) {
      if (activeIsMobile && activeIsPortrait) {
        // In fullscreen on mobile portrait, the 8 button controls span across the top!
        topClass = 'top-24 sm:top-28';
      } else {
        // Desktop or mobile landscape fullscreen has clear top-left
        topClass = isShortScreen ? 'top-3' : 'top-3 sm:top-4';
      }
    } else {
      // Non-fullscreen:
      if (activeIsMobile) {
        if (activeIsPortrait) {
          // Mobile portrait has a 2-row header (~92px tall)
          topClass = 'top-28';
        } else {
          // Mobile landscape has compact 1-row header
          topClass = isShortScreen ? 'top-12' : 'top-14 sm:top-16';
        }
      } else {
        // Desktop has standard header
        topClass = 'top-16 sm:top-20';
      }
    }

    // 2. BOTTOM positioning (guarantee zero overlap with filmstrip drawer or toggle button)
    let bClass = isShortScreen ? 'bottom-3' : 'bottom-6 sm:bottom-8';
    if (isFilmstripVisible) {
      if (isShortScreen || (activeIsMobile && !activeIsPortrait)) {
        // On short screen or mobile landscape, filmstrip is mini and compact (~60-70px)
        bClass = hasFilter ? 'bottom-24 sm:bottom-22' : 'bottom-20 sm:bottom-18';
      } else if (activeIsMobile && activeIsPortrait) {
        // On mobile portrait, filmstrip is full height (~175px tall + filter row if active)
        bClass = hasFilter ? 'bottom-56' : 'bottom-52';
      } else {
        // Desktop
        if (filmstripSize === 'large') {
          bClass = hasFilter ? 'bottom-[27rem] sm:bottom-[25rem]' : 'bottom-[25rem] sm:bottom-[23rem]';
        } else if (filmstripSize === 'mini') {
          bClass = hasFilter ? 'bottom-80 sm:bottom-72' : 'bottom-72 sm:bottom-64';
        } else {
          bClass = hasFilter ? 'bottom-[23rem] sm:bottom-[21rem]' : 'bottom-[21rem] sm:bottom-[19rem]';
        }
      }
    } else if (isFs && activeIsMobile && activeIsPortrait) {
      // When filmstrip is closed in fullscreen on mobile portrait, leave room for the 40px filmstrip toggle button at bottom-3
      bClass = 'bottom-16';
    }

    return `${topClass} ${bClass}`;
  }, [isFs, isFilmstripVisible, filmstripSize, hasFilter, isShortScreen, activeIsMobile, activeIsPortrait]);

  // Render collapsed simple label with current date
  if (isCollapsed) {
    const formattedCurrentDate = formatPanoramaDate(currentPanorama.date);
    let topPos = isFs ? 'top-3 sm:top-4' : (isShortScreen ? 'top-3' : 'top-16 sm:top-20');
    if (activeIsMobile && activeIsPortrait) {
      topPos = isFs ? 'top-24 sm:top-28' : 'top-28';
    }
    return (
      <div
        className={`absolute left-3 sm:left-5 ${topPos} z-30 pointer-events-auto select-none animate-fade-in`}
        style={topStyle}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900/90 text-amber-300 border border-amber-400/40 hover:border-amber-400 shadow-xl backdrop-blur-xl transition-all cursor-pointer group active:scale-95"
          title={isSk ? 'Rozbaliť časovú os' : 'Expand timeline ruler'}
          aria-label="Expand timeline"
        >
          <Calendar className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="font-mono font-black text-xs sm:text-sm text-amber-300 tracking-wider">
            {formattedCurrentDate}
          </span>
          {sortedItems.length > 1 && (
            <span className="px-1.5 py-0.2 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-bold font-mono">
              {currentIdx !== -1 ? `${currentIdx + 1}/${sortedItems.length}` : ''}
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-amber-400/80 group-hover:text-amber-300 group-hover:translate-y-0.5 transition-all" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`absolute left-3 sm:left-5 ${positionClasses} z-30 flex flex-col items-start pointer-events-auto select-none transition-all duration-300 animate-fade-in`}
      style={topStyle}
    >
      {/* Top Header Row: Up Arrow (PgUp) + Collapse Icon */}
      <div className="flex items-center gap-1 mb-0.5">
        <button
          type="button"
          onClick={handleNavNewer}
          className="flex items-center gap-1.5 py-1 px-2 rounded-full text-white/90 hover:text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] [text-shadow:_0_1px_3px_#000,_0_0_5px_#000] hover:bg-black/40 transition-all cursor-pointer group active:scale-95"
          title={isSk ? 'Novšia panoráma (hore, PgUp)' : 'Newer capture (up, PgUp)'}
          aria-label="Newer capture"
        >
          <ChevronUp className={`${isShortScreen ? 'w-4 h-4' : 'w-5 h-5'} text-amber-400 group-hover:-translate-y-0.5 transition-transform drop-shadow-[0_2px_3px_rgba(0,0,0,1)]`} />
          {!isShortScreen && (
            <span className="hidden sm:inline font-mono font-black text-xs text-amber-200 tracking-wider">
              PgUp
            </span>
          )}
        </button>

        {/* Collapse into simple date label button */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="p-1 rounded-full text-zinc-400 hover:text-amber-300 hover:bg-black/40 transition-all cursor-pointer active:scale-95 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]"
          title={isSk ? 'Zrolovať časovú os do labelu' : 'Collapse timeline ruler into label'}
          aria-label="Collapse timeline"
        >
          <Minimize2 className="w-3.5 h-3.5 text-zinc-300 hover:text-amber-300" />
        </button>
      </div>

      {/* Transparent Vertical Scale Ruler Track (NO solid background box) */}
      <div className="relative flex-1 w-full my-1 overflow-visible">
        {/* Vertical ruler axis line */}
        <div className={`absolute ${isShortScreen ? 'left-2' : 'left-2.5 sm:left-3'} top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-400/80 via-white/40 to-amber-400/80 rounded-full drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]`} />

        {/* Standard Year Indicators */}
        {years.map(({ year, percent }) => (
          <div
            key={`yr-${year}`}
            className="absolute left-0 flex items-center gap-1.5 pointer-events-none select-none -translate-y-1/2 opacity-70"
            style={{ top: `${percent}%` }}
          >
            <div className={`${isShortScreen ? 'w-2 h-0.5' : 'w-2.5 h-0.5'} bg-white/70 drop-shadow-[0_1px_2px_#000]`} />
            <span className={`font-mono ${isShortScreen ? 'text-[9px]' : 'text-xs'} font-black text-white/70 tracking-tight drop-shadow-[0_1px_3px_#000] [text-shadow:_0_1px_2px_#000,_-1px_-1px_0_#000,_1px_1px_0_#000]`}>
              {year}
            </span>
          </div>
        ))}

        {/* Panorama Capture Nodes & Prominent Text Dates - Perfectly Aligned */}
        {placedItems.map(({ pano, labelPct, isCurrent }) => {
          const formattedDate = formatPanoramaDate(pano.date);
          const lineLeftClass = isShortScreen ? 'left-2' : 'left-2.5 sm:left-3';
          return (
            <div
              key={`node-${pano.id}`}
              className={`absolute left-0 -translate-y-1/2 flex items-center group cursor-pointer transition-all ${
                isCurrent ? 'z-30' : 'z-20'
              }`}
              style={{ top: `${labelPct}%` }}
              onClick={() => onSelectPanorama(pano)}
            >
              {/* Marker dot on the vertical line */}
              <div
                className={`absolute ${lineLeftClass} -translate-x-1/2 rounded-full transition-all ${
                  isCurrent
                    ? (isShortScreen
                        ? 'w-3 h-3 bg-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_8px_rgba(251,191,36,1)] z-30'
                        : 'w-4 h-4 bg-amber-400 ring-4 ring-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,1)] z-30')
                    : (isShortScreen
                        ? 'w-2 h-2 bg-white/90 group-hover:bg-amber-300 group-hover:scale-125 z-10'
                        : 'w-2.5 h-2.5 bg-white/90 group-hover:bg-amber-300 group-hover:scale-150 drop-shadow-[0_1px_3px_rgba(0,0,0,1)] z-10')
                }`}
                title={formattedDate}
              />

              {/* Large, Prominent Date Label: Bold text with outline, scaled for landscape/portrait */}
              <div className={isShortScreen ? 'pl-4 sm:pl-5' : 'pl-6 sm:pl-7'}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPanorama(pano);
                  }}
                  className={`text-left whitespace-nowrap transition-all cursor-pointer font-mono font-black ${
                    isCurrent
                      ? (isShortScreen
                          ? 'text-amber-300 text-xs sm:text-sm scale-105 drop-shadow-[0_0_8px_rgba(251,191,36,0.95)] [text-shadow:_0_1px_2px_#000,_0_0_5px_#f59e0b,_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000]'
                          : 'text-amber-300 text-base sm:text-lg md:text-xl scale-105 drop-shadow-[0_0_12px_rgba(251,191,36,0.95)] [text-shadow:_0_1px_3px_#000,_0_0_8px_#f59e0b,_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000]')
                      : (isShortScreen
                          ? 'text-white group-hover:text-amber-200 text-[10px] sm:text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,1)] [text-shadow:_0_1px_2px_#000,_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000]'
                          : 'text-white group-hover:text-amber-200 text-xs sm:text-sm md:text-base group-hover:scale-105 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] [text-shadow:_0_1px_3px_#000,_0_0_5px_#000,_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000]')
                  }`}
                  title={`${formattedDate} - ${isCurrent ? (isSk ? 'Aktuálna snímka' : 'Active capture') : (isSk ? 'Kliknite pre zobrazenie' : 'Click to view')}`}
                >
                  {formattedDate}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Button: Down Arrow + PgDown (navigates towards older capture below) */}
      <button
        type="button"
        onClick={handleNavOlder}
        className="flex items-center gap-1.5 py-1 px-2 rounded-full text-white/90 hover:text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] [text-shadow:_0_1px_3px_#000,_0_0_5px_#000] hover:bg-black/40 transition-all cursor-pointer group active:scale-95"
        title={isSk ? 'Staršia panoráma (dole, PgDown)' : 'Older capture (down, PgDown)'}
        aria-label="Older capture"
      >
        <ChevronDown className={`${isShortScreen ? 'w-4 h-4' : 'w-5 h-5'} text-amber-400 group-hover:translate-y-0.5 transition-transform drop-shadow-[0_2px_3px_rgba(0,0,0,1)]`} />
        {!isShortScreen && (
          <span className="hidden sm:inline font-mono font-black text-xs text-amber-200 tracking-wider">
            PgDown
          </span>
        )}
      </button>
    </div>
  );
};
