import React, { useMemo, useEffect, useState } from 'react';
import type { Panorama } from '../types';
import { calculateTrueHeading } from '../utils/solarCalculator';
import { fetchTerrainElevation, formatAltitudeString } from '../utils/elevationService';
import { PanoramaMinimap } from './PanoramaMinimap';

interface SolarCompassHUDProps {
  panorama: Panorama;
  currentLonDeg: number;
  currentLatDeg: number;
  cameraFov?: number;
  isFilmstripOpen?: boolean;
  onClose?: () => void;
  isSk?: boolean;
  onRotateToHeading?: (headingDeg: number) => void;
  isAdmin?: boolean;
  isHeadingLocked?: boolean;
  onToggleHeadingLock?: () => void;
  onLockHeadingCalibrate?: (lockedHeadingDeg: number) => void;
  nearbyPanoramas?: (Panorama & { distance?: number })[];
  onSelectPanorama?: (pano: Panorama) => void;
}

export const SolarCompassHUD: React.FC<SolarCompassHUDProps> = ({
  panorama,
  currentLonDeg,
  currentLatDeg,
  cameraFov = 75,
  isFilmstripOpen = true,
  isSk = true,
  onRotateToHeading,
  isAdmin = false,
  isHeadingLocked,
  onToggleHeadingLock,
  onLockHeadingCalibrate,
  nearbyPanoramas,
  onSelectPanorama,
}) => {
  const [terrainElevation, setTerrainElevation] = useState<number | null>(null);

  const sunData = panorama.sun_data;
  const northOffset = sunData?.north_offset ?? 0;

  // Calculate True Heading (0° = North, 90° = East, 180° = South, 270° = West)
  const { headingDeg, cardinal } = useMemo(() => {
    return calculateTrueHeading(currentLonDeg, northOffset);
  }, [currentLonDeg, northOffset]);

  // Translate cardinal direction if Slovak
  const localizedCardinal = useMemo(() => {
    if (!isSk) return cardinal;
    const dict: Record<string, string> = {
      'N': 'S',
      'NNE': 'SSV',
      'NE': 'SV',
      'ENE': 'VSV',
      'E': 'V',
      'ESE': 'VJV',
      'SE': 'JV',
      'SSE': 'JJV',
      'S': 'J',
      'SSW': 'JJZ',
      'SW': 'JZ',
      'WSW': 'ZJZ',
      'W': 'Z',
      'WNW': 'ZSZ',
      'NW': 'SZ',
      'NNW': 'SSZ',
    };
    return dict[cardinal] || cardinal;
  }, [cardinal, isSk]);

  // Fetch terrain elevation on mount / change of GPS
  useEffect(() => {
    let isMounted = true;
    if (panorama.lat !== null && panorama.lon !== null) {
      fetchTerrainElevation(panorama.lat, panorama.lon).then((elev) => {
        if (isMounted && elev !== null) {
          setTerrainElevation(elev);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [panorama.lat, panorama.lon]);

  const altitudeText = useMemo(() => {
    return formatAltitudeString(panorama, terrainElevation);
  }, [panorama, terrainElevation]);

  return (
    <>
      {/* 1. Center Screen Reticle & Heading Degrees Popup */}
      <div
        className="fixed inset-0 pointer-events-none select-none z-30 flex items-center justify-center"
      >
        <div className="relative flex flex-col items-center">
          {/* Degree & Altitude Popup above the square */}
          <div
            className="absolute bottom-6 flex flex-col items-center px-3 py-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.35)] text-center whitespace-nowrap animate-in fade-in zoom-in-95 duration-150"
            style={{ transform: 'translateY(-4px)' }}
          >
            {/* Heading row */}
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-mono text-sm font-bold tracking-wider">
                {Math.round(headingDeg)}°
              </span>
              <span className="text-xs font-semibold px-1 py-0.2 rounded bg-cyan-950/80 text-cyan-200 border border-cyan-500/30">
                {localizedCardinal}
              </span>
              <span className="text-[9px] font-bold text-amber-400/90 tracking-wider">
                [EXP]
              </span>
            </div>

            {/* Altitude / Elevation row if available */}
            {altitudeText && (
              <div className="text-[11px] font-mono text-slate-300 mt-0.5 flex items-center gap-1">
                <span>⛰️</span>
                <span>{altitudeText}</span>
              </div>
            )}

            {/* Downward triangle caret pointing directly to the center square */}
            <div
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-cyan-400/70"
            />
          </div>

          {/* Small Center Square Reticle */}
          <div
            className="w-4 h-4 rounded-[2px] border-2 border-cyan-400/90 shadow-[0_0_8px_rgba(34,211,238,0.7)] flex items-center justify-center bg-cyan-400/10"
          >
            {/* Tiny center dot */}
            <div className="w-1 h-1 rounded-full bg-white shadow-sm" />
          </div>
        </div>
      </div>

      {/* 2. Rotating Satellite Radar Minimap (3x larger, Upper-Left, Click-to-Enlarge) */}
      <PanoramaMinimap
        panorama={panorama}
        currentHeadingDeg={headingDeg}
        cameraFov={cameraFov}
        isSk={isSk}
        onRotateToHeading={onRotateToHeading}
        isAdmin={isAdmin}
        isHeadingLocked={isHeadingLocked}
        onToggleHeadingLock={onToggleHeadingLock}
        onLockHeadingCalibrate={onLockHeadingCalibrate}
        nearbyPanoramas={nearbyPanoramas}
        onSelectPanorama={onSelectPanorama}
      />
    </>
  );
};
