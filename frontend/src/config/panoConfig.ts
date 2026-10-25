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

export interface PanoStorageConfig {
  /** Base URL for low-resolution fast thumbnails (e.g. 400x200) */
  thumbnailsUrl: string;
  /** Base URL for 2K medium resolution textures (2048x1024) */
  panoramas2kUrl: string;
  /** Base URL for full web-resolution textures (up to 15360x7680) */
  panoramasWebUrl: string;
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

  // Storage endpoints: defaults to relative local paths with optional CDN prefix
  storage: {
    thumbnailsUrl: import.meta.env.VITE_THUMBNAILS_URL || '/thumbnails',
    panoramas2kUrl: import.meta.env.VITE_PANORAMAS_2K_URL || '/panoramas_2k',
    panoramasWebUrl: import.meta.env.VITE_PANORAMAS_WEB_URL || '/panoramas_web',
  },

  // Admin authentication (Google OAuth)
  auth: {
    allowedAdminEmail: import.meta.env.VITE_ADMIN_EMAIL || '',
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  },
};
