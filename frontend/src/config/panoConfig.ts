/**
 * AeroSphere 360 - Central Application Configuration
 *
 * All features, key mappings, branding, storage endpoints, and authorization
 * can be customized here or overridden via environment variables (.env).
 *
 * Created & engineered by Marian Trusik (https://panorama.trusik.link / https://trusik.link)
 * Licensed under the MIT License.
 */

export interface PanoFeatureConfig {
  /** Enable multi-date location time-travel timeline (clustering within 120m across distinct dates) */
  timeTravelTimeline: boolean;
  /** Enable in-browser 4K/60fps video generation & export via WebCodecs & MP4 muxer */
  videoExport4K: boolean;
  /** Enable real-time WebGL HDR color pop and midtone lift */
  hdrBoost: boolean;
  /** Enable Little Planet and Curved conformal stereographic shader projections */
  stereographicProjections: boolean;
  /** Enable directional compass radar overlay and heading orientation */
  compassRadar: boolean;
  /** Enable bottom filmstrip thumbnail drawer on map */
  filmstrip: boolean;
  /** Enable grid / tiles gallery view */
  tilesGallery: boolean;
  /** Enable view counters, likes, and social share tracking */
  socialStats: boolean;
  /** Enable ambient wind and outdoor audio soundscapes */
  soundscapes: boolean;
  /** Enable Google OAuth administration suite (editing GPS, titles, tags, privacy) */
  adminMode: boolean;
}

export interface PanoKeybindingsConfig {
  /** Toggle location timeline mode */
  toggleTimeline: string;
  /** Toggle visual cluster alignment suite (Shift+C by default) */
  toggleSplitCalibration: string;
  /** Toggle clean / immersive view without UI */
  toggleCleanView: string;
  /** Toggle timeline 2s auto-playback */
  togglePlayTimeline: string;
  /** Open custom hashtag editor */
  openTagEditor: string;
}

export interface PanoBrandingConfig {
  /** Application title displayed in header and browser tab */
  appName: string;
  /** Application title displayed in header and browser tab */
  siteTitle: string;
  /** Short tagline / subtitle */
  siteTagline: string;
  /** Author & engine credit */
  author: {
    name: string;
    url: string;
    showCreditBadge: boolean;
  };
}

export type StorageMode = 'local' | 'remote';

export interface PanoStorageConfig {
  /**
   * Storage delivery mode:
   * - 'local' (default): Direct streaming from local bundled assets in frontend/public.
   *   Works immediately out-of-the-box with sample panoramas without any cloud configuration.
   * - 'remote': Streams textures from external cloud storage / CDN / Cloudflare R2 bucket.
   */
  mode: StorageMode;
  /** Active base URL for low-resolution fast thumbnails */
  thumbnailsUrl: string;
  /** Active base URL for 2K medium resolution textures */
  panoramas2kUrl: string;
  /** Active base URL for full web-resolution textures */
  panoramasWebUrl: string;
  /** Optional private / development tunnel base URL */
  tunnelUrl?: string;
  /** Remote cloud storage endpoints (used when mode === 'remote') */
  remote: {
    thumbnailsUrl: string;
    panoramas2kUrl: string;
    panoramasWebUrl: string;
  };
}

export interface PanoAuthConfig {
  /** Permitted admin email for Google OAuth authentication */
  allowedAdminEmail: string;
  /** Google OAuth Client ID */
  googleClientId: string;
}

export interface PanoAnalyticsConfig {
  googleAnalyticsId?: string;
}

export interface PanoAppConfig {
  analytics: PanoAnalyticsConfig;
  features: PanoFeatureConfig;
  keybindings: PanoKeybindingsConfig;
  branding: PanoBrandingConfig;
  storage: PanoStorageConfig;
  auth: PanoAuthConfig;
}

// Active storage mode: 'local' (default out-of-the-box) or 'remote' (Cloudflare R2 / S3 / CDN)
const storageMode: StorageMode = ((import.meta.env.VITE_STORAGE_MODE as StorageMode) || 'local');
const isRemoteMode = storageMode === 'remote';

export const panoConfig: PanoAppConfig = {
  analytics: {
    googleAnalyticsId: import.meta.env.VITE_GA_MEASUREMENT_ID || '',
  },
  // Feature flags: turn off anything your project does not need
  features: {
    timeTravelTimeline: true,
    videoExport4K: true,
    hdrBoost: true,
    stereographicProjections: true,
    compassRadar: true,
    filmstrip: true,
    tilesGallery: true,
    socialStats: false, // Default false in generic template (enable when D1 / backend views are active)
    soundscapes: true,
    adminMode: Boolean(import.meta.env.VITE_ADMIN_EMAIL),
  },

  // Key mappings: customize or assign alternative keyboard shortcuts
  keybindings: {
    toggleTimeline: 'KeyY',
    toggleSplitCalibration: 'Shift+KeyC',
    toggleCleanView: 'KeyC',
    togglePlayTimeline: 'Shift+KeyY',
    openTagEditor: 'KeyT',
  },

  // Branding & author attribution
  branding: {
    siteTitle: import.meta.env.VITE_SITE_TITLE || 'AeroSphere 360',
    appName: import.meta.env.VITE_SITE_TITLE || 'AeroSphere 360',
    siteTagline: import.meta.env.VITE_SITE_TAGLINE || 'Ultra-HD 360° Spherical Panoramas',
    author: {
      name: 'Marian Trusik',
      url: 'https://panorama.trusik.link',
      showCreditBadge: import.meta.env.VITE_SHOW_CREDIT !== 'false',
    },
  },

  // Storage configuration:
  // - 'local' (default): Direct streaming from bundled assets in frontend/public.
  // - 'remote': Streams textures from external cloud storage / CDN / Cloudflare R2 bucket.
  storage: {
    mode: storageMode,

    thumbnailsUrl: isRemoteMode
      ? (import.meta.env.VITE_REMOTE_THUMBNAILS_URL || import.meta.env.VITE_THUMBNAILS_URL || '/thumbnails')
      : (import.meta.env.VITE_THUMBNAILS_URL || '/thumbnails'),

    panoramas2kUrl: isRemoteMode
      ? (import.meta.env.VITE_REMOTE_2K_URL || import.meta.env.VITE_PANORAMAS_2K_URL || '/panoramas_2k')
      : (import.meta.env.VITE_PANORAMAS_2K_URL || '/panoramas_2k'),

    panoramasWebUrl: isRemoteMode
      ? (import.meta.env.VITE_REMOTE_WEB_URL || import.meta.env.VITE_PANORAMAS_WEB_URL || '/panoramas_web')
      : (import.meta.env.VITE_PANORAMAS_WEB_URL || '/panoramas_web'),

    tunnelUrl: import.meta.env.VITE_TUNNEL_URL || '',

    remote: {
      thumbnailsUrl: import.meta.env.VITE_REMOTE_THUMBNAILS_URL || '',
      panoramas2kUrl: import.meta.env.VITE_REMOTE_2K_URL || '',
      panoramasWebUrl: import.meta.env.VITE_REMOTE_WEB_URL || '',
    },
  },

  // Admin authentication (Google OAuth)
  auth: {
    allowedAdminEmail: import.meta.env.VITE_ADMIN_EMAIL || '',
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  },
};
