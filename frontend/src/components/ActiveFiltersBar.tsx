import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  X,
  RotateCcw,
  Sparkles,
  Calendar,
  Heart,
  Search,
  Tag,
  Trash2,
  History,
} from 'lucide-react';
import { SCENE_MOODS } from '../utils/sceneIntel';

export interface ActiveFiltersBarProps {
  filteredCount: number;
  totalCount?: number;
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
  isDeletedMode?: boolean;
  hideCount?: boolean;
  className?: string;
}

export const ActiveFiltersBar: React.FC<ActiveFiltersBarProps> = ({
  filteredCount,
  totalCount,
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
  isDeletedMode = false,
  hideCount = false,
  className = '',
}) => {
  const { t, i18n } = useTranslation();

  const chipBase =
    'inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full font-bold text-[10px] transition-all shadow-xs';
  const closeBtn =
    'p-0.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer flex items-center justify-center';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 md:gap-2 ${className}`}>
      {/* Count pill */}
      {!hideCount && (
        <div className="flex items-center gap-1.5 text-cyan-400 shrink-0 font-bold text-xs pr-1">
          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>{filteredCount.toLocaleString()}</span>
          {totalCount !== undefined && totalCount !== filteredCount && (
            <span className="text-[10px] text-zinc-400 font-normal">
              / {totalCount.toLocaleString()}
            </span>
          )}
        </div>
      )}

      {isDeletedMode ? (
        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 flex items-center gap-1 text-[10px]">
          <Trash2 className="w-3 h-3 text-rose-400" />
          {t('deleted_panos')}
        </span>
      ) : (
        <>
          {/* Label when no filters are active */}
          {!hasAnyFilterActive && (
            <span className="text-zinc-400 text-xs hidden sm:inline">
              {t('gps_panos', 'GPS panorámy')}
            </span>
          )}

          {/* Active filter chips */}
          {hasAnyFilterActive && (
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Favorites chip */}
              {onlyFavorites && (
                <span
                  className={`${chipBase} bg-rose-500/25 text-rose-200 border border-rose-500/50 shadow-rose-950/40`}
                >
                  <Heart className="w-2.5 h-2.5 fill-rose-400 text-rose-400" />
                  <span>{t('favorites_only', 'Obľúbené')}</span>
                  {onToggleOnlyFavorites && (
                    <button
                      type="button"
                      onClick={onToggleOnlyFavorites}
                      className={closeBtn}
                      title={t('reset_this_filter', 'Zrušiť tento filter')}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              )}

              {/* Timeline Clusters chip */}
              {onlyTimelineClusters && (
                <span
                  className={`${chipBase} bg-amber-500/25 text-amber-200 border border-amber-500/50 shadow-amber-950/40`}
                >
                  <History className="w-2.5 h-2.5 text-amber-400" />
                  <span>{t('timeline_clusters', 'Časové osi')}</span>
                  {onToggleOnlyTimelineClusters && (
                    <button
                      type="button"
                      onClick={onToggleOnlyTimelineClusters}
                      className={closeBtn}
                      title={t('reset_this_filter', 'Zrušiť tento filter')}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              )}

              {/* Year chips */}
              {selectedYears.map((yr) => (
                <span
                  key={`yr-${yr}`}
                  className={`${chipBase} bg-cyan-500/20 text-cyan-200 border border-cyan-500/40`}
                >
                  <Calendar className="w-2.5 h-2.5 text-cyan-400" />
                  <span>{yr}</span>
                  {onToggleYear && (
                    <button
                      type="button"
                      onClick={() => onToggleYear(yr)}
                      className={closeBtn}
                      title={t('reset_this_filter', 'Zrušiť tento filter')}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              ))}

              {/* Month chips */}
              {selectedMonths.map((m) => {
                const monthNum = parseInt(m, 10);
                const label = t(`month_${monthNum}`, m);
                return (
                  <span
                    key={`m-${m}`}
                    className={`${chipBase} bg-cyan-500/20 text-cyan-200 border border-cyan-500/40`}
                  >
                    <span>{label}</span>
                    {onToggleMonth && (
                      <button
                        type="button"
                        onClick={() => onToggleMonth(m)}
                        className={closeBtn}
                        title={t('reset_this_filter', 'Zrušiť tento filter')}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </span>
                );
              })}

              {/* Resolution chips */}
              {selectedResolutions.map((res) => {
                const is15K = res === '15K';
                return (
                  <span
                    key={`res-${res}`}
                    className={`${chipBase} ${
                      is15K
                        ? 'bg-amber-400/25 text-amber-200 border border-amber-400/50 ring-1 ring-amber-400/30 font-black'
                        : 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                    }`}
                  >
                    {is15K && <Sparkles className="w-2.5 h-2.5 text-amber-400" />}
                    <span>{res}</span>
                    {onToggleResolution && (
                      <button
                        type="button"
                        onClick={() => onToggleResolution(res)}
                        className={closeBtn}
                        title={t('reset_this_filter', 'Zrušiť tento filter')}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </span>
                );
              })}

              {/* Tag chips */}
              {selectedTags.map((tg) => {
                const label = tg.startsWith('#') ? tg : `#${tg}`;
                return (
                  <span
                    key={`tag-${tg}`}
                    className={`${chipBase} bg-cyan-500/25 text-cyan-200 border border-cyan-400/60 font-mono`}
                  >
                    <Tag className="w-2.5 h-2.5 text-cyan-400" />
                    <span className="max-w-[10rem] truncate">{label}</span>
                    {onToggleTag && (
                      <button
                        type="button"
                        onClick={() => onToggleTag(tg)}
                        className={closeBtn}
                        title={t('reset_this_filter', 'Zrušiť tento filter')}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </span>
                );
              })}

              {/* Mood chips */}
              {selectedMoods.map((moodId) => {
                const moodDef = SCENE_MOODS.find((m) => m.id === moodId);
                const isSk = (i18n?.language || 'sk').startsWith('sk');
                const label = moodDef ? (isSk ? moodDef.labelSk : moodDef.labelEn) : moodId;
                const icon = moodDef?.icon || '✨';
                return (
                  <span
                    key={`mood-${moodId}`}
                    className={`${chipBase} bg-amber-500/25 text-amber-200 border border-amber-400/60`}
                  >
                    <span>{icon}</span>
                    <span className="max-w-[10rem] truncate">{label}</span>
                    {onToggleMood && (
                      <button
                        type="button"
                        onClick={() => onToggleMood(moodId)}
                        className={closeBtn}
                        title={t('reset_this_filter', 'Zrušiť tento filter')}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </span>
                );
              })}

              {/* Search query chip */}
              {searchQuery.trim() && (
                <span
                  className={`${chipBase} bg-purple-500/20 text-purple-200 border border-purple-500/40`}
                >
                  <Search className="w-2.5 h-2.5 text-purple-400" />
                  <span className="max-w-[8rem] truncate">“{searchQuery.trim()}”</span>
                  {onClearSearch && (
                    <button
                      type="button"
                      onClick={onClearSearch}
                      className={closeBtn}
                      title={t('reset_this_filter', 'Zrušiť hľadanie')}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              )}

              {/* Reset all active filters button */}
              {onResetAllFilters && (
                <button
                  type="button"
                  onClick={onResetAllFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-400 shadow-xs transition-all cursor-pointer shrink-0 ml-1 active:scale-95"
                  title={t('reset_filters', 'Resetovať všetky filtre')}
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>{t('reset_filters', 'Reset')}</span>
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
