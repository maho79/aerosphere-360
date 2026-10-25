// Haversine formula to calculate distance between two coordinates in meters
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function getGeodesicBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export function formatCoordinates(lat: number, lon: number): string {
  return `${lat.toFixed(5)}°, ${lon.toFixed(5)}°`;
}

export function getGoogleMapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

export function parseFileSizeToBytes(sizeInput: number | string | undefined | null): number {
  if (sizeInput === undefined || sizeInput === null) return 0;
  if (typeof sizeInput === 'number') {
    return isNaN(sizeInput) || sizeInput < 0 ? 0 : sizeInput;
  }
  if (typeof sizeInput === 'string') {
    const trimmed = sizeInput.trim();
    if (!trimmed) return 0;
    const match = trimmed.match(/^([\d.,]+)\s*([a-zA-Z]*)$/);
    if (!match) {
      const val = parseFloat(trimmed);
      return isNaN(val) ? 0 : val;
    }
    const val = parseFloat(match[1].replace(',', '.'));
    if (isNaN(val)) return 0;
    const unit = match[2].toUpperCase();
    if (unit === 'GB' || unit === 'G') return Math.round(val * 1024 * 1024 * 1024);
    if (unit === 'MB' || unit === 'M') return Math.round(val * 1024 * 1024);
    if (unit === 'KB' || unit === 'K') return Math.round(val * 1024);
    return Math.round(val);
  }
  return 0;
}

export function formatFileSize(sizeInput: number | string | undefined | null): string {
  if (sizeInput === undefined || sizeInput === null) return 'N/A';
  if (typeof sizeInput === 'string') {
    const trimmed = sizeInput.trim();
    // If it's already a formatted string like "3.24 MB"
    if (/[a-zA-Z]/.test(trimmed)) {
      return trimmed;
    }
  }
  const bytes = parseFileSizeToBytes(sizeInput);
  if (bytes <= 0) return 'N/A';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size < 10 && unitIndex > 0 ? size.toFixed(2) : size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatPanoramaDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const match = dateStr.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const fallback = dateStr.match(/\d{4}-\d{2}-\d{2}/);
      return fallback ? fallback[0] : dateStr;
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
}

/**
 * Formats a localized group day title (e.g. "So, 18. mája 2024" or "Sat, May 18, 2024").
 */
export function formatGroupDayTitle(dayStr: string, lang: string = 'sk'): string {
  if (!dayStr || dayStr === 'unknown_date') {
    return lang.startsWith('sk') ? 'Bez dátumu' : 'No date';
  }
  try {
    const parts = dayStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        const formatted = d.toLocaleDateString(lang.startsWith('sk') ? 'sk-SK' : 'en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
      }
    }
  } catch (_) {}
  return dayStr;
}

/**
 * Formats panorama date and time if available (e.g. "2024-05-18 14:32" or "2024-05-18").
 */
export function formatPanoramaDateTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = formatPanoramaDate(dateStr);
  const timeMatch = dateStr.match(/[T ](\d{2}:\d{2})/);
  return timeMatch ? `${d} ${timeMatch[1]}` : d;
}

import type { Panorama } from '../types';

/**
 * Deduplicate panoramas with identical GPS (within ~1.1m) and identical date (down to hour).
 * Always selects the panorama with greater resolution (width * height), or larger file size.
 */
export function deduplicatePanoramas(panoramas: Panorama[]): Panorama[] {
  const groups = new Map<string, Panorama[]>();
  const unkeyed: Panorama[] = [];

  for (const p of panoramas) {
    if (
      p.lat === null ||
      p.lon === null ||
      (p.lat === 0 && p.lon === 0) ||
      !p.date
    ) {
      unkeyed.push(p);
      continue;
    }

    const latKey = p.lat.toFixed(5);
    const lonKey = p.lon.toFixed(5);
    const hourDate = p.date.length >= 13 ? p.date.slice(0, 13) : p.date;
    const key = `${latKey}_${lonKey}_${hourDate}`;

    const list = groups.get(key);
    if (!list) {
      groups.set(key, [p]);
    } else {
      list.push(p);
    }
  }

  const result: Panorama[] = [...unkeyed];

  for (const list of groups.values()) {
    if (list.length === 1) {
      result.push(list[0]);
    } else {
      // Pick panorama with highest resolution (width * height), then highest size
      list.sort((a, b) => {
        const resA = (a.width || 0) * (a.height || 0);
        const resB = (b.width || 0) * (b.height || 0);
        if (resB !== resA) return resB - resA;
        return parseFileSizeToBytes(b.size) - parseFileSizeToBytes(a.size);
      });
      result.push(list[0]);
    }
  }

  // Preserve consistent order (by date descending)
  return result.sort((a, b) => {
    const timeA = a.date ? new Date(a.date).getTime() : 0;
    const timeB = b.date ? new Date(b.date).getTime() : 0;
    return timeB - timeA;
  });
}

