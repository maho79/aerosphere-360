import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Panorama, PanoramaComment } from '../types';
import { useAdmin } from '../context/AdminContext';
import { cleanPanoPath, getResolutionCategory, getHorizontalK, getMegapixels } from '../types';
import {
  X,
  Download,
  BarChart3,
  Eye,
  Flame,
  Search,
  Globe2,
  Lock,
  Trash2,
  ExternalLink,
  ShieldCheck,
  MessageSquare,
  Mail,
  CheckCircle2,
  Clock,
  User,
  RefreshCw,
  Inbox,
  Send,
  Calendar,
  FileCode2,
  Share2,
  Copy,
  Check,
  MousePointerClick,
  AlertTriangle,
  Database,
} from 'lucide-react';
import {
  fetchAllPanoramaComments,
  deletePanoramaComment,
  fetchDetailedShares,
  deleteDetailedShare,
  clearDetailedShares,
  type DetailedShareRecord,
} from '../utils/social';
import { copyToClipboard } from '../utils/share';
import { fetchFeedbacks, markFeedbackRead, deleteFeedbackItem, type FeedbackItem } from '../utils/feedback';
import { AdminTechSpec } from './AdminTechSpec';

interface ServiceMenuProps {
  panoramas: Panorama[];
  onSelectPanorama?: (pano: Panorama) => void;
  onRefresh?: () => void;
}

