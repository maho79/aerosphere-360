-- ============================================================
-- AeroSphere 360 - Cloudflare D1 / SQLite Database Schema
-- Provides database tables for panoramas metadata, view analytics,
-- share tracking, visitor comments, and interactive feedback.
-- ============================================================

-- 1. Master Panoramas Table
CREATE TABLE IF NOT EXISTS panoramas (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  title TEXT,
  city TEXT,
  country TEXT,
  date TEXT,
  lat REAL,
  lon REAL,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  is_private INTEGER DEFAULT 0,
  folder TEXT,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  custom_tags TEXT DEFAULT '[]',
  is_deleted INTEGER DEFAULT 0,
  original_filename TEXT,
  original_filepath TEXT,
  environment TEXT,
  sun_data TEXT,
  gps_source TEXT DEFAULT NULL,
  exclude_timeline INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_panoramas_date ON panoramas (date);
CREATE INDEX IF NOT EXISTS idx_panoramas_is_private ON panoramas (is_private);
CREATE INDEX IF NOT EXISTS idx_panoramas_folder ON panoramas (folder);
CREATE INDEX IF NOT EXISTS idx_panoramas_views ON panoramas (views DESC);
CREATE INDEX IF NOT EXISTS idx_panoramas_shares ON panoramas (shares DESC);
CREATE INDEX IF NOT EXISTS idx_panoramas_is_deleted ON panoramas (is_deleted);
CREATE INDEX IF NOT EXISTS idx_panoramas_gps_source ON panoramas (gps_source);
CREATE INDEX IF NOT EXISTS idx_panoramas_exclude_timeline ON panoramas (exclude_timeline);

-- 2. Shared Links and Click Tracking
CREATE TABLE IF NOT EXISTS shares (
  sid TEXT PRIMARY KEY,
  key TEXT,
  pano_id TEXT NOT NULL,
  title TEXT,
  url TEXT NOT NULL,
  params TEXT,
  ip TEXT,
  city TEXT,
  country TEXT,
  region TEXT,
  clicks INTEGER DEFAULT 0,
  last_clicked_at TEXT,
  last_click_ip TEXT,
  last_click_city TEXT,
  last_click_country TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shares_key ON shares (key);
CREATE INDEX IF NOT EXISTS idx_shares_pano_id ON shares (pano_id);
CREATE INDEX IF NOT EXISTS idx_shares_created_at ON shares (created_at DESC);

-- 3. Panorama Views Log
CREATE TABLE IF NOT EXISTS panorama_views (
  pano_id TEXT PRIMARY KEY,
  views INTEGER DEFAULT 0,
  last_viewed_at TEXT,
  last_ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_panorama_views_views ON panorama_views (views DESC);

-- 4. Comments
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  pano_id TEXT NOT NULL,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  rating INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0,
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_comments_pano_id ON comments (pano_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments (created_at DESC);

-- 5. Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  pano_id TEXT NOT NULL,
  action TEXT,
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_favorites_pano_id ON favorites (pano_id);

-- 6. Analytics Visits (Edge traffic tracking)
CREATE TABLE IF NOT EXISTS analytics_visits (
  id TEXT PRIMARY KEY,
  timestamp TEXT,
  time_formatted TEXT,
  date_formatted TEXT,
  referrer TEXT,
  raw_referrer TEXT,
  country TEXT,
  city TEXT,
  device TEXT,
  path TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_visits (date_formatted);

-- 7. Visitor Feedback
CREATE TABLE IF NOT EXISTS feedbacks (
  id TEXT PRIMARY KEY,
  email TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  url TEXT,
  read INTEGER DEFAULT 0,
  user_agent TEXT,
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks (created_at DESC);
