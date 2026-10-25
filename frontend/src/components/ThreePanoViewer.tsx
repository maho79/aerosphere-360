import { panoConfig } from '../config/panoConfig';
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { cleanPanoPath, getResolutionCategory, getHorizontalK, type Panorama, type ActiveTextureDetails } from '../types';
import { drawPanoramaWatermark } from '../utils/watermark';
import { SpatialAudioManager } from '../utils/audioManager';
import { getPanoramaSun3DPosition, calculateTrueHeading } from '../utils/solarCalculator';
import { getDistance, formatDistance, getSavedCameraState, saveCameraState } from '../utils/geo';
import { calculateVisiblePOIs, type PlacedHorizonPOI } from '../utils/poiService';

export function getGeodesicBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

export interface WatermarkMeta {
  title?: string;
  country?: string;
  date?: string;
  lat?: number | null;
  lon?: number | null;
}

export interface ThreePanoViewerRef {
  captureCurrentView: (
    suggestedFilename?: string,
    shareUrl?: string,
    meta?: WatermarkMeta
  ) => Promise<boolean>;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setOneToOneZoom: () => void;
  panBy: (deltaLonDeg: number, deltaLatDeg: number) => void;
  lookAtHeading: (headingDeg: number) => void;
  setOrientation?: (lonDeg: number, latDeg: number, fovDeg?: number) => void;
  getViewState?: () => {
    lon: number;
    lat: number;
    fov: number;
    projectionMode: ProjectionMode;
  };
  resetView?: () => void;
  toggleGyroscope?: (forceState?: boolean) => Promise<boolean>;
  flyToHeading?: (headingDeg: number, targetPitch?: number, targetFov?: number) => void;
  isHighResLoaded?: () => boolean;
  createVideoRenderer?: (
    width: number,
    height: number,
    options?: { antiMoire?: boolean } | boolean
  ) => {
    getCanvas: () => HTMLCanvasElement;
    renderFrame: (lonDeg: number, latDeg: number, customFov?: number) => void;
    isHighResReady?: () => boolean;
    waitForHighRes?: (timeoutMs?: number) => Promise<boolean>;
    getActiveTextureInfo?: () => ActiveTextureDetails;
    dispose: () => void;
  } | null;
  getCurrentPanoId?: () => string;
  waitForPanoReady?: (targetPanoId: string, timeoutMs?: number) => Promise<boolean>;
  waitForTopResolution?: (
    targetPanoId: string,
    timeoutMs?: number,
    onStatus?: (status: string) => void
  ) => Promise<{ success: boolean; textureInfo: ActiveTextureDetails }>;
  getActiveTextureInfo?: (forPanoId?: string) => ActiveTextureDetails;
}

export interface ZoomInfo {
  percent: number;
  text: string;
  is1to1: boolean;
}

export type ProjectionMode = 'rectilinear' | 'curved' | 'little_planet';
export type AutoPanDirection = 'right' | 'left' | 'none';

export type TextureState = 'loading' | 'preview_2k' | 'hd_8k' | 'ultra_hd' | 'preview_2k_final';

export interface CalibrationOverlayConfig {
  referencePanorama: Panorama;
  targetNorthOffset: number;
  blend: number; // 0.0 to 1.0 (e.g. 0.5 default)
}

export interface ThreePanoViewerProps {
  panorama: Panorama;
  nextPanorama?: Panorama | null;
  prevPanorama?: Panorama | null;
  initialLon?: number;
  initialLat?: number;
  initialFov?: number;
  isAutoPanning: boolean;
  autoPanDirection?: AutoPanDirection;
  projectionMode?: ProjectionMode;
  isLittlePlanet?: boolean;
  isHdr?: boolean;
  isMovieMode?: boolean;
  isSpatialAudioEnabled?: boolean;
  spatialAudioVolume?: number;
  isSolarCompassEnabled?: boolean;
  isPeakFinderEnabled?: boolean;
  isWalkthroughEnabled?: boolean;
  isGyroscopeEnabled?: boolean;
  onToggleGyroscope?: (active: boolean) => void;
  isCalibratingSun?: boolean;
  onCalibrateSunPoint?: (coords: { imgLon: number; imgLat: number }) => void;
  calibrationOverlay?: CalibrationOverlayConfig | null;
  filmstripPanoramas?: (Panorama & { distance?: number })[];
  onSelectPanorama?: (panorama: Panorama) => void;
  onHeadingChange?: (headingDeg: number, currentLon: number, currentLat: number, currentFov?: number) => void;
  onFullCircleComplete?: () => void;
  onAutoPanStop?: () => void;
  onHighResLoaded?: () => void;
  onTextureStateChange?: (state: TextureState, details?: { width?: number; height?: number }) => void;
  onLoadingChange?: (loading: boolean) => void;
  onError?: (err: string) => void;
  onZoomChange?: (info: ZoomInfo) => void;
  forcedTrueHeading?: number | null;
}

function createCompassMarkerSprite(
  text: string,
  isMajor: boolean,
  subText?: string,
  directionLetter?: string
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;

    if (directionLetter) {
      // 1. Prominent Direction Badge at the top
      const isCardinal = ['N', 'E', 'S', 'W'].includes(directionLetter);
      const badgeW = isCardinal ? 54 : 74;
      const badgeH = 46;
      const badgeX = centerX - badgeW / 2;
      const badgeY = 6;
      const badgeRadius = 14;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeRadius);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      // Color-code cardinals: N = Rose, E = Sky, S = Amber, W = Violet, Intercardinals = Teal
      ctx.fillStyle = directionLetter === 'N'
        ? '#e11d48'
        : directionLetter === 'E'
        ? '#0284c7'
        : directionLetter === 'S'
        ? '#d97706'
        : directionLetter === 'W'
        ? '#7c3aed'
        : '#0d9488';
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      // Bold direction letter
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = isCardinal ? '900 32px monospace, system-ui' : '900 24px monospace, system-ui';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 4;
      ctx.fillText(directionLetter, centerX, badgeY + badgeH / 2);
      ctx.shadowColor = 'transparent';

      // 2. Degree label below badge
      const labelY = badgeY + badgeH + 18;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 20px monospace, sans-serif';

      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
      ctx.strokeText(text, centerX, labelY);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, centerX, labelY);

      if (subText) {
        ctx.font = 'bold 12px monospace, sans-serif';
        ctx.lineWidth = 3;
        ctx.strokeText(subText, centerX, labelY + 16);
        ctx.fillStyle = '#7dd3fc';
        ctx.fillText(subText, centerX, labelY + 16);
      }

      // Vertical tick line UNDER the text pointing down towards horizon
      const lineStartY = labelY + (subText ? 24 : 14);
      const lineEndY = h - 6;

      // Pass 1: Outer white border
      ctx.beginPath();
      ctx.moveTo(centerX, lineStartY);
      ctx.lineTo(centerX, lineEndY);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8.0;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Pass 2: Inner black core line
      ctx.beginPath();
      ctx.moveTo(centerX, lineStartY);
      ctx.lineTo(centerX, lineEndY);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4.0;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Bottom tip dot
      ctx.beginPath();
      ctx.arc(centerX, lineEndY, 5.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX, lineEndY, 3.0, 0, 2 * Math.PI);
      ctx.fillStyle = '#000000';
      ctx.fill();
    } else {
      // Regular degree tick (15°, 30°, 60°...)
      const textY = 56;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 24px monospace, sans-serif';

      ctx.lineWidth = 5.0;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
      ctx.strokeText(text, centerX, textY);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, centerX, textY);

      const lineStartY = textY + 18;
      const lineEndY = h - 6;

      // Pass 1: Outer white border
      ctx.beginPath();
      ctx.moveTo(centerX, lineStartY);
      ctx.lineTo(centerX, lineEndY);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6.0;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Pass 2: Inner black core line
      ctx.beginPath();
      ctx.moveTo(centerX, lineStartY);
      ctx.lineTo(centerX, lineEndY);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(isMajor ? 38 : 26, isMajor ? 23.75 : 16.25, 1);
  return sprite;
}

function createPanoramaMarkerBubbleSprite(
  itemNumber: number,
  distanceStr: string,
  is15K: boolean = false,
  isPrivate: boolean = false
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    // Bubble body dimensions
    const bx = 12;
    const by = 10;
    const bw = w - bx * 2; // 156px
    const bh = 104; // 104px
    const r = 24; // corner radius
    const tipX = cx;
    const tipY = h - 8; // 152px
    const tailHalfW = 16;

    // 1. Draw bubble with narrower bottom (tapered tail pointing down)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw - r, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + r, r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
    // Right side of bottom edge to tail
    ctx.lineTo(tipX + tailHalfW, by + bh);
    // Tail pointing down to narrow tip
    ctx.lineTo(tipX, tipY);
    // Left side of tail back to bottom edge
    ctx.lineTo(tipX - tailHalfW, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.arcTo(bx, by + bh, bx, by + bh - r, r);
    ctx.lineTo(bx, by + r);
    ctx.arcTo(bx, by, bx + r, by, r);
    ctx.closePath();

    // Bubble Fill: Deep dark glass background with rich gradient
    const grad = ctx.createLinearGradient(0, by, 0, tipY);
    if (is15K) {
      grad.addColorStop(0, '#1c1404');
      grad.addColorStop(0.7, '#0f0b02');
      grad.addColorStop(1, '#b45309');
    } else if (isPrivate) {
      grad.addColorStop(0, '#1f0910');
      grad.addColorStop(0.7, '#110408');
      grad.addColorStop(1, '#be123c');
    } else {
      grad.addColorStop(0, '#0a1628');
      grad.addColorStop(0.7, '#060d19');
      grad.addColorStop(1, '#0284c7');
    }
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();

    // 2. Crisp Border Stroke
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw - r, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + r, r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
    ctx.lineTo(tipX + tailHalfW, by + bh);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(tipX - tailHalfW, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.arcTo(bx, by + bh, bx, by + bh - r, r);
    ctx.lineTo(bx, by + r);
    ctx.arcTo(bx, by, bx + r, by, r);
    ctx.closePath();

    ctx.strokeStyle = is15K ? '#f59e0b' : isPrivate ? '#f43f5e' : '#38bdf8';
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Bottom pointer tip highlight dot
    ctx.beginPath();
    ctx.arc(tipX, tipY - 1, 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // 3. Top Line: Large Prominent Panorama #Number
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '900 44px monospace, system-ui, sans-serif';

    // Black stroke around text for ultra-sharp readability
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(`#${itemNumber}`, cx, by + 52);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`#${itemNumber}`, cx, by + 52);

    // 4. Bottom Line: Distance in m or km
    ctx.font = 'bold 22px monospace, system-ui, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(distanceStr, cx, by + 86);

    ctx.fillStyle = is15K ? '#fbbf24' : isPrivate ? '#fb7185' : '#7dd3fc';
    ctx.fillText(distanceStr, cx, by + 86);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(24, 21.33, 1);
  return sprite;
}

function createPoiMarkerSprite(poi: PlacedHorizonPOI): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 130;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const bx = 10;
    const by = 8;
    const bw = w - bx * 2;
    const bh = 80;
    const r = 16;
    const tipX = cx;
    const tipY = h - 6;

    // Background pill
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(bx, by, bw, bh, r);
    } else {
      ctx.rect(bx, by, bw, bh);
    }
    const grad = ctx.createLinearGradient(0, by, 0, by + bh);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // Top icon + name
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${poi.icon} ${poi.name}`, cx, by + 28, bw - 16);

    // Subtitle: elevation & distance
    ctx.font = 'bold 15px monospace, sans-serif';
    ctx.fillStyle = '#7dd3fc';
    const elevStr = poi.elevationMeters ? `${poi.elevationMeters} m · ` : '';
    ctx.fillText(`${elevStr}${poi.distanceKmStr}`, cx, by + 56);

    // Pointer line to horizon
    ctx.beginPath();
    ctx.moveTo(cx, by + bh);
    ctx.lineTo(tipX, tipY);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Tip dot
    ctx.beginPath();
    ctx.arc(tipX, tipY, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(28, 15.16, 1);
  return sprite;
}

function createWalkthroughChevronSprite(itemNumber: number, title: string, distStr: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;

    // Glowing chevron badge
    ctx.save();
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 14;

    // Double chevron arrow pointing forward
    ctx.beginPath();
    ctx.moveTo(cx - 36, 60);
    ctx.lineTo(cx, 24);
    ctx.lineTo(cx + 36, 60);
    ctx.lineTo(cx + 24, 60);
    ctx.lineTo(cx, 38);
    ctx.lineTo(cx - 24, 60);
    ctx.closePath();
    ctx.fillStyle = '#22d3ee';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - 36, 88);
    ctx.lineTo(cx, 52);
    ctx.lineTo(cx + 36, 88);
    ctx.lineTo(cx + 24, 88);
    ctx.lineTo(cx, 66);
    ctx.lineTo(cx - 24, 88);
    ctx.closePath();
    ctx.fillStyle = '#06b6d4';
    ctx.fill();
    ctx.restore();

    // Bottom pill with distance & number
    const pillW = 120;
    const pillH = 32;
    const pillX = cx - pillW / 2;
    const pillY = 96;

    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(pillX, pillY, pillW, pillH, 16);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fillStyle = 'rgba(8, 51, 68, 0.88)';
    ctx.fill();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 17px monospace, system-ui';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${distStr}`, cx, pillY + pillH / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(22, 17.1, 1);
  return sprite;
}

