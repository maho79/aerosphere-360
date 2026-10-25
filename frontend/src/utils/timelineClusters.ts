import { type Panorama } from '../types';
import { getDistance, formatPanoramaDate, getPanoramaAltitude } from './geo';

export interface TimelineCluster {
  id: string;
  hub: Panorama;
  members: Panorama[];
  distinctDatesCount: number;
}

/**
 * Compute global, consistent spatial clusters for panoramas.
 * Every panorama belongs to at most one cluster (partition).
 * Panoramas in the same cluster share the exact same cluster ID and member set.
 */
export function buildTimelineClusters(
  panoramas: Panorama[],
  radiusMeters = 120
): {
  clusters: TimelineCluster[];
  panoToCluster: Map<string, TimelineCluster>;
  timelinePanoIds: Set<string>;
} {
  const valid = panoramas.filter((p): p is Panorama & { lat: number; lon: number } => p.lat !== null && p.lon !== null && !p.is_deleted && !p.exclude_timeline);
  const cellSize = 0.002; // ~200m spatial grid cell
  const grid = new Map<string, (Panorama & { lat: number; lon: number })[]>();

  for (const p of valid) {
    const key = `${Math.floor(p.lat / cellSize)}_${Math.floor(p.lon / cellSize)}`;
    let cell = grid.get(key);
    if (!cell) {
      cell = [];
      grid.set(key, cell);
    }
    cell.push(p);
  }

  function getNeighbors(p: Panorama & { lat: number; lon: number }, maxDist: number): (Panorama & { lat: number; lon: number })[] {
    const res: (Panorama & { lat: number; lon: number })[] = [];
    const cx = Math.floor(p.lat / cellSize);
    const cy = Math.floor(p.lon / cellSize);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = grid.get(`${cx + dx}_${cy + dy}`);
        if (!cell) continue;
        for (const other of cell) {
          if (getDistance(p.lat, p.lon, other.lat, other.lon) <= maxDist) {
            res.push(other);
          }
        }
      }
    }
    return res;
  }

  // Calculate density of multi-date captures around each panorama
  const density = new Map<string, number>();
  for (const p of valid) {
    const neighbors = getNeighbors(p, radiusMeters);
    const dates = new Set<string>();
    for (const n of neighbors) {
      const d = formatPanoramaDate(n.date);
      if (d) dates.add(d);
    }
    density.set(p.id, dates.size);
  }

  // Sort candidate hub centers by density descending, then newest date
  const hubs = valid
    .filter((p) => (density.get(p.id) || 0) >= 2)
    .sort((a, b) => {
      const da = density.get(a.id) || 0;
      const db = density.get(b.id) || 0;
      if (db !== da) return db - da;
      return (b.date || '').localeCompare(a.date || '');
    });

  const panoToCluster = new Map<string, TimelineCluster>();
  const clusters: TimelineCluster[] = [];
  const timelinePanoIds = new Set<string>();

  for (const hub of hubs) {
    if (panoToCluster.has(hub.id)) continue;

    const nearby = getNeighbors(hub, radiusMeters);
    const unassigned = nearby.filter((p) => !panoToCluster.has(p.id));
    const dates = new Set(unassigned.map((p) => formatPanoramaDate(p.date)).filter(Boolean));
    if (dates.size < 2) continue;

    const cluster: TimelineCluster = {
      id: `cluster_${hub.id}`,
      hub,
      members: unassigned,
      distinctDatesCount: dates.size,
    };

    clusters.push(cluster);
    for (const m of unassigned) {
      panoToCluster.set(m.id, cluster);
      timelinePanoIds.add(String(m.id));
    }
  }

  return { clusters, panoToCluster, timelinePanoIds };
}

/**
 * Get chronological timeline panoramas (one best representative per calendar date)
 * for the cluster that `panorama` belongs to.
 * Guaranteed to be 100% consistent: any member of the cluster returns the exact same set of dates.
 */
