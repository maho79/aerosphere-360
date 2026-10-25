import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Panorama } from '../types';
import { getResolutionCategory, getHorizontalK } from '../types';
import { formatFileSize, parseFileSizeToBytes, formatPanoramaDate } from '../utils/geo';
import { getLastViewedMap, getWeeklyViewsMap } from '../utils/traffic';
import {
  Eye,
  Calendar,
  Sparkles,
  Maximize2,
  HardDrive,
  Search,
  ArrowUpDown,
  ExternalLink,
  Flame,
  Clock,
  Layers,
  Heart,
  MessageSquare,
  Share2,
} from 'lucide-react';
import {
  getPanoramaShareCount,
  getPanoramaFavoriteCount,
  getPanoramaCommentsCount,
} from '../utils/social';

interface PanoRankingListProps {
  panoramas: Panorama[];
}

type SortKey =
  | 'total_views'
  | 'most_shared'
  | 'most_favorites'
  | 'last_viewed'
  | 'week_views'
  | 'newest_date'
  | 'resolution';

export const PanoRankingList: React.FC<PanoRankingListProps> = ({ panoramas }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isSk = i18n.language.startsWith('sk');

  const [sortKey, setSortKey] = useState<SortKey>('total_views');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(20);

  // Retrieve tracked last viewed timestamps and weekly view counts
  const lastViewedMap = useMemo(() => getLastViewedMap(), []);
  const weeklyViewsMap = useMemo(() => getWeeklyViewsMap(), []);

  // Format relative time helper
  const formatLastViewed = (ts: number | undefined): string => {
    if (!ts) return t('never_viewed');
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return isSk ? 'Práve teraz' : 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return isSk ? `pred ${diffMin} min.` : `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return isSk ? `pred ${diffHours} hod.` : `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return isSk ? 'Včera' : 'Yesterday';
    if (diffDays < 7) return isSk ? `pred ${diffDays} dňami` : `${diffDays}d ago`;
    const d = new Date(ts);
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  };

  // Filter and sort panoramas
  const sortedPanoramas = useMemo(() => {
    // 1. Text filter
    let list = panoramas;
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter((p) => {
        const cityMatch = p.city?.toLowerCase().includes(q);
        const countryMatch = p.country?.toLowerCase().includes(q);
        const fileMatch = p.filename?.toLowerCase().includes(q) || p.original_filename?.toLowerCase().includes(q);
        return cityMatch || countryMatch || fileMatch;
      });
    }

    // 2. Sorting
    return [...list].sort((a, b) => {
      if (sortKey === 'total_views') {
        const vA = a.views || 0;
        const vB = b.views || 0;
        if (vB !== vA) return vB - vA;
        return (b.date || '').localeCompare(a.date || '');
      }

      if (sortKey === 'most_shared') {
        const sA = a.shares || getPanoramaShareCount(a.id);
        const sB = b.shares || getPanoramaShareCount(b.id);
        if (sB !== sA) return sB - sA;
        return (b.views || 0) - (a.views || 0);
      }

      if (sortKey === 'most_favorites') {
        const fA = a.favorites || getPanoramaFavoriteCount(a.id);
        const fB = b.favorites || getPanoramaFavoriteCount(b.id);
        if (fB !== fA) return fB - fA;
        return (b.views || 0) - (a.views || 0);
      }

      if (sortKey === 'last_viewed') {
        const tsA = lastViewedMap[a.id] || 0;
        const tsB = lastViewedMap[b.id] || 0;
        if (tsB !== tsA) return tsB - tsA;
        // Fallback to views if no timestamp
        const vA = a.views || 0;
        const vB = b.views || 0;
        if (vB !== vA) return vB - vA;
        return (b.date || '').localeCompare(a.date || '');
      }

      if (sortKey === 'week_views') {
        const wA = weeklyViewsMap[a.id] || 0;
        const wB = weeklyViewsMap[b.id] || 0;
        if (wB !== wA) return wB - wA;
        const vA = a.views || 0;
        const vB = b.views || 0;
        if (vB !== vA) return vB - vA;
        return (b.date || '').localeCompare(a.date || '');
      }

      if (sortKey === 'newest_date') {
        return (b.date || '').localeCompare(a.date || '');
      }

      if (sortKey === 'resolution') {
        const wA = a.width || 0;
        const wB = b.width || 0;
        if (wB !== wA) return wB - wA;
        return (b.views || 0) - (a.views || 0);
      }

      return 0;
    });
  }, [panoramas, sortKey, searchQuery, lastViewedMap, weeklyViewsMap]);

  const displayedList = sortedPanoramas.slice(0, visibleCount);

  const handleOpenPanorama = (pano: Panorama) => {
    navigate(`/?pano=${encodeURIComponent(pano.id)}`);
  };

  const getEstimatedStreamedBytes = (p: Panorama): string => {
    const views = p.views || 0;
    if (views === 0) return '0 MB';
    const singleBytes = p.size ? parseFileSizeToBytes(p.size) : 8_500_000;
    const totalBytes = views * singleBytes;
    return formatFileSize(totalBytes);
  };

  return (
    <div className="glass-panel-elevated p-6 rounded-3xl border border-white/10 space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400">
            <Eye className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">{t('pano_list_title')}</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">{t('pano_list_desc')}</p>
        </div>

        {/* Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{t('sort_by')}:</span>
          </div>

          <div className="flex flex-wrap items-center bg-black/40 p-1 rounded-xl border border-white/10 gap-1">
            <button
              onClick={() => { setSortKey('total_views'); setVisibleCount(20); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortKey === 'total_views'
                  ? 'bg-cyan-500 text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t('sort_total_views')}
            </button>

            <button
              onClick={() => { setSortKey('most_shared'); setVisibleCount(20); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                sortKey === 'most_shared'
                  ? 'bg-violet-400 text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Share2 className="w-3 h-3 text-violet-400" />
              <span>{t('sort_most_shared')}</span>
            </button>

            <button
              onClick={() => { setSortKey('most_favorites'); setVisibleCount(20); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                sortKey === 'most_favorites'
                  ? 'bg-rose-400 text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
              <span>{t('sort_most_favorites')}</span>
            </button>

            <button
              onClick={() => { setSortKey('last_viewed'); setVisibleCount(20); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortKey === 'last_viewed'
                  ? 'bg-cyan-500 text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t('sort_last_viewed')}
            </button>

            <button
              onClick={() => { setSortKey('week_views'); setVisibleCount(20); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                sortKey === 'week_views'
                  ? 'bg-amber-400 text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>{t('sort_week_views')}</span>
            </button>

            <button
              onClick={() => { setSortKey('newest_date'); setVisibleCount(20); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortKey === 'newest_date'
                  ? 'bg-cyan-500 text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t('sort_newest')}
            </button>

            <button
              onClick={() => { setSortKey('resolution'); setVisibleCount(20); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortKey === 'resolution'
                  ? 'bg-cyan-500 text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t('sort_resolution')}
            </button>
          </div>
        </div>
      </div>

      {/* Search Input Filter */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setVisibleCount(20);
          }}
          placeholder={t('search_stats_pano')}
          className="w-full bg-zinc-950/70 border border-white/10 focus:border-cyan-500/50 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs px-1 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Clickable Panoramas List */}
      <div className="space-y-2">
        {displayedList.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs">
            {t('no_panos_match')}
          </div>
        ) : (
          displayedList.map((pano, index) => {
            const cleanFilename = encodeURIComponent(pano.filename);
            const thumbPath = `/thumbnails/${cleanFilename}`;
            const resCat = getResolutionCategory(pano.width);
            const views = pano.views || 0;
            const lastViewedTs = lastViewedMap[pano.id];
            const weeklyViews = weeklyViewsMap[pano.id] || 0;
            const shares = pano.shares || getPanoramaShareCount(pano.id);
            const favorites = pano.favorites || getPanoramaFavoriteCount(pano.id);
            const comments = pano.comments_count || getPanoramaCommentsCount(pano.id);

            return (
              <div
                key={pano.id}
                onClick={() => handleOpenPanorama(pano)}
                className="group p-3 rounded-2xl bg-zinc-950/50 hover:bg-zinc-900/80 border border-white/5 hover:border-cyan-500/40 transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
              >
                {/* Left: Rank, Thumbnail & Info */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Rank indicator */}
                  <div className="w-6 text-center text-xs font-mono font-bold text-zinc-500 group-hover:text-cyan-400 shrink-0">
                    #{index + 1}
                  </div>

                  {/* Thumbnail */}
                  <div className="relative w-20 sm:w-24 aspect-[16/10] rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shrink-0 group-hover:border-cyan-400/60 transition-colors">
                    <img
                      src={thumbPath}
                      alt={pano.filename}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('/panoramas/')) {
                          target.src = `/panoramas/${cleanFilename}`;
                        }
                      }}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {resCat === '15K' ? (
                      <div className="absolute top-1 right-1 px-1 py-0.2 rounded bg-amber-400/90 text-zinc-950 font-black text-[8px] flex items-center gap-0.5 shadow-sm">
                        <Sparkles className="w-2 h-2 text-zinc-950" />
                        <span>15K</span>
                      </div>
                    ) : (
                      <div className="absolute top-1 right-1 px-1 py-0.2 rounded bg-black/75 text-zinc-200 border border-white/20 text-[8px] font-bold">
                        {resCat}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 space-y-0.5">
                    <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                      {pano.city && pano.city !== 'Unknown' ? pano.city : (pano.original_filename || pano.filename)}
                      {pano.country && pano.country !== 'Unknown' && (
                        <span className="text-zinc-400 font-normal ml-1">({pano.country})</span>
                      )}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        <span>{formatPanoramaDate(pano.date)}</span>
                      </span>

                      <span className="text-zinc-600">•</span>

                      <span className="flex items-center gap-1 font-mono text-zinc-300">
                        <Maximize2 className="w-3 h-3 text-zinc-500" />
                        <span>{getHorizontalK(pano.width)}</span>
                      </span>

                      <span className="text-zinc-600">•</span>

                      <span className="flex items-center gap-1 text-zinc-400">
                        <HardDrive className="w-3 h-3 text-zinc-500" />
                        <span>{formatFileSize(pano.size)}</span>
                      </span>
                    </div>

                    {/* Last Viewed info line */}
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span>{t('last_viewed_label')}: <strong className="text-zinc-300 font-normal">{formatLastViewed(lastViewedTs)}</strong></span>
                      </span>
                      {weeklyViews > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                          <span>+{weeklyViews} {t('sort_week_views').toLowerCase()}</span>
                        </span>
                      )}
                      {shares > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30 flex items-center gap-0.5" title={t('shares')}>
                          <Share2 className="w-2.5 h-2.5 text-violet-400" />
                          <span>{shares}×</span>
                        </span>
                      )}
                      {favorites > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 flex items-center gap-0.5" title={t('favorites')}>
                          <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                          <span>{favorites}</span>
                        </span>
                      )}
                      {comments > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-0.5" title={t('comments')}>
                          <MessageSquare className="w-2.5 h-2.5 text-amber-400" />
                          <span>{comments}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Metrics & Open Action */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="text-right space-y-0.5">
                    {/* Views Count Badge */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-black font-mono">
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{views.toLocaleString()}</span>
                      <span className="text-[10px] text-cyan-400 font-semibold">{t('views').toLowerCase()}</span>
                    </div>

                    <p className="text-[10px] text-zinc-500">
                      {t('streamed_estimate')}: <span className="font-mono text-zinc-400">{getEstimatedStreamedBytes(pano)}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPanorama(pano);
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500 hover:text-zinc-950 text-cyan-400 transition-all border border-white/10 hover:border-cyan-400 shadow-sm"
                    title={t('view_in_360')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load More Button */}
      {sortedPanoramas.length > visibleCount && (
        <button
          onClick={() => setVisibleCount((prev) => prev + 25)}
          className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold text-cyan-300 border border-white/10 transition-colors cursor-pointer"
        >
          {t('load_more')} ({sortedPanoramas.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
};