export const ThreePanoViewer = forwardRef<ThreePanoViewerRef, ThreePanoViewerProps>(({
  panorama,
  nextPanorama,
  prevPanorama,
  initialLon,
  initialLat,
  initialFov,
  isAutoPanning,
  autoPanDirection,
  projectionMode,
  isLittlePlanet = false,
  isHdr = false,
  isMovieMode = false,
  isSpatialAudioEnabled = false,
  spatialAudioVolume = 0.5,
  isSolarCompassEnabled = false,
  isPeakFinderEnabled = false,
  isWalkthroughEnabled = false,
  isGyroscopeEnabled = false,
  onToggleGyroscope,
  isCalibratingSun = false,
  onCalibrateSunPoint,
  calibrationOverlay,
  filmstripPanoramas = [],
  onSelectPanorama,
  onHeadingChange,
  onFullCircleComplete,
  onAutoPanStop,
  onHighResLoaded,
  onTextureStateChange,
  onLoadingChange,
  onError,
  onZoomChange,
  forcedTrueHeading,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const littlePlanetSceneRef = useRef<THREE.Scene | null>(null);
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const quadMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const dummyTextureRef = useRef<THREE.DataTexture | null>(null);
  if (!dummyTextureRef.current) {
    const dummyData = new Uint8Array([17, 17, 24, 255]);
    const dTex = new THREE.DataTexture(dummyData, 1, 1);
    dTex.needsUpdate = true;
    dummyTextureRef.current = dTex;
  }
  const prevTextureRef = useRef<THREE.Texture | null>(null);
  const sphereUniformsRef = useRef<{
    uHdr: { value: number };
    uPrevTexture: { value: THREE.Texture };
    uBlend: { value: number };
    uHasPrev: { value: number };
    uPrevOffset: { value: number };
  }>({
    uHdr: { value: isHdr ? 1.0 : 0.0 },
    uPrevTexture: { value: dummyTextureRef.current },
    uBlend: { value: 1.0 },
    uHasPrev: { value: 0.0 },
    uPrevOffset: { value: 0.0 },
  });
  const lastTrueHeadingRef = useRef<number | null>(null);
  const lastLatRef = useRef<number>(0);
  const lastSavedStateTimeRef = useRef<number>(0);
  const previousPanoIdRef = useRef<string | null>(null);
  const previousNorthOffsetRef = useRef<number>(panorama.sun_data?.north_offset ?? 0);
  const audioManagerRef = useRef<SpatialAudioManager | null>(null);
  const sunMarkerGroupRef = useRef<THREE.Group | null>(null);
  const compassRingGroupRef = useRef<THREE.Group | null>(null);
  const panoramaMarkersGroupRef = useRef<THREE.Group | null>(null);
  const poiMarkersGroupRef = useRef<THREE.Group | null>(null);
  const walkthroughGroupRef = useRef<THREE.Group | null>(null);
  const isGyroscopeActiveRef = useRef<boolean>(false);
  const lastDeviceAlphaRef = useRef<number | null>(null);
  const lastDeviceBetaRef = useRef<number | null>(null);
  const onHeadingChangeRef = useRef(onHeadingChange);
  onHeadingChangeRef.current = onHeadingChange;
  const onSelectPanoramaRef = useRef(onSelectPanorama);
  onSelectPanoramaRef.current = onSelectPanorama;
  const filmstripPanoramasRef = useRef(filmstripPanoramas);
  filmstripPanoramasRef.current = filmstripPanoramas;
  const isCalibratingSunRef = useRef(isCalibratingSun);
  isCalibratingSunRef.current = isCalibratingSun;
  const onCalibrateSunPointRef = useRef(onCalibrateSunPoint);
  onCalibrateSunPointRef.current = onCalibrateSunPoint;
  const onHighResLoadedRef = useRef(onHighResLoaded);
  onHighResLoadedRef.current = onHighResLoaded;
  const onTextureStateChangeRef = useRef(onTextureStateChange);
  onTextureStateChangeRef.current = onTextureStateChange;
  const applyHighResRef = useRef<((tex: THREE.Texture) => void) | null>(null);
  const isDisposedRef = useRef<boolean>(false);
  const loadEpochRef = useRef<number>(0);
  const activeTexturesRef = useRef<{
    thumb: THREE.Texture | null;
    pano2k: THREE.Texture | null;
    pano8k: THREE.Texture | null;
    full: THREE.Texture | null;
  }>({ thumb: null, pano2k: null, pano8k: null, full: null });
  const panoramaRef = useRef<Panorama>(panorama);
  panoramaRef.current = panorama;
  const nextPanoramaRef = useRef<Panorama | null>(nextPanorama || null);
  nextPanoramaRef.current = nextPanorama || null;
  const prevPanoramaRef = useRef<Panorama | null>(prevPanorama || null);
  prevPanoramaRef.current = prevPanorama || null;
  const isHighResFinishedRef = useRef<boolean>(false);
  const activeTexturePanoIdRef = useRef<string | null>(null);
  const isPanoCrossfadeActiveRef = useRef<boolean>(false);
  const deferred15KTimeoutRef = useRef<any>(null);
  const triggerDeferred15KRef = useRef<(() => void) | null>(null);
  const fallback2kTimeoutRef = useRef<any>(null);
  const isCalibrationActiveRef = useRef<boolean>(false);
  const calibrationRefTextureRef = useRef<THREE.Texture | null>(null);

  const forceCrossfadeComplete = () => {
    isPanoCrossfadeActiveRef.current = false;
    stateRef.current.isCrossfading = false;
    sphereUniformsRef.current.uBlend.value = 1.0;
    sphereUniformsRef.current.uHasPrev.value = 0.0;
    sphereUniformsRef.current.uPrevOffset.value = 0.0;

    if (quadMaterialRef.current?.uniforms.uPrevOffset) {
      quadMaterialRef.current.uniforms.uPrevOffset.value = 0.0;
    }
    if (quadMaterialRef.current?.uniforms.uHasPrev) {
      quadMaterialRef.current.uniforms.uHasPrev.value = 0.0;
    }
    if (quadMaterialRef.current?.uniforms.uBlend) {
      quadMaterialRef.current.uniforms.uBlend.value = 1.0;
    }

    const topTex =
      activeTexturesRef.current.full ||
      activeTexturesRef.current.pano8k ||
      activeTexturesRef.current.pano2k ||
      activeTexturesRef.current.thumb;

    if (topTex) {
      if (materialRef.current && materialRef.current.map !== topTex) {
        materialRef.current.map = topTex;
        materialRef.current.color.setHex(0xffffff);
        materialRef.current.needsUpdate = true;
      }
      if (quadMaterialRef.current && quadMaterialRef.current.uniforms.uTexture.value !== topTex) {
        quadMaterialRef.current.uniforms.uTexture.value = topTex;
      }
    }
  };

  const getActiveTextureInfo = (forPanoId?: string): ActiveTextureDetails => {
    const currentPano = panoramaRef.current;
    const pWidth = currentPano?.width || 0;
    const pHeight = currentPano?.height || 0;
    const maxTex = rendererRef.current?.capabilities?.maxTextureSize || 4096;

    if (forPanoId && activeTexturePanoIdRef.current !== String(forPanoId)) {
      return {
        tier: 'none',
        width: 0,
        height: 0,
        isMaxQuality: false,
        label: 'Načítavam...',
        sourceWidth: pWidth,
        sourceHeight: pHeight,
      };
    }

    let activeTex: THREE.Texture | null = null;
    let tier: 'full' | '8k' | '2k' | 'thumb' | 'none' = 'none';

    if (activeTexturesRef.current.full) {
      activeTex = activeTexturesRef.current.full;
      tier = 'full';
    } else if (activeTexturesRef.current.pano8k) {
      activeTex = activeTexturesRef.current.pano8k;
      tier = '8k';
    } else if (activeTexturesRef.current.pano2k) {
      activeTex = activeTexturesRef.current.pano2k;
      tier = '2k';
    } else if (activeTexturesRef.current.thumb) {
      activeTex = activeTexturesRef.current.thumb;
      tier = 'thumb';
    }

    let texW = 0;
    let texH = 0;
    if (activeTex?.image) {
      const img = activeTex.image as any;
      texW = img.naturalWidth || img.width || 0;
      texH = img.naturalHeight || img.height || 0;
    }

    if (texW === 0) {
      if (tier === 'full') {
        texW = Math.min(pWidth || 8192, maxTex);
        texH = Math.min(pHeight || 4096, Math.round(maxTex / 2));
      } else if (tier === '8k') {
        texW = Math.min(8192, maxTex);
        texH = Math.min(4096, Math.round(maxTex / 2));
      } else if (tier === '2k') {
        texW = 2048;
        texH = 1024;
      }
    }

    const isMaxQuality =
      tier === 'full' ||
      (tier === '8k' && (pWidth <= 8192 || maxTex <= 8192)) ||
      (tier === '2k' && (pWidth <= 2048 || maxTex < 4096));

    let label = 'Neznáme rozlíšenie';
    if (tier === 'full') {
      label = `${getHorizontalK(texW)} Ultra-HD (${texW.toLocaleString()}×${texH.toLocaleString()} px)`;
    } else if (tier === '8k') {
      label = isMaxQuality
        ? `8K HD (${texW.toLocaleString()}×${texH.toLocaleString()} px)`
        : `8K HD (${texW.toLocaleString()}×${texH.toLocaleString()} px) [Zdroj: ${getHorizontalK(pWidth)}]`;
    } else if (tier === '2k') {
      label = isMaxQuality
        ? `2K HD (${texW.toLocaleString()}×${texH.toLocaleString()} px)`
        : `2K HD (${texW.toLocaleString()}×${texH.toLocaleString()} px) [Fallback z ${getHorizontalK(pWidth)}]`;
    } else if (tier === 'thumb') {
      label = 'Nízka kvalita (Miniatúra)';
    }

    return {
      tier,
      width: texW,
      height: texH,
      isMaxQuality,
      label,
      sourceWidth: pWidth,
      sourceHeight: pHeight,
    };
  };

  interface PreloadEntry {
    tex: THREE.Texture;
    isHighRes: boolean;
    key: string;
    timestamp: number;
  }
  const preloadedTexturesRef = useRef<Map<string, PreloadEntry>>(new Map());

  const configureTexture = (tex: THREE.Texture) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
  };

  const downsampleSourceIfNeeded = (
    source: ImageBitmap | HTMLImageElement,
    maxSize: number
  ): HTMLCanvasElement | ImageBitmap | HTMLImageElement => {
    const width = 'naturalWidth' in source ? source.naturalWidth : source.width;
    const height = 'naturalHeight' in source ? source.naturalHeight : source.height;

    if (width <= maxSize && height <= maxSize) {
      return source;
    }

    const scale = Math.min(maxSize / width, maxSize / height);
    const targetW = Math.max(1, Math.floor(width * scale));
    const targetH = Math.max(1, Math.floor(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return source;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, targetW, targetH);

    if ('close' in source && typeof (source as any).close === 'function') {
      try {
        (source as any).close();
      } catch {}
    }

    return canvas;
  };

  const loadPanoTextureAsync = (
    url: string,
    onSuccess: (tex: THREE.Texture) => void,
    onError?: (err?: any) => void
  ) => {
    const maxTextureSize = rendererRef.current?.capabilities?.maxTextureSize || 8192;

    const loadViaImageElement = () => {
      if (isDisposedRef.current) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (isDisposedRef.current) return;
        try {
          const finalSource = downsampleSourceIfNeeded(img, maxTextureSize);
          const tex = (typeof HTMLCanvasElement !== 'undefined' && finalSource instanceof HTMLCanvasElement)
                ? new THREE.CanvasTexture(finalSource)
                : new THREE.Texture(finalSource as any);
              tex.needsUpdate = true;
          configureTexture(tex);
          if (rendererRef.current) {
            try { rendererRef.current.initTexture(tex); } catch {}
          }
          onSuccess(tex);
        } catch (e) {
          onError?.(e);
        }
      };
      img.onerror = (e) => {
        onError?.(e);
      };
      img.src = url;
    };

    if (typeof window !== 'undefined' && typeof createImageBitmap === 'function') {
      try {
        const ibLoader = new THREE.ImageBitmapLoader();
        ibLoader.setOptions({ imageOrientation: 'flipY', premultiplyAlpha: 'none' });
        ibLoader.load(
          url,
          async (imageBitmap) => {
            if (isDisposedRef.current) {
              try { (imageBitmap as any)?.close?.(); } catch {}
              return;
            }
            try {
              let finalSource: ImageBitmap | HTMLCanvasElement = imageBitmap;
              const width = imageBitmap.width;
              const height = imageBitmap.height;

              if (width > maxTextureSize || height > maxTextureSize) {
                const scale = Math.min(maxTextureSize / width, maxTextureSize / height);
                const targetW = Math.max(1, Math.floor(width * scale));
                const targetH = Math.max(1, Math.floor(height * scale));

                try {
                  // Asynchronous, off-thread hardware worker resize with ZERO main-thread CPU freeze
                  finalSource = await createImageBitmap(imageBitmap, {
                    resizeWidth: targetW,
                    resizeHeight: targetH,
                    resizeQuality: 'medium',
                    imageOrientation: 'none',
                    premultiplyAlpha: 'none',
                  });
                  try { (imageBitmap as any)?.close?.(); } catch {}
                } catch {
                  finalSource = downsampleSourceIfNeeded(imageBitmap, maxTextureSize) as HTMLCanvasElement;
                }
              }

              if (isDisposedRef.current) {
                try { (finalSource as any)?.close?.(); } catch {}
                return;
              }

              const tex = (typeof HTMLCanvasElement !== 'undefined' && finalSource instanceof HTMLCanvasElement)
                ? new THREE.CanvasTexture(finalSource)
                : new THREE.Texture(finalSource as any);
              tex.needsUpdate = true;
              tex.flipY = false;
              configureTexture(tex);
              if (rendererRef.current) {
                try { rendererRef.current.initTexture(tex); } catch {}
              }
              onSuccess(tex);
            } catch {
              loadViaImageElement();
            }
          },
          undefined,
          () => {
            loadViaImageElement();
          }
        );
        return;
      } catch {
        // Fallback to loadViaImageElement below
      }
    }

    loadViaImageElement();
  };

  const safeDisposePreloaded = (key: string) => {
    const entry = preloadedTexturesRef.current.get(key);
    if (entry) {
      preloadedTexturesRef.current.delete(key);
      if (
        entry.tex !== prevTextureRef.current &&
        entry.tex !== activeTexturesRef.current.full &&
        entry.tex !== activeTexturesRef.current.pano2k &&
        entry.tex !== activeTexturesRef.current.thumb
      ) {
        entry.tex.dispose();
      }
    }
  };

  const preloadPanorama = (pano: Panorama | null | undefined, preferHighRes: boolean) => {
    if (!pano || !pano.filename || isDisposedRef.current) return;
    const cleanKey = cleanPanoPath(pano.filename);
    const existing = preloadedTexturesRef.current.get(cleanKey);
    if (existing && (!preferHighRes || existing.isHighRes)) {
      return;
    }

    // Keep cache bounded (max 4 preloaded textures)
    if (preloadedTexturesRef.current.size >= 4) {
      const currentClean = cleanPanoPath(panoramaRef.current?.filename || '');
      const nextClean = nextPanoramaRef.current ? cleanPanoPath(nextPanoramaRef.current.filename) : '';
      const prevClean = prevPanoramaRef.current ? cleanPanoPath(prevPanoramaRef.current.filename) : '';

      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [key, item] of preloadedTexturesRef.current.entries()) {
        if (key !== currentClean && key !== nextClean && key !== prevClean) {
          if (item.timestamp < oldestTime) {
            oldestTime = item.timestamp;
            oldestKey = key;
          }
        }
      }
      if (oldestKey) {
        safeDisposePreloaded(oldestKey);
      }
    }

    const cacheBuster = pano?.size ? `?v=${pano.size}` : '';
    const isLocalMode = panoConfig.storage.mode === 'local';
    const pano2kUrl = isLocalMode
      ? `/panoramas_2k/${cleanKey}${cacheBuster}`
      : `${panoConfig.storage.panoramas2kUrl}/${cleanKey}${cacheBuster}`;
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const highResCandidates = isLocalMode
      ? [
          `/panoramas_web/${cleanKey}${cacheBuster}`,
          `/panoramas_2k/${cleanKey}${cacheBuster}`,
        ]
      : [
          ...(panoConfig.storage.panoramasWebUrl ? [`${panoConfig.storage.panoramasWebUrl}/${cleanKey}${cacheBuster}`] : []),
          `/panoramas_web/${cleanKey}${cacheBuster}`,
          ...(isLocal && panoConfig.storage.tunnelUrl ? [`${panoConfig.storage.tunnelUrl}/panoramas_web/${cleanKey}${cacheBuster}`] : []),
        ];

    const storePreloaded = (tex: THREE.Texture, isHighRes: boolean) => {
      if (isDisposedRef.current) {
        tex.dispose();
        return;
      }
      configureTexture(tex);
      if (rendererRef.current) {
        try {
          rendererRef.current.initTexture(tex);
        } catch {
          // Safe fallback
        }
      }
      const prevEntry = preloadedTexturesRef.current.get(cleanKey);
      if (prevEntry && prevEntry.tex !== tex) {
        safeDisposePreloaded(cleanKey);
      }
      preloadedTexturesRef.current.set(cleanKey, {
        tex,
        isHighRes,
        key: cleanKey,
        timestamp: Date.now(),
      });
    };

    const tryPreloadHiRes = (idx: number) => {
      if (idx >= highResCandidates.length) return;
      loadPanoTextureAsync(
        highResCandidates[idx],
        (hiTex) => {
          storePreloaded(hiTex, true);
          const currentClean = cleanPanoPath(panoramaRef.current?.filename || '');
          if (currentClean === cleanKey && applyHighResRef.current) {
            applyHighResRef.current(hiTex);
          }
        },
        () => tryPreloadHiRes(idx + 1)
      );
    };

    if (preferHighRes) {
      loadPanoTextureAsync(
        pano2kUrl,
        (tex2k) => {
          storePreloaded(tex2k, false);
          tryPreloadHiRes(0);
        },
        () => {
          loadPanoTextureAsync(
            `/panoramas_2k/${cleanKey}${cacheBuster}`,
            (tex2k) => {
              storePreloaded(tex2k, false);
              tryPreloadHiRes(0);
            },
            () => {
              tryPreloadHiRes(0);
            }
          );
        }
      );
    } else {
      loadPanoTextureAsync(
        pano2kUrl,
        (tex2k) => storePreloaded(tex2k, false),
        () => {
          loadPanoTextureAsync(
            `/panoramas_2k/${cleanKey}${cacheBuster}`,
            (tex2k) => storePreloaded(tex2k, false),
            () => {}
          );
        }
      );
    }
  };

  const checkIsNextReady = () => {
    if (!nextPanoramaRef.current || nextPanoramaRef.current.id === panoramaRef.current.id) {
      return true;
    }
    const nextClean = cleanPanoPath(nextPanoramaRef.current.filename);
    const entry = preloadedTexturesRef.current.get(nextClean);
    return !!(entry && entry.tex);
  };

  const [isRendererReady, setIsRendererReady] = useState(false);
  const lastZoomTextRef = useRef<string>('');

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const s = stateRef.current;
      const isShader = s.projectionMode === 'little_planet' || s.projectionMode === 'curved';
      if (isShader) {
        if (s.projectionMode === 'curved') {
          const container = containerRef.current;
          const renderer = rendererRef.current;
          const w = container ? (container.clientWidth || window.innerWidth) : window.innerWidth;
          const h = container ? (container.clientHeight || window.innerHeight) : window.innerHeight;
          const dpr = renderer ? renderer.getPixelRatio() : (window.devicePixelRatio || 1);
          const physicalW = renderer ? renderer.domElement.width : w * dpr;
          const physicalH = renderer ? renderer.domElement.height : h * dpr;
          const minDim = Math.min(physicalW, physicalH);
          const panoW = panoramaRef.current.width || 8192;
          const uZoom_1to1 = panoW / (minDim * Math.PI);
          const curPercent = (s.targetLittlePlanetZoom / uZoom_1to1) * 100;
          const newPercent = Math.round(curPercent) + 1;
          s.targetLittlePlanetZoom = Math.max(0.22, Math.min(5.0, (newPercent / 100) * uZoom_1to1));
        } else {
          // little_planet
          const curPercent = s.targetLittlePlanetZoom * 100;
          const newPercent = Math.round(curPercent) + 1;
          s.targetLittlePlanetZoom = Math.max(0.30, Math.min(3.0, newPercent / 100));
        }
      } else {
        const container = containerRef.current;
        const renderer = rendererRef.current;
        const h = container ? (container.clientHeight || window.innerHeight) : window.innerHeight;
        const dpr = renderer ? renderer.getPixelRatio() : (window.devicePixelRatio || 1);
        const physicalH = renderer ? renderer.domElement.height : h * dpr;
        const panoW = panoramaRef.current.width || 8192;
        const fov1to1_rad = 2 * Math.atan((physicalH * Math.PI) / panoW);
        const current_rad = THREE.MathUtils.degToRad(s.targetFov);
        const curPercent = (Math.tan(fov1to1_rad / 2) / Math.tan(current_rad / 2)) * 100;
        const newPercent = Math.round(curPercent) + 1;
        const newFovRad = 2 * Math.atan(Math.tan(fov1to1_rad / 2) / (newPercent / 100));
        s.targetFov = Math.max(15, Math.min(110, THREE.MathUtils.radToDeg(newFovRad)));
      }
    },
    zoomOut: () => {
      const s = stateRef.current;
      const isShader = s.projectionMode === 'little_planet' || s.projectionMode === 'curved';
      if (isShader) {
        if (s.projectionMode === 'curved') {
          const container = containerRef.current;
          const renderer = rendererRef.current;
          const w = container ? (container.clientWidth || window.innerWidth) : window.innerWidth;
          const h = container ? (container.clientHeight || window.innerHeight) : window.innerHeight;
          const dpr = renderer ? renderer.getPixelRatio() : (window.devicePixelRatio || 1);
          const physicalW = renderer ? renderer.domElement.width : w * dpr;
          const physicalH = renderer ? renderer.domElement.height : h * dpr;
          const minDim = Math.min(physicalW, physicalH);
          const panoW = panoramaRef.current.width || 8192;
          const uZoom_1to1 = panoW / (minDim * Math.PI);
          const curPercent = (s.targetLittlePlanetZoom / uZoom_1to1) * 100;
          const newPercent = Math.max(1, Math.round(curPercent) - 1);
          s.targetLittlePlanetZoom = Math.max(0.22, Math.min(5.0, (newPercent / 100) * uZoom_1to1));
        } else {
          // little_planet
          const curPercent = s.targetLittlePlanetZoom * 100;
          const newPercent = Math.max(1, Math.round(curPercent) - 1);
          s.targetLittlePlanetZoom = Math.max(0.30, Math.min(3.0, newPercent / 100));
        }
      } else {
        const container = containerRef.current;
        const renderer = rendererRef.current;
        const h = container ? (container.clientHeight || window.innerHeight) : window.innerHeight;
        const dpr = renderer ? renderer.getPixelRatio() : (window.devicePixelRatio || 1);
        const physicalH = renderer ? renderer.domElement.height : h * dpr;
        const panoW = panoramaRef.current.width || 8192;
        const fov1to1_rad = 2 * Math.atan((physicalH * Math.PI) / panoW);
        const current_rad = THREE.MathUtils.degToRad(s.targetFov);
        const curPercent = (Math.tan(fov1to1_rad / 2) / Math.tan(current_rad / 2)) * 100;
        const newPercent = Math.max(1, Math.round(curPercent) - 1);
        const newFovRad = 2 * Math.atan(Math.tan(fov1to1_rad / 2) / (newPercent / 100));
        s.targetFov = Math.max(15, Math.min(110, THREE.MathUtils.radToDeg(newFovRad)));
      }
    },
    resetZoom: () => {
      const s = stateRef.current;
      const isShader = s.projectionMode === 'little_planet' || s.projectionMode === 'curved';
      if (isShader) {
        const defaultZoom = s.projectionMode === 'curved' ? 0.90 : 0.85;
        s.targetLittlePlanetZoom = defaultZoom;
      } else {
        s.targetFov = 75;
      }
    },
    setOneToOneZoom: () => {
      const s = stateRef.current;
      const container = containerRef.current;
      const renderer = rendererRef.current;
      const w = container ? (container.clientWidth || window.innerWidth) : window.innerWidth;
      const h = container ? (container.clientHeight || window.innerHeight) : window.innerHeight;
      const dpr = renderer ? renderer.getPixelRatio() : (window.devicePixelRatio || 1);
      const physicalW = renderer ? renderer.domElement.width : w * dpr;
      const physicalH = renderer ? renderer.domElement.height : h * dpr;
      const panoW = panoramaRef.current.width || 8192;

      const isShader = s.projectionMode === 'little_planet' || s.projectionMode === 'curved';
      if (isShader) {
        if (s.projectionMode === 'curved') {
          const minDim = Math.min(physicalW, physicalH);
          const uZoom_1to1 = panoW / (minDim * Math.PI);
          s.targetLittlePlanetZoom = Math.max(0.22, Math.min(5.0, uZoom_1to1));
          s.targetLittlePlanetPitch = 0;
        } else {
          s.targetLittlePlanetZoom = 1.0;
          s.targetLittlePlanetPitch = 0;
        }
      } else {
        // Standard rectilinear view: tan(fovV / 2) = (physicalH * PI) / panoW
        const fovV_rad = 2 * Math.atan((physicalH * Math.PI) / panoW);
        const fovV_deg = THREE.MathUtils.radToDeg(fovV_rad);
        s.targetFov = Math.max(15, Math.min(110, fovV_deg));
        s.targetLat = 0;
      }
    },
    panBy: (deltaLonDeg: number, deltaLatDeg: number) => {
      const s = stateRef.current;
      const isShader = s.projectionMode === 'little_planet' || s.projectionMode === 'curved';
      if (isShader) {
        s.targetLittlePlanetYaw += THREE.MathUtils.degToRad(deltaLonDeg);
        const pitchLimit = 1.45;
        const deltaPitchRad = THREE.MathUtils.degToRad(deltaLatDeg);
        s.targetLittlePlanetPitch = Math.max(-pitchLimit, Math.min(pitchLimit, s.targetLittlePlanetPitch + deltaPitchRad));
      } else {
        s.targetLon += deltaLonDeg;
        s.targetLat = Math.max(-88, Math.min(88, s.targetLat + deltaLatDeg));
      }
    },
    lookAtHeading: (targetHeadingDeg: number) => {
      const northOffset = panoramaRef.current?.sun_data?.north_offset ?? 0;
      const desiredLon = targetHeadingDeg - northOffset;
      const s = stateRef.current;
      const currentLonNorm = ((s.lon % 360) + 360) % 360;
      const desiredLonNorm = ((desiredLon % 360) + 360) % 360;
      let diff = desiredLonNorm - currentLonNorm;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;

      const isShader = s.projectionMode === 'little_planet' || s.projectionMode === 'curved';
      if (isShader) {
        s.targetLittlePlanetYaw += THREE.MathUtils.degToRad(diff);
        s.targetLittlePlanetPitch = 0;
      } else {
        s.targetLon = s.lon + diff;
        s.targetLat = 0;
      }
    },
    setOrientation: (lonDeg: number, latDeg: number, fovDeg?: number) => {
      const s = stateRef.current;
      const isShader = s.projectionMode === 'little_planet' || s.projectionMode === 'curved';
      if (isShader) {
        s.littlePlanetYaw = THREE.MathUtils.degToRad(lonDeg);
        s.targetLittlePlanetYaw = s.littlePlanetYaw;
        s.littlePlanetPitch = THREE.MathUtils.degToRad(latDeg);
        s.targetLittlePlanetPitch = s.littlePlanetPitch;
        if (fovDeg !== undefined && !isNaN(fovDeg)) {
          s.littlePlanetZoom = fovDeg;
          s.targetLittlePlanetZoom = fovDeg;
        }
      } else {
        s.lon = lonDeg;
        s.targetLon = lonDeg;
        s.lat = Math.max(-88, Math.min(88, latDeg));
        s.targetLat = s.lat;
        if (fovDeg !== undefined && !isNaN(fovDeg) && cameraRef.current) {
          s.fov = Math.max(1, Math.min(120, fovDeg));
          s.targetFov = s.fov;
          cameraRef.current.fov = s.fov;
          cameraRef.current.updateProjectionMatrix();
        }
      }
      saveCameraState(latDeg, fovDeg ?? (isShader ? s.littlePlanetZoom : s.fov), isShader ? s.littlePlanetZoom : undefined);
    },
    captureCurrentView: async (suggestedFilename?: string, shareUrl?: string, meta?: WatermarkMeta) => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return false;
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const s = stateRef.current;
      const isLp = s.projectionMode === 'little_planet';
      const isCurved = s.projectionMode === 'curved';
      const isShaderMode = isLp || isCurved;

      const container = containerRef.current;
      const isPortrait = container && container.clientHeight > 0
        ? container.clientWidth < container.clientHeight
        : window.innerWidth < window.innerHeight;

      // Sizing:
      // - Portrait view: 9:16 portrait 4K (2160x3840px)
      // - Landscape view: 16:9 landscape 4K (3840x2160px)
      const targetWidth = isPortrait ? 2160 : 3840;
      const targetHeight = isPortrait ? 3840 : 2160;
      const exportAspect = targetWidth / targetHeight;

      try {
        // 1. Offscreen WebGLRenderTarget with 4K dimensions
        const renderTarget = new THREE.WebGLRenderTarget(targetWidth, targetHeight, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
          type: THREE.UnsignedByteType,
          colorSpace: THREE.SRGBColorSpace,
        });

        forceCrossfadeComplete();
        const previousRenderTarget = renderer.getRenderTarget();

        if (isShaderMode && littlePlanetSceneRef.current && orthoCameraRef.current && quadMaterialRef.current) {
          // Render full Little Planet or Curved projection into 4K target
          const quadMat = quadMaterialRef.current;
          quadMat.uniforms.uResolution.value.set(targetWidth, targetHeight);
          quadMat.uniforms.uMode.value = isCurved ? 1 : 0;
          renderer.setRenderTarget(renderTarget);
          renderer.render(littlePlanetSceneRef.current, orthoCameraRef.current);
          renderer.setRenderTarget(previousRenderTarget);
          quadMat.uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height);
        } else {
          // 2. Clone camera with matching orientation, aspect ratio, and field-of-view matching the user's viewport
          const s = stateRef.current;
          const phi = THREE.MathUtils.degToRad(90 - s.lat);
          const theta = THREE.MathUtils.degToRad(s.lon);

          const target = new THREE.Vector3(
            500 * Math.sin(phi) * Math.cos(theta),
            500 * Math.cos(phi),
            500 * Math.sin(phi) * Math.sin(theta)
          );

          const liveAspect = container && container.clientHeight > 0
            ? container.clientWidth / container.clientHeight
            : (window.innerWidth / window.innerHeight);

          // Calculate export camera FOV so that the user gets an identical crop to what they see:
          // If live view is wider than target aspect (e.g. tablet portrait 3:4 vs 9:16, or ultra-wide desktop vs 16:9),
          // adjust vertical FOV to preserve horizontal framing.
          // Otherwise, preserve exact vertical FOV.
          let exportFov = camera.fov;
          if (liveAspect > exportAspect) {
            const vFovRad = THREE.MathUtils.degToRad(camera.fov);
            const exportVFovRad = 2 * Math.atan((liveAspect / exportAspect) * Math.tan(vFovRad / 2));
            exportFov = THREE.MathUtils.radToDeg(exportVFovRad);
          }

          const exportCamera = new THREE.PerspectiveCamera(exportFov, exportAspect, 0.1, 1100);
          exportCamera.position.set(0, 0, 0);
          exportCamera.lookAt(target);
          exportCamera.updateProjectionMatrix();

          const wasSunVisible = sunMarkerGroupRef.current?.visible;
          const wasCompassVisible = compassRingGroupRef.current?.visible;
          const wasPanoramaMarkersVisible = panoramaMarkersGroupRef.current?.visible;
          if (sunMarkerGroupRef.current) sunMarkerGroupRef.current.visible = false;
          if (compassRingGroupRef.current) compassRingGroupRef.current.visible = false;
          if (panoramaMarkersGroupRef.current) panoramaMarkersGroupRef.current.visible = false;

          // 3. Render scene into offscreen target without affecting main viewport
          renderer.setRenderTarget(renderTarget);
          renderer.render(scene, exportCamera);
          renderer.setRenderTarget(previousRenderTarget);

          if (sunMarkerGroupRef.current && wasSunVisible) sunMarkerGroupRef.current.visible = true;
          if (compassRingGroupRef.current && wasCompassVisible) compassRingGroupRef.current.visible = true;
          if (panoramaMarkersGroupRef.current && wasPanoramaMarkersVisible) panoramaMarkersGroupRef.current.visible = true;
        }

        // 4. Extract pixel buffer from render target
        const pixelBuffer = new Uint8Array(targetWidth * targetHeight * 4);
        renderer.readRenderTargetPixels(renderTarget, 0, 0, targetWidth, targetHeight, pixelBuffer);
        renderTarget.dispose();

        // 5. Create 2D Canvas and invert Y-axis (WebGL origin is bottom-left, 2D canvas origin is top-left)
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = targetWidth;
        offscreenCanvas.height = targetHeight;
        const ctx = offscreenCanvas.getContext('2d');
        if (!ctx) return false;

        const imgData = ctx.createImageData(targetWidth, targetHeight);
        const rowBytes = targetWidth * 4;
        for (let y = 0; y < targetHeight; y++) {
          const srcY = targetHeight - 1 - y;
          const srcOffset = srcY * rowBytes;
          const destOffset = y * rowBytes;
          imgData.data.set(pixelBuffer.subarray(srcOffset, srcOffset + rowBytes), destOffset);
        }
        ctx.putImageData(imgData, 0, 0);

        // Watermark: draw clean panorama metadata badge with QR code at bottom right
        if (shareUrl) {
          await drawPanoramaWatermark(ctx, {
            canvasWidth: targetWidth,
            canvasHeight: targetHeight,
            shareUrl,
            title: meta?.title || (panoramaRef.current.city && panoramaRef.current.city !== 'Unknown' ? panoramaRef.current.city : (panoramaRef.current.original_filename || panoramaRef.current.filename)),
            country: meta?.country !== undefined ? meta.country : (panoramaRef.current.country && panoramaRef.current.country !== 'Unknown' ? panoramaRef.current.country : undefined),
            date: meta?.date,
            lat: meta?.lat !== undefined ? meta.lat : panoramaRef.current.lat,
            lon: meta?.lon !== undefined ? meta.lon : panoramaRef.current.lon,
            position: 'bottom-right',
          });
        }

        // 6. Generate and trigger 4K JPEG download
        return new Promise<boolean>((resolve) => {
          offscreenCanvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(false);
                return;
              }
              const blobUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = blobUrl;
              if (suggestedFilename) {
                const finalName = suggestedFilename.toLowerCase().endsWith('.jpg') || suggestedFilename.toLowerCase().endsWith('.jpeg')
                  ? suggestedFilename
                  : `${suggestedFilename}.jpg`;
                a.download = finalName;
              } else {
                const baseName = 'panorama_view';
                const suffix = isLp ? '_little_planet.jpg' : isCurved ? '_curved.jpg' : '_4k_crop.jpg';
                a.download = `${baseName}${suffix}`;
              }
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
              resolve(true);
            },
            'image/jpeg',
            0.95
          );
        });
      } catch (err) {
        console.error('Error exporting 4K view:', err);
        return false;
      }
    },
    getViewState: () => {
      const s = stateRef.current;
      const isShader = s.projectionMode === 'little_planet' || s.projectionMode === 'curved';
      return {
        lon: isShader ? THREE.MathUtils.radToDeg(s.littlePlanetYaw) : s.lon,
        lat: isShader ? THREE.MathUtils.radToDeg(s.littlePlanetPitch) : s.lat,
        fov: isShader ? s.littlePlanetZoom : (cameraRef.current?.fov || s.targetFov),
        projectionMode: s.projectionMode,
      };
    },
    resetView: () => {
      const s = stateRef.current;
      const isShader = s.projectionMode === 'little_planet' || s.projectionMode === 'curved';
      if (isShader) {
        const defaultZoom = s.projectionMode === 'curved' ? 0.90 : 0.85;
        s.targetLittlePlanetZoom = defaultZoom;
        s.targetLittlePlanetPitch = 0;
        s.targetLittlePlanetYaw = 0;
      } else {
        s.targetLon = initialLon ?? 0;
        s.targetLat = initialLat ?? 0;
        s.targetFov = 75;
      }
    },
    toggleGyroscope: async (forceState?: boolean): Promise<boolean> => {
      const nextState = forceState !== undefined ? forceState : !isGyroscopeActiveRef.current;
      if (nextState) {
        if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
          try {
            const res = await (DeviceOrientationEvent as any).requestPermission();
            if (res !== 'granted') {
              isGyroscopeActiveRef.current = false;
              onToggleGyroscope?.(false);
              return false;
            }
          } catch {
            isGyroscopeActiveRef.current = false;
            onToggleGyroscope?.(false);
            return false;
          }
        }
      }
      isGyroscopeActiveRef.current = nextState;
      lastDeviceAlphaRef.current = null;
      lastDeviceBetaRef.current = null;
      onToggleGyroscope?.(nextState);
      return nextState;
    },
    flyToHeading: (targetHeadingDeg: number, targetPitch: number = 0, targetFov: number = 70) => {
      const northOffset = panoramaRef.current?.sun_data?.north_offset ?? 0;
      const desiredLon = targetHeadingDeg - northOffset;
      const s = stateRef.current;
      const curLonNorm = ((s.lon % 360) + 360) % 360;
      const desLonNorm = ((desiredLon % 360) + 360) % 360;
      let diff = desLonNorm - curLonNorm;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;

      const isShader = s.projectionMode === 'little_planet' || s.projectionMode === 'curved';
      if (isShader) {
        s.targetLittlePlanetYaw += THREE.MathUtils.degToRad(diff);
        s.targetLittlePlanetPitch = THREE.MathUtils.degToRad(targetPitch);
      } else {
        s.targetLon = s.lon + diff;
        s.targetLat = targetPitch;
        s.targetFov = targetFov;
      }
    },
    isHighResLoaded: () => !!(activeTexturesRef.current.pano8k || activeTexturesRef.current.full),
    createVideoRenderer: (
      width: number,
      height: number,
      options?: { antiMoire?: boolean } | boolean
    ) => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return null;
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const s = stateRef.current;
      const isLp = s.projectionMode === 'little_planet';
      const isCurved = s.projectionMode === 'curved';
      const isShaderMode = isLp || isCurved;

      const antiMoire = typeof options === 'boolean' ? options : (options?.antiMoire ?? true);

      // 1. High-Performance Anti-Moiré: One-time Trilinear Mipmapping & 8x Anisotropic filtering on texture
      const setupTextureAntiMoire = (tex: THREE.Texture | null | undefined) => {
        if (!tex || !antiMoire) return;
        // CRITICAL PERFORMANCE GUARD: only configure once per texture to avoid re-generating mipmaps on every frame!
        if (tex.userData && tex.userData.__antiMoireReady) return;
        if (!tex.userData) tex.userData = {};
        tex.userData.__antiMoireReady = true;

        try {
          const maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 8;
          tex.anisotropy = Math.max(1, Math.min(8, maxAniso));
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.needsUpdate = true;
        } catch (err) {
          console.warn('Anti-moiré texture setup fallback:', err);
        }
      };

      const topTex =
        activeTexturesRef.current.full ||
        activeTexturesRef.current.pano8k ||
        activeTexturesRef.current.pano2k ||
        activeTexturesRef.current.thumb ||
        (isShaderMode ? quadMaterialRef.current?.uniforms.uTexture.value : materialRef.current?.map);

      setupTextureAntiMoire(topTex);

      const exportAspect = width / height;

      // Direct 4K WebGLRenderTarget (samples: 0 eliminates expensive 4K MSAA blit resolve while texture filtering provides pristine anti-moiré)
      const renderTarget = new THREE.WebGLRenderTarget(width, height, {
        samples: 0,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        colorSpace: THREE.SRGBColorSpace,
      });

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = width;
      exportCanvas.height = height;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) {
        renderTarget.dispose();
        return null;
      }

      const pixelBuffer = new Uint8Array(width * height * 4);
      const imgData = ctx.createImageData(width, height);
      const rowBytes = width * 4;

      const container = containerRef.current;
      const liveAspect = container && container.clientHeight > 0
        ? container.clientWidth / container.clientHeight
        : (window.innerWidth / window.innerHeight);

      let exportFov = cameraRef.current.fov;
      if (liveAspect > exportAspect) {
        const vFovRad = THREE.MathUtils.degToRad(cameraRef.current.fov);
        const exportVFovRad = 2 * Math.atan((liveAspect / exportAspect) * Math.tan(vFovRad / 2));
        exportFov = THREE.MathUtils.radToDeg(exportVFovRad);
      }

      const exportCamera = new THREE.PerspectiveCamera(exportFov, exportAspect, 0.1, 1100);
      exportCamera.position.set(0, 0, 0);

      const wasSunVisible = sunMarkerGroupRef.current?.visible;
      const wasCompassVisible = compassRingGroupRef.current?.visible;
      const wasPanoramaMarkersVisible = panoramaMarkersGroupRef.current?.visible;
      if (sunMarkerGroupRef.current) sunMarkerGroupRef.current.visible = false;
      if (compassRingGroupRef.current) compassRingGroupRef.current.visible = false;
      if (panoramaMarkersGroupRef.current) panoramaMarkersGroupRef.current.visible = false;

      const targetVec = new THREE.Vector3();

      forceCrossfadeComplete();

      return {
        getCanvas: () => exportCanvas,
        isHighResReady: () => {
          const info = getActiveTextureInfo(String(panoramaRef.current?.id));
          return info.isMaxQuality || info.tier === '8k' || info.tier === 'full';
        },
        waitForHighRes: async (timeoutMs = 15000) => {
          const panoIdStr = String(panoramaRef.current?.id || '');
          const info = getActiveTextureInfo(panoIdStr);
          if (info.isMaxQuality) {
            forceCrossfadeComplete();
            return true;
          }
          const start = Date.now();
          while (Date.now() - start < timeoutMs) {
            const curInfo = getActiveTextureInfo(panoIdStr);
            if (curInfo.isMaxQuality) {
              forceCrossfadeComplete();
              return true;
            }
            if (isHighResFinishedRef.current && (curInfo.tier === '8k' || curInfo.tier === 'full')) {
              forceCrossfadeComplete();
              return true;
            }
            await new Promise((r) => setTimeout(r, 100));
          }
          forceCrossfadeComplete();
          return getActiveTextureInfo(panoIdStr).isMaxQuality;
        },
        getActiveTextureInfo: () => getActiveTextureInfo(String(panoramaRef.current?.id)),
        renderFrame: (lonDeg: number, latDeg: number, customFov?: number) => {
          forceCrossfadeComplete();
          if (antiMoire) {
            const curTex = isShaderMode
              ? (quadMaterialRef.current?.uniforms.uTexture.value || materialRef.current?.map)
              : materialRef.current?.map;
            setupTextureAntiMoire(curTex);
          }
          const previousRenderTarget = renderer.getRenderTarget();

          if (isShaderMode && littlePlanetSceneRef.current && orthoCameraRef.current && quadMaterialRef.current) {
            const quadMat = quadMaterialRef.current;
            quadMat.uniforms.uResolution.value.set(width, height);
            quadMat.uniforms.uMode.value = isCurved ? 1 : 0;
            quadMat.uniforms.uYaw.value = THREE.MathUtils.degToRad(lonDeg);
            quadMat.uniforms.uPitch.value = THREE.MathUtils.degToRad(latDeg);
            quadMat.uniforms.uZoom.value = s.littlePlanetZoom;

            renderer.setRenderTarget(renderTarget);
            renderer.render(littlePlanetSceneRef.current, orthoCameraRef.current);
            renderer.setRenderTarget(previousRenderTarget);
            quadMat.uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height);
          } else {
            const baseFov = customFov || cameraRef.current?.fov || 75;
            let adaptedFov = baseFov;
            if (liveAspect > exportAspect) {
              const vFovRad = THREE.MathUtils.degToRad(baseFov);
              const exportVFovRad = 2 * Math.atan((liveAspect / exportAspect) * Math.tan(vFovRad / 2));
              adaptedFov = THREE.MathUtils.radToDeg(exportVFovRad);
            }
            if (Math.abs(adaptedFov - exportCamera.fov) > 0.01) {
              exportCamera.fov = adaptedFov;
              exportCamera.updateProjectionMatrix();
            }

            const phi = THREE.MathUtils.degToRad(90 - latDeg);
            const theta = THREE.MathUtils.degToRad(lonDeg);
            targetVec.set(
              500 * Math.sin(phi) * Math.cos(theta),
              500 * Math.cos(phi),
              500 * Math.sin(phi) * Math.sin(theta)
            );
            exportCamera.lookAt(targetVec);

            renderer.setRenderTarget(renderTarget);
            renderer.render(scene, exportCamera);
            renderer.setRenderTarget(previousRenderTarget);
          }

          renderer.readRenderTargetPixels(renderTarget, 0, 0, width, height, pixelBuffer);
          for (let y = 0; y < height; y++) {
            const srcY = height - 1 - y;
            const srcOffset = srcY * rowBytes;
            const destOffset = y * rowBytes;
            imgData.data.set(pixelBuffer.subarray(srcOffset, srcOffset + rowBytes), destOffset);
          }
          ctx.putImageData(imgData, 0, 0);
        },
        dispose: () => {
          if (sunMarkerGroupRef.current && wasSunVisible) sunMarkerGroupRef.current.visible = true;
          if (compassRingGroupRef.current && wasCompassVisible) compassRingGroupRef.current.visible = true;
          if (panoramaMarkersGroupRef.current && wasPanoramaMarkersVisible) panoramaMarkersGroupRef.current.visible = true;
          renderTarget.dispose();
        },
      };
    },
    getCurrentPanoId: () => String(panoramaRef.current?.id || ''),
    waitForPanoReady: async (targetPanoId: string, timeoutMs = 8000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (
          String(panoramaRef.current?.id) === String(targetPanoId) &&
          activeTexturePanoIdRef.current === String(targetPanoId) &&
          (activeTexturesRef.current.pano8k || activeTexturesRef.current.full || activeTexturesRef.current.pano2k)
        ) {
          forceCrossfadeComplete();
          await new Promise((r) => setTimeout(r, 100));
          return true;
        }
        await new Promise((r) => setTimeout(r, 80));
      }
      return String(panoramaRef.current?.id) === String(targetPanoId);
    },
    waitForTopResolution: async (
      targetPanoId: string,
      timeoutMs = 35000,
      onStatus?: (status: string) => void
    ): Promise<{ success: boolean; textureInfo: ActiveTextureDetails }> => {
      const start = Date.now();

      while (Date.now() - start < timeoutMs) {
        if (String(panoramaRef.current?.id) !== String(targetPanoId)) {
          onStatus?.(`Prepínam na panorámu #${targetPanoId}...`);
          await new Promise((r) => setTimeout(r, 80));
          continue;
        }

        if (activeTexturePanoIdRef.current !== String(targetPanoId)) {
          onStatus?.(`Pripravujem textúry pre #${targetPanoId}...`);
          await new Promise((r) => setTimeout(r, 80));
          continue;
        }

        const p = panoramaRef.current;
        const pWidth = p?.width || 0;
        const maxTex = rendererRef.current?.capabilities?.maxTextureSize || 4096;
        const targetNeedsFull = pWidth > 8192 && maxTex > 8192;
        const targetNeeds8K = pWidth > 2048 && maxTex >= 4096;

        // Check if top resolution is already loaded for THIS panorama
        if (targetNeedsFull && activeTexturesRef.current.full) {
          onStatus?.(`Plné rozlíšenie ${getHorizontalK(pWidth)} pripravené!`);
          forceCrossfadeComplete();
          await new Promise((r) => setTimeout(r, 100));
          return { success: true, textureInfo: getActiveTextureInfo(targetPanoId) };
        }
        if (!targetNeedsFull && targetNeeds8K && (activeTexturesRef.current.pano8k || activeTexturesRef.current.full)) {
          onStatus?.(`8K HD pripravené!`);
          forceCrossfadeComplete();
          await new Promise((r) => setTimeout(r, 100));
          return { success: true, textureInfo: getActiveTextureInfo(targetPanoId) };
        }
        if (!targetNeedsFull && !targetNeeds8K && (activeTexturesRef.current.pano2k || activeTexturesRef.current.full)) {
          forceCrossfadeComplete();
          await new Promise((r) => setTimeout(r, 100));
          return { success: true, textureInfo: getActiveTextureInfo(targetPanoId) };
        }

        // If loading officially finished (fallback or completed)
        if (isHighResFinishedRef.current) {
          const info = getActiveTextureInfo(targetPanoId);
          if (info.tier !== 'none' && info.tier !== 'thumb') {
            forceCrossfadeComplete();
            await new Promise((r) => setTimeout(r, 100));
            return { success: info.isMaxQuality, textureInfo: info };
          }
        }

        // Status messages for user
        if (targetNeedsFull) {
          if (activeTexturesRef.current.pano8k) {
            onStatus?.(`8K HD stiahnuté • Sťahujem ${getHorizontalK(pWidth)} originál do pamäte...`);
          } else if (activeTexturesRef.current.pano2k) {
            onStatus?.(`2K náhľad pripravený • Sťahujem ${getHorizontalK(pWidth)} Ultra-HD...`);
          } else {
            onStatus?.(`Sťahujem ${getHorizontalK(pWidth)} pre #${targetPanoId}...`);
          }
        } else if (targetNeeds8K) {
          if (activeTexturesRef.current.pano2k) {
            onStatus?.(`2K náhľad pripravený • Sťahujem 8K HD...`);
          } else {
            onStatus?.(`Sťahujem 8K HD pre #${targetPanoId}...`);
          }
        } else {
          onStatus?.(`Načítavam panorámu #${targetPanoId}...`);
        }

        await new Promise((r) => setTimeout(r, 80));
      }

      // Timeout expired - return whatever highest quality texture is active
      forceCrossfadeComplete();
      const finalInfo = getActiveTextureInfo(targetPanoId);
      return { success: finalInfo.isMaxQuality, textureInfo: finalInfo };
    },
    getActiveTextureInfo: (forPanoId?: string) => getActiveTextureInfo(forPanoId),
  }));

  const savedCameraState = getSavedCameraState();
  const initialLonVal = initialLon !== undefined && !isNaN(initialLon) ? initialLon : 0;
  const initialLatVal = initialLat !== undefined && !isNaN(initialLat) ? initialLat : savedCameraState.lat;
  const initialFovVal = initialFov !== undefined && !isNaN(initialFov) && initialFov >= 25 && initialFov <= 110
    ? initialFov
    : savedCameraState.fov;

  const resolvedMode: ProjectionMode = projectionMode || (isLittlePlanet ? 'little_planet' : 'rectilinear');
  const initialShaderZoom = savedCameraState.shaderZoom >= 0.22 && savedCameraState.shaderZoom <= 5.0
    ? savedCameraState.shaderZoom
    : (resolvedMode === 'curved' ? 0.90 : 0.85);

  // Keep references to mutable interaction states without triggering rerenders
  const stateRef = useRef({
    isAutoPanning,
    autoPanDirection: autoPanDirection || (isAutoPanning ? 'right' : 'none'),
    onAutoPanStop,
    projectionMode: resolvedMode,
    isLittlePlanet: resolvedMode === 'little_planet',
    isHdr,
    littlePlanetYaw: THREE.MathUtils.degToRad(initialLonVal),
    littlePlanetPitch: THREE.MathUtils.degToRad(initialLatVal),
    littlePlanetZoom: initialFovVal < 10 ? initialFovVal : initialShaderZoom,
    targetLittlePlanetYaw: THREE.MathUtils.degToRad(initialLonVal),
    targetLittlePlanetPitch: THREE.MathUtils.degToRad(initialLatVal),
    targetLittlePlanetZoom: initialFovVal < 10 ? initialFovVal : initialShaderZoom,
    onPointerDownLittlePlanetYaw: THREE.MathUtils.degToRad(initialLonVal),
    onPointerDownLittlePlanetPitch: THREE.MathUtils.degToRad(initialLatVal),
    pinchStartLittlePlanetZoom: initialFovVal < 10 ? initialFovVal : initialShaderZoom,
    isUserInteracting: false,
    onPointerDownPointerX: 0,
    onPointerDownPointerY: 0,
    onPointerDownLon: initialLonVal,
    onPointerDownLat: initialLatVal,
    lon: initialLonVal,
    lat: initialLatVal,
    targetLon: initialLonVal,
    targetLat: initialLatVal,
    velocityX: 0,
    velocityY: 0,
    lastPointerX: 0,
    lastPointerY: 0,
    lastPointerTime: 0,
    targetFov: initialFovVal,
    fov: initialFovVal,
    pinchStartDist: 0,
    pinchStartFov: initialFovVal,
    isCrossfading: false,
    crossfadeStartTime: 0,
    crossfadeDuration: 480,
    isMovieMode,
    onFullCircleComplete,
    accumulatedPanDeg: 0,
  });

  // Keep stateRef up to date with prop changes
  useEffect(() => {
    stateRef.current.isAutoPanning = isAutoPanning;
    stateRef.current.autoPanDirection = autoPanDirection || (isAutoPanning ? 'right' : 'none');
    if (!isAutoPanning && triggerDeferred15KRef.current) {
      triggerDeferred15KRef.current();
    }
    stateRef.current.onAutoPanStop = onAutoPanStop;
    stateRef.current.isHdr = isHdr;
    stateRef.current.isMovieMode = isMovieMode;
    stateRef.current.onFullCircleComplete = onFullCircleComplete;
    if (sphereUniformsRef.current) {
      sphereUniformsRef.current.uHdr.value = isHdr ? 1.0 : 0.0;
    }
    if (quadMaterialRef.current) {
      quadMaterialRef.current.uniforms.uHdr.value = isHdr ? 1.0 : 0.0;
    }
    const mode: ProjectionMode = projectionMode || (isLittlePlanet ? 'little_planet' : 'rectilinear');
    if (stateRef.current.projectionMode !== mode) {
      stateRef.current.projectionMode = mode;
      stateRef.current.isLittlePlanet = mode === 'little_planet';
      if (mode === 'little_planet' || mode === 'curved') {
        const initialYaw = THREE.MathUtils.degToRad(stateRef.current.lon);
        stateRef.current.targetLittlePlanetYaw = initialYaw;
        stateRef.current.littlePlanetYaw = initialYaw;
        const initialPitch = mode === 'curved' ? THREE.MathUtils.degToRad(stateRef.current.lat) : 0;
        stateRef.current.targetLittlePlanetPitch = initialPitch;
        stateRef.current.littlePlanetPitch = initialPitch;
        const defaultZoom = mode === 'curved' ? 0.90 : 0.85;
        stateRef.current.targetLittlePlanetZoom = defaultZoom;
        stateRef.current.littlePlanetZoom = defaultZoom;
      } else {
        const syncLon = THREE.MathUtils.radToDeg(stateRef.current.littlePlanetYaw);
        const syncLat = THREE.MathUtils.radToDeg(stateRef.current.littlePlanetPitch);
        stateRef.current.lon = syncLon;
        stateRef.current.targetLon = syncLon;
        stateRef.current.lat = Math.max(-88, Math.min(88, syncLat));
        stateRef.current.targetLat = stateRef.current.lat;
      }
    }
  }, [isAutoPanning, autoPanDirection, onAutoPanStop, projectionMode, isLittlePlanet, isHdr, isMovieMode, onFullCircleComplete]);

  // Intelligent GPU Texture Preloading for adjacent panoramas (both directions in high-res)
  useEffect(() => {
    if (!isRendererReady) return;
    if (nextPanorama && nextPanorama.id !== panorama.id) {
      preloadPanorama(nextPanorama, true);
    }
    if (prevPanorama && prevPanorama.id !== panorama.id) {
      preloadPanorama(prevPanorama, true);
    }
  }, [nextPanorama?.id, prevPanorama?.id, panorama.id, isRendererReady]);

  // Spatial Audio control: start/stop and master volume
  useEffect(() => {
    if (!audioManagerRef.current) return;
    audioManagerRef.current.setMasterVolume(spatialAudioVolume);
    if (isSpatialAudioEnabled) {
      audioManagerRef.current.start();
    } else {
      audioManagerRef.current.stop();
    }
  }, [isSpatialAudioEnabled, spatialAudioVolume, isRendererReady]);

  // 3D AR Solar Marker & 360° Cloud Azimuth Compass Ring in Three.js scene (+20° above horizon)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !isRendererReady) return;

    // Compass only active in standard rectilinear mode (not curved or little planet)
    const isCompassActive = isSolarCompassEnabled && projectionMode !== 'curved' && projectionMode !== 'little_planet' && !isLittlePlanet;

    if (!isCompassActive) {
      if (sunMarkerGroupRef.current) sunMarkerGroupRef.current.visible = false;
      if (compassRingGroupRef.current) compassRingGroupRef.current.visible = false;
      if (panoramaMarkersGroupRef.current) panoramaMarkersGroupRef.current.visible = false;
      return;
    }

    // 1. Build or update Sun Marker Group
    if (!sunMarkerGroupRef.current) {
      const sunGroup = new THREE.Group();

      // Glowing yellow sun core
      const sunGeo = new THREE.SphereGeometry(14, 24, 24);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdf40, depthTest: false });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      sunGroup.add(sunMesh);

      // Corona halo ring
      const ringGeo = new THREE.RingGeometry(18, 30, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff9900,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthTest: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      sunGroup.add(ringMesh);

      // Sun label billboard
      const label = createCompassMarkerSprite('☀️ Slnko', true, 'Solar Center', '☀️');
      label.position.set(0, -32, 0);
      sunGroup.add(label);

      scene.add(sunGroup);
      sunMarkerGroupRef.current = sunGroup;
    }

    // 2. Build or rebuild 360° Azimuth Compass Ring (+10° above horizon)
    if (compassRingGroupRef.current) {
      scene.remove(compassRingGroupRef.current);
      compassRingGroupRef.current.traverse((child) => {
        if ((child as any).material?.map) (child as any).material.map.dispose();
        if ((child as any).material) (child as any).material.dispose();
        if ((child as any).geometry) (child as any).geometry.dispose();
      });
      compassRingGroupRef.current = null;
    }

    const compassRingGroup = new THREE.Group();
    const northOffset = panorama.sun_data?.north_offset ?? 0;

    // +10° elevation above horizon:
    const elevDeg = 10;
    const phi = THREE.MathUtils.degToRad(90 - elevDeg);
    const r = 460;
    const y = r * Math.cos(phi);
    const rxz = r * Math.sin(phi);

    const azimuthMarkers: { deg: number; label: string; isMajor: boolean; subText?: string; directionLetter?: string }[] = [
      { deg: 0, label: '0°', isMajor: true, subText: 'SEVER', directionLetter: 'N' },
      { deg: 15, label: '15°', isMajor: false },
      { deg: 30, label: '30°', isMajor: false },
      { deg: 45, label: '45°', isMajor: true, subText: 'SV', directionLetter: 'NE' },
      { deg: 60, label: '60°', isMajor: false },
      { deg: 75, label: '75°', isMajor: false },
      { deg: 90, label: '90°', isMajor: true, subText: 'VÝCHOD', directionLetter: 'E' },
      { deg: 105, label: '105°', isMajor: false },
      { deg: 120, label: '120°', isMajor: false },
      { deg: 135, label: '135°', isMajor: true, subText: 'JV', directionLetter: 'SE' },
      { deg: 150, label: '150°', isMajor: false },
      { deg: 165, label: '165°', isMajor: false },
      { deg: 180, label: '180°', isMajor: true, subText: 'JUH', directionLetter: 'S' },
      { deg: 195, label: '195°', isMajor: false },
      { deg: 210, label: '210°', isMajor: false },
      { deg: 225, label: '225°', isMajor: true, subText: 'JZ', directionLetter: 'SW' },
      { deg: 240, label: '240°', isMajor: false },
      { deg: 255, label: '255°', isMajor: false },
      { deg: 270, label: '270°', isMajor: true, subText: 'ZÁPAD', directionLetter: 'W' },
      { deg: 285, label: '285°', isMajor: false },
      { deg: 300, label: '300°', isMajor: false },
      { deg: 315, label: '315°', isMajor: true, subText: 'SZ', directionLetter: 'NW' },
      { deg: 330, label: '330°', isMajor: false },
      { deg: 345, label: '345°', isMajor: false },
    ];

    azimuthMarkers.forEach((m) => {
      // Sphere longitude: theta_deg = (headingDeg - northOffset + 360) % 360
      const sphereLonDeg = (m.deg - northOffset + 360) % 360;
      const theta = THREE.MathUtils.degToRad(sphereLonDeg);
      const mx = rxz * Math.cos(theta);
      const mz = rxz * Math.sin(theta);

      const sprite = createCompassMarkerSprite(m.label, m.isMajor, m.subText, m.directionLetter);
      sprite.position.set(mx, y, mz);
      compassRingGroup.add(sprite);

      // True North laser beacon cylinder at 0°
      if (m.deg === 0) {
        const beamGeo = new THREE.CylinderGeometry(1.2, 1.2, 80, 16);
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0xf43f5e,
          transparent: true,
          opacity: 0.75,
          depthTest: false,
        });
        const beamMesh = new THREE.Mesh(beamGeo, beamMat);
        beamMesh.position.set(mx, y + 40, mz);
        compassRingGroup.add(beamMesh);
      }
    });

    scene.add(compassRingGroup);
    compassRingGroupRef.current = compassRingGroup;
    compassRingGroupRef.current.visible = true;

    // 3. Build or rebuild Clickable Filmstrip Panorama Markers on the horizon (-3.5° elevation)
    if (panoramaMarkersGroupRef.current) {
      scene.remove(panoramaMarkersGroupRef.current);
      panoramaMarkersGroupRef.current.traverse((child) => {
        if ((child as any).material?.map) (child as any).material.map.dispose();
        if ((child as any).material) (child as any).material.dispose();
        if ((child as any).geometry) (child as any).geometry.dispose();
      });
      panoramaMarkersGroupRef.current = null;
    }

    const panoramaMarkersGroup = new THREE.Group();
    panoramaMarkersGroup.visible = true;

    if (filmstripPanoramas && filmstripPanoramas.length > 0 && panorama.lat !== null && panorama.lon !== null) {
      const curLat = panorama.lat;
      const curLon = panorama.lon;
      const rPano = 455;
      const baseElevDeg = 10.0; // Same level as azimuth numbers
      const tierElevStepDeg = 2.2; // Compact vertical step between tiers so bubbles stay close

      interface PlacedBubble {
        sphereLon: number;
        tier: number;
      }
      const placedBubbles: PlacedBubble[] = [];

      // Prepare items with distance and filmstrip index (itemNumber 1-based)
      const candidatePanos = filmstripPanoramas
        .map((p, idx) => {
          if (p.id === panorama.id) return null;
          if (p.lat === null || p.lon === null || isNaN(p.lat) || isNaN(p.lon)) return null;
          const distMeters = p.distance ?? getDistance(curLat, curLon, p.lat, p.lon);
          return {
            panorama: p,
            lat: p.lat as number,
            lon: p.lon as number,
            itemNumber: idx + 1,
            distMeters,
          };
        })
        .filter(Boolean) as { panorama: Panorama; lat: number; lon: number; itemNumber: number; distMeters: number }[];

      // Sort by distance ASCENDING: closest panoramas get placed first into lowest tier (tier 0)
      candidatePanos.sort((a, b) => a.distMeters - b.distMeters);

      candidatePanos.forEach(({ panorama: p, lat: pLat, lon: pLon, itemNumber, distMeters }) => {
        const bearing = getGeodesicBearing(curLat, curLon, pLat, pLon);
        const sphereLon = (bearing - northOffset + 360) % 360;

        // Find lowest tier so this bubble does not overlap with any previously placed bubble
        let tier = 0;
        while (
          placedBubbles.some((other) => {
            let diff = Math.abs(other.sphereLon - sphereLon);
            if (diff > 180) diff = 360 - diff;
            return other.tier === tier && diff < 3.4;
          })
        ) {
          tier++;
        }
        placedBubbles.push({ sphereLon, tier });

        const elevDeg = baseElevDeg + tier * tierElevStepDeg;
        const phiPano = THREE.MathUtils.degToRad(90 - elevDeg);
        const yPano = rPano * Math.cos(phiPano);
        const rxzPano = rPano * Math.sin(phiPano);
        const theta = THREE.MathUtils.degToRad(sphereLon);

        const px = rxzPano * Math.cos(theta);
        const pz = rxzPano * Math.sin(theta);

        const distStr = formatDistance(distMeters);
        const is15K = getResolutionCategory(p.width) === '15K';
        const isPriv = Boolean(p.is_private);

        const sprite = createPanoramaMarkerBubbleSprite(itemNumber, distStr, is15K, isPriv);
        sprite.position.set(px, yPano, pz);
        // Ensure closest panoramas (lower tier) render above distant ones in case of slight overlap
        sprite.renderOrder = 100 - tier;
        (sprite as any).__panorama = p;
        (sprite as any).__itemNumber = itemNumber;

        panoramaMarkersGroup.add(sprite);
      });
    }

    scene.add(panoramaMarkersGroup);
    panoramaMarkersGroupRef.current = panoramaMarkersGroup;

    // 4. Position Sun Marker
    const sunData = getPanoramaSun3DPosition(panorama, 460);
    if (sunData && sunMarkerGroupRef.current) {
      sunMarkerGroupRef.current.position.copy(sunData.position);
      sunMarkerGroupRef.current.lookAt(0, 0, 0);
      sunMarkerGroupRef.current.visible = true;
    } else if (sunMarkerGroupRef.current) {
      sunMarkerGroupRef.current.visible = false;
    }

    // 5. Build or rebuild Peak Finder POI Markers on horizon
    if (poiMarkersGroupRef.current) {
      scene.remove(poiMarkersGroupRef.current);
      poiMarkersGroupRef.current.traverse((child) => {
        if ((child as any).material?.map) (child as any).material.map.dispose();
        if ((child as any).material) (child as any).material.dispose();
        if ((child as any).geometry) (child as any).geometry.dispose();
      });
      poiMarkersGroupRef.current = null;
    }

    const poiMarkersGroup = new THREE.Group();
    poiMarkersGroup.visible = !!isPeakFinderEnabled && !isLittlePlanet && projectionMode === 'rectilinear';

    if (isPeakFinderEnabled && panorama.lat !== null && panorama.lon !== null) {
      const visiblePois = calculateVisiblePOIs(panorama.lat, panorama.lon, northOffset, 65);
      const rPoi = 462;
      visiblePois.forEach((poi) => {
        const phiPoi = THREE.MathUtils.degToRad(90 - poi.elevDeg);
        const yPoi = rPoi * Math.cos(phiPoi);
        const rxzPoi = rPoi * Math.sin(phiPoi);
        const thetaPoi = THREE.MathUtils.degToRad(poi.sphereLon);

        const px = rxzPoi * Math.cos(thetaPoi);
        const pz = rxzPoi * Math.sin(thetaPoi);

        const sprite = createPoiMarkerSprite(poi);
        sprite.position.set(px, yPoi, pz);
        sprite.renderOrder = 85;
        (sprite as any).__poi = poi;

        poiMarkersGroup.add(sprite);
      });
    }
    scene.add(poiMarkersGroup);
    poiMarkersGroupRef.current = poiMarkersGroup;

    // 6. Build or rebuild 3D Virtual Walkthrough Navigation Hotspots (ground chevrons)
    if (walkthroughGroupRef.current) {
      scene.remove(walkthroughGroupRef.current);
      walkthroughGroupRef.current.traverse((child) => {
        if ((child as any).material?.map) (child as any).material.map.dispose();
        if ((child as any).material) (child as any).material.dispose();
        if ((child as any).geometry) (child as any).geometry.dispose();
      });
      walkthroughGroupRef.current = null;
    }

    const walkthroughGroup = new THREE.Group();
    walkthroughGroup.visible = !!isWalkthroughEnabled && !isLittlePlanet && projectionMode === 'rectilinear';

    if (isWalkthroughEnabled && filmstripPanoramas && filmstripPanoramas.length > 0 && panorama.lat !== null && panorama.lon !== null) {
      const curLat = panorama.lat;
      const curLon = panorama.lon;
      const rWalk = 425;
      const walkElevDeg = -14.0;
      const phiWalk = THREE.MathUtils.degToRad(90 - walkElevDeg);
      const yWalk = rWalk * Math.cos(phiWalk);
      const rxzWalk = rWalk * Math.sin(phiWalk);

      const nearbyCandidates = filmstripPanoramas
        .map((p, idx) => {
          if (p.id === panorama.id) return null;
          if (p.lat === null || p.lon === null || isNaN(p.lat) || isNaN(p.lon)) return null;
          const distMeters = p.distance ?? getDistance(curLat, curLon, p.lat, p.lon);
          if (distMeters < 15 || distMeters > 3500) return null;
          return {
            panorama: p,
            lat: p.lat,
            lon: p.lon,
            itemNumber: idx + 1,
            distMeters,
          };
        })
        .filter(Boolean) as { panorama: Panorama; lat: number; lon: number; itemNumber: number; distMeters: number }[];

      nearbyCandidates.sort((a, b) => a.distMeters - b.distMeters);
      const topWalkSteps = nearbyCandidates.slice(0, 8);

      topWalkSteps.forEach(({ panorama: p, lat: pLat, lon: pLon, itemNumber, distMeters }) => {
        const bearing = getGeodesicBearing(curLat, curLon, pLat, pLon);
        const sphereLon = (bearing - northOffset + 360) % 360;
        const theta = THREE.MathUtils.degToRad(sphereLon);

        const px = rxzWalk * Math.cos(theta);
        const pz = rxzWalk * Math.sin(theta);

        const distStr = formatDistance(distMeters);
        const sprite = createWalkthroughChevronSprite(itemNumber, p.title || p.city || '', distStr);
        sprite.position.set(px, yWalk, pz);
        sprite.renderOrder = 120;
        (sprite as any).__panorama = p;
        (sprite as any).__itemNumber = itemNumber;
        (sprite as any).__bearing = bearing;

        walkthroughGroup.add(sprite);
      });
    }
    scene.add(walkthroughGroup);
    walkthroughGroupRef.current = walkthroughGroup;
  }, [isSolarCompassEnabled, isPeakFinderEnabled, isWalkthroughEnabled, projectionMode, isLittlePlanet, panorama.id, panorama.sun_data, isRendererReady, filmstripPanoramas]);

  useEffect(() => {
    isCalibratingSunRef.current = isCalibratingSun;
    if (containerRef.current) {
      if (isCalibratingSun) {
        containerRef.current.style.cursor = 'crosshair';
      } else {
        containerRef.current.style.cursor = 'grab';
      }
    }
  }, [isCalibratingSun]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    onLoadingChange?.(true);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(stateRef.current.targetFov || 75, width / height, 0.1, 1100);
    camera.position.set(0, 0, 0);

    // 2. Hardware-accelerated WebGL Renderer (powerPreference = 'high-performance', DPR <= 3, preserveDrawingBuffer for pic export)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
    renderer.setSize(width, height);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // Initialize Spatial Audio Manager attached to camera and scene
    if (!audioManagerRef.current) {
      audioManagerRef.current = SpatialAudioManager.getInstance();
    }
    audioManagerRef.current.init(camera, scene);

    // 3. Inverted SphereGeometry (r=500, 128x96 segments for smooth anti-moiré curvature)
    const geometry = new THREE.SphereGeometry(500, 128, 96);
    // Invert normals to point inward so camera inside sphere views the interior surface
    geometry.scale(-1, 1, 1);

    const material = new THREE.MeshBasicMaterial({
      map: dummyTextureRef.current,
      color: 0xffffff,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uHdr = sphereUniformsRef.current.uHdr;
      shader.uniforms.uPrevTexture = sphereUniformsRef.current.uPrevTexture;
      shader.uniforms.uBlend = sphereUniformsRef.current.uBlend;
      shader.uniforms.uHasPrev = sphereUniformsRef.current.uHasPrev;
      shader.uniforms.uPrevOffset = sphereUniformsRef.current.uPrevOffset;
      shader.fragmentShader = `
        uniform float uHdr;
        uniform sampler2D uPrevTexture;
        uniform float uBlend;
        uniform float uHasPrev;
        uniform float uPrevOffset;
        vec3 applyHDR(vec3 color) {
          // 1. Aggressive shadow lift (gamma 0.68 pulls up deep shadows, preserves true black at 0 and highlights at 1)
          vec3 lifted = pow(max(color, vec3(0.0)), vec3(0.68));
          // 2. Midtone contrast boost (S-curve steepens gradient in gray / midtones)
          vec3 sCurve = lifted * lifted * (3.0 - 2.0 * lifted);
          vec3 contrasted = mix(lifted, sCurve, 0.45);
          // 3. Strong vibrance and color saturation pop
          float lum = dot(contrasted, vec3(0.2126, 0.7152, 0.0722));
          float maxC = max(contrasted.r, max(contrasted.g, contrasted.b));
          float minC = min(contrasted.r, min(contrasted.g, contrasted.b));
          float sat = (maxC - minC) / (maxC + 0.001);
          float vibrance = 1.50 - sat * 0.45;
          vec3 saturated = mix(vec3(lum), contrasted, max(1.18, vibrance)) * 1.10;
          return clamp(saturated, 0.0, 1.0);
        }
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #include <map_fragment>
        if (uHasPrev > 0.5 && uBlend < 1.0) {
          vec2 prevUv = vec2(fract(vMapUv.x + uPrevOffset), vMapUv.y);
          vec4 prevCol = texture2D(uPrevTexture, prevUv);
          diffuseColor = mix(prevCol, diffuseColor, uBlend);
        }
        if (uHdr > 0.5) {
          diffuseColor.rgb = applyHDR(diffuseColor.rgb);
        }
        `
      );
    };
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    materialRef.current = material;

    // 3b. Little Planet stereographic fullscreen quad
    const littlePlanetScene = new THREE.Scene();
    const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeometry = new THREE.PlaneGeometry(2, 2);

    const quadMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: dummyTextureRef.current },
        uPrevTexture: sphereUniformsRef.current.uPrevTexture,
        uBlend: sphereUniformsRef.current.uBlend,
        uHasPrev: sphereUniformsRef.current.uHasPrev,
        uPrevOffset: sphereUniformsRef.current.uPrevOffset,
        uResolution: { value: new THREE.Vector2(width, height) },
        uYaw: { value: stateRef.current.littlePlanetYaw },
        uPitch: { value: stateRef.current.littlePlanetPitch },
        uZoom: { value: stateRef.current.littlePlanetZoom },
        uMode: { value: stateRef.current.projectionMode === 'curved' ? 1 : 0 },
        uHdr: sphereUniformsRef.current.uHdr,
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform sampler2D uPrevTexture;
        uniform float uBlend;
        uniform float uHasPrev;
        uniform float uPrevOffset;
        uniform vec2 uResolution;
        uniform float uYaw;
        uniform float uPitch;
        uniform float uZoom;
        uniform int uMode; // 0 = little_planet, 1 = curved (conformal horizontal stereographic)
        uniform float uHdr;
        varying vec2 vUv;

        const float PI = 3.14159265358979323846;

        vec3 applyHDR(vec3 color) {
          // 1. Aggressive shadow lift (gamma 0.68 pulls up deep shadows, preserves true black at 0 and highlights at 1)
          vec3 lifted = pow(max(color, vec3(0.0)), vec3(0.68));
          // 2. Midtone contrast boost (S-curve steepens gradient in gray / midtones)
          vec3 sCurve = lifted * lifted * (3.0 - 2.0 * lifted);
          vec3 contrasted = mix(lifted, sCurve, 0.45);
          // 3. Strong vibrance and color saturation pop
          float lum = dot(contrasted, vec3(0.2126, 0.7152, 0.0722));
          float maxC = max(contrasted.r, max(contrasted.g, contrasted.b));
          float minC = min(contrasted.r, min(contrasted.g, contrasted.b));
          float sat = (maxC - minC) / (maxC + 0.001);
          float vibrance = 1.50 - sat * 0.45;
          vec3 saturated = mix(vec3(lum), contrasted, max(1.18, vibrance)) * 1.10;
          return clamp(saturated, 0.0, 1.0);
        }

        void main() {
          float minDim = min(uResolution.x, uResolution.y);
          vec2 p = (vUv - 0.5) * 2.0 * vec2(uResolution.x / minDim, uResolution.y / minDim);

          p /= max(uZoom, 0.1);

          vec3 dir;

          if (uMode == 0) {
            // Little Planet: Inverse stereographic projection from zenith
            float r2 = dot(p, p);
            dir = vec3(
              2.0 * p.x / (1.0 + r2),
              (r2 - 1.0) / (1.0 + r2),
              2.0 * p.y / (1.0 + r2)
            );
          } else {
            // Curved: Conformal horizontal stereographic projection
            float r = length(p);
            float theta = 2.0 * atan(r * 0.5);
            dir = vec3(
              sin(theta) * (r > 0.0001 ? p.x / r : 0.0),
              sin(theta) * (r > 0.0001 ? p.y / r : 0.0),
              cos(theta)
            );
          }

          // Pitch rotation (tilt along X axis): positive uPitch tilts camera up (+Y)
          float cp = cos(uPitch);
          float sp = sin(uPitch);
          vec3 tilted = vec3(
            dir.x,
            dir.y * cp + dir.z * sp,
            -dir.y * sp + dir.z * cp
          );

          // Yaw rotation (spin around Y axis): positive uYaw rotates camera right (+lon)
          float cy = cos(uYaw);
          float sy = sin(uYaw);
          vec3 rotated = vec3(
            tilted.x * cy + tilted.z * sy,
            tilted.y,
            -tilted.x * sy + tilted.z * cy
          );

          float lat = asin(clamp(rotated.y, -1.0, 1.0));
          float lon = atan(rotated.x, rotated.z);

          vec2 texCoord = vec2(
            fract(lon / (2.0 * PI)),
            clamp(lat / PI + 0.5, 0.0005, 0.9995)
          );

          // Correct screen-space derivatives across the 2*PI wrap seam to eliminate the 1px mipmap seam
          vec2 dx = dFdx(texCoord);
          vec2 dy = dFdy(texCoord);
          dx.x = dx.x - floor(dx.x + 0.5);
          dy.x = dy.x - floor(dy.x + 0.5);

          vec4 col = textureGrad(uTexture, texCoord, dx, dy);
          if (uHasPrev > 0.5 && uBlend < 1.0) {
            vec2 prevTexCoord = vec2(fract(texCoord.x + uPrevOffset), texCoord.y);
            vec4 prevCol = textureGrad(uPrevTexture, prevTexCoord, dx, dy);
            col = mix(prevCol, col, uBlend);
          }
          if (uHdr > 0.5) {
            col.rgb = applyHDR(col.rgb);
          }
          gl_FragColor = col;
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    const quadMesh = new THREE.Mesh(quadGeometry, quadMaterial);
    littlePlanetScene.add(quadMesh);

    littlePlanetSceneRef.current = littlePlanetScene;
    orthoCameraRef.current = orthoCamera;
    quadMaterialRef.current = quadMaterial;

    // Expose for testing
    (window as any).__threeViewer = {
      scene,
      camera,
      renderer,
      sphere,
      material,
      littlePlanetScene,
      getLon: () => stateRef.current.lon,
      getLat: () => stateRef.current.lat,
      getFov: () => camera.fov,
      lookAtHeading: (targetHeadingDeg: number) => {
        const northOffset = panoramaRef.current?.sun_data?.north_offset ?? 0;
        const desiredLon = targetHeadingDeg - northOffset;
        const s = stateRef.current;
        const currentLonNorm = ((s.lon % 360) + 360) % 360;
        const desiredLonNorm = ((desiredLon % 360) + 360) % 360;
        let diff = desiredLonNorm - currentLonNorm;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        const isShader = s.projectionMode === 'little_planet' || s.projectionMode === 'curved';
        if (isShader) {
          s.targetLittlePlanetYaw += THREE.MathUtils.degToRad(diff);
          s.targetLittlePlanetPitch = 0;
        } else {
          s.targetLon = s.lon + diff;
          s.targetLat = 0;
        }
      },
    };

    setIsRendererReady(true);

    // 5. Interaction & Controls (Mouse & Touch Drag with Physics Damping & Pitch Clamp)
    const handleStart = (clientX: number, clientY: number) => {
      const s = stateRef.current;
      s.isUserInteracting = true;
      s.onPointerDownPointerX = clientX;
      s.onPointerDownPointerY = clientY;
      s.onPointerDownLon = s.lon;
      s.targetLon = s.lon;
      s.onPointerDownLat = s.lat;
      s.targetLat = s.lat;
      s.onPointerDownLittlePlanetYaw = s.littlePlanetYaw;
      s.targetLittlePlanetYaw = s.littlePlanetYaw;
      s.onPointerDownLittlePlanetPitch = s.littlePlanetPitch;
      s.targetLittlePlanetPitch = s.littlePlanetPitch;
      s.lastPointerX = clientX;
      s.lastPointerY = clientY;
      s.lastPointerTime = performance.now();
      s.velocityX = 0;
      s.velocityY = 0;

      if (s.isAutoPanning && !s.isMovieMode) {
        s.onAutoPanStop?.();
      }
    };

    const handleMove = (clientX: number, clientY: number) => {
      const s = stateRef.current;
      if (!s.isUserInteracting) return;
      const now = performance.now();

      // Dynamic viewport measurement for precise 1:1 pixel-to-angle mapping
      const rect = renderer.domElement.getBoundingClientRect();
      const viewWidth = Math.max(1, rect.width || container.clientWidth || window.innerWidth || 800);
      const viewHeight = Math.max(1, rect.height || container.clientHeight || window.innerHeight || 600);
      const minDim = Math.min(viewWidth, viewHeight);

      const isShader = s.projectionMode === 'little_planet' || s.projectionMode === 'curved';
      if (isShader) {
        const isCurved = s.projectionMode === 'curved';
        // Exact 1:1 stereographic finger-to-surface tracking across all zoom levels
        // In shader: p = (vUv - 0.5) * 2.0 * (res / minDim) / max(uZoom, 0.1).
        // 1 pixel on screen corresponds to 2.0 / (minDim * uZoom) in normalized projection space.
        const currentZoom = Math.max(0.08, s.littlePlanetZoom);
        const dragFactor = (isCurved ? 2.0 : 2.5) / (minDim * currentZoom);

        const deltaX = (s.onPointerDownPointerX - clientX) * dragFactor;
        const deltaY = (clientY - s.onPointerDownPointerY) * dragFactor;

        s.targetLittlePlanetYaw = s.onPointerDownLittlePlanetYaw + deltaX;
        const pitchLimit = 1.45;
        s.targetLittlePlanetPitch = Math.max(-pitchLimit, Math.min(pitchLimit, s.onPointerDownLittlePlanetPitch + deltaY));

        s.velocityX = 0;
        s.velocityY = 0;

        s.lastPointerX = clientX;
        s.lastPointerY = clientY;
        s.lastPointerTime = now;
        return;
      }

      // Exact 1:1 perspective camera ray projection:
      // In Three.js, camera.fov is the vertical field of view in degrees.
      // Angular velocity per pixel at screen center: (2 * tan(fov_y / 2)) / height (in rad/px)
      const currentFovDeg = cameraRef.current?.fov || s.fov || s.targetFov || 75;
      const halfFovRad = (currentFovDeg * 0.5 * Math.PI) / 180;
      const tanHalfFov = Math.tan(halfFovRad);
      const degPerPixel = ((2.0 * tanHalfFov) / viewHeight) * (180 / Math.PI);

      // Horizontal tilt compensation: when tilted up/down by latitude, horizontal rotation is scaled by cos(lat)
      // Clamping cos(lat) >= 0.15 ensures stable, responsive tracking even near poles without gimbal slippage
      const latRad = (s.onPointerDownLat * Math.PI) / 180;
      const cosLat = Math.max(0.15, Math.cos(latRad));

      const deltaX = ((s.onPointerDownPointerX - clientX) * degPerPixel) / cosLat;
      const deltaY = (clientY - s.onPointerDownPointerY) * degPerPixel;

      s.targetLon = s.onPointerDownLon + deltaX;
      // Clamp pitch strictly between -88° and +88° to avoid gimbal lock at poles while allowing full tilt freedom
      s.targetLat = Math.max(-88, Math.min(88, s.onPointerDownLat + deltaY));

      s.velocityX = 0;
      s.velocityY = 0;

      s.lastPointerX = clientX;
      s.lastPointerY = clientY;
      s.lastPointerTime = now;
    };

    const handleEnd = (clientX?: number, clientY?: number) => {
      const s = stateRef.current;
      const wasInteracting = s.isUserInteracting;
      s.isUserInteracting = false;
      s.velocityX = 0;
      s.velocityY = 0;
      s.targetLon = s.lon;
      s.targetLat = s.lat;
      s.targetLittlePlanetYaw = s.littlePlanetYaw;
      s.targetLittlePlanetPitch = s.littlePlanetPitch;

      // Click / tap detection on 3D clickable markers (Walkthrough chevrons, POIs, Filmstrip bubbles)
      if (
        wasInteracting &&
        clientX !== undefined &&
        clientY !== undefined
      ) {
        const dx = clientX - s.onPointerDownPointerX;
        const dy = clientY - s.onPointerDownPointerY;
        if (Math.hypot(dx, dy) < 10) {
          const rect = renderer.domElement.getBoundingClientRect();
          const mouseX = ((clientX - rect.left) / rect.width) * 2 - 1;
          const mouseY = -((clientY - rect.top) / rect.height) * 2 + 1;
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

          // 1. Walkthrough hotspots (highest priority)
          if (walkthroughGroupRef.current?.visible) {
            const hits = raycaster.intersectObjects(walkthroughGroupRef.current.children, false);
            if (hits.length > 0) {
              const hit = hits[0].object as any;
              if (hit.__panorama && onSelectPanoramaRef.current) {
                const targetHeading = hit.__bearing;
                if (targetHeading !== undefined) {
                  const northOff = panoramaRef.current?.sun_data?.north_offset ?? 0;
                  const desiredLon = targetHeading - northOff;
                  const curLonNorm = ((s.lon % 360) + 360) % 360;
                  const desLonNorm = ((desiredLon % 360) + 360) % 360;
                  let diff = desLonNorm - curLonNorm;
                  while (diff > 180) diff -= 360;
                  while (diff < -180) diff += 360;
                  s.targetLon = s.lon + diff;
                  s.targetLat = -14;
                  s.targetFov = Math.max(38, s.targetFov - 20);
                }
                setTimeout(() => {
                  onSelectPanoramaRef.current?.(hit.__panorama);
                }, 220);
                return;
              }
            }
          }

          // 2. Peak Finder POI markers
          if (poiMarkersGroupRef.current?.visible) {
            const hits = raycaster.intersectObjects(poiMarkersGroupRef.current.children, false);
            if (hits.length > 0) {
              const hit = hits[0].object as any;
              if (hit.__poi) {
                const northOff = panoramaRef.current?.sun_data?.north_offset ?? 0;
                const desiredLon = hit.__poi.bearingDeg - northOff;
                const curLonNorm = ((s.lon % 360) + 360) % 360;
                const desLonNorm = ((desiredLon % 360) + 360) % 360;
                let diff = desLonNorm - curLonNorm;
                while (diff > 180) diff -= 360;
                while (diff < -180) diff += 360;
                s.targetLon = s.lon + diff;
                s.targetLat = hit.__poi.elevDeg;
                return;
              }
            }
          }

          // 3. Clickable filmstrip markers
          if (panoramaMarkersGroupRef.current?.visible) {
            const intersects = raycaster.intersectObjects(panoramaMarkersGroupRef.current.children, false);
            if (intersects.length > 0) {
              const hit = intersects[0].object as any;
              if (hit.__panorama && onSelectPanoramaRef.current) {
                onSelectPanoramaRef.current(hit.__panorama);
                return;
              }
            }
          }
        }
      }
    };

    // Pointer events
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      handleStart(e.clientX, e.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      handleMove(e.clientX, e.clientY);

      // Hover cursor management for all clickable 3D markers
      const s = stateRef.current;
      if (!s.isUserInteracting) {
        const rect = renderer.domElement.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

        const checkWalk = walkthroughGroupRef.current?.visible
          ? raycaster.intersectObjects(walkthroughGroupRef.current.children, false)
          : [];
        const checkPoi = poiMarkersGroupRef.current?.visible
          ? raycaster.intersectObjects(poiMarkersGroupRef.current.children, false)
          : [];
        const checkPano = panoramaMarkersGroupRef.current?.visible
          ? raycaster.intersectObjects(panoramaMarkersGroupRef.current.children, false)
          : [];

        if (checkWalk.length > 0 || checkPoi.length > 0 || checkPano.length > 0) {
          container.style.cursor = 'pointer';
        } else {
          container.style.cursor = 'grab';
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      handleEnd(e.clientX, e.clientY);
    };

    const onPointerCancel = () => {
      handleEnd();
    };

    // Mouse fallback events for automation & older browsers
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      handleStart(e.clientX, e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const onMouseUp = (e: MouseEvent) => {
      handleEnd(e.clientX, e.clientY);
    };

    const onTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches && e.changedTouches[0];
      handleEnd(touch?.clientX, touch?.clientY);
    };

    const onTouchCancel = () => {
      handleEnd();
    };

    // Zooming via Wheel
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = stateRef.current;
      const isShader = s.projectionMode === 'little_planet' || s.projectionMode === 'curved';
      if (isShader) {
        const minZoom = s.projectionMode === 'curved' ? 0.22 : 0.30;
        const maxZoom = s.projectionMode === 'curved' ? 5.0 : 3.0;
        // Gentler wheel zoom (~2.5x finer resolution: 0.0006 instead of 0.0015)
        s.targetLittlePlanetZoom = Math.max(minZoom, Math.min(maxZoom, s.targetLittlePlanetZoom - e.deltaY * 0.0006));
        return;
      }
      // Adjust FOV safely between 15° (for 1:1 ultra-res inspection) and 110° (expanded wide-angle range)
      // Gentler wheel zoom (~2.5x finer resolution: 0.02 instead of 0.05)
      s.targetFov = Math.max(15, Math.min(110, s.targetFov + e.deltaY * 0.02));
    };

    // Pinch-to-zoom on touch devices
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const s = stateRef.current;
        s.isUserInteracting = false;
        s.pinchStartDist = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
        s.pinchStartFov = s.targetFov;
        s.pinchStartLittlePlanetZoom = s.targetLittlePlanetZoom;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const s = stateRef.current;
        const currentDist = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
        if (s.pinchStartDist > 0) {
          const isShader = s.projectionMode === 'little_planet' || s.projectionMode === 'curved';
          if (isShader) {
            const minZoom = s.projectionMode === 'curved' ? 0.22 : 0.30;
            const maxZoom = s.projectionMode === 'curved' ? 5.0 : 3.0;
            const factor = currentDist / s.pinchStartDist;
            s.targetLittlePlanetZoom = Math.max(minZoom, Math.min(maxZoom, s.pinchStartLittlePlanetZoom * factor));
          } else {
            const factor = s.pinchStartDist / currentDist;
            s.targetFov = Math.max(15, Math.min(110, s.pinchStartFov * factor));
          }
        }
      }
    };

    // Keyboard zoom shortcuts (+ / -)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const s = stateRef.current;
      const isShader = s.projectionMode === 'little_planet' || s.projectionMode === 'curved';
      if (e.key === '+' || e.key === '=') {
        if (isShader) {
          const maxZoom = s.projectionMode === 'curved' ? 5.0 : 3.0;
          s.targetLittlePlanetZoom = Math.min(maxZoom, s.targetLittlePlanetZoom * 1.15);
        } else {
          s.targetFov = Math.max(15, s.targetFov - 5);
        }
      } else if (e.key === '-' || e.key === '_') {
        if (isShader) {
          const minZoom = s.projectionMode === 'curved' ? 0.22 : 0.30;
          s.targetLittlePlanetZoom = Math.max(minZoom, s.targetLittlePlanetZoom / 1.15);
        } else {
          s.targetFov = Math.min(110, s.targetFov + 5);
        }
      }
    };

    // Double click calibration handler for admin solar alignment
    const onDblClick = (e: MouseEvent) => {
      if (!isCalibratingSunRef.current || !container || !camera || !sphere) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
      const intersects = raycaster.intersectObject(sphere, false);
      if (intersects.length > 0) {
        const p = intersects[0].point;
        const radius = p.length();
        const phi = Math.acos(Math.max(-1, Math.min(1, p.y / radius)));
        const theta = Math.atan2(p.z, p.x);
        const imgLat = 90 - THREE.MathUtils.radToDeg(phi);
        const imgLon = ((THREE.MathUtils.radToDeg(theta) % 360) + 360) % 360;
        onCalibrateSunPointRef.current?.({ imgLon, imgLat });
      }
    };

    // Device orientation motion sensor (mobile gyroscope navigation)
    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (!isGyroscopeActiveRef.current) return;
      const s = stateRef.current;
      if (s.isUserInteracting) return;

      if (e.alpha !== null && e.beta !== null) {
        if (lastDeviceAlphaRef.current === null || lastDeviceBetaRef.current === null) {
          lastDeviceAlphaRef.current = e.alpha;
          lastDeviceBetaRef.current = e.beta;
          return;
        }

        let deltaAlpha = e.alpha - lastDeviceAlphaRef.current;
        if (deltaAlpha > 180) deltaAlpha -= 360;
        if (deltaAlpha < -180) deltaAlpha += 360;

        let deltaBeta = e.beta - lastDeviceBetaRef.current;

        lastDeviceAlphaRef.current = e.alpha;
        lastDeviceBetaRef.current = e.beta;

        // Apply smooth orientation delta
        s.targetLon -= deltaAlpha * 0.85;
        s.targetLat = Math.max(-85, Math.min(85, s.targetLat + deltaBeta * 0.85));
      }
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('dblclick', onDblClick);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchCancel);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('deviceorientation', handleDeviceOrientation);

    // 6. Resize handling
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
        renderer.setSize(w, h);
        quadMaterial.uniforms.uResolution.value.set(
          renderer.domElement.width,
          renderer.domElement.height
        );
      }
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Trigger initial layout adjustment
    setTimeout(handleResize, 50);

    // 7. Render Loop with Smooth Damping (Google Photos Inertia)
    let animationFrameId: number;
    let lastFrameTime = performance.now();

    const animate = () => {
      if (isDisposedRef.current) return;
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      const rawDelta = now - lastFrameTime;
      lastFrameTime = now;
      const deltaMs = Math.min(Math.max(rawDelta, 1), 100);
      const dtScale = deltaMs / 16.6667;
      const dampingFactor = 1.0 - Math.pow(1.0 - 0.12, dtScale);
      const fovDampingFactor = 1.0 - Math.pow(1.0 - 0.15, dtScale);

      const s = stateRef.current;

      // Smooth crossfade progression across panorama transitions (bypassed during manual calibration)
      if (s.isCrossfading && !isCalibrationActiveRef.current) {
        const elapsed = performance.now() - s.crossfadeStartTime;
        const duration = s.crossfadeDuration || 480;
        const t = Math.min(1.0, elapsed / duration);
        const blend = t * t * (3.0 - 2.0 * t);
        sphereUniformsRef.current.uBlend.value = blend;
        if (quadMaterialRef.current?.uniforms.uBlend) {
          quadMaterialRef.current.uniforms.uBlend.value = blend;
        }
        if (t >= 1.0) {
          s.isCrossfading = false;
          isPanoCrossfadeActiveRef.current = false;
          sphereUniformsRef.current.uBlend.value = 1.0;
          sphereUniformsRef.current.uHasPrev.value = 0.0;
          sphereUniformsRef.current.uPrevOffset.value = 0.0;
          if (quadMaterialRef.current?.uniforms.uBlend) {
            quadMaterialRef.current.uniforms.uBlend.value = 1.0;
          }
          if (quadMaterialRef.current?.uniforms.uHasPrev) {
            quadMaterialRef.current.uniforms.uHasPrev.value = 0.0;
          }
          if (quadMaterialRef.current?.uniforms.uPrevOffset) {
            quadMaterialRef.current.uniforms.uPrevOffset.value = 0.0;
          }
          if (prevTextureRef.current) {
            const oldTex = prevTextureRef.current;
            prevTextureRef.current = null;
            // Clean up any preloader cache entry that pointed to oldTex so we never reuse a disposed texture
            for (const [k, v] of preloadedTexturesRef.current.entries()) {
              if (v.tex === oldTex) {
                preloadedTexturesRef.current.delete(k);
              }
            }
            oldTex.dispose();
            if (dummyTextureRef.current) {
              sphereUniformsRef.current.uPrevTexture.value = dummyTextureRef.current;
              if (quadMaterialRef.current?.uniforms.uPrevTexture) {
                quadMaterialRef.current.uniforms.uPrevTexture.value = dummyTextureRef.current;
              }
            }
          }
        }
      }

      if (s.projectionMode === 'little_planet' || s.projectionMode === 'curved') {
        const isCurved = s.projectionMode === 'curved';
        // Handle continuous auto-panning spinning globe with constant angular velocity
        if (s.isAutoPanning && !s.isUserInteracting) {
          const dir = s.autoPanDirection === 'left' ? -1 : 1;
          const step = 0.003 * dir * dtScale;
          s.targetLittlePlanetYaw += step;
          if (s.isMovieMode) {
            s.accumulatedPanDeg += Math.abs(THREE.MathUtils.radToDeg(step));
            if (s.accumulatedPanDeg >= 360) {
              const isNextReady = checkIsNextReady();
              if (isNextReady || s.accumulatedPanDeg >= 420) {
                s.accumulatedPanDeg = 0;
                s.onFullCircleComplete?.();
              }
            }
          }
        }

        // When dragging, track pointer directly with zero lag; when idle/animating, use smooth damping
        if (s.isUserInteracting) {
          s.littlePlanetYaw = s.targetLittlePlanetYaw;
          s.littlePlanetPitch = s.targetLittlePlanetPitch;
        } else {
          s.littlePlanetYaw += (s.targetLittlePlanetYaw - s.littlePlanetYaw) * dampingFactor;
          s.littlePlanetPitch += (s.targetLittlePlanetPitch - s.littlePlanetPitch) * dampingFactor;
        }
        s.littlePlanetZoom += (s.targetLittlePlanetZoom - s.littlePlanetZoom) * dampingFactor;

        // Keep lon and lat continuously in sync so switching modes and panorama heading tracking is instantaneous & identical
        s.lon = THREE.MathUtils.radToDeg(s.littlePlanetYaw);
        s.targetLon = s.lon;
        s.lat = THREE.MathUtils.radToDeg(s.littlePlanetPitch);
        s.targetLat = s.lat;

        quadMaterial.uniforms.uMode.value = isCurved ? 1 : 0;
        quadMaterial.uniforms.uYaw.value = s.littlePlanetYaw;
        quadMaterial.uniforms.uPitch.value = s.littlePlanetPitch;
        quadMaterial.uniforms.uZoom.value = s.littlePlanetZoom;
        quadMaterial.uniforms.uResolution.value.set(
          renderer.domElement.width,
          renderer.domElement.height
        );

        renderer.render(littlePlanetScene, orthoCamera);
      } else {
        // Handle continuous auto-panning if active with constant angular velocity
        if (s.isAutoPanning && !s.isUserInteracting) {
          const dir = s.autoPanDirection === 'left' ? -1 : 1;
          const step = (s.isMovieMode ? 0.10 : 0.08) * dir * dtScale;
          s.targetLon += step;
          if (s.isMovieMode) {
            s.accumulatedPanDeg += Math.abs(step);
            if (s.accumulatedPanDeg >= 360) {
              const isNextReady = checkIsNextReady();
              if (isNextReady || s.accumulatedPanDeg >= 420) {
                s.accumulatedPanDeg = 0;
                s.onFullCircleComplete?.();
              }
            }
          }
        }

        // When dragging, track pointer directly with zero lag; when idle/animating, use smooth damping
        if (s.isUserInteracting) {
          s.lon = s.targetLon;
          s.lat = s.targetLat;
        } else {
          s.lon += (s.targetLon - s.lon) * dampingFactor;
          s.lat += (s.targetLat - s.lat) * dampingFactor;
        }
        s.lat = Math.max(-88, Math.min(88, s.lat));

        // Keep yaw and pitch continuously in sync for seamless switch to curved
        s.littlePlanetYaw = THREE.MathUtils.degToRad(s.lon);
        s.targetLittlePlanetYaw = s.littlePlanetYaw;
        s.littlePlanetPitch = THREE.MathUtils.degToRad(s.lat);
        s.targetLittlePlanetPitch = s.littlePlanetPitch;

        // Smooth FOV interpolation
        if (Math.abs(camera.fov - s.targetFov) > 0.01) {
          camera.fov += (s.targetFov - camera.fov) * fovDampingFactor;
          camera.updateProjectionMatrix();
        }
        s.fov = camera.fov;

        // Convert spherical coordinates to 3D lookAt target vector
        const phi = THREE.MathUtils.degToRad(90 - s.lat);
        const theta = THREE.MathUtils.degToRad(s.lon);

        const target = new THREE.Vector3(
          500 * Math.sin(phi) * Math.cos(theta),
          500 * Math.cos(phi),
          500 * Math.sin(phi) * Math.sin(theta)
        );

        camera.lookAt(target);
        renderer.render(scene, camera);
      }

      // Update Spatial Audio sound movements
      if (audioManagerRef.current && audioManagerRef.current.isActive()) {
        audioManagerRef.current.update(deltaMs / 1000);
      }

      // Track real-time True Heading and Pitch for continuous orientation across panorama switches
      const northOffset = panoramaRef.current?.sun_data?.north_offset ?? 0;
      const heading = calculateTrueHeading(s.lon, northOffset);
      lastTrueHeadingRef.current = heading.headingDeg;
      lastLatRef.current = s.lat;

      // Report real-time True Heading, orientation, and horizontal FOV
      if (onHeadingChangeRef.current) {
        const vFovRad = THREE.MathUtils.degToRad(camera.fov);
        const aspect = camera.aspect || 1;
        const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);
        const hFovDeg = THREE.MathUtils.radToDeg(hFovRad);
        onHeadingChangeRef.current(heading.headingDeg, s.lon, s.lat, hFovDeg);
      }

      // Periodically persist tilt & zoom state to localStorage for seamless cross-panorama continuity
      const nowMs = performance.now();
      if (nowMs - lastSavedStateTimeRef.current > 350) {
        lastSavedStateTimeRef.current = nowMs;
        const isShader = s.projectionMode === 'little_planet' || s.projectionMode === 'curved';
        const curLat = isShader ? THREE.MathUtils.radToDeg(s.littlePlanetPitch) : s.lat;
        saveCameraState(curLat, camera.fov, s.littlePlanetZoom);
      }

      // Compute and emit zoom info if onZoomChange listener is attached
      if (onZoomChange) {
        const w = container ? (container.clientWidth || window.innerWidth) : window.innerWidth;
        const h = container ? (container.clientHeight || window.innerHeight) : window.innerHeight;
        const dpr = renderer ? renderer.getPixelRatio() : (window.devicePixelRatio || 1);
        const physicalW = renderer ? renderer.domElement.width : w * dpr;
        const physicalH = renderer ? renderer.domElement.height : h * dpr;
        const panoW = panoramaRef.current.width || 8192;

        let percent = 100;
        if (s.projectionMode === 'curved') {
          const minDim = Math.min(physicalW, physicalH);
          const uZoom_1to1 = panoW / (minDim * Math.PI);
          percent = Math.round((s.littlePlanetZoom / uZoom_1to1) * 100);
        } else if (s.projectionMode === 'little_planet') {
          percent = Math.round(s.littlePlanetZoom * 100);
        } else {
          const fov1to1_rad = 2 * Math.atan((physicalH * Math.PI) / panoW);
          const current_rad = THREE.MathUtils.degToRad(camera.fov);
          const ratio = Math.tan(fov1to1_rad / 2) / Math.tan(current_rad / 2);
          percent = Math.round(ratio * 100);
        }

        const is1to1 = Math.abs(percent - 100) <= 2;
        const text = is1to1 ? '1:1' : `${percent}%`;

        if (text !== lastZoomTextRef.current) {
          lastZoomTextRef.current = text;
          onZoomChange({ percent, text, is1to1 });
        }
      }
    };

    animate();

    // 8. Lifecycle & Cleanup: Disposing geometries, textures, materials, and renderer
    return () => {
      isDisposedRef.current = true;
      cancelAnimationFrame(animationFrameId);

      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);

      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();

      if ((window as any).__threeViewer) {
        delete (window as any).__threeViewer;
      }

      // Dispose POI and Walkthrough groups
      if (poiMarkersGroupRef.current) {
        scene.remove(poiMarkersGroupRef.current);
        poiMarkersGroupRef.current.traverse((child) => {
          if ((child as any).material?.map) (child as any).material.map.dispose();
          if ((child as any).material) (child as any).material.dispose();
          if ((child as any).geometry) (child as any).geometry.dispose();
        });
        poiMarkersGroupRef.current = null;
      }
      if (walkthroughGroupRef.current) {
        scene.remove(walkthroughGroupRef.current);
        walkthroughGroupRef.current.traverse((child) => {
          if ((child as any).material?.map) (child as any).material.map.dispose();
          if ((child as any).material) (child as any).material.dispose();
          if ((child as any).geometry) (child as any).geometry.dispose();
        });
        walkthroughGroupRef.current = null;
      }

      // Free GPU resources
      geometry.dispose();
      material.dispose();
      quadGeometry.dispose();
      quadMaterial.dispose();
      if (dummyTextureRef.current) {
        dummyTextureRef.current.dispose();
        dummyTextureRef.current = null;
      }
      if (prevTextureRef.current) {
        prevTextureRef.current.dispose();
        prevTextureRef.current = null;
      }

      if (activeTexturesRef.current.thumb) {
        activeTexturesRef.current.thumb.dispose();
        activeTexturesRef.current.thumb = null;
      }
      if (activeTexturesRef.current.pano2k) {
        activeTexturesRef.current.pano2k.dispose();
        activeTexturesRef.current.pano2k = null;
      }
      if (activeTexturesRef.current.full) {
        activeTexturesRef.current.full.dispose();
        activeTexturesRef.current.full = null;
      }

      preloadedTexturesRef.current.forEach((entry) => {
        try {
          entry.tex.dispose();
        } catch {}
      });
      preloadedTexturesRef.current.clear();

      sceneRef.current = null;
      cameraRef.current = null;
      littlePlanetSceneRef.current = null;
      orthoCameraRef.current = null;
      quadMaterialRef.current = null;
      materialRef.current = null;
      rendererRef.current = null;

      if (audioManagerRef.current) {
        audioManagerRef.current.dispose();
        audioManagerRef.current = null;
      }

      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    isGyroscopeActiveRef.current = !!isGyroscopeEnabled;
    if (!isGyroscopeEnabled) {
      lastDeviceAlphaRef.current = null;
      lastDeviceBetaRef.current = null;
    }
  }, [isGyroscopeEnabled]);

  // 2. Progressive Texture Loading for the active panorama (preserves camera orientation, tilt, zoom, and projection)
  useEffect(() => {
    if (!isRendererReady || !materialRef.current || !quadMaterialRef.current || !rendererRef.current) return;

    const currentEpoch = ++loadEpochRef.current;
    const material = materialRef.current;
    const quadMaterial = quadMaterialRef.current;
    const renderer = rendererRef.current;

    // Reset interaction momentum so it doesn't spin uncontrollably across panorama switches
    stateRef.current.velocityX = 0;
    stateRef.current.velocityY = 0;
    stateRef.current.isUserInteracting = false;
    stateRef.current.accumulatedPanDeg = 0;

    // Street View orientation continuity: preserve exact True Azimuth (heading) from previous panorama, or use forcedTrueHeading
    if (
      previousPanoIdRef.current &&
      previousPanoIdRef.current !== panorama.id &&
      ((forcedTrueHeading !== undefined && forcedTrueHeading !== null) || lastTrueHeadingRef.current !== null)
    ) {
      const preservedHeading = (forcedTrueHeading !== undefined && forcedTrueHeading !== null)
        ? forcedTrueHeading
        : (lastTrueHeadingRef.current ?? 0);
      const oldNorthOffset = previousNorthOffsetRef.current ?? 0;
      const newNorthOffset = panorama.sun_data?.north_offset ?? 0;

      // TrueHeading = (cameraLon + newNorthOffset) % 360  =>  cameraLon = TrueHeading - newNorthOffset
      const desiredLonNorm = ((preservedHeading - newNorthOffset) % 360 + 360) % 360;
      const curLon = stateRef.current.lon;
      const curLonNorm = ((curLon % 360) + 360) % 360;
      let diff = desiredLonNorm - curLonNorm;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      const targetLon = curLon + diff;

      stateRef.current.lon = targetLon;
      const panLead = stateRef.current.isAutoPanning
        ? (stateRef.current.autoPanDirection === 'left' ? -1 : 1) * ((stateRef.current.isMovieMode ? 0.10 : 0.08) / 0.12)
        : 0;
      stateRef.current.targetLon = targetLon + panLead;
      stateRef.current.littlePlanetYaw = THREE.MathUtils.degToRad(targetLon);
      stateRef.current.targetLittlePlanetYaw = stateRef.current.littlePlanetYaw + (stateRef.current.isAutoPanning ? (stateRef.current.autoPanDirection === 'left' ? -0.025 : 0.025) : 0);

      // Geographically align previous texture in crossfade shader so horizon and distant objects line up
      const offsetDiffDeg = newNorthOffset - oldNorthOffset;
      const prevOffsetNorm = offsetDiffDeg / 360.0;
      sphereUniformsRef.current.uPrevOffset.value = prevOffsetNorm;
      if (quadMaterial.uniforms.uPrevOffset) {
        quadMaterial.uniforms.uPrevOffset.value = prevOffsetNorm;
      }
    }

    // Camera pitch (tilt) and zoom continuity: retain user's current pitch and zoom across panorama switches
    if (!previousPanoIdRef.current) {
      if (forcedTrueHeading !== undefined && forcedTrueHeading !== null) {
        const newNorthOffset = panorama.sun_data?.north_offset ?? 0;
        const desiredLonNorm = ((forcedTrueHeading - newNorthOffset) % 360 + 360) % 360;
        stateRef.current.lon = desiredLonNorm;
        stateRef.current.targetLon = desiredLonNorm;
        stateRef.current.littlePlanetYaw = THREE.MathUtils.degToRad(desiredLonNorm);
        stateRef.current.targetLittlePlanetYaw = stateRef.current.littlePlanetYaw;
      }
      const targetPitch = (initialLat !== undefined && !isNaN(initialLat)) ? initialLat : initialLatVal;
      stateRef.current.lat = targetPitch;
      stateRef.current.targetLat = targetPitch;
      stateRef.current.littlePlanetPitch = THREE.MathUtils.degToRad(targetPitch);
      stateRef.current.targetLittlePlanetPitch = stateRef.current.littlePlanetPitch;
    } else {
      // Retain current pitch and zoom seamlessly across panorama transitions
      stateRef.current.targetLat = stateRef.current.lat;
      stateRef.current.targetLittlePlanetPitch = stateRef.current.littlePlanetPitch;
      // Do NOT reset zoom (targetFov / targetLittlePlanetZoom) to stale initial values!
      if (cameraRef.current) {
        stateRef.current.fov = cameraRef.current.fov;
      }
    }

    previousPanoIdRef.current = panorama.id;
    previousNorthOffsetRef.current = panorama.sun_data?.north_offset ?? 0;

    // Capture current visible texture to smoothly crossfade from
    const currentActiveTex = activeTexturesRef.current.full || activeTexturesRef.current.pano8k || activeTexturesRef.current.pano2k || activeTexturesRef.current.thumb;
    if (currentActiveTex) {
      if (prevTextureRef.current && prevTextureRef.current !== currentActiveTex) {
        prevTextureRef.current.dispose();
      }
      prevTextureRef.current = currentActiveTex;
      sphereUniformsRef.current.uPrevTexture.value = currentActiveTex;
      sphereUniformsRef.current.uHasPrev.value = 1.0;
      sphereUniformsRef.current.uBlend.value = 0.0;
      if (quadMaterial.uniforms.uPrevTexture) {
        quadMaterial.uniforms.uPrevTexture.value = currentActiveTex;
      }
      if (quadMaterial.uniforms.uHasPrev) {
        quadMaterial.uniforms.uHasPrev.value = 1.0;
      }
      if (quadMaterial.uniforms.uBlend) {
        quadMaterial.uniforms.uBlend.value = 0.0;
      }
      stateRef.current.isCrossfading = false;
      isPanoCrossfadeActiveRef.current = true;
    } else if (prevTextureRef.current) {
      sphereUniformsRef.current.uHasPrev.value = 1.0;
      sphereUniformsRef.current.uBlend.value = 0.0;
      if (quadMaterial.uniforms.uHasPrev) {
        quadMaterial.uniforms.uHasPrev.value = 1.0;
      }
      if (quadMaterial.uniforms.uBlend) {
        quadMaterial.uniforms.uBlend.value = 0.0;
      }
      stateRef.current.isCrossfading = false;
      isPanoCrossfadeActiveRef.current = true;
    }
    activeTexturesRef.current = { thumb: null, pano2k: null, pano8k: null, full: null };
    activeTexturePanoIdRef.current = null;
    isHighResFinishedRef.current = false;

    const safeDispose = (tex: THREE.Texture | null) => {
      if (
        tex &&
        tex !== prevTextureRef.current &&
        tex !== activeTexturesRef.current.full &&
        tex !== activeTexturesRef.current.pano8k &&
        tex !== activeTexturesRef.current.pano2k
      ) {
        tex.dispose();
      }
    };

    const triggerCrossfade = () => {
      if (sphereUniformsRef.current.uHasPrev.value > 0.5 && !stateRef.current.isCrossfading) {
        stateRef.current.isCrossfading = true;
        stateRef.current.crossfadeStartTime = performance.now();
        stateRef.current.crossfadeDuration = 480;
      }
    };

    const crossfadeToResolution = (newTex: THREE.Texture) => {
      // If a pano-to-pano crossfade is currently active, DO NOT interrupt it!
      // Simply update the incoming texture target (material.map & quadMaterial.uniforms.uTexture)
      // and keep the ongoing blend from prevTexture (Pano A) to newTex (Pano B).
      if (isPanoCrossfadeActiveRef.current) {
        material.map = newTex;
        material.needsUpdate = true;
        material.color.setHex(0xffffff);
        quadMaterial.uniforms.uTexture.value = newTex;
        triggerCrossfade();
        return;
      }

      const currentTex = activeTexturesRef.current.full ||
                         activeTexturesRef.current.pano8k ||
                         activeTexturesRef.current.pano2k ||
                         activeTexturesRef.current.thumb;

      if (currentTex && currentTex !== newTex) {
        if (prevTextureRef.current && prevTextureRef.current !== currentTex && prevTextureRef.current !== newTex) {
          prevTextureRef.current.dispose();
        }
        prevTextureRef.current = currentTex;
        sphereUniformsRef.current.uPrevTexture.value = currentTex;
        sphereUniformsRef.current.uHasPrev.value = 1.0;
        sphereUniformsRef.current.uBlend.value = 0.0;
        sphereUniformsRef.current.uPrevOffset.value = 0.0;
        if (quadMaterial.uniforms.uPrevTexture) {
          quadMaterial.uniforms.uPrevTexture.value = currentTex;
        }
        if (quadMaterial.uniforms.uHasPrev) {
          quadMaterial.uniforms.uHasPrev.value = 1.0;
        }
        if (quadMaterial.uniforms.uBlend) {
          quadMaterial.uniforms.uBlend.value = 0.0;
        }
        if (quadMaterial.uniforms.uPrevOffset) {
          quadMaterial.uniforms.uPrevOffset.value = 0.0;
        }
        stateRef.current.isCrossfading = true;
        stateRef.current.crossfadeStartTime = performance.now();
        // Resolution upgrade on the same panorama uses quick 200ms blend to minimize dual texture sampling
        stateRef.current.crossfadeDuration = 200;
      }
      material.map = newTex;
      material.needsUpdate = true;
      material.color.setHex(0xffffff);
      quadMaterial.uniforms.uTexture.value = newTex;
    };

    onLoadingChange?.(true);

    let previewLoaded = false;
    let pano2kLoaded = false;
    let highResLoaded = false;
    isHighResFinishedRef.current = false;

    const cacheBuster = panorama.size ? `?v=${panorama.size}` : '';
    const cleanFilename = cleanPanoPath(panorama.filename);
    const hasPrevVisible = sphereUniformsRef.current.uHasPrev.value > 0.5;
    let thumbTimeout: any = null;

    const isLocalMode = panoConfig.storage.mode === 'local';
    const thumbPath = `/thumbnails/${cleanFilename}${cacheBuster}`;
    const r2ThumbPath = isLocalMode
      ? `/thumbnails/${cleanFilename}${cacheBuster}`
      : `${panoConfig.storage.thumbnailsUrl}/${cleanFilename}${cacheBuster}`;
    const pano2kDirectPath = isLocalMode
      ? `/panoramas_2k/${cleanFilename}${cacheBuster}`
      : `${panoConfig.storage.panoramas2kUrl}/${cleanFilename}${cacheBuster}`;
    const pano2kPath = `/panoramas_2k/${cleanFilename}${cacheBuster}`;
    const pano8kDirectPath = isLocalMode
      ? `/panoramas_web/${cleanFilename}${cacheBuster}`
      : `${panoConfig.storage.panoramasWebUrl}/${cleanFilename}${cacheBuster}`;
    const pano8kPath = `/panoramas_web/${cleanFilename}${cacheBuster}`;

    const getHighResCandidateUrls = (): string[] => {
      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const urls: string[] = [];
      if (isLocalMode) {
        urls.push(`/panoramas_web/${cleanFilename}${cacheBuster}`);
        urls.push(`/panoramas_2k/${cleanFilename}${cacheBuster}`);
      } else {
        if (panoConfig.storage.panoramasWebUrl) {
          urls.push(`${panoConfig.storage.panoramasWebUrl}/${cleanFilename}${cacheBuster}`);
        }
        urls.push(`/panoramas_web/${cleanFilename}${cacheBuster}`);
        urls.push(`/panoramas_2k/${cleanFilename}${cacheBuster}`);
      }
      if (isLocal && panoConfig.storage.tunnelUrl) {
        urls.push(`${panoConfig.storage.tunnelUrl}/panoramas_web/${cleanFilename}${cacheBuster}`);
        urls.push(`${panoConfig.storage.tunnelUrl}/panoramas/${cleanFilename}${cacheBuster}`);
      }
      return Array.from(new Set(urls.filter(Boolean)));
    };

    // Apply high-res 8K/11K/15K texture and cleanup lower-res textures
    const applyHighRes = (tex: THREE.Texture) => {
      if (thumbTimeout) {
        clearTimeout(thumbTimeout);
        thumbTimeout = null;
      }
      if (fallback2kTimeoutRef.current) {
        clearTimeout(fallback2kTimeoutRef.current);
        fallback2kTimeoutRef.current = null;
      }
      if (isDisposedRef.current || currentEpoch !== loadEpochRef.current) {
        tex.dispose();
        return;
      }
      configureTexture(tex);

      const oldFull = activeTexturesRef.current.full;
      const old8k = activeTexturesRef.current.pano8k;
      const old2k = activeTexturesRef.current.pano2k;
      const oldThumb = activeTexturesRef.current.thumb;

      crossfadeToResolution(tex);
      triggerCrossfade();
      material.map = tex;
      material.needsUpdate = true;
      activeTexturesRef.current.full = tex;
      activeTexturePanoIdRef.current = String(panorama.id);
      highResLoaded = true;
      isHighResFinishedRef.current = true;
      onLoadingChange?.(false);
      onHighResLoadedRef.current?.();

      // Self-heal dimensions from actual loaded texture if panorama.width is 0 or missing
      const imgObj = tex.image as HTMLImageElement | HTMLCanvasElement | undefined;
      const detectedW = imgObj ? ('naturalWidth' in imgObj ? imgObj.naturalWidth : imgObj.width) : 0;
      const detectedH = imgObj ? ('naturalHeight' in imgObj ? imgObj.naturalHeight : imgObj.height) : 0;
      if ((!panorama.width || panorama.width <= 0) && detectedW > 0) {
        panorama.width = detectedW;
        panorama.height = detectedH > 0 ? detectedH : Math.round(detectedW / 2);
      }

      const maxTextureSize = renderer.capabilities.maxTextureSize || 8192;
      const displayW = Math.min(panorama.width || detectedW || maxTextureSize, maxTextureSize);
      const displayH = Math.min(panorama.height || detectedH || Math.round(maxTextureSize / 2), Math.round(maxTextureSize / 2));
      onTextureStateChangeRef.current?.('ultra_hd', { width: displayW, height: displayH });

      if (old2k && old2k !== prevTextureRef.current) safeDispose(old2k);
      if (old8k && old8k !== prevTextureRef.current) safeDispose(old8k);
      if (oldThumb && oldThumb !== prevTextureRef.current) safeDispose(oldThumb);
      if (oldFull && oldFull !== tex && oldFull !== prevTextureRef.current) safeDispose(oldFull);
      activeTexturesRef.current.pano2k = null;
      activeTexturesRef.current.pano8k = null;
      activeTexturesRef.current.thumb = null;
    };

    applyHighResRef.current = applyHighRes;

    const handle15KFailure = () => {
      if (isDisposedRef.current || currentEpoch !== loadEpochRef.current) return;
      activeTexturePanoIdRef.current = String(panorama.id);
      if (activeTexturesRef.current.pano8k) {
        console.warn('Ultra-HD texture failed or timed out; maintaining 8K/4K HD as permanent view.');
        const tex = activeTexturesRef.current.pano8k;
        material.map = tex;
        material.needsUpdate = true;
        material.color.setHex(0xffffff);
        quadMaterial.uniforms.uTexture.value = tex;
        triggerCrossfade();
        highResLoaded = true;
        isHighResFinishedRef.current = true;
        onHighResLoadedRef.current?.();
        const maxTextureSize = renderer.capabilities.maxTextureSize || 4096;
        const w = Math.min(8192, maxTextureSize);
        const h = Math.min(4096, Math.round(maxTextureSize / 2));
        onTextureStateChangeRef.current?.('ultra_hd', { width: w, height: h });
        onLoadingChange?.(false);
      } else if (pano2kLoaded || previewLoaded) {
        console.warn('High-res texture failed or timed out; maintaining 2K preview as stable fallback.');
        const tex = activeTexturesRef.current.pano2k || activeTexturesRef.current.thumb;
        if (tex) {
          material.map = tex;
          material.color.setHex(0xffffff);
          quadMaterial.uniforms.uTexture.value = tex;
          triggerCrossfade();
        }
        highResLoaded = true;
        isHighResFinishedRef.current = true;
        onHighResLoadedRef.current?.();
        onTextureStateChangeRef.current?.('preview_2k_final', { width: 2048, height: 1024 });
        onLoadingChange?.(false);
      } else {
        isHighResFinishedRef.current = true;
        onError?.('Failed to load panorama image.');
        onLoadingChange?.(false);
      }
    };

    // Stage 4: Load Ultra-HD (8K/11K/15K) with automatic multi-tier tunnel fallback
    const loadFullRes = () => {
      if (isDisposedRef.current || highResLoaded || currentEpoch !== loadEpochRef.current) return;

      const candidateUrls = getHighResCandidateUrls();
      let finished = false;
      const timeoutId = setTimeout(() => {
        if (!finished && !highResLoaded && currentEpoch === loadEpochRef.current) {
          console.warn('Ultra-HD download exceeded 45s timeout; maintaining stable view.');
          handle15KFailure();
        }
      }, 45000);

      const tryNextUrl = (index: number) => {
        if (index >= candidateUrls.length) {
          finished = true;
          clearTimeout(timeoutId);
          console.warn('All high-res texture candidates failed; maintaining stable view.');
          handle15KFailure();
          return;
        }
        if (isDisposedRef.current || highResLoaded || currentEpoch !== loadEpochRef.current) {
          clearTimeout(timeoutId);
          return;
        }

        const currentUrl = candidateUrls[index];
        let handled = false;
        const candidateTimeout = setTimeout(() => {
          if (!handled && !finished && !highResLoaded && currentEpoch === loadEpochRef.current) {
            handled = true;
            tryNextUrl(index + 1);
          }
        }, 6000);

        loadPanoTextureAsync(
          currentUrl,
          (hiResTex) => {
            if (handled) return;
            handled = true;
            clearTimeout(candidateTimeout);
            finished = true;
            clearTimeout(timeoutId);
            applyHighRes(hiResTex);
          },
          () => {
            if (handled || finished || isDisposedRef.current || currentEpoch !== loadEpochRef.current) return;
            handled = true;
            clearTimeout(candidateTimeout);
            tryNextUrl(index + 1);
          }
        );
      };

      tryNextUrl(0);
    };

    // Stage 3: Apply 8K texture and decide whether to stream 11K/15K on background
    const apply8K = (tex: THREE.Texture) => {
      if (thumbTimeout) {
        clearTimeout(thumbTimeout);
        thumbTimeout = null;
      }
      if (fallback2kTimeoutRef.current) {
        clearTimeout(fallback2kTimeoutRef.current);
        fallback2kTimeoutRef.current = null;
      }
      if (isDisposedRef.current || highResLoaded || currentEpoch !== loadEpochRef.current) {
        tex.dispose();
        return;
      }
      configureTexture(tex);

      const old8k = activeTexturesRef.current.pano8k;
      const old2k = activeTexturesRef.current.pano2k;
      const oldThumb = activeTexturesRef.current.thumb;

      crossfadeToResolution(tex);
      triggerCrossfade();
      material.map = tex;
      material.needsUpdate = true;
      activeTexturesRef.current.pano8k = tex;
      activeTexturePanoIdRef.current = String(panorama.id);

      if (oldThumb && oldThumb !== prevTextureRef.current) safeDispose(oldThumb);
      if (old2k && old2k !== prevTextureRef.current) safeDispose(old2k);
      if (old8k && old8k !== tex && old8k !== prevTextureRef.current) safeDispose(old8k);
      activeTexturesRef.current.thumb = null;
      activeTexturesRef.current.pano2k = null;

      // Self-heal dimensions from actual loaded texture if panorama.width is 0 or missing
      const imgObj = tex.image as HTMLImageElement | HTMLCanvasElement | undefined;
      const detectedW = imgObj ? ('naturalWidth' in imgObj ? imgObj.naturalWidth : imgObj.width) : 0;
      const detectedH = imgObj ? ('naturalHeight' in imgObj ? imgObj.naturalHeight : imgObj.height) : 0;
      if ((!panorama.width || panorama.width <= 0) && detectedW > 0) {
        panorama.width = detectedW;
        panorama.height = detectedH > 0 ? detectedH : Math.round(detectedW / 2);
      }

      const maxTextureSize = renderer.capabilities.maxTextureSize || 4096;
      const isTopRes = (panorama.width && panorama.width <= 8192) || maxTextureSize <= 8192;

      if (isTopRes) {
        // Device or panorama tops out at 8K (or 4K if maxTextureSize is 4096): mark as final high-res view
        highResLoaded = true;
        isHighResFinishedRef.current = true;
        onLoadingChange?.(false);
        onHighResLoadedRef.current?.();
        const displayW = Math.min(panorama.width || detectedW || maxTextureSize, maxTextureSize);
        const displayH = Math.min(panorama.height || detectedH || Math.round(maxTextureSize / 2), Math.round(maxTextureSize / 2));
        onTextureStateChangeRef.current?.('ultra_hd', { width: displayW, height: displayH });
      } else {
        // High-end GPU (>8K capability) on 11K or 15K panorama: show 8K instantly and stream full master in background
        onLoadingChange?.(false);
        onTextureStateChangeRef.current?.('hd_8k', { width: 8192, height: 4096 });
        if (deferred15KTimeoutRef.current) {
          clearTimeout(deferred15KTimeoutRef.current);
          deferred15KTimeoutRef.current = null;
        }
        if (stateRef.current.isAutoPanning) {
          // Defer 15K loading while actively auto-panning so spinning remains locked at 60 FPS
          triggerDeferred15KRef.current = () => {
            if (currentEpoch === loadEpochRef.current && !isDisposedRef.current && !highResLoaded) {
              loadFullRes();
            }
          };
          deferred15KTimeoutRef.current = setTimeout(() => {
            if (currentEpoch === loadEpochRef.current && !isDisposedRef.current && !highResLoaded) {
              loadFullRes();
            }
          }, 3500);
        } else {
          loadFullRes();
        }
      }
    };

    const load8K = () => {
      if (isDisposedRef.current || highResLoaded || currentEpoch !== loadEpochRef.current) return;

      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const k8Candidates: string[] = isLocalMode
        ? [
            `/panoramas_web/${cleanFilename}${cacheBuster}`,
            `/panoramas_2k/${cleanFilename}${cacheBuster}`,
          ]
        : [
            pano8kDirectPath,
            `/panoramas_web/${cleanFilename}${cacheBuster}`,
            pano8kPath,
            ...(isLocal && panoConfig.storage.tunnelUrl ? [`${panoConfig.storage.tunnelUrl}/panoramas_web/${cleanFilename}${cacheBuster}`] : []),
          ];

      const try8K = (index: number) => {
        if (index >= k8Candidates.length) {
          if (currentEpoch !== loadEpochRef.current) return;
          const maxTextureSize = renderer.capabilities.maxTextureSize || 4096;
          // If 8K pre-generated texture is unavailable, stream the master texture directly!
          // If master exceeds maxTextureSize (e.g. 11K Insta360 on 8K GPU), loadPanoTextureAsync downsamples to maxTextureSize.
          if (maxTextureSize >= 4096 && panorama.width > 2048) {
            loadFullRes();
          } else {
            handle15KFailure();
          }
          return;
        }

        loadPanoTextureAsync(
          k8Candidates[index],
          (tex) => apply8K(tex),
          () => {
            if (currentEpoch !== loadEpochRef.current) return;
            try8K(index + 1);
          }
        );
      };

      try8K(0);
    };

    // Apply 2K preview texture
    const apply2K = (tex: THREE.Texture) => {
      if (thumbTimeout) {
        clearTimeout(thumbTimeout);
        thumbTimeout = null;
      }
      if (isDisposedRef.current || highResLoaded || currentEpoch !== loadEpochRef.current) {
        tex.dispose();
        return;
      }
      configureTexture(tex);

      const old2k = activeTexturesRef.current.pano2k;
      const oldThumb = activeTexturesRef.current.thumb;

      activeTexturesRef.current.pano2k = tex;
      activeTexturePanoIdRef.current = String(panorama.id);
      pano2kLoaded = true;
      previewLoaded = true;

      if (oldThumb && oldThumb !== prevTextureRef.current) safeDispose(oldThumb);
      if (old2k && old2k !== tex && old2k !== prevTextureRef.current) safeDispose(old2k);
      activeTexturesRef.current.thumb = null;

      // Check device WebGL texture capacity
      const maxTextureSize = renderer.capabilities.maxTextureSize || 4096;
      if (maxTextureSize < 4096) {
        console.info(`WebGL MAX_TEXTURE_SIZE is ${maxTextureSize} (< 4096); keeping 2K texture as permanent high-res view.`);
        highResLoaded = true;
        isHighResFinishedRef.current = true;
        material.map = tex;
        material.needsUpdate = true;
        material.color.setHex(0xffffff);
        quadMaterial.uniforms.uTexture.value = tex;
        triggerCrossfade();
        onLoadingChange?.(false);
        onHighResLoadedRef.current?.();
        onTextureStateChangeRef.current?.('preview_2k_final', { width: 2048, height: 1024 });
        return;
      }

      // If we already have a previous panorama on screen (switching between panoramas):
      // KEEP THE CURRENT PANORAMA DISPLAYING WITHOUT ANY BLUR OR DEGRADE!
      // Do NOT crossfade to 2K. Wait in background for 8K/full-res to complete,
      // and only crossfade once the new panorama is in full high resolution!
      if (!hasPrevVisible) {
        // Initial page load: show 2K immediately so user isn't on a blank screen
        material.map = tex;
        material.needsUpdate = true;
        material.color.setHex(0xffffff);
        quadMaterial.uniforms.uTexture.value = tex;
        triggerCrossfade();
        onLoadingChange?.(false);
      } else {
        // Background transition: current panorama keeps rendering/rotating at 60 FPS
        // Fallback safety: if high-res takes > 500ms, crossfade to 2K so user sees new location without delay
        if (fallback2kTimeoutRef.current) clearTimeout(fallback2kTimeoutRef.current);
        fallback2kTimeoutRef.current = setTimeout(() => {
          if (currentEpoch === loadEpochRef.current && !highResLoaded && !isDisposedRef.current) {
            material.map = tex;
            material.needsUpdate = true;
            material.color.setHex(0xffffff);
            quadMaterial.uniforms.uTexture.value = tex;
            triggerCrossfade();
            onLoadingChange?.(false);
          }
        }, 500);
      }

      onTextureStateChangeRef.current?.('preview_2k', { width: 2048, height: 1024 });

      // Immediately start background loading of 8K high-res texture!
      load8K();
    };

    // Stage 2: Load 2K preview (~50ms from R2)
    const load2K = () => {
      if (isDisposedRef.current || highResLoaded || currentEpoch !== loadEpochRef.current) return;

      loadPanoTextureAsync(
        pano2kDirectPath,
        (tex) => apply2K(tex),
        () => {
          if (currentEpoch !== loadEpochRef.current) return;
          loadPanoTextureAsync(
            pano2kPath,
            (tex) => apply2K(tex),
            () => {
              if (currentEpoch !== loadEpochRef.current) return;
              const maxTextureSize = renderer.capabilities.maxTextureSize || 4096;
              if (maxTextureSize >= 4096) {
                load8K();
              } else {
                handle15KFailure();
              }
            }
          );
        }
      );
    };

    // Check if texture was already warmed up in the preloader cache
    const preloaded = preloadedTexturesRef.current.get(cleanFilename);
    if (preloaded && preloaded.tex) {
      if (preloaded.isHighRes) {
        // High-res texture was already warmed up: crossfade directly to full resolution with 0ms delay!
        applyHighRes(preloaded.tex);
        return () => {
          if (thumbTimeout) clearTimeout(thumbTimeout);
          if (fallback2kTimeoutRef.current) clearTimeout(fallback2kTimeoutRef.current);
        };
      } else {
        if (!hasPrevVisible) {
          apply2K(preloaded.tex);
          return () => {
            if (thumbTimeout) clearTimeout(thumbTimeout);
            if (fallback2kTimeoutRef.current) clearTimeout(fallback2kTimeoutRef.current);
          };
        } else {
          // Preloader had 2K, but we have a previous panorama on screen:
          // Keep 2K ready as fallback, keep current panorama visible, and proceed immediately to 8K
          activeTexturesRef.current.pano2k = preloaded.tex;
          pano2kLoaded = true;
          previewLoaded = true;
          if (fallback2kTimeoutRef.current) clearTimeout(fallback2kTimeoutRef.current);
          fallback2kTimeoutRef.current = setTimeout(() => {
            if (currentEpoch === loadEpochRef.current && !highResLoaded && !isDisposedRef.current) {
              material.map = preloaded.tex;
              material.needsUpdate = true;
              material.color.setHex(0xffffff);
              quadMaterial.uniforms.uTexture.value = preloaded.tex;
              triggerCrossfade();
              onLoadingChange?.(false);
            }
          }, 500);
          load8K();
          return () => {
            if (thumbTimeout) clearTimeout(thumbTimeout);
            if (fallback2kTimeoutRef.current) {
              clearTimeout(fallback2kTimeoutRef.current);
              fallback2kTimeoutRef.current = null;
            }
          };
        }
      }
    }

    const applyThumb = (thumb: THREE.Texture) => {
      if (isDisposedRef.current || pano2kLoaded || highResLoaded || currentEpoch !== loadEpochRef.current) {
        thumb.dispose();
        return;
      }
      // Never downgrade or flicker to a thumbnail when switching between panoramas!
      if (hasPrevVisible) {
        thumb.dispose();
        return;
      }
      configureTexture(thumb);

      const oldThumb = activeTexturesRef.current.thumb;
      activeTexturesRef.current.thumb = thumb;
      activeTexturePanoIdRef.current = String(panorama.id);
      material.map = thumb;
      material.needsUpdate = true;
      material.color.setHex(0xffffff);
      quadMaterial.uniforms.uTexture.value = thumb;
      triggerCrossfade();
      previewLoaded = true;
      onLoadingChange?.(false);
      if (oldThumb && oldThumb !== thumb && oldThumb !== prevTextureRef.current) safeDispose(oldThumb);
    };

    // Stage 1: Load instant micro-preview thumbnail (~10-20ms)
    loadPanoTextureAsync(
      thumbPath,
      (thumb) => {
        if (isDisposedRef.current || pano2kLoaded || highResLoaded || currentEpoch !== loadEpochRef.current) {
          thumb.dispose();
          return;
        }
        // If we already have a previous panorama visible, delay thumbnail by 220ms so 2K can arrive first without low-res flicker
        if (hasPrevVisible) {
          thumbTimeout = setTimeout(() => applyThumb(thumb), 220);
        } else {
          applyThumb(thumb);
        }
      },
      () => {
        if (!isDisposedRef.current && !pano2kLoaded && !highResLoaded && currentEpoch === loadEpochRef.current) {
          loadPanoTextureAsync(
            r2ThumbPath,
            (r2Thumb) => {
              if (isDisposedRef.current || pano2kLoaded || highResLoaded || currentEpoch !== loadEpochRef.current) {
                r2Thumb.dispose();
                return;
              }
              if (hasPrevVisible) {
                thumbTimeout = setTimeout(() => applyThumb(r2Thumb), 220);
              } else {
                applyThumb(r2Thumb);
              }
            },
            () => {}
          );
        }
      }
    );

    load2K();

    return () => {
      if (thumbTimeout) {
        clearTimeout(thumbTimeout);
      }
      if (fallback2kTimeoutRef.current) {
        clearTimeout(fallback2kTimeoutRef.current);
        fallback2kTimeoutRef.current = null;
      }
      if (deferred15KTimeoutRef.current) {
        clearTimeout(deferred15KTimeoutRef.current);
        deferred15KTimeoutRef.current = null;
      }
      triggerDeferred15KRef.current = null;
      applyHighResRef.current = null;
    };
  }, [isRendererReady, panorama.id, panorama.filename, panorama.width]);

  // Manual Cluster Alignment Calibration Overlay Effect
  useEffect(() => {
    if (!isRendererReady) return;

    if (!calibrationOverlay) {
      if (isCalibrationActiveRef.current) {
        isCalibrationActiveRef.current = false;
        sphereUniformsRef.current.uHasPrev.value = 0.0;
        sphereUniformsRef.current.uBlend.value = 1.0;
        sphereUniformsRef.current.uPrevOffset.value = 0.0;
        if (quadMaterialRef.current) {
          quadMaterialRef.current.uniforms.uHasPrev.value = 0.0;
          quadMaterialRef.current.uniforms.uBlend.value = 1.0;
          quadMaterialRef.current.uniforms.uPrevOffset.value = 0.0;
          if (dummyTextureRef.current) {
            quadMaterialRef.current.uniforms.uPrevTexture.value = dummyTextureRef.current;
          }
        }
        if (dummyTextureRef.current) {
          sphereUniformsRef.current.uPrevTexture.value = dummyTextureRef.current;
        }
        if (calibrationRefTextureRef.current) {
          const refTex = calibrationRefTextureRef.current;
          calibrationRefTextureRef.current = null;
          let inCache = false;
          for (const v of preloadedTexturesRef.current.values()) {
            if (v.tex === refTex) {
              inCache = true;
              break;
            }
          }
          if (!inCache) {
            try {
              refTex.dispose();
            } catch {}
          }
        }
      }
      return;
    }

    isCalibrationActiveRef.current = true;
    stateRef.current.isCrossfading = false;
    isPanoCrossfadeActiveRef.current = false;

    const refPano = calibrationOverlay.referencePanorama;
    const cleanRef = cleanPanoPath(refPano.filename);
    const refNorthOffset = refPano.sun_data?.north_offset ?? 0;
    const offsetDiffDeg = calibrationOverlay.targetNorthOffset - refNorthOffset;
    const prevOffsetNorm = offsetDiffDeg / 360.0;
    const blendVal = Math.max(0.0, Math.min(1.0, calibrationOverlay.blend));

    const applyRefUniforms = (tex: THREE.Texture) => {
      calibrationRefTextureRef.current = tex;
      sphereUniformsRef.current.uPrevTexture.value = tex;
      sphereUniformsRef.current.uHasPrev.value = 1.0;
      sphereUniformsRef.current.uBlend.value = blendVal;
      sphereUniformsRef.current.uPrevOffset.value = prevOffsetNorm;

      if (quadMaterialRef.current) {
        quadMaterialRef.current.uniforms.uPrevTexture.value = tex;
        quadMaterialRef.current.uniforms.uHasPrev.value = 1.0;
        quadMaterialRef.current.uniforms.uBlend.value = blendVal;
        quadMaterialRef.current.uniforms.uPrevOffset.value = prevOffsetNorm;
      }
    };

    // If texture is already loaded for this reference panorama, apply uniforms immediately
    if (calibrationRefTextureRef.current && (calibrationRefTextureRef.current as any).__cleanRef === cleanRef) {
      applyRefUniforms(calibrationRefTextureRef.current);
      return;
    }

    const preloaded = preloadedTexturesRef.current.get(cleanRef);
    if (preloaded?.tex) {
      (preloaded.tex as any).__cleanRef = cleanRef;
      applyRefUniforms(preloaded.tex);
      return;
    }

    const candidateUrls = [
      `${panoConfig.storage.panoramas2kUrl}/${cleanRef}`,
      `/panoramas_2k/${cleanRef}`,
      `${panoConfig.storage.panoramasWebUrl}/${cleanRef}`,
      `/panoramas_web/${cleanRef}`,
      `/thumbnails/${cleanRef}`,
    ];

    let cancelled = false;
    const tryLoad = (idx: number) => {
      if (idx >= candidateUrls.length || cancelled) return;
      loadPanoTextureAsync(
        candidateUrls[idx],
        (tex) => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          (tex as any).__cleanRef = cleanRef;
          applyRefUniforms(tex);
        },
        () => tryLoad(idx + 1)
      );
    };

    tryLoad(0);

    return () => {
      cancelled = true;
    };
  }, [
    isRendererReady,
    calibrationOverlay?.referencePanorama?.id,
    calibrationOverlay?.referencePanorama?.filename,
    calibrationOverlay?.targetNorthOffset,
    calibrationOverlay?.blend,
  ]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing select-none touch-none" />;
});

ThreePanoViewer.displayName = 'ThreePanoViewer';
