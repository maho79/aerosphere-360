import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import type { Panorama, ActiveTextureDetails } from '../types';
import { SOUNDTRACK_SONGS } from './audioManager';
import { drawPanoramaWatermark } from './watermark';
import { formatPanoramaDate, getExportDateStr, getPanoramaCity } from './geo';

export interface ExportAudioTrackOption {
  id: string;
  name: string;
  subtitle: string;
  filename: string;
}

export const EXPORT_AUDIO_TRACKS: ExportAudioTrackOption[] = [
  {
    id: 'random',
    name: 'Náhodná skladba',
    subtitle: 'Automatický výber z ambientných skladieb',
    filename: '',
  },
  {
    id: 'Above_the_Glass_Wing',
    name: 'Above the Glass Wing',
    subtitle: 'Pokojné ambientné piáno & sláčiky',
    filename: 'Above_the_Glass_Wing.mp3',
  },
  {
    id: 'Beyond_the_Morning_Rise',
    name: 'Beyond the Morning Rise',
    subtitle: 'Povznášajúca atmosférická melódia',
    filename: 'Beyond_the_Morning_Rise.mp3',
  },
  {
    id: 'Golden_Latitude',
    name: 'Golden Latitude',
    subtitle: 'Hrejivý filmový soundtrack',
    filename: 'Golden_Latitude.mp3',
  },
  {
    id: 'none',
    name: 'Bez hudby',
    subtitle: 'Tiché video bez zvukovej stopy',
    filename: '',
  },
];

export interface VideoExportOptions {
  durationSeconds: 30 | 60 | number;
  fps: 30 | 60;
  resolution: '1080p' | '1440p' | '4k';
  orientation: 'landscape' | 'portrait';
  bitrateMbps: number; // e.g. 20, 30, 50 Mbps
  direction: 'clockwise' | 'counterclockwise';
  includeWatermark: boolean;
  audioTrack?: string; // id, filename, or 'random' | 'none'
  enableAudioLoopCrossfade?: boolean; // default true
  antiMoire?: boolean; // Anti-Moiré & Antialiasing (default true)
}

export interface VideoExportProgress {
  currentFrame: number;
  totalFrames: number;
  percent: number;
  fps: number;
  effectiveFps?: number;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
  stage: 'initializing' | 'rendering' | 'muxing' | 'complete' | 'cancelled' | 'error';
  infoNote?: string;
  previewDataUrl?: string;
  error?: string;
  fileBlob?: Blob;
  filename?: string;
  actualSizeMB?: number;
  actualBitrateMbps?: number;
  audioTrackTitle?: string;
}

export function isWebCodecsVideoSupported(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).VideoEncoder !== 'undefined';
}

export function isWebCodecsAudioSupported(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).AudioEncoder !== 'undefined' && typeof (window as any).AudioData !== 'undefined';
}

export function getVideoDimensions(resolution: '1080p' | '1440p' | '4k', orientation: 'landscape' | 'portrait'): { width: number; height: number } {
  let longEdge = 1920;
  let shortEdge = 1080;

  if (resolution === '1440p') {
    longEdge = 2560;
    shortEdge = 1440;
  } else if (resolution === '4k') {
    longEdge = 3840;
    shortEdge = 2160;
  }

  // Ensure dimensions are even numbers (divisible by 2) for H.264 encoder compatibility
  longEdge = Math.round(longEdge / 2) * 2;
  shortEdge = Math.round(shortEdge / 2) * 2;

  if (orientation === 'portrait') {
    return { width: shortEdge, height: longEdge };
  }
  return { width: longEdge, height: shortEdge };
}

export function estimateVideoFileSizeMB(durationSeconds: number, bitrateMbps: number, includeAudio: boolean = true): number {
  // Video MB = (bitrate in Mbps * seconds) / 8
  const videoMB = (bitrateMbps * durationSeconds) / 8;
  // Audio MB at 192 kbps (0.192 Mbps)
  const audioMB = includeAudio ? (0.192 * durationSeconds) / 8 : 0;
  return Math.round((videoMB + audioMB) * 10) / 10;
}

export interface WorkingEncoderSetup {
  codec: string;
  hardwareAcceleration: 'no-preference' | 'prefer-hardware' | 'prefer-software';
  effectiveFps: number;
  actualBitrateBps: number;
  bitrateMode: 'constant' | 'variable';
  latencyMode?: 'quality' | 'realtime';
  infoNote?: string;
  diagnosticText: string;
}

