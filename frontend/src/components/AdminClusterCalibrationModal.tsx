import { panoConfig } from '../config/panoConfig';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Compass,
  Check,
  X,
  RotateCcw,
  Sliders,
  ArrowLeftRight,
  Eye,
  Layers,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Panorama } from '../types';
import type { CalibrationOverlayConfig } from './ThreePanoViewer';
import { cleanPanoPath } from '../types';
import { getDistance } from '../utils/geo';

export interface AdminClusterCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPanorama: Panorama;
  allPanoramas: Panorama[];
  selectedPanoramas?: Panorama[];
  onSaveAlignment: (
    targetPanoId: string | number,
    newNorthOffset: number,
    refPanoId: string | number
  ) => Promise<boolean>;
  onUpdateCalibrationOverlay: (config: CalibrationOverlayConfig | null) => void;
  onShowToast?: (msg: string) => void;
}

export const AdminClusterCalibrationModal: React.FC<AdminClusterCalibrationModalProps> = ({
  isOpen,
  onClose,
  targetPanorama: initialTarget,
  allPanoramas,
  selectedPanoramas,
  onSaveAlignment,
  onUpdateCalibrationOverlay,
  onShowToast,
}) => {
  const { t, i18n } = useTranslation();
  const isSk = i18n.language.startsWith('sk');

  const [targetPano, setTargetPano] = useState<Panorama>(initialTarget);
  const [refPano, setRefPano] = useState<Panorama | null>(null);
  const [targetOffset, setTargetOffset] = useState<number>(0);
  const [initialOffset, setInitialOffset] = useState<number>(0);
  const [blend, setBlend] = useState<number>(0.5);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const blinkTimerRef = useRef<any>(null);

  // Compute available cluster candidates within 100 meters
  const clusterCandidates = useMemo(() => {
    if (!targetPano || targetPano.lat === null || targetPano.lon === null) return [];
    const tLat = targetPano.lat;
    const tLon = targetPano.lon;

    const matched = allPanoramas.filter((p) => {
      if (p.id === targetPano.id) return false;
      if (p.is_deleted || p.folder === '!DELETED!' || p.exclude_timeline) return false;
      if (p.lat === null || p.lon === null) return false;
      const d = getDistance(tLat, tLon, p.lat, p.lon);
      return d <= 120; // 120m cluster radius
    });

    return matched.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });
  }, [targetPano, allPanoramas]);

  // Determine the best reference panorama
  const bestReferenceCandidate = useMemo(() => {
    if (selectedPanoramas && selectedPanoramas.length === 2) {
      const other = selectedPanoramas.find((p) => p.id !== targetPano.id);
      if (other) return other;
    }

    if (clusterCandidates.length === 0) return null;

    // Score candidates based on visual alignment, sun detection, and distance
    const scored = clusterCandidates.map((p) => {
      let score = 0;
      const sd = p.sun_data;
      if (sd) {
        if (sd.visual_aligned) score += 100;
        if (sd.alignment_inliers && sd.alignment_inliers > 0) score += 50;
        if (sd.sun_detected) score += 30;
        if (sd.north_offset !== undefined && sd.north_offset !== 0) score += 20;
      }
      if (targetPano.lat && targetPano.lon && p.lat && p.lon) {
        const dist = getDistance(targetPano.lat, targetPano.lon, p.lat, p.lon);
        score += Math.max(0, 50 - dist);
      }
      return { pano: p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.pano || clusterCandidates[0];
  }, [clusterCandidates, selectedPanoramas, targetPano]);

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (!isOpen) {
      onUpdateCalibrationOverlay(null);
      if (blinkTimerRef.current) clearInterval(blinkTimerRef.current);
      setIsBlinking(false);
      return;
    }

    let initialT = initialTarget;
    let initialR = bestReferenceCandidate;

    if (selectedPanoramas && selectedPanoramas.length === 2) {
      initialT = selectedPanoramas[0];
      initialR = selectedPanoramas[1];
    }

    setTargetPano(initialT);
    setRefPano(initialR);
    const off = initialT.sun_data?.north_offset ?? 0;
    setTargetOffset(off);
    setInitialOffset(off);
    setBlend(0.5);
    setIsBlinking(false);
    setIsCollapsed(false);
  }, [isOpen, initialTarget.id, bestReferenceCandidate?.id]);

  // Push real-time calibration overlay updates to ThreePanoViewer
  useEffect(() => {
    if (!isOpen || !refPano) {
      onUpdateCalibrationOverlay(null);
      return;
    }

    onUpdateCalibrationOverlay({
      referencePanorama: refPano,
      targetNorthOffset: targetOffset,
      blend,
    });
  }, [isOpen, refPano?.id, targetOffset, blend, onUpdateCalibrationOverlay]);

  // Handle A/B blinking effect
  useEffect(() => {
    if (!isBlinking) {
      if (blinkTimerRef.current) {
        clearInterval(blinkTimerRef.current);
        blinkTimerRef.current = null;
      }
      return;
    }

    let flip = false;
    blinkTimerRef.current = setInterval(() => {
      flip = !flip;
      setBlend(flip ? 1.0 : 0.0);
    }, 450);

    return () => {
      if (blinkTimerRef.current) clearInterval(blinkTimerRef.current);
    };
  }, [isBlinking]);

  // Keyboard navigation & fine nudge
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is in an input field
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === ' ') {
        e.preventDefault();
        setBlend((prev) => (prev > 0.5 ? 0.0 : 1.0));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.ctrlKey ? 5.0 : e.shiftKey ? 1.0 : 0.1;
        adjustOffset(-step);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.ctrlKey ? 5.0 : e.shiftKey ? 1.0 : 0.1;
        adjustOffset(step);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, targetOffset, targetPano, refPano]);

  if (!isOpen) return null;

  const adjustOffset = (delta: number) => {
    setTargetOffset((prev) => {
      let next = (prev + delta) % 360;
      if (next < 0) next += 360;
      return Math.round(next * 100) / 100;
    });
  };

  const handleSwapRoles = () => {
    if (!refPano) return;
    const oldTarget = targetPano;
    const oldRef = refPano;
    setTargetPano(oldRef);
    setRefPano(oldTarget);
    const newOff = oldRef.sun_data?.north_offset ?? 0;
    setTargetOffset(newOff);
    setInitialOffset(newOff);
  };

  const handleSave = async () => {
    if (!refPano || isSaving) return;
    setIsSaving(true);
    try {
      const ok = await onSaveAlignment(targetPano.id, targetOffset, refPano.id);
      if (ok) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const refNorthOffset = refPano?.sun_data?.north_offset ?? 0;
  const deltaFromRef = ((targetOffset - refNorthOffset + 540) % 360) - 180;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[3100] w-[95vw] max-w-2xl pointer-events-auto select-none animate-slide-up">
      <div className="glass-panel-elevated rounded-3xl p-4 md:p-5 border border-cyan-500/40 shadow-2xl backdrop-blur-2xl text-white space-y-3.5">
        {/* Header & Controls bar */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white tracking-tight">
                  {isSk ? 'Kalibrácia zarovnania panorám' : 'Panorama Alignment Calibration'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {isSk
                  ? 'Zarovnajte horizont a vzdialené objekty pomocou 50% prekryvu'
                  : 'Align horizon and distant objects using real-time 50% overlay'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsCollapsed((v) => !v)}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-300 transition-all cursor-pointer"
              title={isCollapsed ? (isSk ? 'Rozbaliť panel' : 'Expand panel') : (isSk ? 'Zbaliť panel' : 'Collapse panel')}
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 transition-all cursor-pointer"
              title={isSk ? 'Zavrieť (Esc)' : 'Close (Esc)'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimized Quick Info (when collapsed) */}
        {isCollapsed && (
          <div className="flex items-center justify-between py-1 text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="text-cyan-300 font-bold">Offset: {targetOffset.toFixed(2)}°</span>
              <span className="text-zinc-500">|</span>
              <span className="text-amber-300">Δ: {deltaFromRef >= 0 ? `+${deltaFromRef.toFixed(2)}°` : `${deltaFromRef.toFixed(2)}°`}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustOffset(-0.1)}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs"
              >
                -0.1°
              </button>
              <button
                type="button"
                onClick={() => adjustOffset(0.1)}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs"
              >
                +0.1°
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold text-xs"
              >
                {isSaving ? '...' : isSk ? 'Uložiť' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Full Controls Body */}
        {!isCollapsed && (
          <div className="space-y-4">
            {/* Target vs Reference Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Target Panorama Card */}
              <div className="p-3 rounded-2xl bg-black/40 border border-cyan-500/30 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative w-12 h-10 rounded-lg overflow-hidden shrink-0 border border-cyan-400/50 bg-black/50">
                    <img
                      src={`${panoConfig.storage.thumbnailsUrl}/${cleanPanoPath(targetPano.filename)}`}
                      alt="Target"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-cyan-500/90 text-zinc-950 text-[9px] font-mono font-black text-center py-0.2">
                      CIEĽ
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-cyan-400 flex items-center gap-1">
                      <span>{isSk ? 'Cieľ (Kalibruje sa)' : 'Target (Calibrating)'}</span>
                      <span className="font-mono text-zinc-400">#{targetPano.id}</span>
                    </div>
                    <div className="text-xs font-bold text-white truncate">
                      {targetPano.date ? targetPano.date.slice(0, 10) : targetPano.title || targetPano.city}
                    </div>
                    <div className="text-[10px] font-mono text-cyan-300">
                      Offset: {targetOffset.toFixed(2)}°
                    </div>
                  </div>
                </div>
              </div>

              {/* Reference Panorama Card */}
              <div className="p-3 rounded-2xl bg-black/40 border border-amber-500/30 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative w-12 h-10 rounded-lg overflow-hidden shrink-0 border border-amber-400/50 bg-black/50">
                    {refPano && (
                      <img
                        src={`${panoConfig.storage.thumbnailsUrl}/${cleanPanoPath(refPano.filename)}`}
                        alt="Reference"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}
                    <span className="absolute bottom-0 inset-x-0 bg-amber-400/90 text-zinc-950 text-[9px] font-mono font-black text-center py-0.2">
                      REF
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                      <span>{isSk ? 'Referencia (Pevná)' : 'Reference (Fixed)'}</span>
                      {refPano && <span className="font-mono text-zinc-400">#{refPano.id}</span>}
                    </div>
                    {clusterCandidates.length > 1 ? (
                      <div className="relative mt-0.5">
                        <select
                          value={refPano ? String(refPano.id) : ''}
                          onChange={(e) => {
                            const found = clusterCandidates.find((c) => String(c.id) === e.target.value);
                            if (found) setRefPano(found);
                          }}
                          className="bg-black/60 border border-white/20 rounded-lg text-xs font-bold text-white py-0.5 px-1.5 pr-5 truncate w-full appearance-none cursor-pointer focus:outline-none focus:border-amber-400"
                        >
                          {clusterCandidates.map((c) => (
                            <option key={c.id} value={String(c.id)} className="bg-zinc-900 text-white">
                              #{c.id} - {c.date ? c.date.slice(0, 10) : c.title || c.city} ({c.sun_data?.north_offset ?? 0}°)
                              {c.sun_data?.visual_aligned ? ' ✓' : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-white truncate">
                        {refPano?.date ? refPano.date.slice(0, 10) : refPano?.title || refPano?.city || 'No candidate'}
                      </div>
                    )}
                    <div className="text-[10px] font-mono text-amber-300">
                      Offset: {refNorthOffset.toFixed(2)}°
                    </div>
                  </div>
                </div>

                {/* Swap Target & Reference Button */}
                <button
                  type="button"
                  onClick={handleSwapRoles}
                  className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-400/40 transition-all cursor-pointer shrink-0"
                  title={isSk ? 'Vymeniť cieľ a referenciu' : 'Swap target and reference'}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Azimuth / Offset Controls */}
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                    {isSk ? 'Severný azimut (North Offset)' : 'North Azimuth Offset'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    {targetOffset.toFixed(2)}°
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <span className="text-zinc-400">Δ od ref:</span>
                  <span className={`font-bold ${deltaFromRef === 0 ? 'text-zinc-300' : deltaFromRef > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {deltaFromRef >= 0 ? `+${deltaFromRef.toFixed(2)}°` : `${deltaFromRef.toFixed(2)}°`}
                  </span>
                </div>
              </div>

              {/* Slider */}
              <div className="relative flex items-center">
                <input
                  type="range"
                  min="0"
                  max="359.9"
                  step="0.05"
                  value={targetOffset}
                  onChange={(e) => setTargetOffset(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-white/10 rounded-lg"
                />
              </div>

              {/* Step Buttons */}
              <div className="flex items-center justify-between gap-1 pt-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustOffset(-5.0)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 font-mono text-xs border border-white/10"
                    title="-5.0°"
                  >
                    -5°
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustOffset(-1.0)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 font-mono text-xs border border-white/10"
                    title="-1.0°"
                  >
                    -1°
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustOffset(-0.1)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 font-mono text-xs font-bold border border-cyan-500/40"
                    title="-0.1°"
                  >
                    -0.1°
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setTargetOffset(initialOffset)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white font-mono text-xs flex items-center gap-1 border border-white/10"
                  title={isSk ? 'Obnoviť pôvodný offset' : 'Reset to original offset'}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isSk ? 'Reset' : 'Reset'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustOffset(0.1)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 font-mono text-xs font-bold border border-cyan-500/40"
                    title="+0.1°"
                  >
                    +0.1°
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustOffset(1.0)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 font-mono text-xs border border-white/10"
                    title="+1.0°"
                  >
                    +1°
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustOffset(5.0)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 font-mono text-xs border border-white/10"
                    title="+5.0°"
                  >
                    +5°
                  </button>
                </div>
              </div>
            </div>

            {/* Blend & Visualization Controls */}
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isSk ? 'Režim zobrazenia / Prekryv' : 'Overlay Blending Mode'}</span>
                </div>
                <span className="font-mono text-xs font-bold text-cyan-300">
                  {Math.round(blend * 100)}%
                </span>
              </div>

              {/* Blend Slider */}
              <div className="relative flex items-center">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={blend}
                  onChange={(e) => {
                    setIsBlinking(false);
                    setBlend(parseFloat(e.target.value));
                  }}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-white/10 rounded-lg"
                />
              </div>

              {/* Blend Mode Quick Presets */}
              <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsBlinking(false);
                    setBlend(0.0);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                    blend === 0 && !isBlinking
                      ? 'bg-amber-400 text-zinc-950 border-amber-300 shadow-md ring-1 ring-amber-300'
                      : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/15'
                  }`}
                >
                  {isSk ? '0% Iba Ref' : '0% Ref Only'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsBlinking(false);
                    setBlend(0.5);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                    blend === 0.5 && !isBlinking
                      ? 'bg-cyan-500 text-zinc-950 border-cyan-300 shadow-md ring-1 ring-cyan-300'
                      : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/15'
                  }`}
                >
                  {isSk ? '50% Prekryv' : '50% Blend'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsBlinking(false);
                    setBlend(1.0);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                    blend === 1.0 && !isBlinking
                      ? 'bg-cyan-400 text-zinc-950 border-cyan-300 shadow-md ring-1 ring-cyan-300'
                      : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/15'
                  }`}
                >
                  {isSk ? '100% Iba Cieľ' : '100% Target'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsBlinking((v) => !v)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                    isBlinking
                      ? 'bg-amber-500 text-zinc-950 border-amber-300 shadow-md ring-2 ring-amber-400 animate-pulse'
                      : 'bg-white/5 text-amber-300 border-amber-400/30 hover:bg-amber-500/20'
                  }`}
                  title={isSk ? 'Blikanie medzi A a B pre detekciu posunu' : 'Blink A/B to spot alignment offset'}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isSk ? 'A/B Blikanie' : 'A/B Blink'}</span>
                </button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-zinc-400 font-mono hidden sm:block">
                <span>← / → : ±0.1° (Shift: ±1°) | Medzerník: A/B</span>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 text-xs font-bold transition-all cursor-pointer"
                >
                  {isSk ? 'Zrušiť' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !refPano}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-zinc-950 text-xs font-extrabold shadow-lg shadow-cyan-950/80 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{isSaving ? (isSk ? 'Ukladám...' : 'Saving...') : isSk ? 'Uložiť zarovnanie' : 'Save Alignment'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
