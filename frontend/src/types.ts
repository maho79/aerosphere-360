export interface PanoramaSunData {
  astro_azimuth: number;    // Astronomical solar azimuth from North (0-360°)
  astro_elevation: number;  // Astronomical solar altitude above horizon (-90 to +90°)
  img_azimuth?: number;     // Detected solar centroid azimuth in equirectangular image (0-360°)
  img_elevation?: number;   // Detected solar centroid altitude in equirectangular image (-90 to +90°)
  north_offset: number;     // Camera North heading offset in degrees (0-360°)
  sun_detected: boolean;    // Whether solar disk was successfully detected in image
  confidence?: number;      // Confidence score of solar detection (0.0 to 1.0)
  visual_aligned?: boolean; // Whether heading was visually calibrated via horizon feature matching
  manual_aligned?: boolean; // Whether heading was manually calibrated via split-screen / admin tool
  is_visual_anchor?: boolean; // Whether this panorama serves as reference anchor for the cluster
  ref_pano_id?: string;     // Anchor panorama ID used for visual alignment
  alignment_confidence?: number; // Visual alignment confidence (0.0 to 1.0)
  alignment_inliers?: number;    // Count of ORB feature consensus inliers
}

export interface Panorama {
  id: string;
  filename: string;
  original_filename: string;
  title?: string;
  city: string;
  country: string;
  date: string;
  lat: number | null;
  lon: number | null;
  width: number;
  height: number;
  size: number | string;
  file_size?: number | string;
  thumbnail?: string;
  is_private?: boolean;
  is_deleted?: boolean;
  folder?: string | null;
  shares?: number;
  views?: number;
  favorites?: number;
  comments_count?: number;
  custom_tags?: string[] | string;
  updated_at?: string;
  original_filepath?: string;
  environment?: 'outdoor' | 'indoor';
  altitude?: number;
  sun_data?: PanoramaSunData;
  gps_source?: 'exif' | 'manual' | 'auto' | 'editor' | null;
  exclude_timeline?: boolean;
}

export type GpsStatus = 'original_exif' | 'manual_editor' | 'auto_needs_review' | 'no_gps';

export function getPanoramaGpsStatus(pano: Panorama): GpsStatus {
  const hasGps = pano.lat !== null && pano.lon !== null && !isNaN(Number(pano.lat)) && !isNaN(Number(pano.lon)) && !(pano.lat === 0 && pano.lon === 0);
  if (!hasGps) {
    return 'no_gps';
  }
  if (pano.gps_source === 'auto') {
    return 'auto_needs_review';
  }
  if (pano.gps_source === 'manual' || pano.gps_source === 'editor') {
    return 'manual_editor';
  }
  return 'original_exif';
}

export interface PanoramaComment {
  id: string;
  pano_id: string;
  author: string;
  text: string;
  created_at: string;
  is_admin?: boolean;
}

export type GPSPanorama = Panorama & {
  lat: number;
  lon: number;
};

export interface MapViewState {
  lat: number;
  lng: number;
  zoom: number;
  year: string;
}

export function cleanPanoPath(p: string): string {
  if (!p) return '';
  return p.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');
}

export function getResolutionCategory(width: number): string {
  if (!width || isNaN(width) || width <= 0) return 'Unknown';
  if (width >= 16000) return '16K+';
  if (width >= 14500 && width < 16000) return '15K';
  if (width >= 13500 && width < 14500) return '14K';
  if (width >= 12500 && width < 13500) return '13K';
  if (width >= 11500 && width < 12500) return '12K';
  if (width >= 10500 && width < 11500) return '11K';
  if (width >= 9500 && width < 10500) return '10K';
  if (width >= 8500 && width < 9500) return '9K';
  if (width >= 7500 && width < 8500) return '8K';
  if (width >= 6500 && width < 7500) return '7K';
  if (width >= 5500 && width < 6500) return '6K';
  if (width >= 4500 && width < 5500) return '5K';
  if (width >= 3500 && width < 4500) return '4K';
  const k = Math.round(width / 1000);
  return `${k}K`;
}

/**
 * Returns horizontal resolution indicator in 'K' notation (e.g. '15.4K', '15K', '8K')
 */
export function getHorizontalK(width: number): string {
  if (!width || isNaN(width) || width <= 0) return '0K';
  const k = width / 1000;
  const rounded = Math.round(k * 10) / 10;
  if (rounded === Math.floor(rounded)) {
    return `${Math.floor(rounded)}K`;
  }
  return `${rounded.toFixed(1)}K`;
}

/**
 * Returns total megapixels (MP) calculated as (width * height) / 1,000,000
 * e.g. '118.0 MP', '33.6 MP', '18.0 MP'
 */
export function getMegapixels(width: number, height: number): string {
  if (!width || !height || isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
    return '0 MP';
  }
  const total = (width * height) / 1_000_000;
  return `${total.toFixed(1)} MP`;
}

export interface ActiveTextureDetails {
  tier: 'full' | '8k' | '2k' | 'thumb' | 'none';
  width: number;
  height: number;
  isMaxQuality: boolean;
  label: string;
  sourceWidth: number;
  sourceHeight: number;
}

export interface BatchVideoReportItem {
  id: string;
  title: string;
  location: string;
  date: string;
  filename: string;
  nativeResolution: string;
  textureTier: string;
  textureResolution: string;
  textureLabel: string;
  videoResolution: string;
  isMaxQuality: boolean;
  fileSizeMB: number;
  durationSec: number;
}