/**
 * Known geographic reference clusters for fast fallback reverse-geocoding.
 */
const KNOWN_CITY_CLUSTERS: { name: string; country: string; lat: number; lon: number }[] = [
  { name: 'Vysoká pri Morave', country: 'Slovakia', lat: 48.3283, lon: 16.9135 },
  { name: 'Záhorská Ves', country: 'Slovakia', lat: 48.3815, lon: 16.8398 },
  { name: 'Suchohrad', country: 'Slovakia', lat: 48.4058, lon: 16.8564 },
  { name: 'Jakubov', country: 'Slovakia', lat: 48.4116, lon: 16.9668 },
  { name: 'Malacky', country: 'Slovakia', lat: 48.4361, lon: 17.0219 },
  { name: 'Zohor', country: 'Slovakia', lat: 48.3183, lon: 16.9814 },
  { name: 'Láb', country: 'Slovakia', lat: 48.3683, lon: 16.9817 },
  { name: 'Plavecký Štvrtok', country: 'Slovakia', lat: 48.3661, lon: 17.0022 },
  { name: 'Lozorno', country: 'Slovakia', lat: 48.2983, lon: 17.0450 },
  { name: 'Stupava', country: 'Slovakia', lat: 48.2750, lon: 17.0317 },
  { name: 'Borinka', country: 'Slovakia', lat: 48.2639, lon: 17.0869 },
  { name: 'Bratislava', country: 'Slovakia', lat: 48.1486, lon: 17.1077 },
  { name: 'Modra', country: 'Slovakia', lat: 48.3339, lon: 17.3075 },
  { name: 'Pezinok', country: 'Slovakia', lat: 48.2889, lon: 17.2667 },
  { name: 'Nové Mesto nad Váhom', country: 'Slovakia', lat: 48.7561, lon: 17.8306 },
  { name: 'Trenčín', country: 'Slovakia', lat: 48.8945, lon: 18.0444 },
  { name: 'Veľká Lomnica', country: 'Slovakia', lat: 49.1122, lon: 20.3592 },
  { name: 'Vysoké Tatry', country: 'Slovakia', lat: 49.1386, lon: 20.2228 },
  { name: 'Smolenice', country: 'Slovakia', lat: 48.5036, lon: 17.4308 },
  { name: 'Sloup', country: 'Czechia', lat: 49.4144, lon: 16.7397 },
  { name: 'Praha', country: 'Czechia', lat: 50.0755, lon: 14.4378 },
  { name: 'Faliraki', country: 'Greece', lat: 36.3392, lon: 28.2006 },
  { name: 'Rhodes', country: 'Greece', lat: 36.4349, lon: 28.2175 },
  { name: 'Alanya', country: 'Turkey', lat: 36.5438, lon: 31.9998 },
];

export function resolveNearestCity(lat: number | null | undefined, lon: number | null | undefined): { city: string; country: string } | null {
  if (lat === null || lat === undefined || lon === null || lon === undefined || (lat === 0 && lon === 0)) return null;
  let closest = null;
  let minDist = Infinity;
  for (const c of KNOWN_CITY_CLUSTERS) {
    const dist = getDistance(lat, lon, c.lat, c.lon);
    if (dist < minDist) {
      minDist = dist;
      closest = c;
    }
  }
  if (closest && minDist <= 35000) {
    return { city: closest.name, country: closest.country };
  }
  return null;
}

/**
 * Returns clean display city name for a panorama, with automatic fallback
 * to reverse-geocoded nearest city when city is missing or 'Unknown'.
 */
export function getPanoramaCity(p: Panorama): string {
  if (p.city && p.city !== 'Unknown') return p.city;
  const resolved = resolveNearestCity(p.lat, p.lon);
  if (resolved) return resolved.city;
  return p.city && p.city !== 'Unknown' ? p.city : (p.folder || p.original_filename);
}

/**
 * Formats a clean date string in YYYY-MM-DD format for export filenames.
 */
export function getExportDateStr(dateStr?: string | null): string {
  if (!dateStr) return 'unknown_date';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  } catch (_) {}
  return 'unknown_date';
}

/**
 * Generates standardized export filename according to the format:
 * yyyy-mm-dd - lokalita - aerosphere_360.jpg (for full panorama)
 * yyyy-mm-dd - lokalita - aerosphere_360_4k_crop.jpg
 * yyyy-mm-dd - lokalita - aerosphere_360_little_planet.jpg
 */
