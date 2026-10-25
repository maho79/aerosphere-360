import type { PanoramaComment } from '../types';

const STORAGE_KEY_FAVORITES_LIST = 'pano_favorites_list';
const STORAGE_KEY_FAVORITES_CACHE = 'pano_favorites_cache';
const STORAGE_KEY_SHARES_CACHE = 'pano_shares_cache';
const STORAGE_KEY_COMMENTS_PREFIX = 'pano_comments_';
const STORAGE_KEY_COMMENTER_NAME = 'pano_commenter_name';

/* ============================================================
 * SHARES TRACKING
 * ============================================================ */

export interface DetailedShareRecord {
  sid: string;
  key?: string;
  id: string;
  title?: string;
  url: string;
  params?: Record<string, any>;
  ip: string;
  city: string;
  country: string;
  region?: string;
  created_at: string;
  clicks: number;
  last_clicked_at: string | null;
  last_click_geo?: {
    ip?: string;
    city?: string;
    country?: string;
  };
}

export function getPanoramaSharesMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHARES_CACHE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getPanoramaShareCount(id: string): number {
  const map = getPanoramaSharesMap();
  return map[String(id)] || 0;
}

/**
 * Record a panorama share event (increments share count locally and in Cloudflare KV)
 */
export async function recordPanoramaShare(id: string): Promise<number> {
  if (typeof window === 'undefined') return 1;
  const strId = String(id);
  let newCount = 1;

  // 1. Update local storage cache immediately
  try {
    const map = getPanoramaSharesMap();
    newCount = (map[strId] || 0) + 1;
    map[strId] = newCount;
    localStorage.setItem(STORAGE_KEY_SHARES_CACHE, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('pano_shares_changed', { detail: { id: strId, shares: newCount } }));
  } catch (e) {
    console.warn('Failed to save share count in localStorage:', e);
  }

  // 2. Report to backend Cloudflare KV
  try {
    const res = await fetch(`/api/panoramas/share?id=${encodeURIComponent(strId)}`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.shares === 'number') {
        newCount = data.shares;
        const map = getPanoramaSharesMap();
        map[strId] = newCount;
        localStorage.setItem(STORAGE_KEY_SHARES_CACHE, JSON.stringify(map));
      }
    }
  } catch (e) {
    // Offline or local dev fallback
  }

  return newCount;
}

/**
 * Record a detailed share event with unique SID, short key, exact URL, and title/params (captures IP and Geo on Cloudflare D1/KV)
 */
export async function recordDetailedShare(
  id: string,
  sid: string,
  url: string,
  title?: string,
  key?: string,
  params?: Record<string, any>
): Promise<number> {
  if (typeof window === 'undefined') return 1;
  const strId = String(id);
  let newCount = 1;

  // Update local share cache
  try {
    const map = getPanoramaSharesMap();
    newCount = (map[strId] || 0) + 1;
    map[strId] = newCount;
    localStorage.setItem(STORAGE_KEY_SHARES_CACHE, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('pano_shares_changed', { detail: { id: strId, shares: newCount } }));
  } catch (_) {}

  // Post to Cloudflare endpoint
  try {
    const res = await fetch('/api/panoramas/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: strId, sid, url, title, key, params }),
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.shares === 'number') {
        newCount = data.shares;
        const map = getPanoramaSharesMap();
        map[strId] = newCount;
        localStorage.setItem(STORAGE_KEY_SHARES_CACHE, JSON.stringify(map));
      }
    }
  } catch (e) {
    console.warn('Failed to record detailed share:', e);
  }

  return newCount;
}

/**
 * Record a visit / click on a shared link via SID (debounced per session in sessionStorage to avoid KV writes)
 */
export async function recordShareClick(sid: string): Promise<void> {
  if (!sid || typeof window === 'undefined') return;
  const sessionKey = `counted_share_${sid}`;
  try {
    if (sessionStorage.getItem(sessionKey)) {
      return; // Already counted this session
    }
    sessionStorage.setItem(sessionKey, '1');
  } catch (_) {}

  try {
    await fetch('/api/panoramas/share/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sid }),
      keepalive: true,
    });
  } catch (err) {
    console.warn('Failed to record share click:', err);
  }
}

/**
 * Fetch all detailed share logs for Admin console
 */
export async function fetchDetailedShares(
  token?: string
): Promise<{ success: boolean; count: number; shares: DetailedShareRecord[]; error?: string }> {
  try {
    let authToken = token;
    if (!authToken && typeof window !== 'undefined') {
      try {
        const sessStr = localStorage.getItem('pano_admin_session') || sessionStorage.getItem('pano_admin_session');
        const sess = JSON.parse(sessStr || '{}');
        authToken = sess.token;
      } catch (_) {}
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      headers['x-admin-token'] = authToken;
    }

    const res = await fetch('/api/panoramas/shares-detailed', {
      headers,
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.shares)) {
        return { success: true, count: data.shares.length, shares: data.shares };
      }
    } else {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.error) errMsg = errJson.error;
      } catch (_) {}
      return { success: false, count: 0, shares: [], error: errMsg };
    }
  } catch (err: any) {
    console.warn('Failed to fetch detailed shares:', err);
    return { success: false, count: 0, shares: [], error: err?.message || 'Network error' };
  }
  return { success: false, count: 0, shares: [] };
}

