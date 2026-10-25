import React, { useState, useEffect, useMemo } from 'react';
import { X, Tag, Plus, Check, Loader2, Hash, Sparkles } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { slugifyTag, getPopularTags, isAllowedTag } from '../utils/tags';
import type { Panorama } from '../types';

interface AdminTagEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  panoramas: Panorama[];
  allPanoramas?: Panorama[];
  onSaved?: (updatedTags: string[]) => void;
}

export const AdminTagEditorModal: React.FC<AdminTagEditorModalProps> = ({
  isOpen,
  onClose,
  panoramas,
  allPanoramas = [],
  onSaved,
}) => {
  const { batchUpdatePanoramas } = useAdmin();
  const [tagInput, setTagInput] = useState('');
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Initialize tags from given panoramas
  useEffect(() => {
    if (!isOpen || panoramas.length === 0) {
      setCurrentTags([]);
      return;
    }

    const tagSet = new Set<string>();
    panoramas.forEach((p) => {
      if (p.custom_tags) {
        let list: string[] = [];
        if (Array.isArray(p.custom_tags)) {
          list = p.custom_tags;
        } else if (typeof p.custom_tags === 'string') {
          try {
            const parsed = JSON.parse(p.custom_tags);
            if (Array.isArray(parsed)) list = parsed;
            else list = p.custom_tags.split(/[\s,]+/);
          } catch {
            list = p.custom_tags.split(/[\s,]+/);
          }
        }
        list.forEach((t) => {
          const slug = slugifyTag(t.replace(/^#+/, ''));
          if (slug && isAllowedTag(slug)) tagSet.add(`#${slug}`);
        });
      }
    });

    setCurrentTags(Array.from(tagSet));
    setTagInput('');
    setStatusMessage(null);
  }, [isOpen, panoramas]);

  // Compute popular suggestions
  const popularSuggestions = useMemo(() => {
    if (allPanoramas.length === 0) return [];
    return getPopularTags(allPanoramas).slice(0, 16);
  }, [allPanoramas]);

  if (!isOpen || panoramas.length === 0) return null;

  const handleAddTag = (raw: string) => {
    const slug = slugifyTag(raw.replace(/^#+/, ''));
    if (!slug) return;
    if (!isAllowedTag(slug)) {
      setStatusMessage('Disallowed tag (months, years, pano, location excluded)');
      return;
    }
    const tag = `#${slug}`;
    if (!currentTags.includes(tag)) {
      setCurrentTags((prev) => [...prev, tag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setCurrentTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const ids = panoramas.map((p) => String(p.id));
      const single = panoramas.length === 1 ? panoramas[0] : null;
      const res = await batchUpdatePanoramas({
        ids,
        custom_tags: currentTags,
        ...(single && single.width ? {
          filename: single.filename,
          width: single.width,
          height: single.height,
          file_size: Number(single.file_size || single.size) || undefined,
        } : {}),
      });

      if (res.success) {
        setStatusMessage(`Uložené pre ${ids.length} panorám`);
        onSaved?.(currentTags);
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setStatusMessage('Nepodarilo sa uložiť tagy do D1');
      }
    } catch (err: any) {
      setStatusMessage(err?.message || 'Chyba pri ukladaní');
    } finally {
      setIsSaving(false);
    }
  };

  const isBulk = panoramas.length > 1;

  return (
    <div
      className="fixed inset-0 z-[3500] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg glass-panel-elevated rounded-3xl p-6 border border-cyan-500/40 shadow-2xl relative animate-slide-up text-white space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-950/60">
            <Tag className="w-5 h-5" />
          </div>
          <div className="min-w-0 pr-8">
            <h3 className="text-base font-bold text-white truncate">
              {isBulk
                ? `Hromadné Tagovanie (${panoramas.length} panorám)`
                : `Tagy Panorámy: ${panoramas[0].city || panoramas[0].filename}`}
            </h3>
            <p className="text-xs text-zinc-400 truncate">
              Kláves <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-300 border border-white/20 font-mono text-[10px]">T</kbd> • Ukladá sa priamo do Cloudflare D1
            </p>
          </div>
        </div>

        {/* Current Hashtags Pill Area */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-white/10 min-h-[5.5rem] flex flex-wrap gap-2 items-start content-start max-h-48 overflow-y-auto custom-scrollbar">
          {currentTags.length === 0 ? (
            <div className="w-full text-center py-4 text-xs text-zinc-500 italic">
              Žiadne vlastné tagy. Pridajte nový tag nižšie alebo vyberte zo zoznamu.
            </div>
          ) : (
            currentTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-xl bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 text-xs font-mono font-bold shadow-xs transition-all group"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="p-1 rounded-lg hover:bg-rose-500/30 hover:text-rose-200 text-zinc-400 transition-colors cursor-pointer"
                  title="Odstrániť tag"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Input for new tag */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Napíšte tag (napr. zapadslnka, plaz, grecko) a stlačte Enter..."
              className="w-full bg-zinc-900 border border-white/15 focus:border-cyan-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={() => handleAddTag(tagInput)}
            disabled={!tagInput.trim()}
            className="px-4 py-2 rounded-xl bg-cyan-500/25 hover:bg-cyan-500/40 text-cyan-200 border border-cyan-400/50 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Pridať</span>
          </button>
        </div>

        {/* Popular Suggestions */}
        {popularSuggestions.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-semibold">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Odporúčané a populárne tagy z katalógu:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-1">
              {popularSuggestions.map(({ tag, count }) => {
                const isSelected = currentTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (isSelected) handleRemoveTag(tag);
                      else handleAddTag(tag);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-500 text-zinc-950 border-cyan-300 font-bold'
                        : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10 hover:border-cyan-500/40'
                    }`}
                  >
                    <span>{tag}</span>
                    <span className="opacity-60 text-[9px] ml-1">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Status message */}
        {statusMessage && (
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <span className="text-[11px] text-zinc-400 font-mono">
            {currentTags.length} {currentTags.length === 1 ? 'tag' : 'tagov'} vybraných
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl glass-button text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
            >
              Zrušiť
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/60 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Ukladám...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Uložiť do D1</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
