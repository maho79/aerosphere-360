import React, { useState, useEffect } from 'react';
import type { Panorama } from '../types';
import { getResolutionCategory, getHorizontalK, getMegapixels } from '../types';
import { formatFileSize, formatPanoramaDate } from '../utils/geo';
import { Calendar, HardDrive, Maximize2, MapPin, Eye, Sparkles, Trash2, RotateCcw, Lock, Globe2, Heart, MessageSquare, Share2, Check, History } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useTranslation } from 'react-i18next';
import { isPanoramaFavorite, getPanoramaFavoriteCount, getPanoramaShareCount, getPanoramaCommentsCount } from '../utils/social';
import { extractPanoramaTags } from '../utils/tags';

interface PinHoverCardProps {
  panorama: Panorama;
  onExplore?: () => void;
}

export const PinHoverCard: React.FC<PinHoverCardProps> = ({ panorama, onExplore }) => {
  const { isAdmin, togglePanoramaPublic, deletePanorama, restorePanorama } = useAdmin();
  const { t } = useTranslation();
  const [imgSrc, setImgSrc] = useState<string>(
    `/thumbnails/${encodeURIComponent(panorama.filename)}`
  );

  const [isPrivate, setIsPrivate] = useState<boolean>(Boolean(panorama.is_private));
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [justChanged, setJustChanged] = useState<boolean>(false);

  useEffect(() => {
    setIsPrivate(Boolean(panorama.is_private));
  }, [panorama.is_private]);

  const isFav = isPanoramaFavorite(panorama.id);
  const shares = panorama.shares || getPanoramaShareCount(panorama.id);
  const comments = panorama.comments_count || getPanoramaCommentsCount(panorama.id);

  useEffect(() => {
    setImgSrc(`/thumbnails/${encodeURIComponent(panorama.filename)}`);
  }, [panorama.filename]);

  const handleImageError = () => {
    const webPath = `/panoramas_web/${encodeURIComponent(panorama.filename)}`;
    const fullPath = `/panoramas/${encodeURIComponent(panorama.filename)}`;
    if (imgSrc.includes('/thumbnails/')) {
      setImgSrc(webPath);
    } else if (imgSrc.includes('/panoramas_web/')) {
      setImgSrc(fullPath);
    }
  };

  const handleTogglePublic = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isUpdating) return;
    setIsUpdating(true);
    const targetIsPrivate = !isPrivate;
    setIsPrivate(targetIsPrivate);
    try {
      await togglePanoramaPublic(panorama.id, isPrivate);
      setJustChanged(true);
      setTimeout(() => setJustChanged(false), 2500);
    } catch (err) {
      console.error('Failed to toggle public state:', err);
      setIsPrivate(!targetIsPrivate);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      onClick={onExplore}
      className="w-72 bg-zinc-950/95 backdrop-blur-2xl rounded-2xl border border-white/15 overflow-hidden shadow-2xl shadow-black/80 hover:border-cyan-500/50 transition-all duration-300 text-slate-100 cursor-pointer group"
    >
      {/* Image Preview Container */}
      <div className="relative w-full h-36 bg-zinc-900 overflow-hidden">
        <img
          src={imgSrc}
          alt={panorama.city || 'Panorama preview'}
          onError={handleImageError}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none" />

        {/* Favorite indicator badge on top-left */}
        {isFav && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-rose-950/80 backdrop-blur-md border border-rose-500/50 text-[10px] font-bold text-rose-300 flex items-center gap-1 shadow-lg shadow-rose-950/60 z-10">
            <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
            <span>{t('favorites')}</span>
          </div>
        )}

        {/* Admin Quick Action Button DIRECTLY ON THUMBNAIL */}
        {isAdmin && (
          <button
            type="button"
            onClick={handleTogglePublic}
            disabled={isUpdating}
            className={`absolute top-2.5 ${isFav ? 'left-24' : 'left-2.5'} z-20 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-xl backdrop-blur-md border transition-all cursor-pointer ${
              isPrivate
                ? 'bg-emerald-600/95 hover:bg-emerald-500 text-white border-emerald-300 shadow-emerald-950/80 hover:scale-105 active:scale-95'
                : 'bg-zinc-900/85 hover:bg-zinc-800 text-cyan-300 border-cyan-500/40 hover:scale-105 active:scale-95'
            }`}
            title={isPrivate ? t('add_to_public', 'Pridať do public') : t('make_private', 'Presunúť do súkromných')}
          >
            {isUpdating ? (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isPrivate ? (
              <>
                <Globe2 className="w-3 h-3 text-emerald-100" />
                <span>{justChanged ? t('added_to_public', 'Pridané do public!') : t('add_to_public', 'Pridať do public')}</span>
              </>
            ) : (
              <>
                {justChanged ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Globe2 className="w-3 h-3 text-cyan-400" />
                )}
                <span>{justChanged ? t('added_to_public', 'Pridané!') : t('public', 'Public')}</span>
              </>
            )}
          </button>
        )}

        {/* 360 or Timeline Cluster Badge */}
        {(panorama as any).cluster_count ? (
          <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-black text-[10px] flex items-center gap-1 z-10 border border-amber-300 shadow-md font-mono" title={`Časová os: ${(panorama as any).cluster_count} záberov`}>
            <History className="w-3 h-3 stroke-[3]" />
            <span>#{(panorama as any).cluster_count}</span>
          </div>
        ) : (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-bold text-cyan-400 flex items-center gap-1 z-10">
            <Eye className="w-3 h-3 text-cyan-400" />
            360°
          </div>
        )}

        {/* Location pill on image - Top over the sky */}
        <div className="absolute top-9 left-2.5 right-2.5 flex items-center gap-1.5 text-white drop-shadow-md z-10">
          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-bold text-xs truncate">
            {panorama.city !== 'Unknown' ? panorama.city : 'Panoramic View'}
          </span>
          {panorama.country && panorama.country !== 'Unknown' && (
            <span className="text-[11px] text-zinc-300 truncate">({panorama.country})</span>
          )}
        </div>
      </div>

      {/* Details Section */}
      <div className="p-3.5 space-y-2 text-xs">
        {/* Date Taken */}
        <div className="flex items-center justify-between text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            {t('capture_date')}
          </span>
          <span className="text-zinc-200 font-medium">
            {formatPanoramaDate(panorama.date)}
          </span>
        </div>

        {/* Resolution & Megapixels */}
        <div className="flex items-center justify-between text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-zinc-500" />
            {t('resolution')}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-200 font-medium">
              {panorama.width} × {panorama.height}
            </span>
            <span
              className="px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-extrabold text-[10px] border border-amber-400/30 font-mono"
              title="Total Megapixels"
            >
              {getMegapixels(panorama.width, panorama.height)}
            </span>
            {getResolutionCategory(panorama.width) === '15K' ? (
              <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-400 to-yellow-400 text-zinc-950 font-black text-[10px] flex items-center gap-0.5 shadow-sm border border-amber-300">
                <Sparkles className="w-2.5 h-2.5 text-zinc-950 fill-zinc-950" />
                {getHorizontalK(panorama.width)}
              </span>
            ) : (
              <span
                className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-bold text-[10px] border border-cyan-500/30 font-mono"
                title="Horizontal Resolution"
              >
                {getHorizontalK(panorama.width)}
              </span>
            )}
          </div>
        </div>

        {/* File Size & Views */}
        <div className="flex items-center justify-between text-zinc-400">
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
            {t('filesize')}
          </span>
          <div className="flex items-center gap-2">
            {(panorama.views || 0) > 0 && (
              <span className="text-amber-300 font-mono font-bold flex items-center gap-0.5 text-[11px]" title={t('views')}>
                <Eye className="w-3 h-3" />
                <span>{panorama.views}</span>
              </span>
            )}
            <span className="text-cyan-400 font-semibold">
              {formatFileSize(panorama.size)}
            </span>
          </div>
        </div>

        {/* Community Engagement Stats (Shares, Comments) */}
        {(shares > 0 || comments > 0) && (
          <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-zinc-400 border-t border-white/5">
            {shares > 0 && (
              <span className="flex items-center gap-1 text-violet-300 font-bold" title={t('shares')}>
                <Share2 className="w-3 h-3 text-violet-400" />
                <span>{shares}×</span>
              </span>
            )}
            {comments > 0 && (
              <span className="flex items-center gap-1 text-amber-300 font-bold" title={t('comments')}>
                <MessageSquare className="w-3 h-3 text-amber-400" />
                <span>{comments}</span>
              </span>
            )}
          </div>
        )}

        {/* Tags */}
        {(() => {
          const tags = extractPanoramaTags(panorama);
          if (tags.length === 0) return null;
          return (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-white/5">
              {tags.map((tg) => (
                <span
                  key={tg}
                  className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono text-[9px] font-medium"
                >
                  {tg}
                </span>
              ))}
            </div>
          );
        })()}

        {/* Admin Quick Actions */}
        {isAdmin && (
          <div
            className="pt-2 border-t border-white/10 flex items-center justify-between gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleTogglePublic}
              disabled={isUpdating}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                isPrivate
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
              }`}
              title={isPrivate ? t('add_to_public', 'Pridať do public') : t('make_private', 'Presunúť do súkromných')}
            >
              {isUpdating ? (
                <span className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isPrivate ? (
                <>
                  <Globe2 className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{justChanged ? t('added_to_public', 'Pridané!') : t('add_to_public', 'Pridať do public')}</span>
                </>
              ) : (
                <>
                  <Globe2 className="w-2.5 h-2.5 text-cyan-400" />
                  <span>{t('public', 'Verejná')} (Public)</span>
                </>
              )}
            </button>

            {panorama.is_deleted || panorama.folder === '!DELETED!' ? (
              <button
                type="button"
                onClick={() => restorePanorama(panorama.id, 'Restored')}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all cursor-pointer ml-auto"
                title={t('restore_selected')}
              >
                <RotateCcw className="w-2.5 h-2.5 text-emerald-400" />
                <span>{t('restore_selected')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Move this panorama to "!DELETED!" folder?')) {
                    deletePanorama(panorama.id);
                  }
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/40 transition-all cursor-pointer ml-auto"
                title={t('delete')}
              >
                <Trash2 className="w-2.5 h-2.5 text-rose-400" />
                <span>{t('delete')}</span>
              </button>
            )}
          </div>
        )}

        {/* Action Prompt */}
        <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between text-cyan-400 group-hover:text-cyan-300 font-semibold tracking-wide transition-colors">
          <span>{t('view_map', '360°')}</span>
          <span className="transform group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </div>
    </div>
  );
};