/**
 * Delete a single detailed share log (Admin only)
 */
export async function deleteDetailedShare(sid: string, token?: string): Promise<boolean> {
  try {
    let authToken = token;
    if (!authToken && typeof window !== 'undefined') {
      try {
        const sessStr = localStorage.getItem('pano_admin_session') || sessionStorage.getItem('pano_admin_session');
        const sess = JSON.parse(sessStr || '{}');
        authToken = sess.token;
      } catch (_) {}
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      headers['x-admin-token'] = authToken;
    }

    const res = await fetch('/api/panoramas/shares-detailed', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'delete', sid, token: authToken }),
    });
    return res.ok;
  } catch (_) {
    return false;
  }
}

/**
 * Clear all detailed share logs (Admin only)
 */
export async function clearDetailedShares(token?: string): Promise<boolean> {
  try {
    let authToken = token;
    if (!authToken && typeof window !== 'undefined') {
      try {
        const sessStr = localStorage.getItem('pano_admin_session') || sessionStorage.getItem('pano_admin_session');
        const sess = JSON.parse(sessStr || '{}');
        authToken = sess.token;
      } catch (_) {}
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      headers['x-admin-token'] = authToken;
    }

    const res = await fetch('/api/panoramas/shares-detailed', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'clear', token: authToken }),
    });
    return res.ok;
  } catch (_) {
    return false;
  }
}

/* ============================================================
 * FAVORITES (BOOKMARKS)
 * ============================================================ */

export function getFavoritePanoIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAVORITES_LIST);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function isPanoramaFavorite(id: string): boolean {
  const list = getFavoritePanoIds();
  return list.includes(String(id));
}

export function getPanoramaFavoritesMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAVORITES_CACHE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getPanoramaFavoriteCount(id: string): number {
  const map = getPanoramaFavoritesMap();
  return map[String(id)] || 0;
}

/**
 * Toggle favorite state for current user and update global favorite count
 */
export async function togglePanoramaFavorite(id: string): Promise<{ isFavorite: boolean; count: number }> {
  if (typeof window === 'undefined') return { isFavorite: false, count: 0 };
  const strId = String(id);
  const currentList = getFavoritePanoIds();
  const currentlyFavorite = currentList.includes(strId);
  const nextFavorite = !currentlyFavorite;

  // 1. Update personal favorites list
  let nextList: string[];
  if (nextFavorite) {
    nextList = Array.from(new Set([...currentList, strId]));
  } else {
    nextList = currentList.filter((item) => item !== strId);
  }
  try {
    localStorage.setItem(STORAGE_KEY_FAVORITES_LIST, JSON.stringify(nextList));
  } catch (e) {
    console.warn('Failed to save favorites list:', e);
  }

  // 2. Update global favorites cache
  const map = getPanoramaFavoritesMap();
  let count = map[strId] || 0;
  count = nextFavorite ? count + 1 : Math.max(0, count - 1);
  map[strId] = count;
  try {
    localStorage.setItem(STORAGE_KEY_FAVORITES_CACHE, JSON.stringify(map));
  } catch {}

  // Dispatch event for instant UI reactive sync
  window.dispatchEvent(
    new CustomEvent('pano_favorites_changed', {
      detail: { id: strId, isFavorite: nextFavorite, favoritesCount: count, favoriteIds: nextList },
    })
  );

  // 3. Sync to Cloudflare KV backend
  try {
    const action = nextFavorite ? 'add' : 'remove';
    const res = await fetch(`/api/panoramas/favorite?id=${encodeURIComponent(strId)}&action=${action}`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.favorites === 'number') {
        count = data.favorites;
        map[strId] = count;
        localStorage.setItem(STORAGE_KEY_FAVORITES_CACHE, JSON.stringify(map));
      }
    }
  } catch (e) {
    // Offline or local dev fallback
  }

  return { isFavorite: nextFavorite, count };
}

/* ============================================================
 * COMMENTS MANAGEMENT
 * ============================================================ */

export function getStoredCommenterName(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(STORAGE_KEY_COMMENTER_NAME) || '';
  } catch {
    return '';
  }
}

export function setStoredCommenterName(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_COMMENTER_NAME, name);
  } catch {}
}

export function getLocalPanoComments(id: string): PanoramaComment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_COMMENTS_PREFIX}${id}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getPanoramaCommentsCount(id: string): number {
  return getLocalPanoComments(id).length;
}

