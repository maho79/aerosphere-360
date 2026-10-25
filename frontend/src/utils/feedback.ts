export interface FeedbackItem {
  id: string;
  subject: string;
  email?: string;
  message: string;
  url?: string;
  timestamp: string;
  read: boolean;
  user_agent?: string;
}

const STORAGE_KEY_FEEDBACKS_CACHE = 'pano_feedbacks_cache';

export function getLocalFeedbacks(): FeedbackItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FEEDBACKS_CACHE);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalFeedbacks(feedbacks: FeedbackItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_FEEDBACKS_CACHE, JSON.stringify(feedbacks.slice(0, 300)));
  } catch {}
}

/**
 * Submit visitor feedback to Cloudflare /api/feedback (which saves feedback in storage and notifies admin)
 */
export async function submitFeedback(payload: {
  subject: string;
  email?: string;
  message: string;
  url?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const cleanSubject = (payload.subject || '').trim() || window.location.href;
  const cleanEmail = (payload.email || '').trim();
  const cleanMessage = (payload.message || '').trim();
  const cleanUrl = payload.url || window.location.href;

  if (!cleanMessage) {
    return { success: false, error: 'Správa nemôže byť prázdna.' };
  }

  const localItem: FeedbackItem = {
    id: 'fb-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    subject: cleanSubject,
    email: cleanEmail || 'Anonym',
    message: cleanMessage,
    url: cleanUrl,
    timestamp: new Date().toISOString(),
    read: false,
  };

  // Cache locally
  const current = getLocalFeedbacks();
  current.unshift(localItem);
  saveLocalFeedbacks(current);
  window.dispatchEvent(new CustomEvent('pano_feedback_submitted', { detail: localItem }));

  // Post to Cloudflare endpoint with resilient fallback
  const candidateEndpoints = ['/api/feedback', '/panoramas/api/feedback'];
  for (const ep of candidateEndpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: cleanSubject,
          email: cleanEmail,
          message: cleanMessage,
          url: cleanUrl,
          user_agent: navigator.userAgent || '',
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: true, id: data.id || localItem.id };
      }
    } catch {
      // try next candidate
    }
  }

  // Stored in localStorage as fallback
  return { success: true, id: localItem.id };
}

/**
 * Fetch feedbacks for Admin console
 */
export async function fetchFeedbacks(): Promise<{ unreadCount: number; feedbacks: FeedbackItem[] }> {
  try {
    const res = await fetch('/api/feedback');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.feedbacks)) {
        saveLocalFeedbacks(data.feedbacks);
        return {
          unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : data.feedbacks.filter((f: any) => !f.read).length,
          feedbacks: data.feedbacks,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to fetch feedbacks from API:', e);
  }

  const local = getLocalFeedbacks();
  return {
    unreadCount: local.filter((f) => !f.read).length,
    feedbacks: local,
  };
}

/**
 * Mark a feedback as read
 */
export async function markFeedbackRead(id: string): Promise<void> {
  const local = getLocalFeedbacks().map((f) => (f.id === id ? { ...f, read: true } : f));
  saveLocalFeedbacks(local);
  window.dispatchEvent(new CustomEvent('pano_feedbacks_changed'));

  try {
    await fetch(`/api/feedback?action=mark-read&id=${encodeURIComponent(id)}`);
  } catch (_) {}
}

/**
 * Delete a feedback message
 */
export async function deleteFeedbackItem(id: string): Promise<void> {
  const local = getLocalFeedbacks().filter((f) => f.id !== id);
  saveLocalFeedbacks(local);
  window.dispatchEvent(new CustomEvent('pano_feedbacks_changed'));

  try {
    await fetch(`/api/feedback?action=delete&id=${encodeURIComponent(id)}`);
  } catch (_) {}
}
