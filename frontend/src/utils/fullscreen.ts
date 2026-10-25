/**
 * Cross-browser Fullscreen API utility supporting standard and vendor-prefixed methods
 * (WebKit, Safari, iOS, Chrome Android, Firefox, Edge/IE).
 */

export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  const el = document.documentElement as any;
  return Boolean(
    doc.fullscreenEnabled ||
    doc.webkitFullscreenEnabled ||
    doc.mozFullScreenEnabled ||
    doc.msFullscreenEnabled ||
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.webkitRequestFullScreen
  );
}

export function isBrowserFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.webkitCurrentFullScreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

export async function requestBrowserFullscreen(element?: HTMLElement): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const target = (element || document.documentElement) as any;
  const doc = document as any;

  try {
    if (typeof target.requestFullscreen === 'function') {
      await target.requestFullscreen();
      return true;
    } else if (typeof target.webkitRequestFullscreen === 'function') {
      await target.webkitRequestFullscreen();
      return true;
    } else if (typeof target.webkitRequestFullScreen === 'function') {
      await target.webkitRequestFullScreen();
      return true;
    } else if (typeof target.mozRequestFullScreen === 'function') {
      await target.mozRequestFullScreen();
      return true;
    } else if (typeof target.msRequestFullscreen === 'function') {
      await target.msRequestFullscreen();
      return true;
    } else if (typeof doc.documentElement?.webkitRequestFullscreen === 'function') {
      await doc.documentElement.webkitRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('requestFullscreen failed:', err);
  }
  return false;
}

export async function exitBrowserFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const doc = document as any;

  try {
    if (typeof doc.exitFullscreen === 'function') {
      await doc.exitFullscreen();
      return true;
    } else if (typeof doc.webkitExitFullscreen === 'function') {
      await doc.webkitExitFullscreen();
      return true;
    } else if (typeof doc.webkitCancelFullScreen === 'function') {
      await doc.webkitCancelFullScreen();
      return true;
    } else if (typeof doc.mozCancelFullScreen === 'function') {
      await doc.mozCancelFullScreen();
      return true;
    } else if (typeof doc.msExitFullscreen === 'function') {
      await doc.msExitFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('exitFullscreen failed:', err);
  }
  return false;
}

export function addFullscreenChangeListener(callback: (active: boolean) => void): () => void {
  if (typeof document === 'undefined') return () => {};

  const handler = () => {
    callback(isBrowserFullscreen());
  };

  const events = [
    'fullscreenchange',
    'webkitfullscreenchange',
    'mozfullscreenchange',
    'MSFullscreenChange',
  ];

  events.forEach((ev) => document.addEventListener(ev, handler));

  return () => {
    events.forEach((ev) => document.removeEventListener(ev, handler));
  };
}
