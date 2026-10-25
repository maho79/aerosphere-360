import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type ViewMode = 'mobile' | 'desktop';

interface ViewModeContextType {
  viewMode: ViewMode;
  isMobileMode: boolean;
  isDesktopMode: boolean;
  deviceType: DeviceType;
  isApp: boolean;
  toggleViewMode: () => void;
  setViewMode: (mode: ViewMode) => void;
  resetToDefault: () => void;
}

const STORAGE_KEY = 'pano_view_mode';

/**
 * Accurately detects whether the physical device is a mobile phone, tablet, or desktop PC.
 * Crucially resilient against "Desktop site" mode toggled in mobile Chrome / Android TWA,
 * where the user-agent or viewport might mimic a desktop browser, but physical screen
 * dimensions (screen.width/height) and touch capability reliably identify a smartphone.
 */
export function isMobileApp(): boolean {
  if (typeof window === 'undefined') return false;
  // 1. URL search parameter from Android TWA / PWA launcher
  const search = window.location.search;
  if (search.includes('app=android') || search.includes('app=twa') || search.includes('mode=app')) {
    return true;
  }
  // 2. Standalone display mode (TWA, PWA, Chrome installed web app)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as any).standalone === true;
  const ua = navigator.userAgent || '';
  const isTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const isMobileOS = /Android|iPhone|iPod|iPad/i.test(ua);
  if (isStandalone && (isMobileOS || isTouch)) {
    return true;
  }
  // 3. Android app referrer or Chrome Custom Tab
  if (typeof document !== 'undefined' && document.referrer && (document.referrer.includes('android-app://') || document.referrer.includes('com.android.chrome'))) {
    return true;
  }
  // 4. Android WebView
  if (/wv|Android.*Version\/[0-9.]+/i.test(ua)) {
    return true;
  }
  return false;
}

/**
 * Returns true if running on any physical mobile phone (Android, iPhone, etc.) or mobile app wrapper.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  if (isMobileApp()) return true;
  const ua = navigator.userAgent || '';
  if (/Android.*Mobile|Mobile.*Safari|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobi|Mobile/i.test(ua)) {
    return true;
  }
  const isTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const screenMin = Math.min(window.screen.width, window.screen.height);
  if (isTouch && screenMin < 768) {
    return true;
  }
  return false;
}

/**
 * Accurately detects whether the physical device is a mobile phone, tablet, or desktop PC.
 * Resilient against "Desktop site" toggles and high-DPI smartphone screens.
 */
export function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  if (isMobileApp() || isMobileDevice()) return 'mobile';

  const ua = navigator.userAgent || '';
  const isTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const screenMin = Math.min(window.screen.width, window.screen.height);

  // 1. Apple iPad (including iPadOS reporting MacIntel with touch)
  const isIpad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIpad) return 'tablet';

  // 2. Standard mobile phone keywords in UA (Google spec: Android + Mobile = smartphone)
  if (/Android.*Mobile|Mobile.*Safari|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobi|Mobile/i.test(ua)) {
    return 'mobile';
  }

  // 3. Android Tablet (Android in UA without "Mobile", or specific tablet keywords)
  const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
  if (isAndroidTablet || /Tablet|PlayBook|Silk/i.test(ua)) return 'tablet';

  // 4. Physical screen dimension check for touch devices:
  if (isTouch) {
    if (screenMin < 600) {
      return 'mobile';
    }
    if (screenMin >= 600 && screenMin < 1100) {
      return 'tablet';
    }
  }

  return 'desktop';
}

/**
 * Returns the default view mode based on physical device type:
 * - Mobile phones & mobile apps -> 'mobile'
 * - Tablets and PCs -> 'desktop'
 */
export function getDefaultViewMode(): ViewMode {
  if (isMobileApp() || isMobileDevice()) return 'mobile';
  const device = detectDeviceType();
  return device === 'mobile' ? 'mobile' : 'desktop';
}

function applyViewportMeta(mode: ViewMode, device: DeviceType) {
  if (typeof document === 'undefined') return;
  let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'viewport';
    document.head.appendChild(meta);
  }

  // Standard responsive viewport for all devices - NEVER scale down to 0.38 miniature PC!
  meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover';

  document.documentElement.dataset.viewMode = mode;
  document.documentElement.classList.toggle('mode-mobile', mode === 'mobile');
  document.documentElement.classList.toggle('mode-desktop', mode === 'desktop');
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export const ViewModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceType] = useState<DeviceType>(() => detectDeviceType());
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'desktop';
    // On any mobile phone or in mobile app: ALWAYS force mobile mode!
    if (isMobileApp() || isMobileDevice()) {
      try {
        localStorage.setItem(STORAGE_KEY, 'mobile');
      } catch {}
      return 'mobile';
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ViewMode | null;
      if (saved === 'mobile' || saved === 'desktop') {
        // If detected smartphone, keep mobile by default
        if (detectDeviceType() === 'mobile' && saved === 'desktop') {
          return 'mobile';
        }
        return saved;
      }
    } catch {}
    return getDefaultViewMode();
  });

  useEffect(() => {
    applyViewportMeta(viewMode, deviceType);
  }, [viewMode, deviceType]);

  const setViewMode = useCallback((mode: ViewMode) => {
    // On mobile phone or in mobile app, reject setting desktop mode
    if ((isMobileApp() || isMobileDevice()) && mode === 'desktop') {
      setViewModeState('mobile');
      return;
    }
    setViewModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
    applyViewportMeta(mode, deviceType);
  }, [deviceType]);

  const toggleViewMode = useCallback(() => {
    // On mobile phone or in mobile app, reject toggling to desktop mode
    if (isMobileApp() || isMobileDevice()) {
      setViewModeState('mobile');
      return;
    }
    setViewModeState((prev) => {
      const next: ViewMode = prev === 'mobile' ? 'desktop' : 'mobile';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      applyViewportMeta(next, deviceType);
      return next;
    });
  }, [deviceType]);

  const resetToDefault = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    const def = getDefaultViewMode();
    setViewModeState(def);
    applyViewportMeta(def, deviceType);
  }, [deviceType]);

  return (
    <ViewModeContext.Provider
      value={{
        viewMode,
        isMobileMode: viewMode === 'mobile',
        isDesktopMode: viewMode === 'desktop',
        deviceType,
        isApp: isMobileApp() || isMobileDevice(),
        toggleViewMode,
        setViewMode,
        resetToDefault,
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
};
