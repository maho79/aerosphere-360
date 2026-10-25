import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Compass,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lock,
  Crosshair,
} from 'lucide-react';
import { ThreePanoViewer, ThreePanoViewerRef } from './ThreePanoViewer';
import type { Panorama, PanoramaSunData } from '../types';
import { cleanPanoPath, getResolutionCategory } from '../types';
import { formatPanoramaDate, getPanoramaCity } from '../utils/geo';

export interface SplitClusterCalibrationViewProps {
  isOpen: boolean;
  onClose: () => void;
  targetPanorama: Panorama;
  clusterPanoramas: Panorama[];
  onSaveAlignment: (
    leftPano: Panorama,
    leftOffset: number,
    rightPano: Panorama,
    rightOffset: number
  ) => Promise<boolean>;
  onShowToast: (msg: string) => void;
  isSk?: boolean;
}

export const SplitClusterCalibrationView: React.FC<SplitClusterCalibrationViewProps> = ({
  isOpen,
  onClose,
  targetPanorama,
  clusterPanoramas,
  onSaveAlignment,
  onShowToast,
  isSk = true,
}) => {
  // Chronologically sorted panoramas in cluster
  const sortedPanos = useMemo(() => {
    if (!clusterPanoramas || clusterPanoramas.length === 0) {
      return [targetPanorama];
    }
    return [...clusterPanoramas].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });
  }, [clusterPanoramas, targetPanorama]);

  // Left and Right selected panoramas
  const [leftPano, setLeftPano] = useState<Panorama>(() => targetPanorama);
  const [rightPano, setRightPano] = useState<Panorama>(() => {
    if (sortedPanos.length <= 1) return targetPanorama;
    const idx = sortedPanos.findIndex((p) => String(p.id) === String(targetPanorama.id));
    if (idx !== -1) {
      return sortedPanos[(idx + 1) % sortedPanos.length];
    }
    return sortedPanos[0];
  });

  // Track viewer refs and current orientations
  const leftViewerRef = useRef<ThreePanoViewerRef>(null);
  const rightViewerRef = useRef<ThreePanoViewerRef>(null);

  const [leftLon, setLeftLon] = useState<number>(0);
  const [leftHeading, setLeftHeading] = useState<number>(0);
  const [rightLon, setRightLon] = useState<number>(0);
  const [rightHeading, setRightHeading] = useState<number>(0);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);

  // Synchronize ONLY once when modal opens (do not re-trigger on subsequent clusterPanoramas re-renders)
  useEffect(() => {
    if (isOpen && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setLeftPano(targetPanorama);
      if (sortedPanos.length > 1) {
        const idx = sortedPanos.findIndex((p) => String(p.id) === String(targetPanorama.id));
        const nextP = idx !== -1 ? sortedPanos[(idx + 1) % sortedPanos.length] : sortedPanos[0];
        setRightPano(nextP);
      } else {
        setRightPano(targetPanorama);
      }
    } else if (!isOpen) {
      hasInitializedRef.current = false;
    }
  }, [isOpen]);

  // Current calculated offsets
  const leftNorthOffset = leftPano.sun_data?.north_offset ?? 0;
  const rightNorthOffset = rightPano.sun_data?.north_offset ?? 0;

  // The true azimuth of the physical landmark aimed at by Left Pano center reticle:
  // Heading = (leftLon + leftNorthOffset) % 360
  const landmarkHeading = useMemo(() => {
    return ((leftLon + leftNorthOffset) % 360 + 360) % 360;
  }, [leftLon, leftNorthOffset]);

  // Check if right panorama has valid heading calibration
  const isRightAligned = Boolean(
    rightPano.sun_data?.manual_aligned ||
    rightPano.sun_data?.visual_aligned ||
    (rightPano.sun_data?.north_offset !== undefined && rightPano.sun_data.north_offset !== 0)
  );

  // Whenever rightPano switches to an already aligned panorama, automatically face the landmark in reticle
  useEffect(() => {
    if (isRightAligned) {
      const instantaneousLeftLon = leftViewerRef.current?.getViewState?.()?.lon ?? leftLon;
      const refHeading = ((instantaneousLeftLon + leftNorthOffset) % 360 + 360) % 360;
      const rightOffset = rightPano.sun_data?.north_offset ?? 0;
      const targetLon = ((refHeading - rightOffset) % 360 + 360) % 360;

      const t1 = setTimeout(() => {
        rightViewerRef.current?.setOrientation?.(targetLon, 0);
      }, 30);
      const t2 = setTimeout(() => {
        rightViewerRef.current?.setOrientation?.(targetLon, 0);
      }, 120);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [rightPano.id, isRightAligned]);

  // Offset needed on Right Pano so that its center reticle (rightLon) aligns with the exact same landmarkHeading:
  // (rightLon + newRightOffset) % 360 = landmarkHeading
  // newRightOffset = (landmarkHeading - rightLon) % 360
  const computedRightOffset = useMemo(() => {
    return Number((((landmarkHeading - rightLon) % 360 + 360) % 360).toFixed(2));
  }, [landmarkHeading, rightLon]);

  // Handle Save Alignment
  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);

    // Read latest instantaneous yaw from viewer refs if available
    const instantaneousLeftLon = leftViewerRef.current?.getViewState?.()?.lon ?? leftLon;
    const instantaneousRightLon = rightViewerRef.current?.getViewState?.()?.lon ?? rightLon;

    const accurateLandmarkHeading = ((instantaneousLeftLon + leftNorthOffset) % 360 + 360) % 360;
    const accurateRightOffset = Number(
      (((accurateLandmarkHeading - instantaneousRightLon) % 360 + 360) % 360).toFixed(2)
    );

    try {
      const success = await onSaveAlignment(
        leftPano,
        leftNorthOffset,
        rightPano,
        accurateRightOffset
      );

      if (success) {
        // Automatically advance the right window to the NEXT panorama in chronological order
        if (sortedPanos.length > 1) {
          const curRightIdx = sortedPanos.findIndex((p) => String(p.id) === String(rightPano.id));
          const nextIdx = curRightIdx !== -1 ? (curRightIdx + 1) % sortedPanos.length : 0;
          const nextPano = sortedPanos[nextIdx];

          setRightPano(nextPano);
          onShowToast(
            isSk
              ? `Zarovnanie uložené! (Offset: ${accurateRightOffset}°). Pravé okno posunuté na: ${formatPanoramaDate(nextPano.date) || `#${nextPano.id}`}`
              : `Alignment saved! (Offset: ${accurateRightOffset}°). Right window advanced to: ${formatPanoramaDate(nextPano.date) || `#${nextPano.id}`}`
          );
        } else {
          onShowToast(
            isSk
              ? `Zarovnanie úspešne uložené! (Offset: ${accurateRightOffset}°)`
              : `Alignment saved! (Offset: ${accurateRightOffset}°)`
          );
        }
      }
    } catch (err) {
      console.error('Failed to save calibration:', err);
      onShowToast(isSk ? 'Chyba pri ukladaní zarovnania' : 'Failed to save alignment');
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    leftLon,
    rightLon,
    leftNorthOffset,
    onSaveAlignment,
    leftPano,
    rightPano,
    sortedPanos,
    isSk,
    onShowToast,
  ]);

  // Keyboard shortcut listener for Shift + S (Save) and Shift + C / Escape (Close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, handleSave]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none">
      {/* Top Floating Control Bar (Centered between the two windows) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-zinc-950/85 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/80">
          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs transition-all shadow-lg cursor-pointer ${
              isSaving
                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 shadow-emerald-500/40 ring-1 ring-emerald-300 hover:scale-[1.03] active:scale-95'
            }`}
            title={isSk ? 'Uložiť zarovnanie a posunúť pravé okno (Shift + S)' : 'Save alignment and advance right window (Shift + S)'}
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{isSaving ? (isSk ? 'Ukladám...' : 'Saving...') : (isSk ? 'Uložiť zarovnanie' : 'Save Alignment')}</span>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-950/30 text-zinc-900 border border-zinc-900/30 text-[10px] font-mono font-extrabold">
              Shift + S
            </kbd>
          </button>

          {/* Real-time Computed Offset Badge */}
          <div className="px-3 py-1 rounded-xl bg-black/60 border border-white/10 flex items-center gap-1.5 text-xs font-mono">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-400">{isSk ? 'Offset:' : 'Offset:'}</span>
            <span className="text-cyan-300 font-bold">{computedRightOffset.toFixed(1)}°</span>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white border border-white/15 text-xs font-bold transition-all cursor-pointer shadow-md hover:scale-[1.03] active:scale-95"
            title={isSk ? 'Zatvoriť kalibráciu (Shift + C / Esc)' : 'Close calibration (Shift + C / Esc)'}
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSk ? 'Zatvoriť' : 'Close'}</span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/50 text-zinc-400 text-[10px] font-mono">
              Shift + C
            </kbd>
          </button>
        </div>

        {/* Informational Hint Tooltip */}
        <div className="px-3 py-1 rounded-full bg-zinc-950/80 backdrop-blur-md border border-white/10 text-[11px] text-zinc-300 shadow-md">
          {isSk
            ? 'Stredovú zvislú čiaru namierte na rovnaký bod v oboch oknách a stlačte Shift + S'
            : 'Aim the center vertical dashed line at the same landmark in both windows and press Shift + S'}
        </div>
      </div>

      {/* Main Dual-Screen Split Area (50% / 50%) */}
      <div className="flex-1 w-full grid grid-cols-2 relative overflow-hidden">
        {/* Left Vertical Divider Line */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-amber-400/30 via-white/40 to-cyan-400/30 z-30 pointer-events-none" />

        {/* -------------------- LEFT WINDOW -------------------- */}
        <div className="relative w-full h-full flex flex-col border-r border-white/10 overflow-hidden bg-zinc-950">
          {/* Header Info Banner */}
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2 pointer-events-none">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-zinc-950 font-black text-xs shadow-md border border-amber-300">
              {isSk ? '1. Kotva (Ľavé okno)' : '1. Anchor (Left)'}
            </span>
            <div className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/20 text-xs text-white font-mono flex items-center gap-2">
              <span className="font-bold text-amber-300">{formatPanoramaDate(leftPano.date)}</span>
              <span className="text-zinc-400">#{leftPano.id}</span>
              <span className="text-zinc-500">|</span>
              <span className="text-amber-200">Azimut: {leftHeading.toFixed(1)}°</span>
            </div>
            {(leftPano.sun_data?.manual_aligned || leftPano.sun_data?.visual_aligned) && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/90 text-zinc-950 font-black text-[10px] flex items-center gap-1 shadow border border-emerald-300">
                <Check className="w-3 h-3 stroke-[3]" />
                {isSk ? 'Zarovnané' : 'Aligned'}
              </span>
            )}
          </div>

          {/* Three.js Canvas Container */}
          <div className="flex-1 w-full h-full relative">
            <ThreePanoViewer
              ref={leftViewerRef}
              panorama={leftPano}
              isAutoPanning={false}
              onHeadingChange={(heading, lon) => {
                setLeftHeading(heading);
                setLeftLon(lon);
              }}
            />

            {/* Sighting Reticle: Vertical Dashed Line through center of photo */}
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              {/* Vertical dashed line */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0 border-r-2 border-dashed border-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.95)]" />
              {/* Center reticle circle */}
              <div className="relative flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-amber-400/80 shadow-md flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                  <div className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
                </div>
                {/* Cross ticks */}
                <div className="absolute -left-3.5 w-2.5 h-0.5 bg-amber-400" />
                <div className="absolute -right-3.5 w-2.5 h-0.5 bg-amber-400" />
                <div className="absolute -top-3.5 w-0.5 h-2.5 bg-amber-400" />
                <div className="absolute -bottom-3.5 w-0.5 h-2.5 bg-amber-400" />
              </div>
              {/* Top notch */}
              <div className="absolute top-16 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/80 border border-amber-400/60 text-[10px] font-mono font-bold text-amber-300 shadow">
                ▲ TERČ
              </div>
            </div>
          </div>

          {/* Left Filmstrip */}
          <div className="h-28 w-full bg-zinc-950/90 backdrop-blur-xl border-t border-amber-500/30 px-3 py-2 flex flex-col z-30">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-semibold mb-1">
              <span className="flex items-center gap-1.5 text-amber-300">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                {isSk ? 'Výber panorámy pre ľavé okno:' : 'Select panorama for left window:'}
              </span>
              <span>{sortedPanos.length} {isSk ? 'v clustri' : 'in cluster'}</span>
            </div>
            <div className="flex-1 flex gap-2 overflow-x-auto overflow-y-hidden pb-1 scrollbar-thin">
              {sortedPanos.map((p) => {
                const isSelected = String(p.id) === String(leftPano.id);
                const isAligned = Boolean(p.sun_data?.manual_aligned || p.sun_data?.visual_aligned);
                return (
                  <button
                    key={`left-${p.id}`}
                    onClick={() => setLeftPano(p)}
                    className={`flex-none w-36 h-full rounded-xl overflow-hidden relative border transition-all text-left group cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400/80 shadow-lg shadow-amber-950/80'
                        : 'border-white/10 hover:border-amber-400/50 bg-zinc-900/80'
                    }`}
                  >
                    <img
                      src={`/thumbnails/${cleanPanoPath(p.filename)}`}
                      alt={p.city || 'Thumbnail'}
                      onError={(e) => {
                        const target = e.currentTarget;
                        const clean = cleanPanoPath(p.filename);
                        if (!target.src.includes('/panoramas_2k/')) {
                          target.src = `/panoramas_2k/${clean}`;
                        } else if (!target.src.includes('/panoramas_web/')) {
                          target.src = `/panoramas_web/${clean}`;
                        }
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-mono font-bold text-amber-200">
                      {formatPanoramaDate(p.date)}
                    </div>
                    {isAligned && (
                      <div className="absolute top-1 right-1 px-1 py-0.5 rounded bg-emerald-500/90 text-zinc-950 font-black text-[8px] flex items-center gap-0.5 shadow">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        <span>{isSk ? 'Zarovnané' : 'Aligned'}</span>
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between text-[10px] text-zinc-300">
                      <span className="font-mono">#{p.id}</span>
                      <span className="text-[9px] text-zinc-400 truncate">{getPanoramaCity(p)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* -------------------- RIGHT WINDOW -------------------- */}
        <div className="relative w-full h-full flex flex-col overflow-hidden bg-zinc-950">
          {/* Header Info Banner */}
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500 text-zinc-950 font-black text-xs shadow-md border border-cyan-300">
              {isSk ? '2. Zarovnávaná (Pravé okno)' : '2. Target (Right)'}
            </span>
            <div className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/20 text-xs text-white font-mono flex items-center gap-2">
              <span className="font-bold text-cyan-300">{formatPanoramaDate(rightPano.date)}</span>
              <span className="text-zinc-400">#{rightPano.id}</span>
              <span className="text-zinc-500">|</span>
              <span className="text-cyan-200">Azimut: {rightHeading.toFixed(1)}°</span>
            </div>
            {isRightAligned && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/90 text-zinc-950 font-black text-[10px] flex items-center gap-1 shadow border border-emerald-300">
                <Check className="w-3 h-3 stroke-[3]" />
                {isSk ? 'Zarovnané' : 'Aligned'}
              </span>
            )}
            {/* Quick alignment snap button for already aligned panorama */}
            {isRightAligned && (
              <button
                type="button"
                onClick={() => {
                  const instantaneousLeftLon = leftViewerRef.current?.getViewState?.()?.lon ?? leftLon;
                  const refHeading = ((instantaneousLeftLon + leftNorthOffset) % 360 + 360) % 360;
                  const rightOffset = rightPano.sun_data?.north_offset ?? 0;
                  const targetLon = ((refHeading - rightOffset) % 360 + 360) % 360;
                  rightViewerRef.current?.setOrientation?.(targetLon, 0);
                  rightViewerRef.current?.lookAtHeading?.(refHeading);
                }}
                className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-md backdrop-blur-md"
                title={isSk ? 'Otočiť pravú panorámu presne na zameraný bod z ľavého okna' : 'Rotate right panorama to target point from left window'}
              >
                <Crosshair className="w-3 h-3 text-cyan-400" />
                <span>{isSk ? 'Zosúladiť s terčom' : 'Align with reticle'}</span>
              </button>
            )}
          </div>

          {/* Three.js Canvas Container */}
          <div className="flex-1 w-full h-full relative">
            <ThreePanoViewer
              ref={rightViewerRef}
              panorama={rightPano}
              forcedTrueHeading={isRightAligned ? landmarkHeading : null}
              isAutoPanning={false}
              onHeadingChange={(heading, lon) => {
                setRightHeading(heading);
                setRightLon(lon);
              }}
            />

            {/* Sighting Reticle: Vertical Dashed Line through center of photo */}
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              {/* Vertical dashed line */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0 border-r-2 border-dashed border-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.95)]" />
              {/* Center reticle circle */}
              <div className="relative flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-cyan-400/80 shadow-md flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm" />
                </div>
                {/* Cross ticks */}
                <div className="absolute -left-3.5 w-2.5 h-0.5 bg-cyan-400" />
                <div className="absolute -right-3.5 w-2.5 h-0.5 bg-cyan-400" />
                <div className="absolute -top-3.5 w-0.5 h-2.5 bg-cyan-400" />
                <div className="absolute -bottom-3.5 w-0.5 h-2.5 bg-cyan-400" />
              </div>
              {/* Top notch */}
              <div className="absolute top-16 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/80 border border-cyan-400/60 text-[10px] font-mono font-bold text-cyan-300 shadow">
                ▲ TERČ
              </div>
            </div>
          </div>

          {/* Right Filmstrip */}
          <div className="h-28 w-full bg-zinc-950/90 backdrop-blur-xl border-t border-cyan-500/30 px-3 py-2 flex flex-col z-30">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-semibold mb-1">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                {isSk ? 'Výber panorámy pre pravé okno:' : 'Select panorama for right window:'}
              </span>
              <span>{sortedPanos.length} {isSk ? 'v clustri' : 'in cluster'}</span>
            </div>
            <div className="flex-1 flex gap-2 overflow-x-auto overflow-y-hidden pb-1 scrollbar-thin">
              {sortedPanos.map((p) => {
                const isSelected = String(p.id) === String(rightPano.id);
                const isAligned = Boolean(p.sun_data?.manual_aligned || p.sun_data?.visual_aligned);
                return (
                  <button
                    key={`right-${p.id}`}
                    onClick={() => setRightPano(p)}
                    className={`flex-none w-36 h-full rounded-xl overflow-hidden relative border transition-all text-left group cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400 ring-2 ring-cyan-400/80 shadow-lg shadow-cyan-950/80'
                        : 'border-white/10 hover:border-cyan-400/50 bg-zinc-900/80'
                    }`}
                  >
                    <img
                      src={`/thumbnails/${cleanPanoPath(p.filename)}`}
                      alt={p.city || 'Thumbnail'}
                      onError={(e) => {
                        const target = e.currentTarget;
                        const clean = cleanPanoPath(p.filename);
                        if (!target.src.includes('/panoramas_2k/')) {
                          target.src = `/panoramas_2k/${clean}`;
                        } else if (!target.src.includes('/panoramas_web/')) {
                          target.src = `/panoramas_web/${clean}`;
                        }
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-mono font-bold text-cyan-200">
                      {formatPanoramaDate(p.date)}
                    </div>
                    {isAligned && (
                      <div className="absolute top-1 right-1 px-1 py-0.5 rounded bg-emerald-500/90 text-zinc-950 font-black text-[8px] flex items-center gap-0.5 shadow">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        <span>{isSk ? 'Zarovnané' : 'Aligned'}</span>
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between text-[10px] text-zinc-300">
                      <span className="font-mono">#{p.id}</span>
                      <span className="text-[9px] text-zinc-400 truncate">{getPanoramaCity(p)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
