export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers / non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}

export function generateShareId(): string {
  return 's_' + Math.random().toString(36).slice(2, 9);
}

/**
 * Generate 3-character alphanumeric key (0..9, a..z) for concise share links
 * e.g. '7k9', 'a1b', 'xyz' -> 36^3 = 46,656 combinations
 */
export function generateShareKey(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let res = '';
  for (let i = 0; i < 3; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export interface MapShareOptions {
  lang?: string;
  years?: string[];
  months?: string[];
  resolutions?: string[];
  tags?: string[];
  moods?: string[];
  year?: string; // backward compatibility
  searchQuery?: string;
  onlyFavorites?: boolean;
  onlyTimelineClusters?: boolean;
  filmstrip?: boolean;
  tiles?: boolean;
  tileSize?: 'normal' | 'large';
  tilesGroupBy?: 'location' | 'date';
  style?: string;
  sid?: string;
  key?: string;
}

/**
 * Clean short URL for Map sharing with 3-character key (&key=xyz), fallback base without verbose params
 */
export function getMapShareUrl(
  lat: number,
  lng: number,
  zoom: number,
  optionsOrYear?: MapShareOptions | string,
  key?: string
): string {
  const url = new URL(window.location.origin + window.location.pathname);

  // If a 3-character key is provided, produce a clean short link: ${window.location.origin}/?key=xyz
  const effectiveKey = key || (typeof optionsOrYear === 'object' && optionsOrYear ? optionsOrYear.key : undefined);
  if (effectiveKey) {
    url.searchParams.set('key', effectiveKey);
    return url.toString();
  }

  // Legacy fallback format with explicit parameters
  url.searchParams.set('lat', lat.toFixed(5));
  url.searchParams.set('lng', lng.toFixed(5));
  const formattedZoom = Number.isInteger(zoom) ? zoom.toString() : parseFloat(zoom.toFixed(2)).toString();
  url.searchParams.set('zoom', formattedZoom);

  if (typeof optionsOrYear === 'string') {
    if (optionsOrYear && optionsOrYear !== 'all') {
      url.searchParams.set('year', optionsOrYear);
    }
  } else if (optionsOrYear) {
    if (optionsOrYear.lang) url.searchParams.set('lang', optionsOrYear.lang);
    if (optionsOrYear.years && optionsOrYear.years.length > 0) {
      url.searchParams.set('years', optionsOrYear.years.join(','));
    } else if (optionsOrYear.year && optionsOrYear.year !== 'all') {
      url.searchParams.set('year', optionsOrYear.year);
    }
    if (optionsOrYear.months && optionsOrYear.months.length > 0) {
      url.searchParams.set('months', optionsOrYear.months.join(','));
    }
    if (optionsOrYear.resolutions && optionsOrYear.resolutions.length > 0) {
      url.searchParams.set('res', optionsOrYear.resolutions.join(','));
    }
    if (optionsOrYear.tags && optionsOrYear.tags.length > 0) {
      url.searchParams.set('tags', optionsOrYear.tags.map((t) => t.replace(/^#/, '')).join(','));
    }
    if (optionsOrYear.moods && optionsOrYear.moods.length > 0) {
      url.searchParams.set('moods', optionsOrYear.moods.join(','));
    }
    if (optionsOrYear.searchQuery) url.searchParams.set('q', optionsOrYear.searchQuery);
    if (optionsOrYear.onlyFavorites) url.searchParams.set('fav', '1');
    if (optionsOrYear.onlyTimelineClusters) url.searchParams.set('timeline', '1');
    if (optionsOrYear.filmstrip) url.searchParams.set('filmstrip', '1');
    if (optionsOrYear.tiles) url.searchParams.set('tiles', '1');
    if (optionsOrYear.tileSize && optionsOrYear.tileSize !== 'normal') {
      url.searchParams.set('tileSize', optionsOrYear.tileSize);
    }
    if (optionsOrYear.tilesGroupBy && optionsOrYear.tilesGroupBy !== 'location') {
      url.searchParams.set('tilesGroup', optionsOrYear.tilesGroupBy);
    }
    if (optionsOrYear.style && optionsOrYear.style !== 'dark') {
      url.searchParams.set('style', optionsOrYear.style);
    }
    if (optionsOrYear.sid) url.searchParams.set('sid', optionsOrYear.sid);
  }

  return url.toString();
}

export interface PanoShareOptions {
  lang?: string;
  lon?: number;
  lat?: number;
  fov?: number;
  proj?: string;
  sid?: string;
  key?: string;
}

/**
 * Clean short URL for Panorama sharing: ${window.location.origin}/?pano=ID&key=KEY
 * Base serves as fallback if key is not found in database.
 */
export function getPanoShareUrl(
  panoId: string,
  optionsOrLangOrKey?: PanoShareOptions | string,
  keyParam?: string
): string {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('pano', panoId);

  // If a short 3-character string was directly passed as the 2nd or 3rd argument
  let effectiveKey = keyParam;
  if (!effectiveKey && typeof optionsOrLangOrKey === 'string' && optionsOrLangOrKey.length === 3 && /^[0-9a-z]{3}$/i.test(optionsOrLangOrKey)) {
    effectiveKey = optionsOrLangOrKey;
  } else if (!effectiveKey && typeof optionsOrLangOrKey === 'object' && optionsOrLangOrKey?.key) {
    effectiveKey = optionsOrLangOrKey.key;
  }

  if (effectiveKey) {
    url.searchParams.set('key', effectiveKey.toLowerCase());
    return url.toString();
  }

  // Legacy fallback format if no key was generated
  if (typeof optionsOrLangOrKey === 'string') {
    if (optionsOrLangOrKey) {
      url.searchParams.set('lang', optionsOrLangOrKey);
    }
  } else if (optionsOrLangOrKey) {
    if (optionsOrLangOrKey.lang) {
      url.searchParams.set('lang', optionsOrLangOrKey.lang);
    }
    if (optionsOrLangOrKey.lon !== undefined && !isNaN(optionsOrLangOrKey.lon)) {
      url.searchParams.set('lon', optionsOrLangOrKey.lon.toFixed(1));
    }
    if (optionsOrLangOrKey.lat !== undefined && !isNaN(optionsOrLangOrKey.lat)) {
      url.searchParams.set('lat', optionsOrLangOrKey.lat.toFixed(1));
    }
    if (optionsOrLangOrKey.fov !== undefined && !isNaN(optionsOrLangOrKey.fov)) {
      const fovFormatted =
        optionsOrLangOrKey.fov < 10
          ? parseFloat(optionsOrLangOrKey.fov.toFixed(2)).toString()
          : Math.round(optionsOrLangOrKey.fov).toString();
      url.searchParams.set('fov', fovFormatted);
    }
    if (optionsOrLangOrKey.proj) {
      url.searchParams.set('proj', optionsOrLangOrKey.proj);
    }
    if (optionsOrLangOrKey.sid) {
      url.searchParams.set('sid', optionsOrLangOrKey.sid);
    }
  }
  return url.toString();
}

export interface ResolvedShareData {
  found: boolean;
  key?: string;
  pano_id?: string;
  title?: string;
  url?: string;
  params?: Record<string, any>;
  clicks?: number;
}

/**
 * Resolve share key from backend D1 / KV database
 * If resolution fails or key not found, gracefully returns { found: false }
 */
export async function resolveShareKey(key: string, panoId?: string): Promise<ResolvedShareData | null> {
  if (!key || typeof window === 'undefined') return null;
  const cleanKey = key.trim().toLowerCase();

  try {
    const qs = new URLSearchParams({ key: cleanKey });
    if (panoId) qs.set('pano', panoId);
    const res = await fetch(`/api/panoramas/share?${qs.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('Could not resolve share key from API, using fallback:', err);
  }
  return { found: false, key: cleanKey, pano_id: panoId };
}

export function getInitialUrlParams(): {
  lat?: number;
  lng?: number;
  zoom?: number;
  lang?: string;
  years?: string[];
  months?: string[];
  resolutions?: string[];
  tags?: string[];
  moods?: string[];
  year?: string;
  panoId?: string;
  searchQuery?: string;
  onlyFavorites?: boolean;
  onlyTimelineClusters?: boolean;
  filmstripMode?: boolean;
  tilesMode?: boolean;
  tileSize?: 'normal' | 'large';
  tilesGroupBy?: 'location' | 'date';
  mapStyle?: string;
  sid?: string;
  shareKey?: string;
  // Camera & view parameters for shared panoramas
  panoLon?: number;
  panoLat?: number;
  panoFov?: number;
  panoProj?: string;
} {
  const params = new URLSearchParams(window.location.search);
  const panoId = params.get('pano') || undefined;
  const lang = params.get('lang') || undefined;

  const latStr = params.get('lat');
  const lngStr = params.get('lng');
  const zoomStr = params.get('zoom');

  const lat = latStr ? parseFloat(latStr) : undefined;
  const lng = lngStr ? parseFloat(lngStr) : undefined;
  const zoom = zoomStr ? parseFloat(zoomStr) : undefined;

  // Years: check 'years' first (comma-separated), fallback to 'year'
  const yearsParam = params.get('years');
  const yearParam = params.get('year');
  let years: string[] | undefined = undefined;
  if (yearsParam) {
    years = yearsParam.split(',').map((s) => s.trim()).filter(Boolean);
  } else if (yearParam && yearParam !== 'all') {
    years = [yearParam.trim()];
  }

  // Months: check 'months' (comma-separated) or 'month'
  const monthsParam = params.get('months') || params.get('month');
  let months: string[] | undefined = undefined;
  if (monthsParam) {
    months = monthsParam.split(',').map((s) => s.trim()).filter(Boolean);
  }

  // Resolutions: check 'res' or 'resolutions'
  const resParam = params.get('res') || params.get('resolutions');
  let resolutions: string[] | undefined = undefined;
  if (resParam) {
    resolutions = resParam.split(',').map((s) => s.trim()).filter(Boolean);
  }

  // Tags: check 'tags' or 'tag'
  const tagsParam = params.get('tags') || params.get('tag');
  let tags: string[] | undefined = undefined;
  if (tagsParam) {
    tags = tagsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.startsWith('#') ? s : `#${s}`));
  }

  // Moods: check 'moods' or 'mood'
  const moodsParam = params.get('moods') || params.get('mood');
  let moods: string[] | undefined = undefined;
  if (moodsParam) {
    moods = moodsParam.split(',').map((s) => s.trim()).filter(Boolean);
  }

  const searchQuery = params.get('q') || undefined;
  const onlyFavorites = params.get('fav') === '1' || params.get('favorites') === '1';
  const onlyTimelineClusters = params.get('timeline') === '1' || params.get('clusters') === '1' || params.get('timeline_clusters') === '1';
  const filmstripMode = params.get('filmstrip') === '1' || params.get('film') === '1';
  const tilesMode = params.get('tiles') === '1';
  const tileSize = (params.get('tileSize') === 'large' ? 'large' : undefined) as 'large' | undefined;
  const tilesGroupParam = params.get('tilesGroup') || params.get('group');
  const tilesGroupBy = (tilesGroupParam === 'date' ? 'date' : tilesGroupParam === 'location' ? 'location' : undefined) as 'location' | 'date' | undefined;
  const mapStyle = params.get('style') || undefined;

  // Pano camera view parameters
  const sid = params.get('sid') || undefined;
  const shareKey = params.get('key') || undefined;
  const lonParam = params.get('lon') || params.get('yaw');
  // Only treat 'pitch' or 'plat' as camera pitch; 'lat' is strictly reserved for map/pano GPS coordinates
  const latPanoParam = params.get('pitch') || params.get('plat') || undefined;
  // Camera FOV must only come from 'fov'; map 'zoom' (levels 1-20) must never be used as camera FOV degrees
  const fovParam = params.get('fov');
  const projParam = params.get('proj') || params.get('projection') || undefined;

  const panoLon = lonParam ? parseFloat(lonParam) : undefined;
  const panoLat = latPanoParam ? parseFloat(latPanoParam) : undefined;
  const panoFov = fovParam ? parseFloat(fovParam) : undefined;
  const panoProj = projParam || undefined;

  return {
    lat: lat && !isNaN(lat) ? lat : undefined,
    lng: lng && !isNaN(lng) ? lng : undefined,
    zoom: zoom && !isNaN(zoom) ? zoom : undefined,
    lang,
    years,
    months,
    resolutions,
    tags,
    moods,
    year: yearParam || (years && years[0]) || undefined,
    panoId,
    searchQuery,
    onlyFavorites,
    onlyTimelineClusters,
    filmstripMode,
    tilesMode,
    tileSize,
    tilesGroupBy,
    mapStyle,
    sid,
    shareKey,
    panoLon: panoLon !== undefined && !isNaN(panoLon) ? panoLon : undefined,
    panoLat: panoLat !== undefined && !isNaN(panoLat) ? panoLat : undefined,
    panoFov: panoFov !== undefined && !isNaN(panoFov) ? panoFov : undefined,
    panoProj,
  };
}