/**
 * Fetch comments for a panorama from Cloudflare KV backend (or fallback to localStorage)
 */
export async function fetchPanoramaComments(id: string): Promise<PanoramaComment[]> {
  const strId = String(id);
  const localComments = getLocalPanoComments(strId);

  try {
    const res = await fetch(`/api/panoramas/comments?id=${encodeURIComponent(strId)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.comments)) {
        // Merge with local if any were added offline
        const mergedMap = new Map<string, PanoramaComment>();
        data.comments.forEach((c: PanoramaComment) => mergedMap.set(c.id, c));
        localComments.forEach((c: PanoramaComment) => {
          if (!mergedMap.has(c.id)) mergedMap.set(c.id, c);
        });
        const combined = Array.from(mergedMap.values());
        combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        try {
          localStorage.setItem(`${STORAGE_KEY_COMMENTS_PREFIX}${strId}`, JSON.stringify(combined));
        } catch {}
        return combined;
      }
    }
  } catch (e) {
    // Offline fallback
  }

  return localComments;
}

/**
 * Post a new comment for a panorama
 */
export async function postPanoramaComment(
  id: string,
  text: string,
  author?: string,
  isAdmin?: boolean
): Promise<{ success: boolean; comment?: PanoramaComment; comments?: PanoramaComment[]; error?: string }> {
  const strId = String(id);
  const cleanText = (text || '').trim();
  if (!cleanText) {
    return { success: false, error: 'Text komentára nemôže byť prázdny.' };
  }

  const cleanAuthor = (author || '').trim() || (isAdmin ? 'Admin' : 'Návštevník');
  setStoredCommenterName(cleanAuthor);

  const newComment: PanoramaComment = {
    id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    pano_id: strId,
    author: cleanAuthor,
    text: cleanText.slice(0, 1000),
    created_at: new Date().toISOString(),
    is_admin: Boolean(isAdmin),
  };

  // 1. Immediately store in localStorage
  let currentList = getLocalPanoComments(strId);
  currentList.unshift(newComment);
  if (currentList.length > 200) currentList = currentList.slice(0, 200);

  try {
    localStorage.setItem(`${STORAGE_KEY_COMMENTS_PREFIX}${strId}`, JSON.stringify(currentList));
    window.dispatchEvent(
      new CustomEvent('pano_comment_added', {
        detail: { id: strId, comment: newComment, count: currentList.length },
      })
    );
  } catch (e) {
    console.warn('Failed to store comment locally:', e);
  }

  // 2. Submit to Cloudflare KV backend
  try {
    const res = await fetch(`/api/panoramas/comment?id=${encodeURIComponent(strId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: newComment.text,
        author: newComment.author,
        is_admin: newComment.is_admin,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.comments)) {
        currentList = data.comments;
        localStorage.setItem(`${STORAGE_KEY_COMMENTS_PREFIX}${strId}`, JSON.stringify(currentList));
      }
    }
  } catch (e) {
    // Offline local storage is sufficient fallback
  }

  return { success: true, comment: newComment, comments: currentList };
}

/**
 * Delete a comment (for administrator)
 */
export async function deletePanoramaComment(
  id: string,
  commentId: string,
  adminToken?: string
): Promise<{ success: boolean; comments?: PanoramaComment[]; error?: string }> {
  const strId = String(id);
  let currentList = getLocalPanoComments(strId).filter((c) => c.id !== commentId);

  try {
    localStorage.setItem(`${STORAGE_KEY_COMMENTS_PREFIX}${strId}`, JSON.stringify(currentList));
    window.dispatchEvent(
      new CustomEvent('pano_comment_deleted', {
        detail: { id: strId, commentId, count: currentList.length },
      })
    );
  } catch (e) {
    console.warn('Failed to delete comment locally:', e);
  }

  // Sync with Cloudflare KV
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }
    const res = await fetch(`/api/panoramas/comment?id=${encodeURIComponent(strId)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'delete', comment_id: commentId, token: adminToken }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.comments)) {
        currentList = data.comments;
        localStorage.setItem(`${STORAGE_KEY_COMMENTS_PREFIX}${strId}`, JSON.stringify(currentList));
      }
    } else {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || 'Chyba pri mazaní komentára' };
    }
  } catch (e) {
    // Offline fallback
  }

  return { success: true, comments: currentList };
}

/**
 * Fetch all panorama comments across the entire site (for Admin console)
 */
export async function fetchAllPanoramaComments(): Promise<PanoramaComment[]> {
  try {
    const res = await fetch('/api/panoramas/comments?all=true');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.comments)) {
        return data.comments;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch all comments from API:', e);
  }

  // Fallback: scan localStorage for pano_comments_* keys
  const collected: PanoramaComment[] = [];
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_COMMENTS_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              collected.push(...parsed);
            }
          }
        }
      }
    } catch (_) {}
  }

  collected.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return collected;
}

