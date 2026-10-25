import * as SunCalc from 'suncalc';
import * as THREE from 'three';
import type { Panorama, PanoramaSunData } from '../types';

/**
 * Returns UTC offset in hours for Central European Time (CET/CEST)
 * Last Sunday of March to last Sunday of October is CEST (UTC+2), else CET (UTC+1).
 */
export function getCentralEuropeanUtcOffset(date: Date): number {
  const year = date.getUTCFullYear();
  // Last Sunday of March
  const marchLast = new Date(Date.UTC(year, 2, 31));
  const marchSunday = 31 - marchLast.getUTCDay();
  const dstStart = new Date(Date.UTC(year, 2, marchSunday, 1, 0, 0));

  // Last Sunday of October
  const octLast = new Date(Date.UTC(year, 9, 31));
  const octSunday = 31 - octLast.getUTCDay();
  const dstEnd = new Date(Date.UTC(year, 9, octSunday, 1, 0, 0));

  return date >= dstStart && date < dstEnd ? 2 : 1;
}

/**
 * Parses a panorama date string, respecting local Slovak/Central European capture timestamps
 */
export function parsePanoramaUtcDate(dateStr: string): Date {
  if (!dateStr) return new Date();

  // If already contains timezone indicator Z or +/-
  if (dateStr.includes('Z') || /[+-]\d{2}:?\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }

  // Naive local timestamp: e.g. "2026-08-15T10:21:48"
  // Treat as local European time and convert to UTC
  const cleaned = dateStr.replace(' ', 'T');
  const temp = new Date(cleaned + 'Z'); // parse as UTC temporarily to get parts
  if (isNaN(temp.getTime())) {
    return new Date();
  }

  const offsetHours = getCentralEuropeanUtcOffset(temp);
  return new Date(temp.getTime() - offsetHours * 3600 * 1000);
}

export interface SolarPositionResult {
  azimuthDeg: number;    // 0° = North, 90° = East, 180° = South, 270° = West
  altitudeDeg: number;   // Degrees above horizon (-90° to +90°)
  isDaylight: boolean;
  sunVector: THREE.Vector3;
}

/**
 * Calculates theoretical astronomical sun position using SunCalc
 */
export function calculateSunPosition(
  dateInput: string | Date,
  lat: number,
  lon: number,
  radius: number = 490
): SolarPositionResult {
  const date = typeof dateInput === 'string' ? parsePanoramaUtcDate(dateInput) : dateInput;
  const pos = SunCalc.getPosition(date, lat, lon);

  // In SunCalc, azimuth is in degrees (0 = North, 90 = East, 180 = South, 270 = West)
  // altitude is in degrees above horizon
  let azDeg = (pos.azimuth + 360) % 360;
  let altDeg = pos.altitude;

  // Convert to 3D Cartesian coordinates inside sphere
  // Three.js coordinate system where Y is Up:
  // phi = 90 - altitude (from +Y down), theta = azimuth
  const phi = THREE.MathUtils.degToRad(90 - Math.max(-89, Math.min(89, altDeg)));
  const theta = THREE.MathUtils.degToRad(azDeg);

  const sunVector = new THREE.Vector3(
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    -radius * Math.sin(phi) * Math.cos(theta)
  );

  return {
    azimuthDeg: azDeg,
    altitudeDeg: altDeg,
    isDaylight: altDeg > -0.833, // Civil solar horizon
    sunVector,
  };
}

/**
 * 16-point cardinal compass text
 */
export function getCompassDirection(deg: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ];
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

/**
 * Calculates current True Heading in degrees based on camera view lon and panorama north_offset
 */
export function calculateTrueHeading(
  cameraLonDeg: number,
  northOffsetDeg: number = 0
): { headingDeg: number; cardinal: string } {
  // Equirectangular panorama longitude maps directly:
  // Heading = (cameraLon + northOffset + 360) % 360
  const headingDeg = ((cameraLonDeg + northOffsetDeg) % 360 + 360) % 360;
  return {
    headingDeg,
    cardinal: getCompassDirection(headingDeg),
  };
}

/**
 * Converts detected or estimated sun position to 3D sphere position aligned with panorama's internal coordinate frame
 */
export function getPanoramaSun3DPosition(
  pano: Panorama,
  radius: number = 490
): {
  position: THREE.Vector3;
  azimuthDeg: number;
  altitudeDeg: number;
  isDetected: boolean;
  confidence: number;
  northOffset: number;
} | null {
  if (!pano) return null;

  const sunData = pano.sun_data;
  if (sunData && sunData.sun_detected && sunData.img_azimuth !== undefined && sunData.img_elevation !== undefined) {
    // Exact detected solar centroid in panorama sphere coordinate frame
    // In ThreePanoViewer equirectangular sphere:
    // target lon maps to image azimuth, lat maps to elevation
    const phi = THREE.MathUtils.degToRad(90 - sunData.img_elevation);
    const theta = THREE.MathUtils.degToRad(sunData.img_azimuth);

    const position = new THREE.Vector3(
      500 * Math.sin(phi) * Math.cos(theta),
      500 * Math.cos(phi),
      500 * Math.sin(phi) * Math.sin(theta)
    ).normalize().multiplyScalar(radius);

    return {
      position,
      azimuthDeg: sunData.astro_azimuth,
      altitudeDeg: sunData.astro_elevation,
      isDetected: true,
      confidence: sunData.confidence ?? 0.85,
      northOffset: sunData.north_offset,
    };
  }

  // Fallback: if GPS and date are available, compute astronomical sun position
  if (pano.lat !== null && pano.lon !== null && pano.date) {
    const astro = calculateSunPosition(pano.date, pano.lat, pano.lon, radius);
    const northOffset = sunData?.north_offset ?? 0;

    // Image-relative azimuth = (astro_azimuth - northOffset + 360) % 360
    const imgAz = (astro.azimuthDeg - northOffset + 360) % 360;
    const phi = THREE.MathUtils.degToRad(90 - Math.max(-85, Math.min(85, astro.altitudeDeg)));
    const theta = THREE.MathUtils.degToRad(imgAz);

    const position = new THREE.Vector3(
      500 * Math.sin(phi) * Math.cos(theta),
      500 * Math.cos(phi),
      500 * Math.sin(phi) * Math.sin(theta)
    ).normalize().multiplyScalar(radius);

    return {
      position,
      azimuthDeg: astro.azimuthDeg,
      altitudeDeg: astro.altitudeDeg,
      isDetected: false,
      confidence: sunData ? (sunData.confidence ?? 0.5) : 0.4,
      northOffset,
    };
  }

  return null;
}