/**
 * Deep-tests candidate encoder configurations using both isConfigSupported and an actual
 * test VideoEncoder.configure() call inside try/catch. This avoids "DOMException: Encoder creation error"
 * crashes when hardware limits (such as 4K 60fps Level 5.2) are exceeded by GPU drivers.
 */
async function testEncoderConfig(config: any): Promise<boolean> {
  if (!isWebCodecsVideoSupported()) return false;
  try {
    if (typeof (window as any).VideoEncoder.isConfigSupported === 'function') {
      const res = await (window as any).VideoEncoder.isConfigSupported(config);
      if (!res || !res.supported) {
        return false;
      }
    }

    // Direct instantiation test to guarantee underlying D3D11 / NVENC / MediaCodec accepts it
    const testEnc = new (window as any).VideoEncoder({
      output: () => {},
      error: () => {},
    });
    testEnc.configure(config);
    testEnc.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Calculates optimal bitrate for high-speed dynamic 4K/1440p panning.
 * Respects user selection directly (e.g. 140 Mbps).
 */
function calculateOptimalBitrate(
  requestedBitrateBps: number,
  is4K: boolean,
  is1440p: boolean,
  fps: number
): number {
  if (requestedBitrateBps > 0) {
    return requestedBitrateBps;
  }
  if (is4K) {
    return fps >= 60 ? 140_000_000 : 100_000_000;
  }
  if (is1440p) {
    return fps >= 60 ? 80_000_000 : 60_000_000;
  }
  return 40_000_000;
}

export async function findWorkingEncoderSetup(
  width: number,
  height: number,
  bitrate: number,
  targetFps: number
): Promise<WorkingEncoderSetup> {
  if (!isWebCodecsVideoSupported()) {
    throw new Error('WebCodecs VideoEncoder is not supported in this browser');
  }

  const is4K = width >= 3840 || height >= 3840;
  const is1440p = !is4K && (width >= 2560 || height >= 2560);
  const actualBitrateBps = calculateOptimalBitrate(bitrate, is4K, is1440p, targetFps);

  // Reliable H.264 candidate codecs ordered by quality & capability:
  // avc1.640034 = High Profile Level 5.2 (Native 4K @ 60fps & up to 300 Mbps)
  // avc1.640033 = High Profile Level 5.1 (Universal standard for 4K @ 30fps & up to 300 Mbps)
  // avc1.4d0034 / avc1.4d0033 = Main Profile Level 5.2 / 5.1
  // avc1.640032 = High Profile Level 5.0 (Up to 168.75 Mbps)
  // avc1.64002a = High Profile Level 4.2
  const candidateCodecs = targetFps >= 60
    ? [
        'avc1.640034',
        'avc1.640033',
        'avc1.4d0034',
        'avc1.4d0033',
        'avc1.640032',
        'avc1.64002a',
        'avc1.4d002a',
        'avc1.640028',
      ]
    : [
        'avc1.640033',
        'avc1.640034',
        'avc1.4d0033',
        'avc1.4d0034',
        'avc1.640032',
        'avc1.64002a',
        'avc1.4d002a',
        'avc1.640028',
      ];

  // Rate & Latency configurations ordered for strict bitrate delivery:
  // CBR ('constant') forces the hardware encoder (NVENC, Intel QSV, AMD AMF, MediaFoundation)
  // to allocate the full requested bitrate (e.g. 140 Mbps) across every second without dropping to low 5-6 Mbps baseline.
  const rateConfigs: Array<{
    bitrateMode: 'constant' | 'variable';
    latencyMode?: 'quality' | 'realtime';
  }> = [
    { bitrateMode: 'constant', latencyMode: 'quality' },
    { bitrateMode: 'constant' },
    { bitrateMode: 'constant', latencyMode: 'realtime' },
    { bitrateMode: 'variable', latencyMode: 'quality' },
    { bitrateMode: 'variable' },
  ];

  const accelModes: Array<'prefer-hardware' | 'no-preference'> = [
    'prefer-hardware',
    'no-preference',
  ];

  const buildResult = (
    codec: string,
    accel: 'prefer-hardware' | 'no-preference' | 'prefer-software',
    fps: number,
    rateCfg: { bitrateMode: 'constant' | 'variable'; latencyMode?: 'quality' | 'realtime' },
    infoNote?: string
  ): WorkingEncoderSetup => {
    const diagnosticText = `H.264 (${codec}) • HW: ${accel} • Bitrate: ${(actualBitrateBps / 1_000_000).toFixed(0)} Mbps • ${fps} FPS [${rateCfg.bitrateMode}${rateCfg.latencyMode ? '/' + rateCfg.latencyMode : ''}]`;

    console.info(
      `%c[VideoEncoder] Selected H.264 GPU configuration: ${diagnosticText}`,
      'color: #06b6d4; font-weight: bold; font-size: 11px;'
    );

    return {
      codec,
      hardwareAcceleration: accel,
      effectiveFps: fps,
      actualBitrateBps,
      bitrateMode: rateCfg.bitrateMode,
      latencyMode: rateCfg.latencyMode,
      infoNote,
      diagnosticText,
    };
  };

  // 1. Primary pass: Check H.264 hardware encoders at EXACT targetFps (e.g. 60 FPS or 30 FPS) and full requested bitrate
  for (const rateCfg of rateConfigs) {
    for (const accel of accelModes) {
      for (const codec of candidateCodecs) {
        const config: any = {
          codec,
          width,
          height,
          bitrate: actualBitrateBps,
          framerate: targetFps,
          bitrateMode: rateCfg.bitrateMode,
          hardwareAcceleration: accel,
          avc: { format: 'avc' },
        };
        if (rateCfg.latencyMode) {
          config.latencyMode = rateCfg.latencyMode;
        }

        if (await testEncoderConfig(config)) {
          return buildResult(codec, accel, targetFps, rateCfg);
        }
        // Also test bare config without nested avc dict
        const { avc: _, ...bareConfig } = config;
        if (await testEncoderConfig(bareConfig)) {
          return buildResult(codec, accel, targetFps, rateCfg);
        }
      }
    }
  }

  // 2. Secondary fallback ONLY if 60 FPS is completely unsupported by driver at 4K
  if (targetFps === 60 && (is4K || is1440p)) {
    const fallbackFps = 30;
    const note = is4K
      ? 'Váš GPU ovládač nepodporuje 4K pri 60 FPS (Level 5.2). Video sa kóduje v 4K pri 30 FPS v plnej kvalite bez artefaktov.'
      : 'Pre dané rozlíšenie bolo automaticky zvolené stabilné 30 FPS.';

    for (const rateCfg of rateConfigs) {
      for (const accel of accelModes) {
        for (const codec of candidateCodecs) {
          const config: any = {
            codec,
            width,
            height,
            bitrate: actualBitrateBps,
            framerate: fallbackFps,
            bitrateMode: rateCfg.bitrateMode,
            hardwareAcceleration: accel,
            avc: { format: 'avc' },
          };
          if (rateCfg.latencyMode) {
            config.latencyMode = rateCfg.latencyMode;
          }

          if (await testEncoderConfig(config)) {
            return buildResult(codec, accel, fallbackFps, rateCfg, note);
          }
        }
      }
    }
  }

  // 3. Ultimate guaranteed fallback
  return buildResult(
    targetFps >= 60 ? 'avc1.640034' : 'avc1.640033',
    'no-preference',
    targetFps,
    { bitrateMode: 'constant' },
    'Použitá štandardná H.264 CBR konfigurácia enkodéra.'
  );
}

export function generateVideoFilename(
  panorama: Panorama,
  options: VideoExportOptions,
  actualFps?: number
): string {
  const dateStr = getExportDateStr(panorama.date);
  const cityRaw = getPanoramaCity(panorama) || (panorama.city && panorama.city !== 'Unknown' ? panorama.city : '');
  const cleanCity = cityRaw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const baseName = cleanCity || (panorama.filename ? panorama.filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') : `panorama_${panorama.id}`);
  const orientStr = options.orientation === 'portrait' ? '9x16' : '16x9';
  const fpsToUse = actualFps || options.fps;
  const audioSuffix = options.audioTrack && options.audioTrack !== 'none' ? '_audio' : '';

  return `${dateStr}_${baseName}_360pan_${options.durationSeconds}s_${options.resolution}_${fpsToUse}fps_${orientStr}${audioSuffix}.mp4`;
}

export function getSongAudioCandidates(filename: string): string[] {
  const clean = filename.replace(/^\/+/, '').replace(/^sounds\//, '');
  return [
    `/sounds/${clean}`,
    `/panoramas/sounds/${clean}`,
    `./sounds/${clean}`,
  ];
}

export async function fetchAudioBuffer(filename: string): Promise<AudioBuffer> {
  const candidates = getSongAudioCandidates(filename);
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API (AudioContext) nie je v tomto prehliadači podporované.');
  }

  const audioCtx = new AudioContextClass();
  let lastError: any = null;

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      try {
        await audioCtx.close();
      } catch {}
      return audioBuffer;
    } catch (err) {
      lastError = err;
    }
  }

  try {
    await audioCtx.close();
  } catch {}

  throw new Error(`Nepodarilo sa stiahnuť audio súbor: ${filename} (${lastError?.message || 'Chyba siete'})`);
}

/**
 * Creates a seamless audio loop of exact duration targetDurationSeconds with an equal-power
 * crossfade at the end, so that cyclic playback in loops (Reels, TikTok, Web, media players)
 * plays uninterrupted without clicks, pops, or volume dips.
 */
export function createLoopedAudioBuffer(
  audioBuffer: AudioBuffer,
  targetDurationSeconds: number,
  crossfadeSeconds: number = 4.0,
  volumeGain: number = 0.50
): { channels: Float32Array[]; sampleRate: number; totalSamples: number } {
  const sampleRate = audioBuffer.sampleRate;
  const totalSamples = Math.round(targetDurationSeconds * sampleRate);
  const fadeSamples = Math.min(
    Math.round(crossfadeSeconds * sampleRate),
    Math.round(totalSamples * 0.35)
  );

  const numChannels = Math.min(audioBuffer.numberOfChannels, 2);
  const outputChannels: Float32Array[] = [];

  for (let ch = 0; ch < numChannels; ch++) {
    const sourceData = audioBuffer.getChannelData(ch);
    const outData = new Float32Array(totalSamples);
    outputChannels.push(outData);

    const maxSourceLen = sourceData.length;
    const bodyLen = totalSamples - fadeSamples;

    // 1. Body: plays audio starting from offset fadeSamples with 50% comfortable volume
    for (let i = 0; i < bodyLen; i++) {
      const srcIdx = (i + fadeSamples) % maxSourceLen;
      outData[i] = sourceData[srcIdx] * volumeGain;
    }

    // 2. Crossfade at the end:
    // Blends continuation of the track (totalSamples..totalSamples+fadeSamples)
    // with the beginning of the track (0..fadeSamples).
    // Uses equal-power fade: cos(pi/2 * t)^2 + sin(pi/2 * t)^2 = 1.0.
    for (let k = 0; k < fadeSamples; k++) {
      const outIdx = bodyLen + k;
      const t = k / fadeSamples;
      const gainOut = Math.cos((Math.PI / 2) * t);
      const gainIn = Math.sin((Math.PI / 2) * t);

      const srcAIdx = (totalSamples + k) % maxSourceLen;
      const srcBIdx = k % maxSourceLen;

      const sampleA = sourceData[srcAIdx];
      const sampleB = sourceData[srcBIdx];

      outData[outIdx] = (gainOut * sampleA + gainIn * sampleB) * volumeGain;
    }
  }

  // Duplicate to stereo if mono
  if (outputChannels.length === 1) {
    outputChannels.push(new Float32Array(outputChannels[0]));
  }

  return {
    channels: outputChannels,
    sampleRate,
    totalSamples,
  };
}

export function getCompletePanoramaUrl(panorama: Panorama): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    return `${origin}/?pano=${encodeURIComponent(panorama.id)}`;
  }
  return `/?pano=${encodeURIComponent(panorama.id)}`;
}