export function getTimelineRepresentativesForCluster(
  panorama: Panorama,
  cluster: TimelineCluster | undefined,
  options: {
    isAdmin?: boolean;
    showPublic?: boolean;
    showPrivate?: boolean;
    filteredPanoramas?: Panorama[];
  } = {}
): (Panorama & { distance?: number })[] {
  if (!cluster || !panorama || panorama.lat === null || panorama.lon === null) return [];
  const curLat = panorama.lat;
  const curLon = panorama.lon;
  const curAlt = getPanoramaAltitude(panorama);

  const { isAdmin = false, showPublic = true, showPrivate = true, filteredPanoramas } = options;

  let candidates = cluster.members.filter((p) => {
    if (p.lat === null || p.lon === null) return false;
    if (!isAdmin && p.is_private) return false;
    if (isAdmin) {
      if (!showPublic && !p.is_private) return false;
      if (!showPrivate && p.is_private) return false;
    }
    if (p.is_deleted || p.folder === '!DELETED!' || p.exclude_timeline) return false;
    return true;
  });

  if (filteredPanoramas && filteredPanoramas.length > 0) {
    const allowed = new Set(filteredPanoramas.map((p) => p.id));
    // If filteredPanoramas contains any member of this cluster (e.g. collapsed cluster representative),
    // retain all cluster captures for the location timeline.
    const clusterHasMatchInFilter = cluster.members.some((m) => allowed.has(m.id));
    if (!clusterHasMatchInFilter) {
      candidates = candidates.filter((p) => allowed.has(p.id) || p.id === panorama.id);
    }
  }

  if (candidates.length <= 1) return [];

  // Group by calendar day (YYYY-MM-DD)
  const dayGroups = new Map<string, Panorama[]>();
  for (const p of candidates) {
    const day = formatPanoramaDate(p.date) || ('unknown_' + p.id);
    let group = dayGroups.get(day);
    if (!group) {
      group = [];
      dayGroups.set(day, group);
    }
    group.push(p);
  }

  // Must have captures from at least 2 distinct dates
  if (dayGroups.size < 2) return [];

  const representatives: (Panorama & { distance?: number })[] = [];
  for (const [, dayCandidates] of dayGroups.entries()) {
    // If active panorama matches this date, preserve it
    const activeMatch = dayCandidates.find((c) => c.id === panorama.id);
    if (activeMatch) {
      representatives.push({
        ...activeMatch,
        distance: Math.round(getDistance(curLat, curLon, activeMatch.lat!, activeMatch.lon!)),
      });
      continue;
    }

    if (dayCandidates.length === 1) {
      const single = dayCandidates[0];
      representatives.push({
        ...single,
        distance: Math.round(getDistance(curLat, curLon, single.lat!, single.lon!)),
      });
      continue;
    }

    // Pick best candidate on this date (closest altitude, visual alignment, 2:1 aspect ratio, resolution)
    const sorted = dayCandidates.slice().sort((a, b) => {
      const altA = getPanoramaAltitude(a);
      const altB = getPanoramaAltitude(b);
      if (curAlt !== null && altA !== null && altB !== null) {
        const diffA = Math.abs(altA - curAlt);
        const diffB = Math.abs(altB - curAlt);
        if (Math.abs(diffA - diffB) > 3) return diffA - diffB;
      }
      const alignA = a.sun_data?.visual_aligned ? 1 : 0;
      const alignB = b.sun_data?.visual_aligned ? 1 : 0;
      if (alignA !== alignB) return alignB - alignA;
      // Prefer complete 2:1 spherical stitches over cropped/unstitched zeniths
      const isFull360A = (a.width && a.height && Math.abs(a.width / a.height - 2.0) <= 0.06) ? 1 : 0;
      const isFull360B = (b.width && b.height && Math.abs(b.width / b.height - 2.0) <= 0.06) ? 1 : 0;
      if (isFull360A !== isFull360B) return isFull360B - isFull360A;
      const resA = (a.width || 0) * (a.height || 0);
      const resB = (b.width || 0) * (b.height || 0);
      if (resA !== resB) return resB - resA;
      return a.id.localeCompare(b.id);
    });

    const best = sorted[0];
    representatives.push({
      ...best,
      distance: Math.round(getDistance(curLat, curLon, best.lat!, best.lon!)),
    });
  }

  // Sort chronologically (oldest to newest)
  representatives.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return da - db;
  });

  return representatives;
}
