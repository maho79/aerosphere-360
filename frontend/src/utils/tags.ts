import type { Panorama } from '../types';

const MONTH_NAMES = new Set([
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
  'januar', 'februar', 'marec', 'maj', 'jun', 'jul', 'oktober',
  'jan', 'feb', 'mar', 'apr', 'aug', 'sep', 'sept', 'oct', 'okt', 'nov', 'dec'
]);

const DISALLOWED_PATTERNS = [
  /pano/i, // matches pano, panoramas, panoramic, dji-pano, etc.
  /^(19|20)\d{2}$/, // 4-digit years (e.g. 1990-2099)
  /^nove\s*mesto(\s*nad\s*vahom)?$/i,
  /^novemesto(nadvahom)?$/i,
];

const DISALLOWED_EXACT = new Set([
  'novemestonadvahom',
  'novemesto',
  'nove',
  'mesto',
  'nadvahom',
  'vahom',
  'slovakia',
  'slovensko',
  'unknown',
  'untitled',
  'dji',
  'dsc',
  'img',
  'jpg',
  'jpeg',
  'png',
  'photo',
  'render',
  'crop',
  'view',
  'web'
]);

/**
 * Validates whether a tag is allowed.
 * Disallows months ('september', 'june', etc.), 4-digit years, anything matching *pano*,
 * location names like 'nove mesto nad vahom', and generic media stopwords.
 */
export function isAllowedTag(tag: string): boolean {
  if (!tag) return false;
  const clean = tag.toLowerCase().replace(/^#+/, '').trim();
  if (!clean || clean.length < 2) return false;
  if (MONTH_NAMES.has(clean)) return false;
  if (DISALLOWED_EXACT.has(clean)) return false;
  for (const pattern of DISALLOWED_PATTERNS) {
    if (pattern.test(clean)) return false;
  }
  return true;
}

/**
 * Remove accents/diacritics and convert to lowercase for accent-insensitive search
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Remove accents/diacritics and non-alphanumeric chars for clean hashtag
 */
export function slugifyTag(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Extract hashtags for a panorama strictly from persisted custom_tags recorded in Cloudflare D1.
 * Unwanted auto-generated tags (months like 'september', years, '*pano*', locations like 'nove mesto nad vahom')
 * are completely omitted, leaving only intentional tags recorded in D1.
 */
export function extractPanoramaTags(pano: Panorama): string[] {
  if (!pano || !pano.custom_tags) return [];

  const tagsSet = new Set<string>();

  // PERSISTED CUSTOM TAGS (From Cloudflare D1)
  let customList: string[] = [];
  if (Array.isArray(pano.custom_tags)) {
    customList = pano.custom_tags;
  } else if (typeof pano.custom_tags === 'string') {
    try {
      const parsed = JSON.parse(pano.custom_tags);
      if (Array.isArray(parsed)) {
        customList = parsed;
      } else if (typeof parsed === 'string') {
        customList = parsed.split(/[\s,]+/);
      }
    } catch {
      customList = pano.custom_tags.split(/[\s,]+/);
    }
  }

  for (const raw of customList) {
    if (!raw) continue;
    const clean = String(raw).trim().replace(/^#+/, '');
    const slug = slugifyTag(clean);
    if (slug && isAllowedTag(slug)) {
      tagsSet.add(`#${slug}`);
    }
  }

  return Array.from(tagsSet);
}

/**
 * Returns all unique hashtags across a list of panoramas with frequency counts
 */
export function getPopularTags(panoramas: Panorama[]): { tag: string; count: number }[] {
  const countMap = new Map<string, number>();

  for (const p of panoramas) {
    const tags = extractPanoramaTags(p);
    for (const t of tags) {
      countMap.set(t, (countMap.get(t) || 0) + 1);
    }
  }

  return Array.from(countMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