export async function createVideoWatermarkOverlay(
  canvasWidth: number,
  canvasHeight: number,
  panorama: Panorama
): Promise<HTMLCanvasElement> {
  const overlay = document.createElement('canvas');
  overlay.width = canvasWidth;
  overlay.height = canvasHeight;
  const ctx = overlay.getContext('2d');
  if (!ctx) return overlay;

  const shareUrl = getCompletePanoramaUrl(panorama);
  const title = (panorama.city && panorama.city !== 'Unknown' ? panorama.city : '') ||
    (panorama.original_filename || panorama.filename || '360° Panorama');
  const country = panorama.country && panorama.country !== 'Unknown' ? panorama.country : undefined;
  const date = formatPanoramaDate(panorama.date);

  await drawPanoramaWatermark(ctx, {
    canvasWidth,
    canvasHeight,
    shareUrl,
    title,
    country,
    date,
    lat: panorama.lat,
    lon: panorama.lon,
    position: 'bottom-right',
  });

  return overlay;
}

export interface VideoRendererInstance {
  getCanvas: () => HTMLCanvasElement;
  renderFrame: (lonDeg: number, latDeg: number, customFov?: number) => void;
  isHighResReady?: () => boolean;
  waitForHighRes?: (timeoutMs?: number) => Promise<boolean>;
  getActiveTextureInfo?: () => ActiveTextureDetails;
  dispose: () => void;
}

