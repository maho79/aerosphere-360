import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  X,
  Play,
  Pause,
  RotateCw,
  RotateCcw,
  Sparkles,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Film,
  HardDrive,
  Sliders,
  Layers,
  StopCircle,
  Music,
  MapPin,
  Volume2,
  FileText,
  Copy,
  ExternalLink,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import type { Panorama, ActiveTextureDetails, BatchVideoReportItem } from '../types';
import { getHorizontalK } from '../types';
import {
  type VideoExportOptions,
  type VideoExportProgress,
  type VideoRendererInstance,
  exportPanorama360Video,
  getVideoDimensions,
  estimateVideoFileSizeMB,
  generateVideoFilename,
  isWebCodecsVideoSupported,
  isWebCodecsAudioSupported,
  getCompletePanoramaUrl,
  EXPORT_AUDIO_TRACKS,
} from '../utils/videoExport';
import { formatCoordinates, formatPanoramaDate } from '../utils/geo';
import { SpatialAudioManager } from '../utils/audioManager';

interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  panorama: Panorama;
  getCurrentView: () => { lon: number; lat: number; fov: number; projectionMode: string } | null;
  createVideoRenderer: (width: number, height: number, options?: { antiMoire?: boolean } | boolean) => VideoRendererInstance | null;
  onShowToast: (message: string) => void;
  isAdmin?: boolean;
  isHighResReady?: boolean;
  selectedPanoramas?: Panorama[];
  onSelectPanorama?: (pano: Panorama) => void;
  waitForPanoReady?: (panoId: string, timeoutMs?: number) => Promise<boolean>;
  waitForTopResolution?: (
    panoId: string,
    timeoutMs?: number,
    onStatus?: (status: string) => void
  ) => Promise<{ success: boolean; textureInfo: ActiveTextureDetails }>;
  getActiveTextureInfo?: () => ActiveTextureDetails | undefined;
}

