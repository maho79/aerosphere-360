import { panoConfig } from '../config/panoConfig';
/**
 * Google Analytics 4 (gtag.js) Integration
 * Measurement ID:  (measurement ID configured in panoConfig)
 */

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export const GA_MEASUREMENT_ID = panoConfig.analytics?.googleAnalyticsId || '';

/**
 * Safely trigger a Google Analytics event
 */
export function trackEvent(eventName: string, params: Record<string, any> = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', eventName, params);
    } catch (e) {
      console.warn('Analytics event failed:', e);
    }
  }
}

/**
 * Track route / page view in single-page app
 */
export function trackPageView(pagePath: string, pageTitle?: string) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      const title = pageTitle || document.title || `${panoConfig.branding.appName}`;
      const loc = window.location.href;
      window.gtag('event', 'page_view', {
        page_title: title,
        page_location: loc,
        page_path: pagePath,
        send_to: GA_MEASUREMENT_ID,
      });
    } catch (e) {
      console.warn('Analytics pageview failed:', e);
    }
  }
}

/**
 * Common event tracking helpers
 */
export const analytics = {
  trackPageView,
  trackEvent,
  viewPanorama: (panoId: string, city?: string, filename?: string) => {
    trackEvent('view_panorama', {
      panorama_id: panoId,
      city: city || 'Unknown',
      filename: filename || '',
    });
  },

  switchViewMode: (mode: 'map' | 'tiles') => {
    trackEvent('switch_view_mode', {
      view_mode: mode,
    });
  },

  changeMapLayer: (layerName: string) => {
    trackEvent('change_map_layer', {
      layer_name: layerName,
    });
  },

  applyFilter: (filterType: 'years' | 'months' | 'resolutions' | 'search' | 'tags' | 'moods', values: any) => {
    trackEvent('apply_filter', {
      filter_type: filterType,
      filter_values: Array.isArray(values) ? values.join(',') : String(values),
    });
  },

  share: (type: 'map' | 'panorama', idOrUrl?: string) => {
    trackEvent('share', {
      content_type: type,
      item_id: idOrUrl,
    });
  },

  exportImage: (panoId: string, filename?: string) => {
    trackEvent('export_4k_image', {
      panorama_id: panoId,
      filename: filename || '',
    });
  },

  downloadPanorama: (panoId: string) => {
    trackEvent('download_panorama', {
      panorama_id: panoId,
    });
  },

  changeLanguage: (lang: string) => {
    trackEvent('change_language', {
      language: lang,
    });
  },
};