/**
 * High-performance deterministic frame-by-frame 360° video export using WebCodecs & mp4-muxer.
 * Rotates full 360° horizontally starting from startLon, preserving current tilt (lat) and fov.
 */
export async function exportPanorama360Video(
  videoRenderer: VideoRendererInstance,
  panorama: Panorama,
  startLon: number,
  startLat: number,
  startFov: number,
  options: VideoExportOptions,
  onProgress?: (progress: VideoExportProgress) => void,
  abortSignal?: AbortSignal
): Promise<Blob> {
  const { width, height } = getVideoDimensions(options.resolution, options.orientation);
  const bitrateBps = options.bitrateMbps * 1_000_000;

  onProgress?.({
    currentFrame: 0,
    totalFrames: Math.round(options.durationSeconds * options.fps),
    percent: 0,
    fps: 0,
    elapsedSeconds: 0,
    estimatedRemainingSeconds: options.durationSeconds,
    stage: 'initializing',
  });

  // Pre-render watermark overlay once if enabled (avoids any frame-by-frame overhead)
  const watermarkOverlay = options.includeWatermark
    ? await createVideoWatermarkOverlay(width, height, panorama)
    : null;

  // Probe and find the verified working encoder configuration with CBR and quality mode
  const encoderSetup = await findWorkingEncoderSetup(width, height, bitrateBps, options.fps);
  const effectiveFps = encoderSetup.effectiveFps;
  const totalFrames = Math.round(options.durationSeconds * effectiveFps);
  const directionSign = options.direction === 'counterclockwise' ? -1 : 1;
  const degreesPerFrame = (360 / totalFrames) * directionSign;

  // Check and wait for high-resolution 8K/15K texture if still downloading
  if (videoRenderer.waitForHighRes && videoRenderer.isHighResReady && !videoRenderer.isHighResReady()) {
    onProgress?.({
      currentFrame: 0,
      totalFrames,
      percent: 0,
      fps: 0,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: options.durationSeconds,
      stage: 'initializing',
      infoNote: 'Čakám na dokončenie sťahovania plného 8K/15K rozlíšenia panorámy pre maximálnu ostrosť...',
    });
    await videoRenderer.waitForHighRes(15000);
  }

  // 1. Resolve and prepare soundtrack with seamless loop crossfade
  let resolvedAudioFilename: string | null = null;
  let resolvedAudioTrackTitle = '';

  if (options.audioTrack && options.audioTrack !== 'none') {
    if (options.audioTrack === 'random') {
      const candidates = SOUNDTRACK_SONGS;
      resolvedAudioFilename = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      const found = EXPORT_AUDIO_TRACKS.find(
        (t) => t.id === options.audioTrack || t.filename === options.audioTrack
      );
      if (found && found.filename) {
        resolvedAudioFilename = found.filename;
      } else {
        resolvedAudioFilename = options.audioTrack.endsWith('.mp3')
          ? options.audioTrack
          : `${options.audioTrack}.mp3`;
      }
    }
    const match = EXPORT_AUDIO_TRACKS.find(
      (t) => t.filename === resolvedAudioFilename || t.id === options.audioTrack
    );
    resolvedAudioTrackTitle = match ? match.name : (resolvedAudioFilename || '').replace('.mp3', '').replace(/_/g, ' ');
  }

  let audioDataLooped: { channels: Float32Array[]; sampleRate: number; totalSamples: number } | null = null;
  let audioEncoderConfig: { codec: string; sampleRate: number; numberOfChannels: number; bitrate: number } | null = null;
  let audioNote: string | undefined = undefined;

  const isAudioEncoderSupported = isWebCodecsAudioSupported();

  if (resolvedAudioFilename && isAudioEncoderSupported) {
    try {
      onProgress?.({
        currentFrame: 0,
        totalFrames,
        percent: 0,
        fps: 0,
        elapsedSeconds: 0,
        estimatedRemainingSeconds: options.durationSeconds,
        stage: 'initializing',
        infoNote: `Pripravujem hudobný sprievod (${resolvedAudioTrackTitle}) a vytváram bezšvíkovú slučku...`,
      });

      const decodedBuffer = await fetchAudioBuffer(resolvedAudioFilename);
      const crossfadeSec = options.enableAudioLoopCrossfade !== false
        ? Math.min(4.0, options.durationSeconds * 0.15)
        : 0;

      audioDataLooped = createLoopedAudioBuffer(decodedBuffer, options.durationSeconds, crossfadeSec);

      // Verify AAC encoder support
      const candidateAudioConfigs = [
        { codec: 'mp4a.40.2', sampleRate: audioDataLooped.sampleRate, numberOfChannels: 2, bitrate: 192000 },
        { codec: 'mp4a.40.2', sampleRate: 44100, numberOfChannels: 2, bitrate: 192000 },
      ];

      for (const cfg of candidateAudioConfigs) {
        if (typeof (window as any).AudioEncoder.isConfigSupported === 'function') {
          const sup = await (window as any).AudioEncoder.isConfigSupported(cfg);
          if (sup && sup.supported) {
            audioEncoderConfig = cfg;
            break;
          }
        } else {
          audioEncoderConfig = cfg;
          break;
        }
      }

      if (!audioEncoderConfig) {
        audioNote = 'Prehliadač nepodporuje AAC AudioEncoder, video sa exportuje bez zvuku.';
      }
    } catch (err: any) {
      console.warn('Nepodarilo sa pripraviť zvukovú stopu pre video export:', err);
      audioNote = `Skladbu sa nepodarilo načítať (${err.message || 'Chyba siete'}), video bude bez hudby.`;
      audioDataLooped = null;
      audioEncoderConfig = null;
    }
  } else if (resolvedAudioFilename && !isAudioEncoderSupported) {
    audioNote = 'Tento prehliadač nepodporuje WebCodecs AudioEncoder, video bude bez hudby.';
  }

  // 2. Create MP4 Muxer with AVC (H.264) video track and optional AAC audio track
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width,
      height,
      frameRate: effectiveFps,
    },
    audio: audioEncoderConfig && audioDataLooped ? {
      codec: 'aac',
      numberOfChannels: 2,
      sampleRate: audioEncoderConfig.sampleRate,
    } : undefined,
    fastStart: 'in-memory',
    firstTimestampBehavior: 'strict',
  });

  // 3. Encode audio track into muxer if available
  if (audioEncoderConfig && audioDataLooped) {
    let audioEncoderError: Error | null = null;
    const audioEncoder = new (window as any).AudioEncoder({
      output: (chunk: any, meta: any) => {
        muxer.addAudioChunk(chunk, meta);
      },
      error: (e: any) => {
        console.error('AudioEncoder error:', e);
        audioEncoderError = e instanceof Error ? e : new Error(String(e));
      },
    });

    try {
      audioEncoder.configure(audioEncoderConfig);

      const chunkSize = 2048;
      const totalAudioSamples = audioDataLooped.totalSamples;
      let sampleOffset = 0;

      while (sampleOffset < totalAudioSamples) {
        if (abortSignal?.aborted) {
          throw new Error('Export bol zrušený používateľom');
        }
        if (audioEncoderError) {
          throw audioEncoderError;
        }

        const currentFrames = Math.min(chunkSize, totalAudioSamples - sampleOffset);
        const planarBuffer = new Float32Array(currentFrames * 2);
        planarBuffer.set(audioDataLooped.channels[0].subarray(sampleOffset, sampleOffset + currentFrames), 0);
        planarBuffer.set(audioDataLooped.channels[1].subarray(sampleOffset, sampleOffset + currentFrames), currentFrames);

        const timestampUs = Math.round((sampleOffset / audioDataLooped.sampleRate) * 1_000_000);

        const audioFrame = new (window as any).AudioData({
          format: 'f32-planar',
          sampleRate: audioDataLooped.sampleRate,
          numberOfFrames: currentFrames,
          numberOfChannels: 2,
          timestamp: timestampUs,
          data: planarBuffer,
        });

        audioEncoder.encode(audioFrame);
        audioFrame.close();

        sampleOffset += currentFrames;
      }

      await audioEncoder.flush();
      audioEncoder.close();
    } catch (aErr: any) {
      console.warn('Audio encoding error:', aErr);
      try {
        audioEncoder.close();
      } catch {}
      audioNote = `Kódovanie audia zlyhalo (${aErr.message || 'Chyba'}), video pokračuje bez zvuku.`;
    }
  }

  let encoderError: Error | null = null;

  // 4. Setup WebCodecs VideoEncoder with verified parameters and quality latencyMode
  const encoder = new (window as any).VideoEncoder({
    output: (chunk: any, meta: any) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (e: any) => {
      console.error('VideoEncoder error:', e);
      encoderError = e instanceof Error ? e : new Error(String(e));
    },
  });

  const encoderConfig: any = {
    codec: encoderSetup.codec,
    width,
    height,
    bitrate: encoderSetup.actualBitrateBps,
    framerate: effectiveFps,
    bitrateMode: encoderSetup.bitrateMode,
    hardwareAcceleration: encoderSetup.hardwareAcceleration,
    avc: { format: 'avc' },
  };

  if (encoderSetup.latencyMode) {
    encoderConfig.latencyMode = encoderSetup.latencyMode;
  }

  try {
    encoder.configure(encoderConfig);
  } catch (err: any) {
    console.warn('[VideoEncoder] Primary configure threw, trying fallback without nested format dict:', err);
    delete encoderConfig.avc;
    try {
      encoder.configure(encoderConfig);
    } catch (fallbackErr: any) {
      console.warn('[VideoEncoder] Fallback configure also threw, trying generic configuration:', fallbackErr);
      encoder.configure({
        codec: effectiveFps >= 60 ? 'avc1.640034' : 'avc1.640033',
        width,
        height,
        bitrate: encoderSetup.actualBitrateBps,
        framerate: effectiveFps,
        bitrateMode: encoderSetup.bitrateMode,
        hardwareAcceleration: 'no-preference',
      });
    }
  }

  const startTime = performance.now();
  let lastProgressUpdate = performance.now();

  // Lightweight offscreen canvas for live frame snapshots (~1x per second) with zero rendering overhead
  const previewCanvas = document.createElement('canvas');
  const previewWidth = options.orientation === 'portrait' ? 180 : 320;
  const previewHeight = options.orientation === 'portrait' ? 320 : 180;
  previewCanvas.width = previewWidth;
  previewCanvas.height = previewHeight;
  const previewCtx = previewCanvas.getContext('2d');
  let lastPreviewSnapshotTime = 0;
  let latestPreviewDataUrl: string | undefined = undefined;

  try {
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      if (abortSignal?.aborted) {
        throw new Error('Export bol zrušený používateľom');
      }

      if (encoderError) {
        throw encoderError;
      }

      // Calculate camera horizontal angle for seamless 360° rotation
      const currentLon = startLon + frameIndex * degreesPerFrame;

      // Render frame offscreen in Three.js
      videoRenderer.renderFrame(currentLon, startLat, startFov);
      const canvas = videoRenderer.getCanvas();

      // Draw pre-rendered watermark overlay with complete link & QR code
      if (watermarkOverlay) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(watermarkOverlay, 0, 0);
        }
      }

      // Capture lightweight live preview snapshot once every ~1000ms (1s) or on initial frame
      const now = performance.now();
      if (now - lastPreviewSnapshotTime >= 1000 || frameIndex === 0) {
        lastPreviewSnapshotTime = now;
        if (previewCtx) {
          previewCtx.drawImage(canvas, 0, 0, previewWidth, previewHeight);
          latestPreviewDataUrl = previewCanvas.toDataURL('image/jpeg', 0.65);
        }
      }

      // Timestamp and frame duration in microseconds
      const timestampUs = Math.round((frameIndex * 1_000_000) / effectiveFps);
      const frameDurationUs = Math.round(1_000_000 / effectiveFps);
      // Keyframe (I-frame) every 1 second (effectiveFps frames) to prevent motion drift and macroblock degradation
      const isKeyFrame = frameIndex % effectiveFps === 0;

      const videoFrame = new (window as any).VideoFrame(canvas, {
        timestamp: timestampUs,
        duration: frameDurationUs,
      });
      encoder.encode(videoFrame, { keyFrame: isKeyFrame });
      videoFrame.close();

      // Backpressure control: If encode queue size exceeds limit (> 4), pause and await until hardware encoder processes frames (<= 2)
      if (encoder.encodeQueueSize > 4) {
        await new Promise<void>((resolve) => {
          let resolved = false;
          let pollTimer: any = null;
          let timeoutTimer: any = null;

          const cleanup = () => {
            if (!resolved) {
              resolved = true;
              if (dequeueHandler && 'removeEventListener' in encoder) {
                encoder.removeEventListener('dequeue', dequeueHandler);
              }
              if (pollTimer) clearInterval(pollTimer);
              if (timeoutTimer) clearTimeout(timeoutTimer);
              resolve();
            }
          };

          const dequeueHandler = () => {
            if (encoder.encodeQueueSize <= 2) {
              cleanup();
            }
          };

          if ('addEventListener' in encoder) {
            encoder.addEventListener('dequeue', dequeueHandler);
          } else if ('ondequeue' in encoder) {
            encoder.ondequeue = dequeueHandler;
          }

          pollTimer = setInterval(() => {
            if (encoder.encodeQueueSize <= 2) {
              cleanup();
            }
          }, 4);

          // Failsafe timeout after 250ms
          timeoutTimer = setTimeout(cleanup, 250);
        });
      }

      // Throttle progress updates to ~15-20 fps to avoid UI overhead
      if (now - lastProgressUpdate > 65 || frameIndex === totalFrames - 1) {
        lastProgressUpdate = now;
        const elapsedSec = (now - startTime) / 1000;
        const processedFps = (frameIndex + 1) / (elapsedSec || 0.001);
        const remainingFrames = totalFrames - (frameIndex + 1);
        const estRemainingSec = Math.max(0, Math.round(remainingFrames / (processedFps || 1)));
        const percent = Math.min(100, Math.round(((frameIndex + 1) / totalFrames) * 100));

        onProgress?.({
          currentFrame: frameIndex + 1,
          totalFrames,
          percent,
          fps: Math.round(processedFps),
          effectiveFps,
          elapsedSeconds: Math.round(elapsedSec),
          estimatedRemainingSeconds: estRemainingSec,
          stage: 'rendering',
          infoNote: encoderSetup.diagnosticText,
          previewDataUrl: latestPreviewDataUrl,
        });
      }
    }

    onProgress?.({
      currentFrame: totalFrames,
      totalFrames,
      percent: 100,
      fps: effectiveFps,
      effectiveFps,
      elapsedSeconds: Math.round((performance.now() - startTime) / 1000),
      estimatedRemainingSeconds: 0,
      stage: 'muxing',
      infoNote: encoderSetup.diagnosticText,
      previewDataUrl: latestPreviewDataUrl,
    });

    // 3. Finalize encoder and muxer
    await encoder.flush();
    encoder.close();

    muxer.finalize();

    const videoBlob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
    const filename = generateVideoFilename(panorama, options, effectiveFps);
    const actualSizeMB = Math.round((videoBlob.size / (1024 * 1024)) * 10) / 10;
    const actualBitrateMbps = Math.round(((videoBlob.size * 8) / (options.durationSeconds * 1_000_000)) * 10) / 10;
    const finalInfoNote = [encoderSetup.diagnosticText, encoderSetup.infoNote, audioNote].filter(Boolean).join(' • ') || undefined;

    onProgress?.({
      currentFrame: totalFrames,
      totalFrames,
      percent: 100,
      fps: effectiveFps,
      effectiveFps,
      elapsedSeconds: Math.round((performance.now() - startTime) / 1000),
      estimatedRemainingSeconds: 0,
      stage: 'complete',
      fileBlob: videoBlob,
      filename,
      actualSizeMB,
      actualBitrateMbps,
      infoNote: finalInfoNote,
      previewDataUrl: latestPreviewDataUrl,
      audioTrackTitle: resolvedAudioTrackTitle || undefined,
    });

    return videoBlob;
  } catch (err: any) {
    try {
      encoder.close();
    } catch {}
    if (abortSignal?.aborted) {
      onProgress?.({
        currentFrame: 0,
        totalFrames,
        percent: 0,
        fps: 0,
        elapsedSeconds: 0,
        estimatedRemainingSeconds: 0,
        stage: 'cancelled',
      });
    } else {
      onProgress?.({
        currentFrame: 0,
        totalFrames,
        percent: 0,
        fps: 0,
        elapsedSeconds: 0,
        estimatedRemainingSeconds: 0,
        stage: 'error',
        error: err.message || 'Chyba pri kódovaní videa',
      });
    }
    throw err;
  }
}