export const ServiceMenu: React.FC<ServiceMenuProps> = ({
  panoramas,
  onSelectPanorama,
  onRefresh,
}) => {
  const {
    showServiceModal,
    setShowServiceModal,
    adminUser,
    togglePanoramaPublic,
    logout,
  } = useAdmin();

  // Top-level Navigation Mode: 'panoramas' | 'shares' | 'comments' | 'feedbacks' | 'techspec' | 'googleearth'
  const [activeTab, setActiveTab] = useState<'panoramas' | 'shares' | 'comments' | 'feedbacks' | 'techspec' | 'googleearth'>('panoramas');
  const [copiedKml, setCopiedKml] = useState(false);

  // Panoramas table states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'public' | 'private' | 'deleted'>('all');
  const [sortBy, setSortBy] = useState<'views' | 'shares' | 'date' | 'name'>('views');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Shares tracking state
  const [sharesList, setSharesList] = useState<DetailedShareRecord[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [sharesError, setSharesError] = useState<string | null>(null);
  const [sharesSearch, setSharesSearch] = useState('');
  const [sharesSortBy, setSharesSortBy] = useState<'date' | 'clicks'>('date');
  const [copiedSid, setCopiedSid] = useState<string | null>(null);

  // Comments state
  const [allComments, setAllComments] = useState<PanoramaComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSearch, setCommentSearch] = useState('');

  // Feedbacks state
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState<number>(0);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [feedbackSearch, setFeedbackSearch] = useState('');

  // Load shares data from Cloudflare KV
  const loadSharesData = async () => {
    setSharesLoading(true);
    setSharesError(null);
    try {
      const res = await fetchDetailedShares(adminUser?.token);
      if (res.success && Array.isArray(res.shares)) {
        setSharesList(res.shares);
      } else if (!res.success) {
        setSharesError(res.error || 'Nepodarilo sa overiť administrátorský prístup k zdieľaniam.');
      }
    } catch (e: any) {
      console.warn('Failed to load shares data:', e);
      setSharesError(e?.message || 'Chyba siete');
    } finally {
      setSharesLoading(false);
    }
  };

  // Load comments and feedbacks when modal opens
  const loadCommentsData = async () => {
    setCommentsLoading(true);
    try {
      const data = await fetchAllPanoramaComments();
      setAllComments(data);
    } catch (e) {
      console.warn('Failed to load comments:', e);
    } finally {
      setCommentsLoading(false);
    }
  };

  const loadFeedbacksData = async () => {
    setFeedbacksLoading(true);
    try {
      const data = await fetchFeedbacks();
      setFeedbacks(data.feedbacks);
      setUnreadFeedbackCount(data.unreadCount);
    } catch (e) {
      console.warn('Failed to load feedbacks:', e);
    } finally {
      setFeedbacksLoading(false);
    }
  };

  useEffect(() => {
    if (showServiceModal) {
      loadCommentsData();
      loadFeedbacksData();
      loadSharesData();
    }
  }, [showServiceModal, adminUser?.token]);

  // Periodic poll for feedbacks count
  useEffect(() => {
    const handleFeedbackSubmitted = () => {
      loadFeedbacksData();
    };
    window.addEventListener('pano_feedback_submitted', handleFeedbackSubmitted);
    window.addEventListener('pano_feedbacks_changed', loadFeedbacksData);
    return () => {
      window.removeEventListener('pano_feedback_submitted', handleFeedbackSubmitted);
      window.removeEventListener('pano_feedbacks_changed', loadFeedbacksData);
    };
  }, []);

  // Quick lookup map for panoramas by id
  const panoMap = useMemo(() => {
    const map = new Map<string, Panorama>();
    panoramas.forEach((p) => map.set(String(p.id), p));
    return map;
  }, [panoramas]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalViews = 0;
    let totalShares = 0;
    let publicCount = 0;
    let privateCount = 0;
    let deletedCount = 0;

    panoramas.forEach((p) => {
      const views = p.views || 0;
      const shares = p.shares || 0;
      totalViews += views;
      totalShares += shares;
      if (p.is_deleted || p.folder === '!DELETED!') {
        deletedCount++;
      } else if (p.is_private) {
        privateCount++;
      } else {
        publicCount++;
      }
    });

    return {
      total: panoramas.length,
      totalViews,
      totalShares,
      publicCount,
      privateCount,
      deletedCount,
    };
  }, [panoramas]);

  // Filter and sort panoramas
  const filteredPanoramas = useMemo(() => {
    let list = [...panoramas];

    if (statusFilter === 'public') {
      list = list.filter((p) => !p.is_deleted && p.folder !== '!DELETED!' && !p.is_private);
    } else if (statusFilter === 'private') {
      list = list.filter((p) => !p.is_deleted && p.folder !== '!DELETED!' && p.is_private);
    } else if (statusFilter === 'deleted') {
      list = list.filter((p) => p.is_deleted || p.folder === '!DELETED!');
    }

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter((p) => {
        const name = (p.original_filename || p.filename || '').toLowerCase();
        const city = (p.city || '').toLowerCase();
        const country = (p.country || '').toLowerCase();
        const folder = (p.folder || '').toLowerCase();
        const origPath = (p.original_filepath || '').toLowerCase();
        return (
          name.includes(q) ||
          city.includes(q) ||
          country.includes(q) ||
          folder.includes(q) ||
          origPath.includes(q)
        );
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'views') {
        const vA = a.views || 0;
        const vB = b.views || 0;
        if (vB !== vA) return vB - vA;
        return (b.date || '').localeCompare(a.date || '');
      }
      if (sortBy === 'shares') {
        const sA = a.shares || 0;
        const sB = b.shares || 0;
        if (sB !== sA) return sB - sA;
        return (b.date || '').localeCompare(a.date || '');
      }
      if (sortBy === 'date') {
        return (b.date || '').localeCompare(a.date || '');
      }
      const nA = a.original_filename || a.filename || '';
      const nB = b.original_filename || b.filename || '';
      return nA.localeCompare(nB);
    });

    return list;
  }, [panoramas, statusFilter, searchQuery, sortBy]);

  // Filtered comments
  const filteredComments = useMemo(() => {
    let list = [...allComments];
    const q = commentSearch.toLowerCase().trim();
    if (q) {
      list = list.filter((c) => {
        const author = (c.author || '').toLowerCase();
        const text = (c.text || '').toLowerCase();
        const pano = panoMap.get(String(c.pano_id));
        const city = (pano?.city || '').toLowerCase();
        return author.includes(q) || text.includes(q) || city.includes(q) || c.pano_id.includes(q);
      });
    }
    return list;
  }, [allComments, commentSearch, panoMap]);

  // Filtered feedbacks
  const filteredFeedbacks = useMemo(() => {
    let list = [...feedbacks];
    const q = feedbackSearch.toLowerCase().trim();
    if (q) {
      list = list.filter((f) => {
        const sub = (f.subject || '').toLowerCase();
        const email = (f.email || '').toLowerCase();
        const msg = (f.message || '').toLowerCase();
        return sub.includes(q) || email.includes(q) || msg.includes(q);
      });
    }
    return list;
  }, [feedbacks, feedbackSearch]);

  const handleExportJson = () => {
    const exportData = panoramas.map((p) => {
      let status: 'public' | 'private' | 'deleted' = 'public';
      if (p.is_deleted) status = 'deleted';
      else if (p.is_private) status = 'private';

      return {
        id: p.id,
        name: p.original_filename || p.filename,
        views: p.views || 0,
        shares: p.shares || 0,
        favorites: p.favorites || 0,
        comments_count: p.comments_count || 0,
        original_directory: p.original_filepath || p.folder || '',
        status,
        is_private: Boolean(p.is_private),
        is_deleted: Boolean(p.is_deleted),
        date: p.date,
        city: p.city,
        country: p.country,
        width: p.width,
        height: p.height,
        environment: p.environment || 'outdoor',
      };
    });

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `panoramas_state_${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [isDumpingSql, setIsDumpingSql] = useState(false);

  const handleDumpSql = async () => {
    setIsDumpingSql(true);
    try {
      let authToken = '';
      try {
        const sessStr = localStorage.getItem('pano_admin_session') || sessionStorage.getItem('pano_admin_session');
        const sess = JSON.parse(sessStr || '{}');
        authToken = sess.token;
      } catch (_) {}

      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        headers['x-admin-token'] = authToken;
      }

      const res = await fetch('/api/panoramas/db-dump', { headers });
      if (!res.ok) {
        throw new Error(`Dump request failed: HTTP ${res.status}`);
      }
      const sqlText = await res.text();
      const blob = new Blob([sqlText], { type: 'application/sql; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `aerosphere_db_dump_${today}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('SQL dump error:', err);
      alert('Chyba pri sťahovaní SQL dumpu databázy: ' + (err?.message || 'Neznáma chyba'));
    } finally {
      setIsDumpingSql(false);
    }
  };

  const handleToggle = async (p: Panorama) => {
    setActionInProgress(p.id);
    try {
      await togglePanoramaPublic(p.id, Boolean(p.is_private));
      onRefresh?.();
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteComment = async (c: PanoramaComment) => {
    if (!window.confirm(`Naozaj vymazať komentár od "${c.author}"?`)) return;
    try {
      await deletePanoramaComment(c.pano_id, c.id);
      setAllComments((prev) => prev.filter((item) => item.id !== c.id));
    } catch (e) {
      console.warn('Failed to delete comment:', e);
    }
  };

  const handleMarkFeedbackRead = async (id: string) => {
    await markFeedbackRead(id);
    setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, read: true } : f)));
    setUnreadFeedbackCount((prev) => Math.max(0, prev - 1));
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm('Naozaj vymazať túto správu?')) return;
    await deleteFeedbackItem(id);
    setFeedbacks((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDeleteShare = async (sid: string) => {
    if (!window.confirm('Naozaj vymazať tento záznam o zdieľaní?')) return;
    try {
      await deleteDetailedShare(sid, adminUser?.token);
      setSharesList((prev) => prev.filter((s) => s.sid !== sid));
    } catch (e) {
      console.warn('Failed to delete share:', e);
    }
  };

  const handleClearShares = async () => {
    if (!window.confirm('Naozaj vymazať celú históriu zaznamenaných zdieľaní z KV?')) return;
    try {
      await clearDetailedShares(adminUser?.token);
      setSharesList([]);
    } catch (e) {
      console.warn('Failed to clear shares:', e);
    }
  };

  const handleCopyShareLink = async (sid: string, url: string) => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedSid(sid);
      setTimeout(() => setCopiedSid(null), 2000);
    }
  };

  const getCountryFlag = (countryCode?: string): string => {
    if (!countryCode || countryCode === 'Unknown' || countryCode.length !== 2) return '🌐';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  // Filtered and sorted shares
  const filteredShares = useMemo(() => {
    let list = [...sharesList];
    if (sharesSearch.trim()) {
      const q = sharesSearch.toLowerCase().trim();
      list = list.filter((s) => {
        return (
          (s.title && s.title.toLowerCase().includes(q)) ||
          (s.city && s.city.toLowerCase().includes(q)) ||
          (s.country && s.country.toLowerCase().includes(q)) ||
          (s.ip && s.ip.toLowerCase().includes(q)) ||
          (s.url && s.url.toLowerCase().includes(q)) ||
          (s.id && String(s.id).includes(q)) ||
          (s.sid && s.sid.toLowerCase().includes(q))
        );
      });
    }
    if (sharesSortBy === 'clicks') {
      list.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    } else {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [sharesList, sharesSearch, sharesSortBy]);

  const totalClicks = useMemo(() => {
    return sharesList.reduce((acc, s) => acc + (s.clicks || 0), 0);
  }, [sharesList]);

  const [mountNode, setMountNode] = useState<Element | null>(() => {
    if (typeof document === 'undefined') return null;
    return document.fullscreenElement || document.body;
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const updateMountNode = () => {
      const fsEl = document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;
      setMountNode(fsEl || document.body);
    };

    updateMountNode();
    document.addEventListener('fullscreenchange', updateMountNode);
    document.addEventListener('webkitfullscreenchange', updateMountNode);
    return () => {
      document.removeEventListener('fullscreenchange', updateMountNode);
      document.removeEventListener('webkitfullscreenchange', updateMountNode);
    };
  }, [showServiceModal]);

  if (!showServiceModal || !mountNode) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-lg animate-fade-in pointer-events-auto"
      onClick={() => setShowServiceModal(false)}
    >
      <div
        className="w-[98vw] max-w-[1760px] h-[95vh] max-h-[95vh] glass-panel-elevated rounded-3xl border border-white/20 shadow-2xl flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 p-0.5 shadow-lg shadow-rose-950/60">
              <div className="w-full h-full bg-[#090a0f] rounded-[14px] flex items-center justify-center text-rose-400">
                <BarChart3 className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Service Menu & Analytics Console
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Authorized Administrator:</span>
                <span className="font-semibold text-zinc-200">
                  {adminUser?.initials || 'M.T.'}
                </span>
                <span className="text-zinc-500">• Cloudflare KV Connected</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* SQL Dump Button */}
            <button
              onClick={handleDumpSql}
              disabled={isDumpingSql}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold transition-all shadow-lg shadow-purple-950/50 group cursor-pointer disabled:opacity-50"
              title="Dump complete Cloudflare D1 SQL database (tables + data)"
            >
              <Database className={`w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform ${isDumpingSql ? 'animate-spin' : ''}`} />
              <span>{isDumpingSql ? 'Sťahujem SQL...' : 'Stiahnuť SQL Dump (D1)'}</span>
            </button>

            {/* Special Export Button */}
            <button
              onClick={handleExportJson}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-bold transition-all shadow-lg shadow-cyan-950/50 group cursor-pointer"
              title="Export complete state of all panoramas as JSON"
            >
              <Download className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Export State JSON</span>
            </button>

            <button
              onClick={() => setShowServiceModal(false)}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Console Main Tabs */}
        <div className="px-6 py-2.5 border-b border-white/10 bg-zinc-950/60 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('panoramas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'panoramas'
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400 shadow-md shadow-cyan-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>Panorámy & Správa ({panoramas.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('comments');
              loadCommentsData();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'comments'
                ? 'bg-amber-500/25 text-amber-200 border border-amber-400 shadow-md shadow-amber-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <span>Všetky komentáre ({allComments.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('feedbacks');
              loadFeedbacksData();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer relative ${
              activeTab === 'feedbacks'
                ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400 shadow-md shadow-emerald-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Mail className="w-4 h-4 text-emerald-400" />
            <span>Feedback / Maily ({feedbacks.length})</span>
            {unreadFeedbackCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                {unreadFeedbackCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('shares');
              loadSharesData();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer relative ${
              activeTab === 'shares'
                ? 'bg-purple-500/25 text-purple-200 border border-purple-400 shadow-md shadow-purple-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Share2 className="w-4 h-4 text-purple-400" />
            <span>Zdieľané odkazy ({sharesList.length})</span>
            {totalClicks > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-purple-500/40 text-purple-200 text-[10px] font-black">
                {totalClicks} {totalClicks === 1 ? 'klik' : totalClicks < 5 ? 'kliky' : 'klikov'}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('googleearth')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'googleearth'
                ? 'bg-amber-500/25 text-amber-200 border border-amber-400 shadow-md shadow-amber-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Globe2 className="w-4 h-4 text-amber-400" />
            <span>Google Earth (KML)</span>
          </button>

          <button
            onClick={() => setActiveTab('techspec')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'techspec'
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400 shadow-md shadow-cyan-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <FileCode2 className="w-4 h-4 text-cyan-400" />
            <span>Tech Spec & Changelog</span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: PANORAMAS & SPRÁVA
           ========================================================================= */}
        {activeTab === 'panoramas' && (
          <>
            {/* Stats Summary Cards */}
            <div className="p-6 pb-4 grid grid-cols-2 sm:grid-cols-5 gap-3 border-b border-white/5 bg-zinc-950/20">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Total Panoramas
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-white">{stats.total}</span>
                  <span className="text-xs text-zinc-500">items</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>Total Views</span>
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-amber-300">{stats.totalViews}</span>
                  <span className="text-xs text-amber-500/80">views</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Globe2 className="w-3 h-3 text-emerald-400" />
                  <span>Public (Online)</span>
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-emerald-300">{stats.publicCount}</span>
                  <span className="text-xs text-emerald-500/80">live</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                <span className="text-[10px] font-semibold text-rose-300 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-rose-400" />
                  <span>Private (Locked)</span>
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-rose-300">{stats.privateCount}</span>
                  <span className="text-xs text-rose-500/80">vault</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-800/40 border border-zinc-700/50">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Trash2 className="w-3 h-3 text-zinc-400" />
                  <span>Deleted Status</span>
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-zinc-300">{stats.deletedCount}</span>
                  <span className="text-xs text-zinc-500">hidden</span>
                </div>
              </div>
            </div>

            {/* Controls Toolbar */}
            <div className="px-6 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-zinc-950/30">
              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/50 shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All ({panoramas.length})
                </button>
                <button
                  onClick={() => setStatusFilter('public')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    statusFilter === 'public'
                      ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/50 shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Public ({stats.publicCount})
                </button>
                <button
                  onClick={() => setStatusFilter('private')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    statusFilter === 'private'
                      ? 'bg-rose-500/30 text-rose-200 border border-rose-500/50 shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Private ({stats.privateCount})
                </button>
                <button
                  onClick={() => setStatusFilter('deleted')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    statusFilter === 'deleted'
                      ? 'bg-zinc-700/50 text-zinc-200 border border-zinc-600 shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Deleted ({stats.deletedCount})
                </button>
              </div>

              {/* Search & Sort */}
              <div className="flex items-center gap-2.5 flex-1 max-w-md ml-auto">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, directory, city..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400 font-semibold cursor-pointer"
                >
                  <option value="views">Sort by Popularity (Views)</option>
                  <option value="shares">Sort by Shares (Zdieľania)</option>
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                </select>
              </div>
            </div>

            {/* Panoramas Leaderboard Table */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {filteredPanoramas.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 text-xs">
                  No panoramas match your search or filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-zinc-400 bg-white/5">
                        <th className="py-3 px-3 w-12 text-center">Rank</th>
                        <th className="py-3 px-3 w-20">Preview</th>
                        <th className="py-3 px-4">Name & Location</th>
                        <th className="py-3 px-4">Original Directory</th>
                        <th className="py-3 px-3 text-center">Views</th>
                        <th className="py-3 px-3 text-center">Shares</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredPanoramas.slice(0, 150).map((p, idx) => {
                        const isPrivate = Boolean(p.is_private);
                        const isDeleted = Boolean(p.is_deleted);
                        const views = p.views || 0;

                        return (
                          <tr
                            key={p.id}
                            className="hover:bg-white/[0.04] transition-colors group"
                          >
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-zinc-400 group-hover:text-cyan-300">
                              {idx === 0 && views > 0 ? (
                                <span className="text-amber-400 flex items-center justify-center gap-0.5">
                                  <Flame className="w-3 h-3 fill-amber-400" /> #1
                                </span>
                              ) : (
                                `#${idx + 1}`
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              <div
                                onClick={() => {
                                  onSelectPanorama?.(p);
                                  setShowServiceModal(false);
                                }}
                                className="w-16 h-10 rounded-lg overflow-hidden bg-zinc-900 border border-white/10 cursor-pointer relative group/thumb"
                                title="Click to view panorama"
                              >
                                <img
                                  src={`/thumbnails/${cleanPanoPath(p.filename)}`}
                                  alt=""
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.src = `/panoramas_web/${cleanPanoPath(p.filename)}`;
                                  }}
                                  className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                                />
                                <div className="absolute inset-0 bg-cyan-500/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                                  <ExternalLink className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 max-w-xs truncate">
                              <div className="font-bold text-white truncate">
                                {p.city !== 'Unknown' ? p.city : (p.original_filename || p.filename)}
                              </div>
                              <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-cyan-300 font-semibold">{getHorizontalK(p.width)} • {getMegapixels(p.width, p.height)}</span>
                                <span>•</span>
                                <span>{p.country !== 'Unknown' ? p.country : p.folder || 'Archive'}</span>
                                <span>•</span>
                                <span>{p.date ? p.date.split('T')[0] : 'N/A'}</span>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 max-w-sm truncate font-mono text-[11px] text-zinc-400" title={p.original_filepath || p.folder || ''}>
                              {p.original_filepath || p.folder || 'Root'}
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                                  views > 0
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-zinc-800 text-zinc-500'
                                }`}
                              >
                                <Eye className="w-3 h-3" />
                                <span>{views}</span>
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                                  (p.shares || 0) > 0
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                    : 'bg-zinc-800 text-zinc-500'
                                }`}
                                title={`Zdieľané ${p.shares || 0}x`}
                              >
                                <Share2 className="w-3 h-3" />
                                <span>{p.shares || 0}</span>
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              {isDeleted ? (
                                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-bold border border-zinc-700">
                                  DELETED
                                </span>
                              ) : isPrivate ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/40 flex items-center justify-center gap-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>PRIVATE</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 flex items-center justify-center gap-1">
                                  <Globe2 className="w-2.5 h-2.5" />
                                  <span>PUBLIC</span>
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleToggle(p)}
                                  disabled={actionInProgress === p.id}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                    isPrivate
                                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                                      : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40'
                                  }`}
                                  title={isPrivate ? 'Make Public (Online for everyone)' : 'Make Private (Locked)'}
                                >
                                  {isPrivate ? (
                                    <>
                                      <Globe2 className="w-3 h-3" />
                                      <span>Make Public</span>
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-3 h-3" />
                                      <span>Make Private</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => {
                                    onSelectPanorama?.(p);
                                    setShowServiceModal(false);
                                  }}
                                  className="p-1 rounded-lg glass-button text-zinc-300 hover:text-cyan-300 cursor-pointer"
                                  title="Open in 360° Viewer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {filteredPanoramas.length > 150 && (
                    <div className="text-center py-4 text-zinc-500 text-xs border-t border-white/5 mt-2">
                      Showing top 150 of {filteredPanoramas.length} panoramas. Use search to find specific ones, or export JSON for the complete database.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* =========================================================================
            TAB 2: VŠETKY KOMENTÁRE (COMMENTS)
           ========================================================================= */}
        {activeTab === 'comments' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar for Comments */}
            <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between gap-3 bg-zinc-950/30">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={commentSearch}
                  onChange={(e) => setCommentSearch(e.target.value)}
                  placeholder="Hľadať v komentároch podľa autora, textu, mesta..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadCommentsData}
                  disabled={commentsLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-button text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${commentsLoading ? 'animate-spin' : ''}`} />
                  <span>Obnoviť</span>
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-3">
              {commentsLoading ? (
                <div className="py-16 text-center text-xs text-zinc-400">Načítavam komentáre...</div>
              ) : filteredComments.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                  <MessageSquare className="w-8 h-8 opacity-40 text-amber-400" />
                  <span>Žiadne komentáre neboli nájdené.</span>
                </div>
              ) : (
                filteredComments.map((c) => {
                  const pano = panoMap.get(String(c.pano_id));
                  return (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-amber-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white text-xs flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-amber-400" />
                            {c.author}
                          </span>
                          {c.is_admin && (
                            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[9px] font-bold border border-rose-500/40">
                              ADMIN
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-500">
                            {new Date(c.created_at).toLocaleString('sk-SK')}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                          {c.text}
                        </p>

                        {/* Associated panorama info */}
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-400">
                          <span className="text-zinc-500">Panoráma:</span>
                          <span className="font-semibold text-cyan-300">
                            {pano ? pano.city || pano.original_filename : `#${c.pano_id}`}
                          </span>
                          {pano && (
                            <span className="text-zinc-500 font-mono text-[10px]">
                              ({getHorizontalK(pano.width)})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {pano && (
                          <button
                            onClick={() => {
                              onSelectPanorama?.(pano);
                              setShowServiceModal(false);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-button text-xs font-semibold text-cyan-300 hover:text-white cursor-pointer"
                            title="Otvoriť panorámu"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Zobraziť</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteComment(c)}
                          className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-white border border-rose-500/30 transition-all cursor-pointer"
                          title="Vymazať komentár"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: FEEDBACK / MAILY (VISITOR INBOX)
           ========================================================================= */}
        {activeTab === 'feedbacks' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar for Feedbacks */}
            <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between gap-3 bg-zinc-950/30">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={feedbackSearch}
                  onChange={(e) => setFeedbackSearch(e.target.value)}
                  placeholder="Hľadať v správach podľa predmetu, emailu, textu..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadFeedbacksData}
                  disabled={feedbacksLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-button text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${feedbacksLoading ? 'animate-spin' : ''}`} />
                  <span>Obnoviť</span>
                </button>
              </div>
            </div>

            {/* Feedbacks Inbox List */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-3">
              {feedbacksLoading ? (
                <div className="py-16 text-center text-xs text-zinc-400">Načítavam feedbacky...</div>
              ) : filteredFeedbacks.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                  <Inbox className="w-8 h-8 opacity-40 text-emerald-400" />
                  <span>Žiadne feedbacky zatiaľ neprišli.</span>
                </div>
              ) : (
                filteredFeedbacks.map((fb) => (
                  <div
                    key={fb.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                      !fb.read
                        ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/30'
                        : 'bg-white/[0.03] border-white/10 opacity-90'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!fb.read ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-zinc-950 font-black text-[9px] uppercase tracking-wide">
                            NOVÝ MAIL
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-bold text-[9px] uppercase">
                            PREČÍTANÉ
                          </span>
                        )}

                        <span className="text-xs font-bold text-white tracking-wide">
                          {fb.subject}
                        </span>

                        <span className="text-[10px] text-zinc-500">
                          {new Date(fb.timestamp).toLocaleString('sk-SK')}
                        </span>
                      </div>

                      {/* Header controls: Mark Read & Delete */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!fb.read && (
                          <button
                            onClick={() => handleMarkFeedbackRead(fb.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold cursor-pointer"
                            title="Označiť ako prečítané"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Prečítané</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteFeedback(fb.id)}
                          className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-white border border-rose-500/30 transition-all cursor-pointer"
                          title="Vymazať správu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Sender Email & URL */}
                    <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-500 text-[11px]">Od:</span>
                        {fb.email && fb.email !== 'Anonym' && fb.email.includes('@') ? (
                          <a
                            href={`mailto:${fb.email}`}
                            className="text-cyan-300 hover:underline font-medium"
                          >
                            {fb.email}
                          </a>
                        ) : (
                          <span className="text-zinc-400">{fb.email || 'Anonym'}</span>
                        )}
                      </div>

                      {fb.url && (
                        <div className="flex items-center gap-1.5 max-w-md truncate">
                          <span className="text-zinc-500 text-[11px]">Link:</span>
                          <a
                            href={fb.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline truncate font-mono text-[11px]"
                          >
                            {fb.url}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Message Body */}
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                      {fb.message}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB: ZDIEĽANÉ ODKAZY & METRIKY (KV)
           ========================================================================= */}
        {activeTab === 'shares' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Quick Stats Banner */}
            <div className="p-4 sm:p-5 border-b border-white/10 bg-zinc-950/40 grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block mb-0.5">
                  Počítadlo zdieľaní
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-amber-200">{stats.totalShares}</span>
                  <span className="text-xs text-amber-500/80">v databáze</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block mb-0.5">
                  História odkazov
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-white">{sharesList.length}</span>
                  <span className="text-xs text-zinc-500">v KV logu</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block mb-0.5">
                  Celkovo preklikov
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-cyan-200">{totalClicks}</span>
                  <span className="text-xs text-cyan-500/80">otvorení</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block mb-0.5">
                  Úspešné s preklikom
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-emerald-200">
                    {sharesList.filter((s) => (s.clicks || 0) > 0).length}
                  </span>
                  <span className="text-xs text-emerald-500/80">odkazov</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-800/40 border border-white/10">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                  Priemer na odkaz
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-white">
                    {sharesList.length > 0 ? (totalClicks / sharesList.length).toFixed(1) : '0'}
                  </span>
                  <span className="text-xs text-zinc-500">klikov / link</span>
                </div>
              </div>
            </div>

            {/* Error / Auth Notice if any */}
            {sharesError && (
              <div className="mx-4 sm:mx-6 mt-3 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    {sharesError.includes('401') || sharesError.includes('token') || sharesError.includes('vypršal')
                      ? 'Platnosť Google session vypršala alebo chýba token. Pre načítanie podrobnej histórie KV logov sa prosím odhláste a znova prihláste.'
                      : `Chyba načítania logov z KV: ${sharesError}`}
                  </span>
                </div>
                <button
                  onClick={() => loadSharesData()}
                  className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-white font-bold text-xs shrink-0 cursor-pointer"
                >
                  Skúsiť znova
                </button>
              </div>
            )}

            {/* Filter and Action Bar */}
            <div className="p-4 border-b border-white/5 bg-zinc-950/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={sharesSearch}
                    onChange={(e) => setSharesSearch(e.target.value)}
                    placeholder="Hľadať podľa IP, mesta, krajiny, názvu panorámy alebo SID..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-zinc-300">
                  <span className="text-zinc-500 text-[11px]">Zoradiť:</span>
                  <select
                    value={sharesSortBy}
                    onChange={(e) => setSharesSortBy(e.target.value as 'date' | 'clicks')}
                    className="bg-transparent border-none text-xs text-purple-300 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="date" className="bg-zinc-900 text-white">Najnovšie</option>
                    <option value="clicks" className="bg-zinc-900 text-white">Najviac preklikov</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadSharesData}
                  disabled={sharesLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  title="Obnoviť dáta z KV"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${sharesLoading ? 'animate-spin text-purple-400' : ''}`} />
                  <span>Obnoviť</span>
                </button>

                {sharesList.length > 0 && (
                  <button
                    onClick={handleClearShares}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
                    title="Vymazať celú históriu zdieľaní"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vymazať históriu</span>
                  </button>
                )}
              </div>
            </div>

            {/* Shares List Container */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar">
              {sharesLoading ? (
                <div className="py-16 text-center text-xs text-purple-300 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Načítavam metriky zdieľaní z KV...</span>
                </div>
              ) : filteredShares.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                  <Share2 className="w-8 h-8 opacity-40 text-purple-400" />
                  <span>
                    {sharesSearch
                      ? 'Nenašli sa žiadne zdieľané odkazy vyhovujúce filtru.'
                      : 'Zatiaľ neboli zaznamenané žiadne zdieľané odkazy.'}
                  </span>
                </div>
              ) : (
                filteredShares.map((s) => (
                  <div
                    key={s.sid}
                    className={`p-4 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                      (s.clicks || 0) > 0
                        ? 'bg-purple-950/20 border-purple-500/40 shadow-lg shadow-purple-950/20'
                        : 'bg-white/[0.03] border-white/10 opacity-90'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {/* SID badge */}
                        <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono text-[10px] font-bold">
                          #{s.sid}
                        </span>

                        {/* Short Key badge if available */}
                        {s.key && (
                          <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-black">
                            key={s.key}
                          </span>
                        )}

                        {/* Title */}
                        <span className="text-xs font-bold text-white tracking-wide truncate max-w-sm sm:max-w-md">
                          {s.title || (s.id ? `Panoráma #${s.id}` : 'Prehľadná mapa')}
                        </span>

                        {/* Timestamp */}
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-600" />
                          {new Date(s.created_at).toLocaleString('sk-SK')}
                        </span>
                      </div>

                      {/* Header Actions: Clicks badge + Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black ${
                            (s.clicks || 0) > 0
                              ? 'bg-purple-500 text-white shadow-md shadow-purple-950/50'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                          title="Počet unikátnych otvorení tohto zdieľaného odkazu"
                        >
                          <MousePointerClick className="w-3.5 h-3.5" />
                          <span>{s.clicks || 0}</span>
                          <span className="text-[10px] font-normal opacity-90">
                            {s.clicks === 1 ? 'preklik' : (s.clicks || 0) < 5 && (s.clicks || 0) > 0 ? 'prekliky' : 'preklikov'}
                          </span>
                        </div>

                        {/* Copy link */}
                        <button
                          onClick={() => handleCopyShareLink(s.sid, s.url)}
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                          title="Kopírovať zdieľaný odkaz"
                        >
                          {copiedSid === s.sid ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Open link */}
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 hover:text-white border border-cyan-500/30 transition-all cursor-pointer"
                          title="Otvoriť odkaz v novom okne"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {/* Delete record */}
                        <button
                          onClick={() => handleDeleteShare(s.sid)}
                          className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-white border border-rose-500/30 transition-all cursor-pointer"
                          title="Vymazať tento záznam z KV"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata & Geo info */}
                    <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                      {/* Flag + Location */}
                      <div className="flex items-center gap-1.5 bg-black/30 px-2.5 py-1 rounded-lg border border-white/5">
                        <span className="text-sm" title={s.country || 'Neznáma krajina'}>
                          {getCountryFlag(s.country)}
                        </span>
                        <span className="text-zinc-200 font-medium">
                          {s.city || 'Neznáme mesto'}, {s.country || 'Neznáma krajina'}
                        </span>
                      </div>

                      {/* IP address */}
                      <div className="flex items-center gap-1.5 bg-black/30 px-2.5 py-1 rounded-lg border border-white/5 font-mono text-[11px] text-zinc-300">
                        <Globe2 className="w-3 h-3 text-purple-400" />
                        <span>IP:</span>
                        <span className="text-purple-300">{s.ip || 'Neznáma IP'}</span>
                      </div>

                      {/* Stored Parameters Badge if present */}
                      {s.params && Object.keys(s.params).length > 0 && (
                        <div className="flex items-center gap-1 bg-black/30 px-2.5 py-1 rounded-lg border border-white/5 text-[10px] text-zinc-300 font-mono">
                          <span className="text-amber-400 font-bold">Uložený pohľad:</span>
                          <span className="text-zinc-400 truncate max-w-xs">
                            {Object.entries(s.params).map(([k, v]) => `${k}:${typeof v === 'number' ? v.toFixed?.(1) || v : v}`).join(' ')}
                          </span>
                        </div>
                      )}

                      {/* Last clicked info */}
                      {s.last_clicked_at && (
                        <div className="flex items-center gap-1.5 bg-black/30 px-2.5 py-1 rounded-lg border border-white/5 text-[11px] text-zinc-400">
                          <MousePointerClick className="w-3 h-3 text-cyan-400" />
                          <span>Naposledy otvorené:</span>
                          <span className="text-cyan-300 font-mono">
                            {new Date(s.last_clicked_at).toLocaleString('sk-SK')}
                          </span>
                          {s.last_click_geo && (
                            <span className="text-zinc-400">
                              ({[s.last_click_geo.city, s.last_click_geo.country].filter(Boolean).join(', ') || s.last_click_geo.ip})
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* URL String */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2 overflow-hidden">
                      <span className="text-[11px] font-mono text-zinc-400 truncate select-all">
                        {s.url}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB: GOOGLE EARTH (KML INTEGRÁCIA)
           ========================================================================= */}
        {activeTab === 'googleearth' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-black/40 space-y-6">
            {/* Header Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/20 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-lg shadow-amber-950/50">
                    <Globe2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white">Google Earth Živé Prepojenie (KML Feed)</h3>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                        Network Link Ready
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                      Automatická synchronizácia všetkých verejných 360° panorám do Google Earth (Desktop, Web, Mobil). Každý pin obsahuje dátum, názov lokality, náhľad z CDN a priamy klikateľný odkaz do 360° prehliadača.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="/api/panoramas/kml"
                    download="panoramas.kml"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/25 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-400 text-xs font-bold transition-all shadow-md shadow-cyan-950/50 cursor-pointer"
                    title="Stiahnuť súbor so všetkými 390 objektmi pre Google Earth Web (Ctrl+I)"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Stiahnuť KML pre Google Earth Web (panoramas.kml)</span>
                  </a>

                  <a
                    href="/api/panoramas/kml?mode=networklink"
                    download="panoramas_networklink.kml"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-button text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
                    title="Pozor: Network Link funguje IBA v nainštalovanom programe Google Earth Pro na PC/Mac (webová verzia earth.google.com ho nepodporuje)"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Network Link (iba Google Earth Pro Desktop)</span>
                  </a>
                </div>
              </div>
            </div>

            {/* URL Box */}
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/10 space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Živá URL adresa feedu (pre Google Earth Pro Desktop / Network Link):
              </span>
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-amber-200">
                <span className="truncate select-all">${window.location.origin}/api/panoramas/kml</span>
                <button
                  onClick={() => {
                    copyToClipboard('${window.location.origin}/api/panoramas/kml');
                    setCopiedKml(true);
                    setTimeout(() => setCopiedKml(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all shrink-0 cursor-pointer"
                >
                  {copiedKml ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Skopírované!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-300" />
                      <span>Kopírovať odkaz</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Guides Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Guide 1: Google Earth Web */}
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <span>Google Earth pre Web (earth.google.com)</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Postup priamo v novom webovom rozhraní v prehliadači:
                </p>
                <ol className="text-xs text-zinc-300 space-y-2 list-decimal list-inside pl-1 leading-relaxed">
                  <li>Kliknite vyššie na <strong className="text-amber-200">Stiahnuť plný KML</strong> (alebo Stiahnuť Network Link) a uložte súbor.</li>
                  <li>Na stránke <strong className="text-cyan-400">earth.google.com</strong> kliknite v hornom menu na <strong className="text-white">Súbor</strong>.</li>
                  <li>Vyberte <strong className="text-white">Otvoriť lokálny súbor KML</strong> (alebo stlačte klávesovú skratku <code className="text-amber-300 px-1 py-0.5 rounded bg-black/40 border border-white/10">Ctrl+I</code>).</li>
                  <li>Alternatívne môžete zvoliť <strong className="text-white">Importovať súbor &gt; KML/Z...</strong></li>
                  <li>Zvoľte stiahnutý súbor <code className="text-amber-300 text-[11px]">panoramas.kml</code>. Všetky piny sa okamžite načítajú do ľavého panelu <em>Obsah mapy</em> a rozbalia na glóbuse!</li>
                </ol>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-zinc-400 leading-relaxed">
                  💡 <em>Poznámka:</em> Webová verzia z bezpečnostných dôvodov prehliadača (CORS sandbox) nepodporuje priame zadanie URL cez „Pridať odkaz“, preto sa súbor KML vkladá fyzicky cez menu <strong>Súbor &gt; Otvoriť lokálny súbor KML</strong>.
                </div>
              </div>

              {/* Guide 2: Google Earth Pro Desktop */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <span>Google Earth Pro (Desktop aplikácia PC / Mac)</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Desktopová nainštalovaná verzia podporuje aj automatické živé obnovovanie cez URL:
                </p>
                <ol className="text-xs text-zinc-300 space-y-2 list-decimal list-inside pl-1 leading-relaxed">
                  <li>V programe kliknite v hornom menu na <strong className="text-white">Pridať (Add) &gt; Odkaz na sieť (Network Link)...</strong></li>
                  <li>Do poľa <strong className="text-white">Názov</strong> zadajte <code className="text-amber-300">360° Panorámy</code>.</li>
                  <li>Do poľa <strong className="text-white">Odkaz (Link)</strong> vložte URL: <code className="text-amber-300 text-[11px]">${window.location.origin}/api/panoramas/kml</code></li>
                  <li>Na karte <strong className="text-white">Obnovenie</strong> zvoľte čas napr. <strong className="text-white">každú 1 hodinu</strong>.</li>
                  <li>Prípadne môžete len dvakrát kliknúť na stiahnutý súbor <code className="text-amber-300 text-[11px]">panoramas_networklink.kml</code> na disku.</li>
                </ol>
              </div>
            </div>

            {/* Pin Preview Visual Spec */}
            <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/10 space-y-3">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Čo presne každý pin v Google Earth zobrazuje:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Názov pinu (Štítok)</span>
                  <span className="text-white font-medium block">YYYY-MM-DD (čistý kompaktný dátum)</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Popis (HTML Bubble)</span>
                  <span className="text-white font-medium block">Názov lokality, čas, obec a štát</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Miniatúra</span>
                  <span className="text-white font-medium block">Optimalizovaný náhľad z R2 CDN</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Interaktivita</span>
                  <span className="text-amber-300 font-bold block">🌐 Tlačidlo Otvoriť 360° Panorámu</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: TECH SPEC & ARCHITECTURAL CHANGELOG
           ========================================================================= */}
        {activeTab === 'techspec' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-black/40">
            <AdminTechSpec />
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 flex items-center justify-between bg-zinc-950/50 text-xs text-zinc-400">
          <div>
            <span>Cloudflare Storage: </span>
            <span className="font-mono text-cyan-300">AEROSPHERE_KV (Cloudflare KV Namespace)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowServiceModal(false)}
              className="px-4 py-2 rounded-xl glass-button text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>,
    mountNode
  );
};
