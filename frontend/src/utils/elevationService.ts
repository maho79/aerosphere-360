import { Panorama } from '../types';

const elevationCache = new Map<string, number>();

/**
 * Fetches terrain elevation above sea level (m a.s.l.) for given GPS coordinates via free Open-Meteo elevation API.
 * Uses in-memory caching to avoid duplicate requests.
 */
export async function fetchTerrainElevation(lat: number, lon: number): Promise<number | null> {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (elevationCache.has(cacheKey)) {
    return elevationCache.get(cacheKey)!;
  }

  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && Array.isArray(data.elevation) && data.elevation.length > 0) {
      const elev = Math.round(data.elevation[0]);
      elevationCache.set(cacheKey, elev);
      return elev;
    }
  } catch (err) {
    console.warn('[Elevation] Failed to fetch terrain elevation:', err);
  }
  return null;
}

/**
 * Returns formatted altitude/elevation string for display in compass HUD and minimap
 */
export function formatAltitudeString(
  panorama: Panorama | null | undefined,
  terrainElev: number | null
): string | null {
  if (!panorama) return null;

  const panoAny = panorama as any;
  const flightAlt = panorama.altitude ?? panoAny.relative_altitude ?? panoAny.alt ?? panoAny.gps_altitude;

  if (typeof flightAlt === 'number' && typeof terrainElev === 'number') {
    // Both flight height and terrain elevation known
    return `Výška: +${Math.round(flightAlt)}m (${terrainElev} m n.m.)`;
  } else if (typeof flightAlt === 'number') {
    return `Výška: +${Math.round(flightAlt)}m`;
  } else if (typeof terrainElev === 'number') {
    return `${terrainElev} m n.m.`;
  }
  return null;
}