export function generateExportFilename(
  p: Panorama,
  type: 'full' | '4k_crop' | 'little_planet' | 'curved_crop' = 'full',
  isHdr: boolean = false,
  key?: string
): string {
  const dateStr = getExportDateStr(p.date);
  const locationRaw = getPanoramaCity(p) || p.original_filename || p.filename || 'lokalita';
  // Clean location for safe filename: replace slashes, backslashes, colons and disallowed chars
  const locationClean = locationRaw
    .replace(/\.jpe?g$/i, '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  let suffix = '';
  if (type === '4k_crop') {
    suffix = '_4k_crop';
  } else if (type === 'little_planet') {
    suffix = '_little_planet';
  } else if (type === 'curved_crop') {
    suffix = '_curved_crop';
  }

  const hdrSuffix = isHdr ? '_hdr' : '';
  const idKeySuffix = key ? `_${p.id}_${key}` : `_${p.id}`;
  return `${dateStr} - ${locationClean} - aerosphere_360${suffix}${hdrSuffix}${idKeySuffix}.jpg`;
}

/**
 * Applies HDR enhancement (shadow lift, S-curve contrast boost, vibrance pop)
 * directly to a 2D HTML5 Canvas image buffer.
 */
export function applyHDRToCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  // Precompute 256-value LUT for aggressive shadow lift + S-curve contrast boost
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const norm = i / 255;
    // 1. Aggressive shadow lift (gamma 0.68 pulls up deep shadows, preserves true black at 0 and highlights at 1)
    const lifted = Math.pow(norm, 0.68);
    // 2. Midtone contrast boost (S-curve steepens gradient in gray / midtones)
    const sCurve = lifted * lifted * (3.0 - 2.0 * lifted);
    const contrasted = lifted * 0.55 + sCurve * 0.45;
    lut[i] = Math.round(Math.min(255, Math.max(0, contrasted * 255)));
  }

  for (let i = 0; i < d.length; i += 4) {
    const r = lut[d[i]];
    const g = lut[d[i + 1]];
    const b = lut[d[i + 2]];

    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = (maxC - minC) / (maxC + 0.001);
    const vibrance = Math.max(1.18, 1.50 - sat * 0.45);

    const satR = lum + (r - lum) * vibrance * 1.10;
    const satG = lum + (g - lum) * vibrance * 1.10;
    const satB = lum + (b - lum) * vibrance * 1.10;

    d[i] = Math.min(255, Math.max(0, Math.round(satR)));
    d[i + 1] = Math.min(255, Math.max(0, Math.round(satG)));
    d[i + 2] = Math.min(255, Math.max(0, Math.round(satB)));
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Retrieves the user's last remembered camera tilt (lat), zoom (fov), and shader zoom.
 */
export function getSavedCameraState(): { lat: number; fov: number; shaderZoom: number } {
  let lat = 0;
  let fov = 75;
  let shaderZoom = 0.85;
  if (typeof window !== 'undefined') {
    try {
      const savedLat = parseFloat(localStorage.getItem('pano_last_lat') || '');
      if (!isNaN(savedLat) && savedLat >= -88 && savedLat <= 88) {
        lat = savedLat;
      }
      const savedFov = parseFloat(localStorage.getItem('pano_last_fov') || '');
      if (!isNaN(savedFov) && savedFov >= 25 && savedFov <= 110) {
        fov = savedFov;
      }
      const savedSz = parseFloat(localStorage.getItem('pano_last_shader_zoom') || '');
      if (!isNaN(savedSz) && savedSz >= 0.22 && savedSz <= 5.0) {
        shaderZoom = savedSz;
      }
    } catch {}
  }
  return { lat, fov, shaderZoom };
}

/**
 * Persists the user's last camera tilt (lat), zoom (fov), and optional shader zoom.
 */
export function saveCameraState(lat: number, fov: number, shaderZoom?: number): void {
  if (typeof window === 'undefined') return;
  try {
    if (!isNaN(lat) && lat >= -88 && lat <= 88) {
      localStorage.setItem('pano_last_lat', String(Math.round(lat * 100) / 100));
    }
    if (!isNaN(fov) && fov >= 25 && fov <= 110) {
      localStorage.setItem('pano_last_fov', String(Math.round(fov * 100) / 100));
    }
    if (shaderZoom !== undefined && !isNaN(shaderZoom) && shaderZoom >= 0.22 && shaderZoom <= 5.0) {
      localStorage.setItem('pano_last_shader_zoom', String(Math.round(shaderZoom * 1000) / 1000));
    }
  } catch {}
}

/**
 * Extracts flight or GPS camera altitude (in meters) from a panorama if available.
 */
export function getPanoramaAltitude(p: Panorama | null | undefined): number | null {
  if (!p) return null;
  const panoAny = p as any;
  const alt = p.altitude ?? panoAny.relative_altitude ?? panoAny.alt ?? panoAny.gps_altitude;
  if (typeof alt === 'number' && !isNaN(alt)) {
    return alt;
  }
  return null;
}


