import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { recordViewEvent } from '../utils/traffic';

import type { Panorama, PanoramaSunData } from '../types';

import { panoConfig } from '../config/panoConfig';

export const ALLOWED_ADMIN_EMAIL = panoConfig.auth.allowedAdminEmail ? panoConfig.auth.allowedAdminEmail.toLowerCase() : '';
export const GOOGLE_CLIENT_ID = panoConfig.auth.googleClientId;

export interface AdminUser {
  email: string;
  name: string;
  initials: string;
  picture?: string;
  token?: string;
}

export interface AdminPanoUpdate {
  ids: string[];
  is_private?: boolean;
  folder?: string | null;
  is_deleted?: boolean;
  sun_data?: PanoramaSunData;
  lat?: number | null;
  lon?: number | null;
  gps_source?: 'exif' | 'manual' | 'auto' | 'editor' | null;
  custom_tags?: string[] | string;
  title?: string;
  city?: string;
  country?: string;
  filename?: string;
  width?: number;
  height?: number;
  file_size?: number;
  exclude_timeline?: boolean;
}

interface AdminContextType {
  isAdmin: boolean;
  adminUser: AdminUser | null;
  loginWithGoogle: (credentialToken: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  showAdminModal: boolean;
  setShowAdminModal: (show: boolean) => void;
  showServiceModal: boolean;
  setShowServiceModal: (show: boolean) => void;
  selectedPanoIds: Set<string>;
  selectionCount: number;
  toggleSelectPano: (id: string) => void;
  selectPanos: (ids: string[]) => void;
  deselectPanos: (ids: string[]) => void;
  clearSelection: () => void;
  isPanoSelected: (id: string) => boolean;
  batchUpdatePanoramas: (params: AdminPanoUpdate) => Promise<{ success: boolean; count: number; error?: string }>;
  updatePanoramaSunData: (id: string, sun_data: PanoramaSunData) => Promise<{ success: boolean; error?: string }>;
  togglePanoramaPublic: (id: string | number, currentlyPrivate: boolean) => Promise<boolean>;
  deletePanorama: (id: string) => Promise<boolean>;
  restorePanorama: (id: string, targetFolder?: string) => Promise<boolean>;
  recordPanoramaView: (id: string) => Promise<number>;
  onPanoramaUpdated?: () => void;
  setOnPanoramaUpdated: (cb: () => void) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Helper to decode JWT client-side
function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0].toUpperCase()}.${parts[1][0].toUpperCase()}.`;
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) {
    const user = email.split('@')[0];
    const parts = user.split(/[._-]/);
    if (parts.length >= 2) {
      return `${parts[0][0].toUpperCase()}.${parts[1][0].toUpperCase()}.`;
    }
    return user.slice(0, 2).toUpperCase();
  }
  return 'M.T.';
}

export interface AdminProviderProps {
  children: React.ReactNode;
  onRefreshPanoramas?: () => Promise<void> | void;
  onUpdatePanoramasLocally?: (updater: (prev: Panorama[]) => Panorama[]) => void;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({
  children,
  onRefreshPanoramas,
  onUpdatePanoramasLocally,
}) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      const sess = localStorage.getItem('pano_admin_session') || sessionStorage.getItem('pano_admin_session');
      if (sess) {
        const parsed = JSON.parse(sess);
        const hasToken = typeof parsed?.token === 'string' && parsed.token.length > 0;
        const isMT = parsed?.email === ALLOWED_ADMIN_EMAIL.toLowerCase();
        if (hasToken && isMT) {
          const payload = decodeJwt(parsed.token);
          if (payload?.exp && payload.exp * 1000 < Date.now()) {
            return false;
          }
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  });

  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const sess = localStorage.getItem('pano_admin_session') || sessionStorage.getItem('pano_admin_session');
      if (sess) {
        const parsed = JSON.parse(sess);
        const hasToken = typeof parsed?.token === 'string' && parsed.token.length > 0;
        const isMT = parsed?.email === ALLOWED_ADMIN_EMAIL.toLowerCase();
        if (hasToken && isMT) {
          const payload = decodeJwt(parsed.token);
          if (payload?.exp && payload.exp * 1000 < Date.now()) {
            return null;
          }
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [showServiceModal, setShowServiceModal] = useState<boolean>(false);
  const [selectedPanoIds, setSelectedPanoIds] = useState<Set<string>>(new Set());
  const [refreshListener, setRefreshListener] = useState<(() => void) | undefined>(undefined);
  const lastTrackedViewsRef = useRef<Map<string, number>>(new Map());

  // Validate existing session on mount
  useEffect(() => {
    const sessStr = localStorage.getItem('pano_admin_session') || sessionStorage.getItem('pano_admin_session');
    if (sessStr) {
      try {
        const sess = JSON.parse(sessStr);
        if (sess?.token) {
          const payload = decodeJwt(sess.token);
          if (payload?.exp && payload.exp * 1000 < Date.now()) {
            console.warn('Google session token has expired on startup. Logging out.');
            logout();
            return;
          }

          fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: sess.token }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success && data.user) {
                const userObj: AdminUser = {
                  email: data.user.email,
                  name: data.user.name || 'Administrator',
                  initials: getInitials(data.user.name, data.user.email),
                  picture: data.user.picture,
                  token: sess.token,
                };
                setAdminUser(userObj);
                setIsAdmin(true);
              } else {
                console.warn('Backend rejected Google session token:', data?.error);
                logout();
              }
            })
            .catch(() => {
              // Dev/offline fallback: keep current session if email matched
            });
        }
      } catch {}
    }
  }, []);

  const loginWithGoogle = async (credentialToken: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const payload = decodeJwt(credentialToken);
      const email = (payload?.email || '').toLowerCase();

      if (!email) {
        return { success: false, error: 'Could not extract Google account email.' };
      }

      if (email !== ALLOWED_ADMIN_EMAIL.toLowerCase()) {
        return {
          success: false,
          error: `Access denied. Email '${email}' is not authorized. Restricted to authorized administrator (M.T.).`,
        };
      }

      // Try server-side validation against Google OAuth endpoint (Cloudflare Worker / KV)
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: credentialToken }),
        });
        if (res.ok) {
          const sData = await res.json();
          if (!sData.success) {
            return { success: false, error: sData.error || 'Server validation rejected Google credential.' };
          }
        }
      } catch (netErr) {
        console.warn('Backend /api/auth offline or local dev, using client-side verified payload', netErr);
      }

      const initials = getInitials(payload?.name, email);
      const user: AdminUser = {
        email,
        name: payload?.name || 'Administrator',
        initials,
        picture: payload?.picture,
        token: credentialToken,
      };

      setIsAdmin(true);
      setAdminUser(user);
      try {
        localStorage.setItem('pano_admin_session', JSON.stringify(user));
        sessionStorage.setItem('pano_admin_session', JSON.stringify(user));
      } catch (_) {}
      setShowAdminModal(false);
      refreshListener?.();
      return { success: true };
    } catch (err: any) {
      console.error('Google login error:', err);
      return { success: false, error: err.message || 'Error processing Google Sign-In' };
    }
  };

  const logout = () => {
    setIsAdmin(false);
    setAdminUser(null);
    setSelectedPanoIds(new Set());
    setShowServiceModal(false);
    try {
      localStorage.removeItem('pano_admin_session');
      localStorage.removeItem('pano_admin');
      sessionStorage.removeItem('pano_admin_session');
      sessionStorage.removeItem('pano_admin');
    } catch (_) {}
    refreshListener?.();
  };

  const toggleSelectPano = (id: string) => {
    if (!isAdmin) return;
    const strId = String(id);
    setSelectedPanoIds((prev) => {
      const next = new Set(prev);
      if (next.has(strId)) {
        next.delete(strId);
      } else {
        next.add(strId);
      }
      return next;
    });
  };

  const selectPanos = (ids: string[]) => {
    if (!isAdmin || ids.length === 0) return;
    setSelectedPanoIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(String(id)));
      return next;
    });
  };

  const deselectPanos = (ids: string[]) => {
    if (!isAdmin || ids.length === 0) return;
    setSelectedPanoIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(String(id)));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedPanoIds(new Set());
  };

  const isPanoSelected = (id: string): boolean => {
    return selectedPanoIds.has(String(id));
  };

  const batchUpdatePanoramas = async (
    params: AdminPanoUpdate
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    const { ids, is_private, folder, is_deleted, sun_data } = params;
    if (ids.length === 0) return { success: false, count: 0 };

    // STRICT AUTHENTICATION CHECK: Only authenticated administrator with Google ID token can modify panoramas
    const token = adminUser?.token;
    if (!isAdmin || !token) {
      setShowAdminModal(true);
      alert('Túto akciu môže vykonať iba prihlásený administrátor (autorizovaný administrátor). Prosím, prihláste sa cez Google.');
      return { success: false, count: 0, error: 'Neprihlásený administrátor' };
    }

    // Client-side expiry check before network request
    const jwtPayload = decodeJwt(token);
    if (jwtPayload?.exp && jwtPayload.exp * 1000 < Date.now()) {
      alert('Platnosť Google prihlásenia vypršala. Prosím, prihláste sa znova cez Google.');
      logout();
      setShowAdminModal(true);
      return { success: false, count: 0, error: 'Platnosť tokenu vypršala' };
    }

    // 1. Post to backend / Cloudflare D1 endpoint with Google OAuth Bearer token
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
      const bodyPayload = { ...params, token };

      let res = await fetch('/api/panoramas', {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok && res.status !== 401 && res.status !== 403) {
        res = await fetch('/api/panoramas/batch-update', {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload),
        });
      }

      if (res.status === 401 || res.status === 403) {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || 'Platnosť prihlásenia administrátora vypršala. Prosím, prihláste sa znova cez Google.');
        logout();
        setShowAdminModal(true);
        return { success: false, count: 0, error: errJson.error || 'Neautorizovaný prístup' };
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error || `Chyba servera (${res.status})`;
        console.error('Batch update failed:', errMsg);
        alert(`Chyba pri zápise do D1: ${errMsg}`);
        return { success: false, count: 0, error: errMsg };
      }

      if (res.ok) {
        // 2. Immediately update in-memory React state so the UI reflects changes with 0ms delay
        onUpdatePanoramasLocally?.((prev) =>
          prev.map((p) => {
            if (!ids.includes(String(p.id))) return p;
            const updated = { ...p };
            if (typeof is_private === 'boolean') {
              updated.is_private = is_private;
              if (is_private === false && (folder === undefined || folder === null)) {
                delete updated.folder;
              }
            }
            if (folder !== undefined) {
              if (folder === null || folder === '') delete updated.folder;
              else updated.folder = folder;
            }
            if (typeof is_deleted === 'boolean') updated.is_deleted = is_deleted;
            if (sun_data !== undefined) updated.sun_data = sun_data;
            if (params.lat !== undefined) updated.lat = params.lat;
            if (params.lon !== undefined) updated.lon = params.lon;
            if (params.gps_source !== undefined) updated.gps_source = params.gps_source;
            if (params.custom_tags !== undefined) updated.custom_tags = params.custom_tags;
            if (params.title !== undefined) updated.title = params.title;
            if (params.city !== undefined) updated.city = params.city;
            if (params.country !== undefined) updated.country = params.country;
            if (typeof params.exclude_timeline === 'boolean') updated.exclude_timeline = params.exclude_timeline;
            return updated;
          })
        );

        // 3. Reconcile localStorage cache
        try {
          const raw = localStorage.getItem('pano_admin_overrides');
          const overrides: Record<string, any> = raw ? JSON.parse(raw) : {};
          ids.forEach((id) => {
            const updated = { ...(overrides[id] || {}) };
            if (typeof is_private === 'boolean') {
              updated.is_private = is_private;
              if (is_private === false && (folder === undefined || folder === null || (typeof updated.folder === 'string' && updated.folder.toLowerCase().includes('private')))) {
                delete updated.folder;
              }
            }
            if (folder === null || folder === '') {
              delete updated.folder;
            } else if (typeof folder === 'string') {
              updated.folder = folder;
            }
            if (typeof is_deleted === 'boolean') {
              updated.is_deleted = is_deleted;
            }
            if (sun_data !== undefined) {
              updated.sun_data = sun_data;
            }
            if (params.lat !== undefined) {
              updated.lat = params.lat;
            }
            if (params.lon !== undefined) {
              updated.lon = params.lon;
            }
            if (params.gps_source !== undefined) {
              updated.gps_source = params.gps_source;
            }
            if (params.custom_tags !== undefined) {
              updated.custom_tags = params.custom_tags;
            }
            if (params.title !== undefined) {
              updated.title = params.title;
            }
            if (typeof params.exclude_timeline === 'boolean') {
              updated.exclude_timeline = params.exclude_timeline;
            }
            if (params.city !== undefined) {
              updated.city = params.city;
            }
            if (params.country !== undefined) {
              updated.country = params.country;
            }
            overrides[id] = updated;
          });
          localStorage.setItem('pano_admin_overrides', JSON.stringify(overrides));
        } catch (e) {
          console.warn('Failed to save to localStorage overrides', e);
        }

        // 4. Trigger canonical server re-sync
        onRefreshPanoramas?.();
        refreshListener?.();

        const data = await res.json().catch(() => ({}));
        return { success: true, count: data.count || data.updated || ids.length };
      }
    } catch (e: any) {
      console.warn('Could not post to /api/panoramas', e);
      alert(`Chyba siete pri ukladaní do D1: ${e.message || e}`);
      return { success: false, count: 0, error: e.message || 'Chyba siete' };
    }

    return { success: false, count: 0 };
  };

  // Quick single panorama toggle between public and private
  const togglePanoramaPublic = async (id: string | number, currentlyPrivate: boolean): Promise<boolean> => {
    const newPrivate = !currentlyPrivate;
    const res = await batchUpdatePanoramas({
      ids: [String(id)],
      is_private: newPrivate,
    });
    return res.success;
  };

  // Calibrate and persist solar position/heading calibration for single panorama
  const updatePanoramaSunData = async (
    id: string,
    sun_data: PanoramaSunData
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isAdmin) {
      return { success: false, error: 'Vyžaduje sa prihlásenie administrátora.' };
    }
    const res = await batchUpdatePanoramas({
      ids: [id],
      sun_data,
    });
    return { success: res.success };
  };

  // Move single panorama to '!DELETED!' folder and mark as deleted & private
  const deletePanorama = async (id: string): Promise<boolean> => {
    const res = await batchUpdatePanoramas({
      ids: [id],
      is_deleted: true,
      folder: '!DELETED!',
      is_private: true,
    });
    return res.success;
  };

  // Restore single panorama from '!DELETED!'
  const restorePanorama = async (id: string, targetFolder: string = 'Restored'): Promise<boolean> => {
    const res = await batchUpdatePanoramas({
      ids: [id],
      is_deleted: false,
      folder: targetFolder,
      is_private: true,
    });
    return res.success;
  };

  // Record a view for a panorama (increment view count directly into Cloudflare D1)
  const recordPanoramaView = async (id: string): Promise<number> => {
    const strId = String(id);
    let newCount = 1;

    // 1. Update local storage views cache immediately for optimistic UI
    try {
      const raw = localStorage.getItem('pano_views_cache');
      const views: Record<string, number> = raw ? JSON.parse(raw) : {};
      newCount = (views[strId] || 0) + 1;
      views[strId] = newCount;
      localStorage.setItem('pano_views_cache', JSON.stringify(views));
    } catch {}

    // Record traffic timestamp and payload
    recordViewEvent({ id: strId });

    // Deduplicate rapid double-triggers on the exact same panorama within 2.5s (e.g. React StrictMode / multi-effect)
    const now = Date.now();
    const lastTrackedTime = lastTrackedViewsRef.current.get(strId) || 0;
    if (now - lastTrackedTime < 2500) {
      return newCount;
    }
    lastTrackedViewsRef.current.set(strId, now);

    // 2. Report view directly to Cloudflare D1 (/api/panoramas/view?id=...)
    try {
      const res = await fetch(`/api/panoramas/view?id=${encodeURIComponent(strId)}`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.views === 'number') {
          newCount = data.views;
          try {
            const raw = localStorage.getItem('pano_views_cache');
            const views: Record<string, number> = raw ? JSON.parse(raw) : {};
            views[strId] = newCount;
            localStorage.setItem('pano_views_cache', JSON.stringify(views));
          } catch {}
        }
      }
    } catch (e) {
      // offline/local ignore
    }

    // Broadcast view update so components (Stats, Tiles, PinHoverCard, PanoViewer) update in real-time
    try {
      window.dispatchEvent(new CustomEvent('pano_view_recorded', { detail: { id: strId, views: newCount } }));
    } catch {}

    return newCount;
  };

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        adminUser,
        loginWithGoogle,
        logout,
        showAdminModal,
        setShowAdminModal,
        showServiceModal,
        setShowServiceModal,
        selectedPanoIds,
        selectionCount: selectedPanoIds.size,
        toggleSelectPano,
        selectPanos,
        deselectPanos,
        clearSelection,
        isPanoSelected,
        batchUpdatePanoramas,
        updatePanoramaSunData,
        togglePanoramaPublic,
        deletePanorama,
        restorePanorama,
        recordPanoramaView,
        onPanoramaUpdated: refreshListener,
        setOnPanoramaUpdated: (cb: () => void) => setRefreshListener(() => cb),
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
