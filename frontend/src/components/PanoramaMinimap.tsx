import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2, X, Lock, Unlock, Plus, Minus } from 'lucide-react';
import { Panorama, getResolutionCategory } from '../types';
import { formatDistance } from '../utils/geo';

interface PanoramaMinimapProps {
  panorama: Panorama;
  currentHeadingDeg: number;
  cameraFov?: number;
  isSk?: boolean;
  onRotateToHeading?: (headingDeg: number) => void;
  isAdmin?: boolean;
  isHeadingLocked?: boolean;
  onToggleHeadingLock?: () => void;
  onLockHeadingCalibrate?: (lockedHeadingDeg: number) => void;
  nearbyPanoramas?: (Panorama & { distance?: number })[];
  onSelectPanorama?: (pano: Panorama) => void;
}

interface CardinalPoint {
  code: string;
  labelSk: string;
  labelEn: string;
  deg: number;
  isMajor: boolean;
  color: string;
  activeColor: string;
  badgeBg: string;
}

const CARDINAL_POINTS: CardinalPoint[] = [
  { code: 'N', labelSk: 'Sever', labelEn: 'North', deg: 0, isMajor: true, color: 'text-rose-400', activeColor: 'bg-rose-500 text-white', badgeBg: 'bg-rose-950/80 border-rose-500/60' },
  { code: 'NE', labelSk: 'Severovýchod', labelEn: 'North-East', deg: 45, isMajor: false, color: 'text-teal-300', activeColor: 'bg-teal-500 text-white', badgeBg: 'bg-teal-950/80 border-teal-500/40' },
  { code: 'E', labelSk: 'Východ', labelEn: 'East', deg: 90, isMajor: true, color: 'text-sky-300', activeColor: 'bg-sky-500 text-white', badgeBg: 'bg-sky-950/80 border-sky-500/60' },
  { code: 'SE', labelSk: 'Juhovýchod', labelEn: 'South-East', deg: 135, isMajor: false, color: 'text-teal-300', activeColor: 'bg-teal-500 text-white', badgeBg: 'bg-teal-950/80 border-teal-500/40' },
  { code: 'S', labelSk: 'Juh', labelEn: 'South', deg: 180, isMajor: true, color: 'text-amber-400', activeColor: 'bg-amber-500 text-white', badgeBg: 'bg-amber-950/80 border-amber-500/60' },
  { code: 'SW', labelSk: 'Juhozápad', labelEn: 'South-West', deg: 225, isMajor: false, color: 'text-teal-300', activeColor: 'bg-teal-500 text-white', badgeBg: 'bg-teal-950/80 border-teal-500/40' },
  { code: 'W', labelSk: 'Západ', labelEn: 'West', deg: 270, isMajor: true, color: 'text-purple-300', activeColor: 'bg-purple-500 text-white', badgeBg: 'bg-purple-950/80 border-purple-500/60' },
  { code: 'NW', labelSk: 'Severozápad', labelEn: 'North-West', deg: 315, isMajor: false, color: 'text-teal-300', activeColor: 'bg-teal-500 text-white', badgeBg: 'bg-teal-950/80 border-teal-500/40' },
];

// Convert lat/lon to global pixel coordinates at given zoom level
function latLonToPixels(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = ((lon + 180) / 360) * n * 256;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n * 256;
  return { x, y };
}

// Zoom levels for radar: from 11 (wide range, ~5-15km) to 16 (close range, ~150-450m)
const MIN_RADAR_ZOOM = 11;
const MAX_RADAR_ZOOM = 16;

