import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Panorama } from '../types';
import { Globe, MapPin, Image, Calendar, Eye, HardDrive } from 'lucide-react';
import { formatFileSize, parseFileSizeToBytes } from '../utils/geo';
import { useAdmin } from '../context/AdminContext';
import { analytics } from '../utils/analytics';
import { TunnelTrafficChart } from './TunnelTrafficChart';
import { PanoRankingList } from './PanoRankingList';

interface StatsProps {
  panoramas: Panorama[];
  onRefresh?: () => void;
}

export const Stats: React.FC<StatsProps> = ({ panoramas, onRefresh }) => {
  const { t } = useTranslation();
  const { isAdmin } = useAdmin();

  useEffect(() => {
    analytics.trackPageView('/stats', 'Stats - 360 Panoramas');
    onRefresh?.();
  }, [onRefresh]);

  // Live views state merged from localStorage and broadcast events
  const [liveViewsMap, setLiveViewsMap] = React.useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('pano_views_cache');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  React.useEffect(() => {
    const handleViewRecorded = (e: CustomEvent<{ id: string; views: number }>) => {
      const { id, views } = e.detail || {};
      if (id && typeof views === 'number') {
        setLiveViewsMap((prev) => ({ ...prev, [id]: views }));
      }
    };
    window.addEventListener('pano_view_recorded', handleViewRecorded as EventListener);
    return () => window.removeEventListener('pano_view_recorded', handleViewRecorded as EventListener);
  }, []);

  const activePanoramas = React.useMemo(() => {
    return panoramas
      .filter((p) => !p.is_deleted && p.folder !== '!DELETED!' && (isAdmin || p.is_private === false))
      .map((p) => {
        const live = liveViewsMap[p.id];
        if (live && live > (p.views || 0)) {
          return { ...p, views: live };
        }
        return p;
      });
  }, [panoramas, isAdmin, liveViewsMap]);

  const gpsCount = activePanoramas.filter((p) => p.lat !== null && p.lon !== null).length;
  const countries = new Set(
    activePanoramas.map((p) => p.country).filter((c) => c && c !== 'Unknown')
  ).size;
  const cities = new Set(
    activePanoramas.map((p) => p.city).filter((c) => c && c !== 'Unknown')
  ).size;
  const totalSizeBytes = activePanoramas.reduce((acc, p) => acc + parseFileSizeToBytes(p.size), 0);
  const totalViews = activePanoramas.reduce((acc, p) => acc + (p.views || 0), 0);

  // Years distribution
  const years = activePanoramas.reduce((acc, p) => {
    if (p.date) {
      try {
        const y = new Date(p.date).getFullYear().toString();
        if (y && !isNaN(Number(y))) {
          acc[y] = (acc[y] || 0) + 1;
        }
      } catch {
        // ignore
      }
    }
    return acc;
  }, {} as Record<string, number>);

  const sortedYears = Object.entries(years).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 lg:p-12 max-w-6xl mx-auto custom-scrollbar">
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">{t('stats')}</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Overview of collection size, viewer engagement, and streaming tunnel bandwidth
          </p>
        </div>

        {/* Top Highlight Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">{t('stats_total')}</span>
              <Image className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{activePanoramas.length.toLocaleString()}</p>
            <p className="text-[10px] text-cyan-400 font-medium">{gpsCount.toLocaleString()} with GPS</p>
          </div>

          <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">{t('views')}</span>
              <Eye className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono">{totalViews.toLocaleString()}</p>
            <p className="text-[10px] text-amber-400 font-medium">Recorded interactions</p>
          </div>

          <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">{t('stats_countries')}</span>
              <Globe className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{countries}</p>
            <p className="text-[10px] text-emerald-400 font-medium">Unique countries</p>
          </div>

          <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">{t('stats_cities')}</span>
              <MapPin className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{cities}</p>
            <p className="text-[10px] text-indigo-400 font-medium">Distinct locations</p>
          </div>

          <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-1.5 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Size</span>
              <HardDrive className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{formatFileSize(totalSizeBytes)}</p>
            <p className="text-[10px] text-purple-400 font-medium">High-resolution assets</p>
          </div>
        </div>

        {/* 1. Tunnel Traffic Estimation Graph */}
        <TunnelTrafficChart panoramas={activePanoramas} />

        {/* 2. Clickable Panoramas Ranking & Activity List */}
        <PanoRankingList panoramas={activePanoramas} />

        {/* 3. Yearly Breakdown */}
        <div className="glass-panel-elevated p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-wide">Panoramas by Year</h2>
          </div>
          <div className="space-y-3">
            {sortedYears.map(([year, count]) => {
              const pct = Math.round((count / (activePanoramas.length || 1)) * 100);
              return (
                <div key={year} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-200 font-medium">{year}</span>
                    <span className="text-cyan-400 font-semibold">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