export const VideoExportModal: React.FC<VideoExportModalProps> = ({
  isOpen,
  onClose,
  panorama,
  getCurrentView,
  createVideoRenderer,
  onShowToast,
  isAdmin = false,
  isHighResReady,
  selectedPanoramas = [],
  onSelectPanorama,
  waitForPanoReady,
  waitForTopResolution,
  getActiveTextureInfo,
}) => {
  const [duration, setDuration] = useState<30 | 60>(60);
  const [resolution, setResolution] = useState<'1080p' | '1440p' | '4k'>('1080p');
  const [fps, setFps] = useState<30 | 60>(30);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [bitrateMbps, setBitrateMbps] = useState<number>(50);
  const [direction, setDirection] = useState<'clockwise' | 'counterclockwise'>('clockwise');
  const [includeWatermark, setIncludeWatermark] = useState<boolean>(true);
  const [antiMoire, setAntiMoire] = useState<boolean>(true);

  // Audio track state
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<string>('random');
  const [audioLoopCrossfade, setAudioLoopCrossfade] = useState<boolean>(true);
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<VideoExportProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Batch Export state
  const [isBatchExporting, setIsBatchExporting] = useState<boolean>(false);
  const [batchTotalCount, setBatchTotalCount] = useState<number>(0);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState<number>(0);
  const [batchCurrentPano, setBatchCurrentPano] = useState<Panorama | null>(null);
  const [batchCompletedPanos, setBatchCompletedPanos] = useState<{ pano: Panorama; filename: string; sizeMB: number }[]>([]);
  const [batchReport, setBatchReport] = useState<BatchVideoReportItem[]>([]);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [batchStartTime, setBatchStartTime] = useState<number>(0);
  const [batchElapsedSeconds, setBatchElapsedSeconds] = useState<number>(0);
  const [batchOverallEtaSeconds, setBatchOverallEtaSeconds] = useState<number>(0);

  const generateReportText = () => {
    const total = batchReport.length;
    const maxQuality = batchReport.filter((r) => r.isMaxQuality).length;
    const fallbackCount = total - maxQuality;
    const totalMB = batchReport.reduce((acc, r) => acc + (r.fileSizeMB || 0), 0);
    const dateStr = new Date().toLocaleString('sk-SK');

    let text = `========================================================================\n`;
    text += `360 PANORAMAS - SPRÁVA O ROZLÍŠENÍ DÁVKOVÉHO EXPORTU VIDEÍ\n`;
    text += `Dátum exportu: ${dateStr}\n`;
    text += `Celkovo videí: ${total}\n`;
    text += `V plnej kvalite: ${maxQuality} (${Math.round((maxQuality / Math.max(1, total)) * 100)}%)\n`;
    if (fallbackCount > 0) {
      text += `S nižším rozlíšením/fallback: ${fallbackCount}\n`;
    }
    text += `Celková veľkosť súborov: ${totalMB.toFixed(1)} MB\n`;
    text += `========================================================================\n\n`;

    batchReport.forEach((item, idx) => {
      text += `[${idx + 1}/${total}] Panoráma #${item.id} - ${item.title}\n`;
      text += `   Lokalita: ${item.location}${item.date ? ` (${item.date})` : ''}\n`;
      text += `   Pôvodné rozlíšenie: ${item.nativeResolution}\n`;
      text += `   Použitá textúra: ${item.textureLabel} ${item.isMaxQuality ? '✓ [Plná kvalita]' : '⚠️ [Fallback/Timeout]'}\n`;
      text += `   Výstupné video: ${item.filename} (${item.videoResolution}, ${item.fileSizeMB} MB, ${item.durationSec}s render)\n\n`;
    });

    return text;
  };

  const handleCopyReport = () => {
    if (batchReport.length === 0) return;
    try {
      navigator.clipboard.writeText(generateReportText());
      onShowToast('Správa o rozlíšení videí bola skopírovaná do schránky.');
    } catch {
      onShowToast('Nepodarilo sa skopírovať správu do schránky.');
    }
  };

  const handleDownloadReport = () => {
    if (batchReport.length === 0) return;
    const text = generateReportText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sprava_video_export_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    onShowToast('Správa o rozlíšení videí bola stiahnutá.');
  };

  const isWebCodecs = isWebCodecsVideoSupported();
  const isWebCodecsAudio = isWebCodecsAudioSupported();

  // GPS presence check
  const hasGps = panorama.lat !== null &&
    panorama.lon !== null &&
    !isNaN(Number(panorama.lat)) &&
    !isNaN(Number(panorama.lon)) &&
    !(Number(panorama.lat) === 0 && Number(panorama.lon) === 0);
  const formattedGps = hasGps ? formatCoordinates(Number(panorama.lat), Number(panorama.lon)) : null;

  // On open: detect if currently playing song in ambient audio manager and suggest it
  useEffect(() => {
    if (isOpen) {
      const activeSong = SpatialAudioManager.getInstance().getCurrentSong();
      if (activeSong) {
        const found = EXPORT_AUDIO_TRACKS.find((t) => t.filename === activeSong);
        if (found) {
          setSelectedAudioTrack(found.id);
        }
      }
    }
  }, [isOpen]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPreviewTrackId(null);
      if (isExporting && abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsExporting(false);
      setProgress(null);
    }
  }, [isOpen, isExporting]);

  // Batch elapsed seconds counter
  useEffect(() => {
    if (!isOpen || !isBatchExporting || batchStartTime <= 0) return;
    const interval = setInterval(() => {
      const elapsed = Math.round((Date.now() - batchStartTime) / 1000);
      setBatchElapsedSeconds(elapsed);
    }, 500);
    return () => clearInterval(interval);
  }, [isOpen, isBatchExporting, batchStartTime]);

  if (!isOpen) return null;

  const { width, height } = getVideoDimensions(resolution, orientation);
  const totalFrames = Math.round(duration * fps);
  const estimatedMB = estimateVideoFileSizeMB(duration, bitrateMbps, selectedAudioTrack !== 'none');

  const togglePreviewTrack = (trackId: string, filename: string) => {
    if (previewTrackId === trackId) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPreviewTrackId(null);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    if (!filename) return;

    const audio = new Audio(`/sounds/${filename}`);
    audio.volume = 0.5;
    audio.play().catch((err) => {
      console.warn('Audio preview play error:', err);
    });
    audio.addEventListener('ended', () => {
      setPreviewTrackId(null);
      previewAudioRef.current = null;
    });
    previewAudioRef.current = audio;
    setPreviewTrackId(trackId);
  };

  const handleStartExport = async () => {
    // Stop any ongoing audio preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPreviewTrackId(null);

    const viewState = getCurrentView();
    if (!viewState) {
      onShowToast('Nepodarilo sa načítať aktuálnu polohu kamery.');
      return;
    }

    const videoRenderer = createVideoRenderer(width, height, { antiMoire });
    if (!videoRenderer) {
      onShowToast('Chyba: Nepodarilo sa vytvoriť grafický kontext pre video render.');
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const options: VideoExportOptions = {
      durationSeconds: duration,
      fps,
      resolution,
      orientation,
      bitrateMbps,
      direction,
      includeWatermark: isAdmin ? includeWatermark : true,
      audioTrack: selectedAudioTrack,
      enableAudioLoopCrossfade: audioLoopCrossfade,
      antiMoire,
    };

    setIsExporting(true);
    setProgress({
      currentFrame: 0,
      totalFrames,
      percent: 0,
      fps: 0,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: duration,
      stage: 'initializing',
    });

    let completedFilename = '';
    let completedActualSizeMB = 0;
    let completedActualBitrateMbps = 0;
    let completedAudioTrackTitle = '';

    try {
      if (waitForTopResolution) {
        setProgress((prev) => prev ? {
          ...prev,
          infoNote: `Čakám na načítanie najvyššieho rozlíšenia (${getHorizontalK(panorama.width)})...`,
        } : prev);
        await waitForTopResolution(String(panorama.id), 25000, (note) => {
          setProgress((prev) => (prev ? { ...prev, infoNote: note } : prev));
        });
      } else if (videoRenderer.waitForHighRes) {
        await videoRenderer.waitForHighRes(15000);
      }

      const blob = await exportPanorama360Video(
        videoRenderer,
        panorama,
        viewState.lon,
        viewState.lat,
        viewState.fov,
        options,
        (p) => {
          if (p.filename) {
            completedFilename = p.filename;
          }
          if (p.actualSizeMB) {
            completedActualSizeMB = p.actualSizeMB;
          }
          if (p.actualBitrateMbps) {
            completedActualBitrateMbps = p.actualBitrateMbps;
          }
          if (p.audioTrackTitle) {
            completedAudioTrackTitle = p.audioTrackTitle;
          }
          setProgress(p);
        },
        abortController.signal
      );

      // Trigger automatic browser download
      const filename = completedFilename || generateVideoFilename(panorama, options);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      const realSizeStr = completedActualSizeMB ? `${completedActualSizeMB} MB` : `${estimatedMB} MB`;
      const realBitrateStr = completedActualBitrateMbps ? ` • ${completedActualBitrateMbps} Mbps` : '';
      const audioStr = completedAudioTrackTitle ? ` • 🎵 ${completedAudioTrackTitle}` : '';
      onShowToast(`Video úspešne stiahnuté: ${filename} (${realSizeStr}${realBitrateStr}${audioStr})`);
    } catch (err: any) {
      if (abortController.signal.aborted) {
        onShowToast('Export videa bol zrušený.');
      } else {
        console.error('Video export error:', err);
        onShowToast(`Chyba exportu: ${err.message || 'Zlyhalo kódovanie videa'}`);
      }
    } finally {
      videoRenderer.dispose();
      setIsExporting(false);
      abortControllerRef.current = null;
    }
  };

  const formatEta = (seconds: number): string => {
    if (!seconds || seconds <= 0 || !isFinite(seconds)) return '0s';
    const s = Math.round(seconds);
    if (s < 60) return `${s}s`;
    if (s < 3600) {
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins}m ${secs}s`;
    }
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const updateBatchEta = (
    currentIndex: number,
    total: number,
    currentProgress: VideoExportProgress | null,
    completedDurations: number[],
    startTs: number
  ) => {
    const completedCount = completedDurations.length;
    const remainingCount = total - currentIndex;

    let avgDuration = 0;
    if (completedCount > 0) {
      avgDuration = completedDurations.reduce((a, b) => a + b, 0) / completedCount;
    } else {
      const estTotalPanoSec = currentProgress?.elapsedSeconds && currentProgress.percent > 5
        ? (currentProgress.elapsedSeconds / (currentProgress.percent / 100))
        : (duration * 1.5);
      avgDuration = estTotalPanoSec;
    }

    const currentPanoRemaining = currentProgress?.estimatedRemainingSeconds ?? avgDuration;
    const futurePanosRemaining = Math.max(0, remainingCount - 1) * avgDuration;
    const totalRemaining = Math.max(0, Math.round(currentPanoRemaining + futurePanosRemaining));
    setBatchOverallEtaSeconds(totalRemaining);
  };

  const handleStartBatchExport = async () => {
    if (!isWebCodecs) {
      onShowToast('WebCodecs VideoEncoder nie je podporovaný v tomto prehliadači.');
      return;
    }
    if (!selectedPanoramas || selectedPanoramas.length === 0) {
      onShowToast('Žiadne vybrané panorámy na dávkový export.');
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPreviewTrackId(null);

    const { width, height } = getVideoDimensions(resolution, orientation);
    const testRenderer = createVideoRenderer(width, height, { antiMoire });
    if (!testRenderer) {
      onShowToast('Chyba: Nepodarilo sa vytvoriť grafický kontext pre video render.');
      return;
    }
    testRenderer.dispose();

    // 1. Lock the exact camera perspective from the first panorama
    const firstView = getCurrentView() || { lon: 0, lat: 0, fov: 75, projectionMode: 'rectilinear' };
    const lockedLon = firstView.lon;
    const lockedLat = firstView.lat;
    const lockedFov = firstView.fov;

    // Synchronized geographic heading across all videos in the batch (aligned for DaVinci Resolve layer stacking)
    const firstPano = selectedPanoramas[0] || panorama;
    const firstNorthOffset = firstPano.sun_data?.north_offset ?? (panorama.sun_data?.north_offset ?? 0);
    const lockedTrueHeading = ((lockedLon + firstNorthOffset) % 360 + 360) % 360;

    const options: VideoExportOptions = {
      durationSeconds: duration,
      fps,
      resolution,
      orientation,
      bitrateMbps,
      direction,
      includeWatermark,
      audioTrack: selectedAudioTrack,
      enableAudioLoopCrossfade: audioLoopCrossfade,
      antiMoire,
    };

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const totalBatch = selectedPanoramas.length;
    setIsExporting(true);
    setIsBatchExporting(true);
    setBatchTotalCount(totalBatch);
    setBatchCurrentIndex(0);
    setBatchCompletedPanos([]);
    setBatchReport([]);
    setShowReportModal(false);
    const startTs = Date.now();
    setBatchStartTime(startTs);
    setBatchElapsedSeconds(0);
    setBatchOverallEtaSeconds(Math.round(totalBatch * duration * 1.5));
    setProgress(null);

    const completedTimes: number[] = [];
    const completedList: { pano: Panorama; filename: string; sizeMB: number }[] = [];
    const completedReportList: BatchVideoReportItem[] = [];

    try {
      for (let i = 0; i < totalBatch; i++) {
        if (abortController.signal.aborted) break;

        const currentPano = selectedPanoramas[i];
        setBatchCurrentIndex(i);
        setBatchCurrentPano(currentPano);

        const panoStartTs = Date.now();

        // Switch viewer to this panorama and wait for the HIGHEST resolution texture
        if (onSelectPanorama) {
          onSelectPanorama(currentPano);
        }

        let textureInfo: ActiveTextureDetails = {
          tier: 'none',
          width: 0,
          height: 0,
          isMaxQuality: false,
          label: 'Neznáme rozlíšenie',
          sourceWidth: currentPano.width || 0,
          sourceHeight: currentPano.height || 0,
        };

        if (waitForTopResolution) {
          setProgress({
            currentFrame: 0,
            totalFrames: Math.round(duration * fps),
            percent: 0,
            fps: 0,
            elapsedSeconds: 0,
            estimatedRemainingSeconds: Math.round(duration * 1.5),
            stage: 'initializing',
            infoNote: `Čakám na plné rozlíšenie (${getHorizontalK(currentPano.width)})...`,
          });

          const res = await waitForTopResolution(
            String(currentPano.id),
            30000,
            (note) => {
              setProgress((prev) => (prev ? { ...prev, infoNote: note } : prev));
            }
          );
          textureInfo = res.textureInfo;
        } else if (waitForPanoReady) {
          await waitForPanoReady(String(currentPano.id), 12000);
        }

        if (abortController.signal.aborted) break;

        const videoRenderer = createVideoRenderer(width, height, { antiMoire });
        if (!videoRenderer) {
          throw new Error(`Nepodarilo sa vytvoriť WebGL Video Renderer pre panorámu #${currentPano.id}`);
        }

        if (videoRenderer.getActiveTextureInfo) {
          const vInfo = videoRenderer.getActiveTextureInfo();
          if (vInfo && vInfo.tier !== 'none' && (vInfo.width >= textureInfo.width || textureInfo.width === 0)) {
            textureInfo = vInfo;
          }
        }

        let completedFilename = '';
        let completedActualSizeMB = 0;
        let completedActualBitrateMbps = 0;
        let completedAudioTrackTitle = '';

        // Calculate camera startLon for current panorama so True Heading is IDENTICAL to lockedTrueHeading
        const currentNorthOffset = currentPano.sun_data?.north_offset ?? 0;
        const desiredLonNorm = ((lockedTrueHeading - currentNorthOffset) % 360 + 360) % 360;
        const curLonNorm = ((lockedLon % 360) + 360) % 360;
        let diff = desiredLonNorm - curLonNorm;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        const panoStartLon = lockedLon + diff;

        try {
          const blob = await exportPanorama360Video(
            videoRenderer,
            currentPano,
            panoStartLon,
            lockedLat,
            lockedFov,
            options,
            (p) => {
              if (p.filename) completedFilename = p.filename;
              if (p.actualSizeMB) completedActualSizeMB = p.actualSizeMB;
              if (p.actualBitrateMbps) completedActualBitrateMbps = p.actualBitrateMbps;
              if (p.audioTrackTitle) completedAudioTrackTitle = p.audioTrackTitle;
              setProgress(p);
              updateBatchEta(i, totalBatch, p, completedTimes, startTs);
            },
            abortController.signal
          );

          const filename = completedFilename || generateVideoFilename(currentPano, options);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 10000);

          const panoDurationSec = (Date.now() - panoStartTs) / 1000;
          completedTimes.push(panoDurationSec);

          const itemResult = {
            pano: currentPano,
            filename,
            sizeMB: completedActualSizeMB || estimatedMB,
          };
          completedList.push(itemResult);
          setBatchCompletedPanos([...completedList]);

          const reportItem: BatchVideoReportItem = {
            id: String(currentPano.id),
            title: currentPano.title || currentPano.city || `Panoráma #${currentPano.id}`,
            location: [currentPano.city, currentPano.country].filter(Boolean).join(', ') || 'Neznáma lokalita',
            date: currentPano.date ? formatPanoramaDate(currentPano.date) : '',
            filename,
            nativeResolution: `${getHorizontalK(currentPano.width)} (${(currentPano.width || 0).toLocaleString()}×${(currentPano.height || 0).toLocaleString()} px)`,
            textureTier: textureInfo.tier,
            textureResolution: `${(textureInfo.width || 0).toLocaleString()}×${(textureInfo.height || 0).toLocaleString()} px`,
            textureLabel: textureInfo.label,
            videoResolution: resolution,
            isMaxQuality: textureInfo.isMaxQuality,
            fileSizeMB: completedActualSizeMB || estimatedMB,
            durationSec: Math.round(panoDurationSec),
          };
          completedReportList.push(reportItem);
          setBatchReport([...completedReportList]);

          updateBatchEta(i + 1, totalBatch, null, completedTimes, startTs);
        } finally {
          videoRenderer.dispose();
        }

        if (i < totalBatch - 1 && !abortController.signal.aborted) {
          await new Promise((r) => setTimeout(r, 800));
        }
      }

      if (abortController.signal.aborted) {
        onShowToast(`Dávkový export zastavený. Úspešne stiahnutých ${completedList.length} z ${totalBatch} videí.`);
      } else {
        onShowToast(`Všetkých ${totalBatch} videí bolo úspešne vygenerovaných a stiahnutých!`);
      }
    } catch (err: any) {
      if (abortController.signal.aborted) {
        onShowToast('Dávkový export bol zrušený.');
      } else {
        console.error('Batch video export error:', err);
        onShowToast(`Chyba dávkového exportu: ${err.message || 'Chyba'}`);
      }
    } finally {
      setIsExporting(false);
      setIsBatchExporting(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="fixed inset-0 z-[2600] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg rounded-3xl glass-panel-elevated border border-white/20 shadow-2xl p-5 sm:p-6 text-white space-y-5 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 p-0.5 shadow-lg shadow-rose-950/50 flex items-center justify-center">
              <div className="w-full h-full bg-[#090a0f] rounded-[14px] flex items-center justify-center">
                <Video className="w-5 h-5 text-rose-400" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Export 360° Videa (Panning)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                  MP4 / H.264 (GPU)
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Plynulý panoramatický okruh 360° z aktuálneho pohľadu v prehliadači
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto custom-scrollbar space-y-4 pr-1">
          {isHighResReady === false && (
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span>Sťahuje sa 8K/15K plné rozlíšenie panorámy... Systém pred spustením renderu počká na plnú ostrosť.</span>
            </div>
          )}

          {!isWebCodecs && (
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Váš prehliadač nepodporuje hardvérový WebCodecs enkodér. Pre maximálnu rýchlosť a priamy H.264 MP4 export odporúčame použiť Google Chrome, Microsoft Edge alebo moderný Android.
              </span>
            </div>
          )}

          {/* Export Settings (disabled during export) */}
          <div className={`space-y-4 ${isExporting ? 'opacity-40 pointer-events-none' : ''}`}>
            {/* 1. Dĺžka (Duration) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Dĺžka videa (Trvanie 360° otočky)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDuration(60)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                    duration === 60
                      ? 'bg-rose-500/20 border-rose-500/60 text-white shadow-md shadow-rose-950/40 ring-1 ring-rose-400/50'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-sm font-black text-rose-300">60 sekúnd</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Odporúčané • Pomalý plynulý záber (6°/s)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDuration(30)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                    duration === 30
                      ? 'bg-rose-500/20 border-rose-500/60 text-white shadow-md shadow-rose-950/40 ring-1 ring-rose-400/50'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-sm font-black text-rose-300">30 sekúnd</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Rýchlejší prelet • Menšia veľkosť (12°/s)</span>
                </button>
              </div>
            </div>

            {/* 2. Rozlíšenie (Resolution) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-cyan-400" />
                <span>Rozlíšenie</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setResolution('1080p')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                    resolution === '1080p'
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200 ring-1 ring-cyan-400/50'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="font-extrabold text-xs">1080p Full HD</div>
                  <div className="text-[9px] text-zinc-400 font-mono">1920 × 1080</div>
                </button>
                <button
                  type="button"
                  onClick={() => setResolution('1440p')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                    resolution === '1440p'
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200 ring-1 ring-cyan-400/50'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="font-extrabold text-xs">1440p 2K QHD</div>
                  <div className="text-[9px] text-zinc-400 font-mono">2560 × 1440</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResolution('4k');
                    setBitrateMbps(140);
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                    resolution === '4k'
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200 ring-1 ring-cyan-400/50'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="font-extrabold text-xs">4K Ultra HD</div>
                  <div className="text-[9px] text-zinc-400 font-mono">3840 × 2160</div>
                </button>
              </div>
              {resolution === '4k' && (
                <div className="mt-2 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-200 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    Tip: Pre 4K zábery využíva hardvérový H.264 High Profile Level 5.2 GPU enkodér plný dátový tok (až 140 Mbps) a presné FPS s riadením fronty proti artefaktom.
                  </span>
                </div>
              )}
            </div>

            {/* 3. FPS & Formát pomeru strán */}
            <div className="grid grid-cols-2 gap-3">
              {/* FPS */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Snímková frekvencia</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFps(30)}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      fps === 30
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 ring-1 ring-amber-400/50'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    30 FPS
                  </button>
                  <button
                    type="button"
                    onClick={() => setFps(60)}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      fps === 60
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 ring-1 ring-amber-400/50'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    60 FPS
                  </button>
                </div>
              </div>

              {/* Orientácia */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Pomer strán</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      orientation === 'landscape'
                        ? 'bg-purple-500/20 border-purple-500/60 text-purple-200 ring-1 ring-purple-400/50'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    16:9 Šírka
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      orientation === 'portrait'
                        ? 'bg-purple-500/20 border-purple-500/60 text-purple-200 ring-1 ring-purple-400/50'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    9:16 Reels
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Dátový tok & Smer */}
            <div className="grid grid-cols-2 gap-3">
              {/* Bitrate */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Dátový tok</span>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-mono font-bold">
                    {bitrateMbps} Mbps
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[50, 80, 120, 140].map((mbps) => (
                    <button
                      key={mbps}
                      type="button"
                      onClick={() => setBitrateMbps(mbps)}
                      className={`py-1.5 rounded-lg border text-[11px] font-bold transition-all text-center cursor-pointer ${
                        bitrateMbps === mbps
                          ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 ring-1 ring-emerald-400/50'
                          : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {mbps}M
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-zinc-400 leading-tight">
                  {bitrateMbps === 50 && '50M • Štandard (úsporná veľkosť pre 1080p)'}
                  {bitrateMbps === 80 && '80M • Vysoká kvalita (pre 1440p / 4K)'}
                  {bitrateMbps === 120 && '120M • Ultra kvalita (Odporúčané pre 4K H.264)'}
                  {bitrateMbps === 140 && '140M • Master kvalita (140 Mbps • Plné využitie GPU)'}
                </div>
              </div>

              {/* Smer otáčania */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Smer otáčania</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDirection('clockwise')}
                    className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      direction === 'clockwise'
                        ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Doprava</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('counterclockwise')}
                    className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      direction === 'counterclockwise'
                        ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Doľava</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Hudobný sprievod (Soundtrack) */}
            <div className="space-y-2 pt-1 border-t border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-rose-400" />
                  <span>Hudobný sprievod do videa</span>
                </label>
                {selectedAudioTrack !== 'none' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                    AAC Stereo 192k
                  </span>
                )}
              </div>

              {/* Track selector grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EXPORT_AUDIO_TRACKS.map((track) => {
                  const isSelected = selectedAudioTrack === track.id;
                  const isPreviewing = previewTrackId === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => setSelectedAudioTrack(track.id)}
                      className={`p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-rose-500/20 border-rose-500/60 text-white shadow-md shadow-rose-950/40 ring-1 ring-rose-400/50'
                          : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-rose-500/30 text-rose-300' : 'bg-white/5 text-zinc-400'
                          }`}
                        >
                          <Music className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className={`font-bold truncate text-[11px] ${isSelected ? 'text-rose-200' : 'text-zinc-200'}`}>
                            {track.name}
                          </div>
                          <div className="text-[9px] text-zinc-400 truncate">
                            {track.subtitle}
                          </div>
                        </div>
                      </div>

                      {/* Preview listen button for playable tracks */}
                      {track.filename && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePreviewTrack(track.id, track.filename);
                          }}
                          className={`p-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
                            isPreviewing
                              ? 'bg-rose-500 text-zinc-950 border-rose-400 shadow-sm animate-pulse'
                              : 'bg-white/10 border-white/10 text-zinc-300 hover:text-white hover:bg-white/20'
                          }`}
                          title={isPreviewing ? 'Zastaviť ukážku' : 'Vypočuť ukážku'}
                        >
                          {isPreviewing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Seamless loop crossfade info card */}
              {selectedAudioTrack !== 'none' && (
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-rose-950/40 to-amber-950/30 border border-rose-500/20 text-xs text-zinc-300 space-y-1">
                  <div className="flex items-center justify-between text-rose-300">
                    <span className="flex items-center gap-1.5 font-bold text-[11px]">
                      <Sparkles className="w-3 h-3 text-rose-400" />
                      <span>Cyklická bezšvíková slučka ({duration}s)</span>
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30">
                      Equal-Power Fade
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Na konci videa v pozícii {duration}s sa hudba plynule preleje do začiatku skladby, takže pri opakovanom prehrávaní (Reels, TikTok, Web) pôsobí hudba úplne neprerušovane bez seknutia.
                  </p>
                </div>
              )}
            </div>

            {/* 6. Vodoznak a GPS súradnice v labeli */}
            <div className="space-y-1.5 pt-1 border-t border-white/5">
              {isAdmin ? (
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeWatermark}
                      onChange={(e) => setIncludeWatermark(e.target.checked)}
                      className="rounded border-white/20 bg-zinc-900 text-rose-500 focus:ring-rose-400/40 w-4 h-4 cursor-pointer mt-0.5"
                    />
                    <div className="text-xs text-zinc-300 space-y-0.5">
                      <div>Zahrnúť vodoznak s popisom, GPS, QR kódom a odkazom</div>
                      {hasGps && formattedGps && (
                        <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>GPS v labeli: {formattedGps}{panorama.altitude ? ` (${Math.round(panorama.altitude)} m)` : ''}</span>
                        </div>
                      )}
                      <div className="text-[10px] text-cyan-300 font-mono break-all">
                        {getCompletePanoramaUrl(panorama)}
                      </div>
                    </div>
                  </label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                    Admin voľba
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Export automaticky zahŕňa diskrétny vodoznak s QR kódom, GPS a odkazom:</span>
                  </div>
                  {hasGps && formattedGps && (
                    <div className="text-[10px] text-emerald-400 font-mono pl-5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>GPS v labeli: {formattedGps}{panorama.altitude ? ` (${Math.round(panorama.altitude)} m)` : ''}</span>
                    </div>
                  )}
                  <div className="text-[10px] text-cyan-300 font-mono pl-5 break-all">
                    {getCompletePanoramaUrl(panorama)}
                  </div>
                </div>
              )}
            </div>

            {/* 7. Anti-Moiré & Antialiasing */}
            <div className="space-y-1.5 pt-1 border-t border-white/5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={antiMoire}
                  onChange={(e) => setAntiMoire(e.target.checked)}
                  className="rounded border-white/20 bg-zinc-900 text-cyan-500 focus:ring-cyan-400/40 w-4 h-4 cursor-pointer mt-0.5"
                />
                <div className="text-xs text-zinc-300 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">Anti-moiré & Antialiasing (Vyhladenie hrán a potlačenie interferencií)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      Odporúčané
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Aktivuje hardvérové 4× MSAA vyhladzovanie, 16× anizotropnú filtráciu, trilineárny mipmapping a subpixelový filter na zamedzenie mihotania jemných mriežok (strechy, ploty, vedenia) pri otáčaní kamery.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Progress / Status display during export */}
          {isExporting && (
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-rose-500/40 space-y-3.5 animate-slide-up shadow-xl">
              {/* Batch Progress Dashboard if batch export is running */}
              {isBatchExporting && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span>
                        Dávka: Panoráma {batchCurrentIndex + 1} z {batchTotalCount}
                      </span>
                    </span>
                    <span className="font-mono font-extrabold text-amber-300">
                      {Math.round(((batchCurrentIndex + ((progress?.percent || 0) / 100)) / Math.max(1, batchTotalCount)) * 100)}%
                    </span>
                  </div>

                  {/* Batch slidebar */}
                  <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-amber-500/20">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-rose-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            Math.round(((batchCurrentIndex + ((progress?.percent || 0) / 100)) / Math.max(1, batchTotalCount)) * 100)
                          )
                        )}%`,
                      }}
                    />
                  </div>

                  {/* Batch Counters & ETA */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] sm:text-[11px] font-mono text-zinc-300 pt-0.5">
                    <div className="bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                      <div className="text-zinc-500 text-[9px] uppercase tracking-wider">Hotovo</div>
                      <div className="text-amber-300 font-bold">{batchCompletedPanos.length} / {batchTotalCount}</div>
                    </div>
                    <div className="bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                      <div className="text-zinc-500 text-[9px] uppercase tracking-wider">Zostáva</div>
                      <div className="text-zinc-200 font-bold">{Math.max(0, batchTotalCount - batchCompletedPanos.length)}</div>
                    </div>
                    <div className="bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                      <div className="text-zinc-500 text-[9px] uppercase tracking-wider">Celková ETA</div>
                      <div className="text-cyan-300 font-bold">~{formatEta(batchOverallEtaSeconds)}</div>
                    </div>
                    <div className="bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                      <div className="text-zinc-500 text-[9px] uppercase tracking-wider">Uplynulo</div>
                      <div className="text-zinc-300 font-bold">{formatEta(batchElapsedSeconds)}</div>
                    </div>
                  </div>

                  {batchCurrentPano && (
                    <div className="text-[11px] text-zinc-300 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-semibold text-white truncate">
                        {batchCurrentPano.title || batchCurrentPano.city || `Panoráma #${batchCurrentPano.id}`}
                      </span>
                      {batchCurrentPano.date && (
                        <span className="text-zinc-400 text-[10px] shrink-0 font-mono">
                          ({batchCurrentPano.date})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Live Preview Snapshot (~1x per second) */}
              {progress?.previewDataUrl && (
                <div className="relative w-full rounded-2xl overflow-hidden bg-black/90 border border-white/10 flex items-center justify-center shadow-2xl p-1">
                  <img
                    src={progress.previewDataUrl}
                    alt="Aktuálna snímka exportu"
                    className={`object-contain max-h-52 w-auto rounded-xl shadow transition-all duration-300 ${
                      orientation === 'portrait' ? 'aspect-[9/16]' : 'aspect-video'
                    }`}
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-white/10 flex items-center gap-1.5 shadow">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span>Živý náhľad (~1x/s)</span>
                  </div>
                  <div className="absolute bottom-3 right-3 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-mono text-zinc-300 border border-white/10 shadow">
                    #{progress.currentFrame} / {progress.totalFrames}
                  </div>
                </div>
              )}

              {progress && (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping" />
                      <span>
                        {progress.stage === 'initializing'
                          ? 'Pripravujem hardvérový H.264 GPU enkodér a hudobnú stopu...'
                          : progress.stage === 'muxing'
                          ? 'Dokončujem zápis MP4 súboru a prepájanie stôp...'
                          : `Generujem snímku ${progress.currentFrame.toLocaleString()} z ${progress.totalFrames.toLocaleString()}`}
                      </span>
                    </span>
                    <span className="font-mono font-extrabold text-rose-300">{progress.percent}%</span>
                  </div>

                  {/* Progress bar for single video */}
                  <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-cyan-400 rounded-full transition-all duration-150"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>

                  {/* Details & ETA for current video */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                    <span>Rýchlosť: ~{progress.fps} fps</span>
                    <span>Zostáva videu: {progress.estimatedRemainingSeconds}s</span>
                    <span>Uplynulo: {progress.elapsedSeconds}s</span>
                  </div>

                  {progress.infoNote && (
                    <div className="text-[11px] text-amber-200 bg-amber-500/15 border border-amber-500/30 rounded-xl p-2.5 flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{progress.infoNote}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Finished message - Batch Mode */}
          {!isExporting && batchCompletedPanos.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-zinc-900/90 to-amber-950/20 border border-amber-500/40 space-y-3 text-xs text-amber-200 animate-slide-up shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <span>Dávkový export dokončený!</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {batchCompletedPanos.length} videí
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-300 font-mono mt-0.5">
                      Úspešne vygenerovaných a stiahnutých {batchCompletedPanos.length} MP4 videí.
                    </div>
                    {batchReport.length > 0 && (
                      <div className="text-[10px] text-zinc-300 font-mono mt-1 flex items-center gap-2">
                        <span className="text-emerald-400 font-semibold">
                          ✓ {batchReport.filter((r) => r.isMaxQuality).length} v plnej kvalite
                        </span>
                        {batchReport.some((r) => !r.isMaxQuality) && (
                          <span className="text-amber-400">
                            • {batchReport.filter((r) => !r.isMaxQuality).length} fallback/zmenšené
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {batchReport.length > 0 && (
                <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Otvoriť správu o rozlíšení ({batchReport.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Kopírovať sumár do schránky"
                  >
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Kopírovať sumár</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Stiahnuť textovú správu"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Stiahnuť .txt</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Finished message - Single Mode */}
          {!isExporting && batchCompletedPanos.length === 0 && progress?.stage === 'complete' && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 space-y-2 text-xs text-emerald-200 animate-slide-up">
              <div className="flex items-start gap-3">
                {progress.previewDataUrl ? (
                  <img
                    src={progress.previewDataUrl}
                    alt="Náhľad vygenerovaného videa"
                    className="w-20 h-14 object-cover rounded-xl border border-emerald-500/30 shrink-0 shadow"
                  />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Video úspešne vygenerované a stiahnuté!</span>
                  </div>
                  <div className="text-[11px] text-emerald-300 font-mono mt-0.5 break-all">
                    {progress.filename}
                  </div>
                  <div className="text-[10px] text-zinc-300 font-mono mt-0.5">
                    {progress.actualSizeMB || estimatedMB} MB • Reálny dátový tok: {progress.actualBitrateMbps || bitrateMbps} Mbps
                    {progress.audioTrackTitle && ` • 🎵 ${progress.audioTrackTitle}`}
                  </div>
                </div>
              </div>
              {progress.infoNote && (
                <div className="text-[11px] text-amber-200 bg-amber-500/15 border border-amber-500/30 rounded-xl p-2 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{progress.infoNote}</span>
                </div>
              )}
            </div>
          )}

          {/* Info Summary Badge */}
          {!isExporting && (
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs text-zinc-300">
              <div className="space-y-0.5">
                <div className="font-semibold text-white">
                  {width} × {height} px • {duration}s • {totalFrames} snímok ({fps} fps)
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 flex-wrap">
                  <span>Kodek H.264 (AVC) • Dátový tok {bitrateMbps} Mbps</span>
                  {selectedAudioTrack !== 'none' && (
                    <span className="text-rose-300 font-medium">• 🎵 AAC Stereo (Seamless Loop)</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold text-rose-300 font-mono">~{estimatedMB} MB</div>
                <div className="text-[10px] text-zinc-400">odhad veľkosti</div>
              </div>
            </div>
          )}

          {/* Synchronized True Heading for Batch Export Notice */}
          {!isExporting && isAdmin && selectedPanoramas && selectedPanoramas.length > 1 && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
              <Compass className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-amber-300">Synchronizovaný azimut aktívny</div>
                <div className="text-[11px] text-zinc-300 leading-relaxed">
                  Všetky videá v dávke budú vygenerované s presne zhodným geografickým azimutom (kompasovým severom). V DaVinci Resolve alebo Premiere Pro ich stačí vložiť do vrstiev pod seba a môžete plynulo rotovať a prelínať medzi jednotlivými časovými snímkami bez akéhokoľvek posunu.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-end gap-2.5 shrink-0">
          {isExporting ? (
            <button
              type="button"
              onClick={handleCancelExport}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <StopCircle className="w-4 h-4 text-rose-400" />
              <span>{isBatchExporting ? 'Zrušiť dávkový export' : 'Zrušiť export'}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer"
              >
                Zavrieť
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleStartBatchExport}
                  disabled={!selectedPanoramas || selectedPanoramas.length === 0}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-zinc-950 font-black text-xs shadow-lg shadow-amber-950/50 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  title={
                    !selectedPanoramas || selectedPanoramas.length === 0
                      ? 'Označte panorámy v tiles alebo na mape'
                      : undefined
                  }
                >
                  <Layers className="w-4 h-4 text-zinc-950" />
                  <span>
                    {selectedPanoramas && selectedPanoramas.length > 0
                      ? `Batch generuj ${selectedPanoramas.length} videí (pre selektované panorámy)`
                      : 'Batch generuj videá (označte v tiles/mape)'}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={handleStartExport}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-zinc-950 font-black text-xs shadow-lg shadow-rose-950/50 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Video className="w-4 h-4 text-zinc-950" />
                <span>Spustiť export 360° videa ({estimatedMB} MB)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Detailed Resolution & Quality Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl max-h-[85vh] bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Správa o rozlíšení vygenerovaných videí
                    <span className="text-xs font-mono font-normal text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                      {batchReport.length} videí
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Prehľad použitých zdrojových panorám, skutočne vyrenderovaných textúr a výstupov
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick summary banner */}
            <div className="p-4 bg-zinc-900/40 border-b border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                <div className="text-zinc-500 text-[10px] uppercase tracking-wider">Celkovo videí</div>
                <div className="text-base font-bold text-white mt-0.5">{batchReport.length}</div>
              </div>
              <div className="bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/20">
                <div className="text-emerald-400 text-[10px] uppercase tracking-wider">Plná kvalita</div>
                <div className="text-base font-bold text-emerald-300 mt-0.5">
                  {batchReport.filter((r) => r.isMaxQuality).length}
                </div>
              </div>
              <div className="bg-amber-950/30 p-2.5 rounded-xl border border-amber-500/20">
                <div className="text-amber-400 text-[10px] uppercase tracking-wider">Fallback / Menšie</div>
                <div className="text-base font-bold text-amber-300 mt-0.5">
                  {batchReport.filter((r) => !r.isMaxQuality).length}
                </div>
              </div>
              <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                <div className="text-zinc-500 text-[10px] uppercase tracking-wider">Celková veľkosť</div>
                <div className="text-base font-bold text-cyan-300 mt-0.5">
                  {batchReport.reduce((acc, r) => acc + (r.fileSizeMB || 0), 0).toFixed(1)} MB
                </div>
              </div>
            </div>

            {/* Content: List of items */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
              {batchReport.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-white/15 transition-all text-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span className="font-mono text-zinc-500 text-[11px]">#{idx + 1}</span>
                      <span>{item.location}</span>
                      {item.date && (
                        <span className="text-[10px] text-zinc-400 font-mono">({item.date})</span>
                      )}
                    </div>
                    {item.isMaxQuality ? (
                      <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Plná kvalita ({item.textureTier.toUpperCase()})</span>
                      </span>
                    ) : (
                      <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        <span>Fallback ({item.textureTier.toUpperCase()})</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-zinc-300">
                    <div className="bg-black/30 p-2 rounded-xl border border-white/5 space-y-1">
                      <div className="text-zinc-500 text-[9px] uppercase tracking-wider">Zdroj vs Render textúra</div>
                      <div className="text-zinc-200">
                        Pôvodné: <span className="text-white font-bold">{item.nativeResolution}</span>
                      </div>
                      <div className="text-zinc-200">
                        Načítané: <span className="text-cyan-300 font-bold">{item.textureLabel}</span>
                      </div>
                    </div>
                    <div className="bg-black/30 p-2 rounded-xl border border-white/5 space-y-1">
                      <div className="text-zinc-500 text-[9px] uppercase tracking-wider">Výstupné video</div>
                      <div className="text-zinc-200 truncate" title={item.filename}>
                        {item.filename}
                      </div>
                      <div className="text-zinc-400">
                        {item.videoResolution} • <span className="text-rose-300 font-bold">{item.fileSizeMB} MB</span> • {item.durationSec}s render
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between gap-3 bg-zinc-900/60">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white border border-white/10 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Kopírovať sumár</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white border border-white/10 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Stiahnuť textovú správu (.txt)</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all cursor-pointer"
              >
                Zavrieť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