export const PanoramaMinimap: React.FC<PanoramaMinimapProps> = ({
  panorama,
  currentHeadingDeg,
  cameraFov = 75,
  isSk = true,
  onRotateToHeading,
  isAdmin = false,
  isHeadingLocked: externalIsHeadingLocked,
  onToggleHeadingLock: externalOnToggleHeadingLock,
  onLockHeadingCalibrate,
  nearbyPanoramas,
  onSelectPanorama,
}) => {
  // Persistent enlarged state across panorama switches
  const [isEnlarged, setIsEnlarged] = useState<boolean>(() => {
    return localStorage.getItem('pano_radar_enlarged') === 'true';
  });

  // Persistent radar radius zoom level across panorama switches
  const [zoom, setZoom] = useState<number>(() => {
    const saved = localStorage.getItem('pano_radar_zoom');
    const num = saved ? Number(saved) : 14;
    return !isNaN(num) && num >= MIN_RADAR_ZOOM && num <= MAX_RADAR_ZOOM ? num : 14;
  });

  const toggleEnlarged = (explicitVal?: boolean) => {
    setIsEnlarged((prev) => {
      const next = typeof explicitVal === 'boolean' ? explicitVal : !prev;
      localStorage.setItem('pano_radar_enlarged', String(next));
      return next;
    });
  };

  const handleIncreaseRadius = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom((prev) => {
      // Lower zoom level = larger geographic radius
      const next = Math.max(MIN_RADAR_ZOOM, prev - 1);
      localStorage.setItem('pano_radar_zoom', String(next));
      return next;
    });
  };

  const handleDecreaseRadius = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom((prev) => {
      // Higher zoom level = smaller geographic radius
      const next = Math.min(MAX_RADAR_ZOOM, prev + 1);
      localStorage.setItem('pano_radar_zoom', String(next));
      return next;
    });
  };

  const handleRadarWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.deltaY < 0) {
      // Scrolled up: closer view / decrease radius
      handleDecreaseRadius();
    } else if (e.deltaY > 0) {
      // Scrolled down: wider view / increase radius
      handleIncreaseRadius();
    }
  };

  const [internalIsHeadingLocked, setInternalIsHeadingLocked] = useState(false);
  const isHeadingLocked = externalIsHeadingLocked !== undefined ? externalIsHeadingLocked : internalIsHeadingLocked;
  const lockedHeadingDegRef = useRef<number>(currentHeadingDeg);

  // Keep unwrapped continuous rotation angle to prevent 360° spin glitches when wrapping around 0°/360°
  const totalRotationRef = useRef<number>(-currentHeadingDeg);
  const prevHeadingRef = useRef<number>(currentHeadingDeg);
  const [rotationAngle, setRotationAngle] = useState<number>(-currentHeadingDeg);

  // Reset rotation when panorama changes
  useEffect(() => {
    setInternalIsHeadingLocked(false);
    totalRotationRef.current = -currentHeadingDeg;
    prevHeadingRef.current = currentHeadingDeg;
    setRotationAngle(-currentHeadingDeg);
  }, [panorama.id]);

  // Track shortest angular path for seamless rotation without 360-degree spins
  useEffect(() => {
    if (isHeadingLocked) {
      // Frozen radar during admin heading alignment
      return;
    }
    let delta = currentHeadingDeg - prevHeadingRef.current;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;

    totalRotationRef.current -= delta;
    prevHeadingRef.current = currentHeadingDeg;
    setRotationAngle(totalRotationRef.current);
  }, [currentHeadingDeg, isHeadingLocked]);

  const handleToggleHeadingLock = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isAdmin) return;

    if (externalOnToggleHeadingLock) {
      externalOnToggleHeadingLock();
      return;
    }

    if (!isHeadingLocked) {
      // 1. LOCK: Freeze radar orientation at current heading
      lockedHeadingDegRef.current = currentHeadingDeg;
      setInternalIsHeadingLocked(true);
    } else {
      // 2. UNLOCK & APPLY: Align current panorama view to locked heading and persist
      const headingToApply = lockedHeadingDegRef.current;
      setInternalIsHeadingLocked(false);
      onLockHeadingCalibrate?.(headingToApply);
    }
  };

  const lat = panorama.lat;
  const lon = panorama.lon;

  const containerRef = useRef<HTMLDivElement>(null);

  // Close enlarged mode only on ESC key (never close on click outside, per user specification)
  useEffect(() => {
    if (!isEnlarged) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleEnlarged(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEnlarged]);

  // Compute 3x3 tiles centered around GPS position
  const mapData = useMemo(() => {
    if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) return null;

    const { x: globalX, y: globalY } = latLonToPixels(lat, lon, zoom);
    const tileX = Math.floor(globalX / 256);
    const tileY = Math.floor(globalY / 256);
    const offsetX = globalX % 256;
    const offsetY = globalY % 256;

    // 3x3 tile coordinates centered around current position (768x768px total)
    const tiles: { key: string; url: string; top: number; left: number }[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = tileX + dx;
        const ty = tileY + dy;
        tiles.push({
          key: `${zoom}/${ty}/${tx}`,
          url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`,
          top: (dy + 1) * 256,
          left: (dx + 1) * 256,
        });
      }
    }

    return {
      tiles,
      centerPixelX: 256 + offsetX,
      centerPixelY: 256 + offsetY,
    };
  }, [lat, lon, zoom]);

  // Numbered clickable pins for nearby panoramas within satellite radar range
  const nearbyPins = useMemo(() => {
    if (!lat || !lon || !nearbyPanoramas || !mapData) return [];
    const { x: globalX, y: globalY } = latLonToPixels(lat, lon, zoom);

    return nearbyPanoramas
      .map((p, idx) => {
        if (p.id === panorama.id || p.lat === null || p.lon === null || isNaN(p.lat) || isNaN(p.lon)) {
          return null;
        }
        const { x: px, y: py } = latLonToPixels(p.lat, p.lon, zoom);
        const dx = px - globalX;
        const dy = py - globalY;
        const distPx = Math.hypot(dx, dy);

        // Keep pins within visible radar radius (max range ~1.6km on enlarged, ~900m on normal)
        const maxDistPx = isEnlarged ? 250 : 155;
        if (distPx > maxDistPx) return null;

        return {
          panorama: p,
          itemNumber: idx + 1,
          left: mapData.centerPixelX + dx,
          top: mapData.centerPixelY + dy,
          distMeters: p.distance,
        };
      })
      .filter(Boolean) as {
        panorama: Panorama & { distance?: number };
        itemNumber: number;
        left: number;
        top: number;
        distMeters?: number;
      }[];
  }, [lat, lon, nearbyPanoramas, mapData, zoom, isEnlarged, panorama.id]);

  // Physical real-world radius displayed in meters or kilometers based on current zoom, latitude & radar size
  const formattedRadius = useMemo(() => {
    if (lat === null || isNaN(lat)) return isEnlarged ? 'r ≈ 1.7 km' : 'r ≈ 600 m';
    const mpp = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
    const pxRadius = isEnlarged ? 260 : 92;
    const meters = pxRadius * mpp;
    if (meters >= 1000) {
      const km = meters / 1000;
      return `r ≈ ${km >= 10 ? Math.round(km) : km.toFixed(1)} km`;
    }
    return `r ≈ ${Math.round(meters / 50) * 50} m`;
  }, [lat, zoom, isEnlarged]);

  if (!lat || !lon || !mapData) {
    return null;
  }

  // Dynamic vision cone angle matching real-time camera horizontal FOV
  // Allows cone to narrow smoothly upon zoom-in (down to sharp 4° beam)
  // and expand smoothly upon zoom-out (up to 75° wide-angle view)
  const coneHalfAngle = Math.min(75, Math.max(4, (cameraFov || 75) / 2));

  // Outer frame dimensions
  // Normal mode: 340px desktop, 250px mobile
  // Enlarged mode: 520px desktop, 90vw mobile
  const diameter = isEnlarged ? 520 : 340;
  const radius = diameter / 2;

  return (
    <>
      {/* Radar Map Container: Permanently anchored in Upper-Left corner (never centered or obscuring panorama) */}
      <div
        ref={containerRef}
        className="fixed top-20 md:top-24 left-3 md:left-5 pointer-events-auto z-40 select-none"
      >
        <div
          onClick={() => toggleEnlarged()}
          onWheel={handleRadarWheel}
          className={`relative rounded-full overflow-hidden shadow-2xl cursor-pointer group transition-all duration-300 ease-out origin-top-left ${
            isEnlarged
              ? 'w-[min(90vw,440px)] h-[min(90vw,440px)] md:w-[560px] md:h-[560px] border-4 border-cyan-400 ring-4 ring-cyan-500/30'
              : 'w-[180px] h-[180px] md:w-[200px] md:h-[200px] border-2 md:border-3 border-white/80 hover:border-cyan-400 hover:scale-[1.02]'
          } bg-slate-950/95`}
          style={{
            boxShadow: isEnlarged
              ? '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(6, 182, 212, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.7)'
              : '0 12px 40px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(0, 0, 0, 0.6)',
          }}
          title={
            isEnlarged
              ? (isSk ? 'Kliknutím zmenšíte radar (alebo ESC)' : 'Click to minimize radar (or ESC)')
              : (isSk ? 'Kliknutím zväčšíte satelitný radar (3x detail)' : 'Click to enlarge satellite radar (3x detail)')
          }
        >
          {/* Rotating Satellite Tiles Layer (Heading-Up Display: rotates by -currentHeadingDeg) */}
          <div
            className="absolute origin-center will-change-transform"
            style={{
              width: '768px',
              height: '768px',
              left: `calc(50% - ${mapData.centerPixelX}px)`,
              top: `calc(50% - ${mapData.centerPixelY}px)`,
              transformOrigin: `${mapData.centerPixelX}px ${mapData.centerPixelY}px`,
              transform: `rotate(${rotationAngle}deg)`,
            }}
          >
            {mapData.tiles.map((t) => (
              <img
                key={t.key}
                src={t.url}
                alt="Sat"
                crossOrigin="anonymous"
                loading="eager"
                className="absolute w-[256px] h-[256px] select-none pointer-events-none"
                style={{
                  top: `${t.top}px`,
                  left: `${t.left}px`,
                  filter: 'contrast(1.10) brightness(1.02)',
                }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ))}

            {/* Nearby Panorama Numbered Pins */}
            {nearbyPins.map((pin) => {
              const is15K = getResolutionCategory(pin.panorama.width) === '15K';
              const distStr = pin.distMeters !== undefined ? formatDistance(pin.distMeters) : '';
              const titleText = `#${pin.itemNumber}: ${pin.panorama.city || pin.panorama.original_filename || 'Panoráma'}${distStr ? ` (${distStr})` : ''}`;

              return (
                <button
                  key={`radar-pin-${pin.panorama.id}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPanorama?.(pin.panorama);
                  }}
                  title={titleText}
                  style={{
                    left: `${pin.left}px`,
                    top: `${pin.top}px`,
                    transform: `translate(-50%, -50%) rotate(${-rotationAngle}deg)`,
                  }}
                  className={`absolute pointer-events-auto cursor-pointer z-30 flex items-center justify-center font-black rounded-full transition-all hover:scale-135 active:scale-90 shadow-xl ${
                    isEnlarged ? 'w-7 h-7 text-xs border-2' : 'w-5 h-5 text-[10px] border'
                  } ${
                    is15K
                      ? 'bg-amber-400 text-slate-950 border-white ring-2 ring-amber-500/80 shadow-amber-950/60'
                      : pin.panorama.is_private
                      ? 'bg-rose-500 text-white border-white ring-1 ring-rose-400 shadow-rose-950/60'
                      : 'bg-cyan-400 text-slate-950 border-white ring-1 ring-cyan-500 shadow-cyan-950/60'
                  }`}
                >
                  {pin.itemNumber}
                </button>
              );
            })}
          </div>

          {/* Radial Vignette & Glass Shadow Overlay */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at center, transparent 45%, rgba(15, 23, 42, 0.45) 80%, rgba(15, 23, 42, 0.90) 100%)',
            }}
          />

          {/* Concentric Range Rings */}
          {/* Inner Range Ring: ~500 m */}
          <div
            className="absolute inset-[25%] rounded-full border border-cyan-400/35 border-dashed pointer-events-none"
          />
          {/* Outer Range Ring: ~1 km */}
          <div
            className="absolute inset-3 rounded-full border border-white/35 border-dashed pointer-events-none"
          />

          {/* Static Center Overlay (Camera/Observer Position & FOV Cone pointing UP) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 200 200"
          >
            <defs>
              <radialGradient id="fovGrad" cx="50%" cy="100%" r="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.65" />
                <stop offset="65%" stopColor="#38bdf8" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
              </radialGradient>
            </defs>

            {/* Vision cone wedge facing straight UP */}
            {(() => {
              const r = 88;
              const cx = 100;
              const cy = 100;
              const leftRad = ((-90 - coneHalfAngle) * Math.PI) / 180;
              const rightRad = ((-90 + coneHalfAngle) * Math.PI) / 180;
              const x1 = cx + r * Math.cos(leftRad);
              const y1 = cy + r * Math.sin(leftRad);
              const x2 = cx + r * Math.cos(rightRad);
              const y2 = cy + r * Math.sin(rightRad);
              const largeArcFlag = coneHalfAngle > 90 ? 1 : 0;
              return (
                <path
                  d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                  fill="url(#fovGrad)"
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  strokeOpacity="0.8"
                />
              );
            })()}

            {/* Center Crosshairs */}
            <line x1="88" y1="100" x2="94" y2="100" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
            <line x1="106" y1="100" x2="112" y2="100" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
            <line x1="100" y1="88" x2="100" y2="94" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
            <line x1="100" y1="106" x2="100" y2="112" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />

            {/* Observer Center Pin & Forward Pointer */}
            <circle cx="100" cy="100" r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
            <polygon points="100,90 96,98 104,98" fill="#38bdf8" />
          </svg>

          {/* Rotating Compass Rim (Interactive Cardinal & Intercardinal Bezel) */}
          <div
            className="absolute inset-0 pointer-events-none will-change-transform"
            style={{
              transform: `rotate(${rotationAngle}deg)`,
            }}
          >
            {CARDINAL_POINTS.map((pt) => {
              // Trigonometry angle from top (North = -90° / -PI/2)
              const rad = ((pt.deg - 90) * Math.PI) / 180;
              // Radius percentage from center
              const rPct = isEnlarged ? 43.5 : 41.5;
              const leftPct = 50 + rPct * Math.cos(rad);
              const topPct = 50 + rPct * Math.sin(rad);

              const titleText = isSk
                ? `Otočiť pohľad na ${pt.labelSk} (${pt.deg}°)`
                : `Rotate view to ${pt.labelEn} (${pt.deg}°)`;

              return (
                <button
                  key={pt.code}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRotateToHeading?.(pt.deg);
                  }}
                  title={titleText}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    transform: `translate(-50%, -50%) rotate(${-rotationAngle}deg)`,
                  }}
                  className={`absolute pointer-events-auto cursor-pointer z-20 flex flex-col items-center justify-center transition-all duration-150 group/cardinal ${
                    pt.isMajor
                      ? isEnlarged
                        ? 'w-8 h-8 rounded-full bg-slate-950/85 border-2 border-white/50 hover:border-cyan-400 hover:scale-125 hover:bg-slate-900 shadow-lg'
                        : 'w-6 h-6 rounded-full bg-slate-950/75 border border-white/40 hover:border-cyan-400 hover:scale-125 hover:bg-slate-900 shadow-md'
                      : isEnlarged
                      ? 'w-6 h-6 rounded-full bg-slate-950/70 border border-white/20 hover:border-teal-400 hover:scale-125 hover:bg-slate-900 shadow-sm'
                      : 'w-4 h-4 rounded-full bg-slate-950/60 border border-white/10 hover:border-teal-400 hover:scale-125'
                  }`}
                >
                  {pt.code === 'N' && (
                    <div
                      className={`w-0 h-0 border-l-transparent border-r-transparent border-b-rose-500 mb-0.5 ${
                        isEnlarged
                          ? 'border-l-[4px] border-r-[4px] border-b-[6px]'
                          : 'border-l-[3px] border-r-[3px] border-b-[5px]'
                      }`}
                    />
                  )}
                  <span
                    className={`leading-none font-black transition-colors ${pt.color} group-hover/cardinal:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] ${
                      pt.isMajor
                        ? isEnlarged
                          ? 'text-[12px] md:text-[13px]'
                          : 'text-[10px]'
                        : isEnlarged
                        ? 'text-[9px]'
                        : 'text-[7px]'
                    }`}
                  >
                    {pt.code}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Interactive Radar Radius Controls: [-] r ≈ ... [+] */}
          <div
            className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-950/90 backdrop-blur-md border border-cyan-400/50 shadow-xl pointer-events-auto z-30 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleDecreaseRadius}
              disabled={zoom >= MAX_RADAR_ZOOM}
              className="w-5 h-5 rounded-full flex items-center justify-center bg-white/10 hover:bg-cyan-500/30 text-cyan-300 hover:text-white active:scale-90 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer font-bold"
              title={isSk ? 'Zmenšiť rádius (detailnejší pohľad)' : 'Decrease radius (closer detail)'}
              aria-label="Decrease radius"
            >
              <Minus className="w-3 h-3" />
            </button>

            <span className="text-[10px] md:text-[11px] font-mono font-bold text-cyan-200 tracking-tight whitespace-nowrap px-1">
              {formattedRadius}
            </span>

            <button
              type="button"
              onClick={handleIncreaseRadius}
              disabled={zoom <= MIN_RADAR_ZOOM}
              className="w-5 h-5 rounded-full flex items-center justify-center bg-white/10 hover:bg-cyan-500/30 text-cyan-300 hover:text-white active:scale-90 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer font-bold"
              title={isSk ? 'Zväčšiť rádius (širší rozhľad a vzdialenejšie panorámy)' : 'Increase radius (wider view)'}
              aria-label="Increase radius"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Top Floating Control Bar (Lock Calibration & Enlarge) - High z-index (z-50) */}
          <div
            className="absolute top-2.5 right-2.5 flex items-center gap-1.5 pointer-events-auto z-50 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Admin Lock / Calibration Button (Freeze radar rotation to align heading) */}
            {isAdmin && (
              <button
                type="button"
                onClick={handleToggleHeadingLock}
                className={`p-2 rounded-full shadow-2xl transition-all cursor-pointer flex items-center justify-center ${
                  isHeadingLocked
                    ? 'bg-amber-500 text-zinc-950 border-2 border-amber-300 ring-4 ring-amber-400/60 animate-pulse scale-110'
                    : 'bg-zinc-950/90 hover:bg-amber-500/30 text-amber-300 hover:text-white border-2 border-amber-400/70 hover:border-amber-300 backdrop-blur-md hover:scale-105'
                }`}
                title={
                  isHeadingLocked
                    ? (isSk ? `Radar ZAMKNUTÝ (${Math.round(lockedHeadingDegRef.current)}°). Otočte panorámu a opätovným kliknutím uložte do KV.` : `Radar LOCKED (${Math.round(lockedHeadingDegRef.current)}°). Rotate panorama and click again to save to KV.`)
                    : (isSk ? 'Zamknúť rotáciu radaru pre kalibráciu severu' : 'Lock radar rotation to calibrate North heading')
                }
              >
                {isHeadingLocked ? (
                  <Lock className="w-4 h-4 text-zinc-950" />
                ) : (
                  <Unlock className="w-4 h-4 text-amber-300" />
                )}
              </button>
            )}

            {/* Top-Right Toggle / Enlarge Button */}
            <button
              type="button"
              onClick={() => toggleEnlarged()}
              className="p-2 rounded-full bg-zinc-950/90 hover:bg-cyan-500/30 text-white hover:text-cyan-200 border-2 border-white/40 hover:border-cyan-400 shadow-2xl backdrop-blur-md transition-all cursor-pointer hover:scale-105 flex items-center justify-center"
              title={isEnlarged ? (isSk ? 'Zmenšiť radar' : 'Minimize radar') : (isSk ? 'Zväčšiť radar' : 'Enlarge radar')}
            >
              {isEnlarged ? (
                <Minimize2 className="w-4 h-4 text-cyan-300" />
              ) : (
                <Maximize2 className="w-4 h-4 text-slate-200 group-hover:text-cyan-300" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
