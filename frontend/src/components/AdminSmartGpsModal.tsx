import { panoConfig } from '../config/panoConfig';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  X,
  MapPin,
  Calendar,
  Sparkles,
  Search,
  Check,
  Loader2,
  Navigation,
  Globe2,
  Move,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  HardDrive,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { cleanPanoPath, getPanoramaGpsStatus } from '../types';
import { formatPanoramaDate, formatCoordinates } from '../utils/geo';
import { GpsStatusBadge } from './GpsStatusBadge';
import type { Panorama } from '../types';

// Custom Map Pin Icons
const unplacedIcon = L.divIcon({
  className: 'glass-marker-wrapper',
  html: `<div class="w-8 h-8 rounded-full bg-rose-500/80 border-2 border-white shadow-xl flex items-center justify-center text-white font-mono font-bold text-xs ring-2 ring-rose-500/40 animate-pulse">?</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const createPlacedIcon = (index: number, isSelected: boolean, isAuto = false) =>
  L.divIcon({
    className: 'glass-marker-wrapper',
    html: `<div class="w-8 h-8 rounded-full ${
      isSelected
        ? 'bg-amber-400 text-zinc-950 ring-4 ring-amber-400/60 scale-125'
        : isAuto
        ? 'bg-amber-500 text-zinc-950 ring-2 ring-amber-400/50'
        : 'bg-cyan-500 text-zinc-950 ring-2 ring-cyan-400/50'
    } border-2 border-white shadow-2xl flex items-center justify-center font-mono font-black text-xs transition-transform cursor-grab active:cursor-grabbing">${index + 1}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

interface AdminSmartGpsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPanoramas: Panorama[];
  allPanoramas: Panorama[];
  onSaved?: (updated: { id: string; lat: number; lon: number }[]) => void;
}

interface ItemCoords {
  panorama: Panorama;
  lat: number | null;
  lon: number | null;
  gps_source: 'exif' | 'manual' | 'auto' | 'editor';
  isModified: boolean;
}

/**
 * Extracts candidate location keyword from folder or filename by removing dates,
 * camera tags, and technical suffixes.
 */
function extractLocationQuery(folder?: string | null, filename?: string): string {
  const raw = `${folder || ''} ${filename || ''}`;
  return raw
    .replace(/private\//gi, ' ')
    .replace(/!DELETED!/gi, ' ')
    .replace(/\b\d{4}[-_/]\d{2}[-_/]\d{2}\b/g, ' ')
    .replace(/\b\d{8}\b/g, ' ')
    .replace(/\b(insta360|dji|gopro|panoramas|pano|insp|dng|raw|render|stitch|web|_2k|_8k|_11k|_15k)\b/gi, ' ')
    .replace(/[._\-–—()[\]{}/\\:,;+*~'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Component to handle map clicks for positioning
 */
const MapClickHandler: React.FC<{
  onMapClick: (lat: number, lon: number) => void;
}> = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

/**
 * Map controller to flyTo locations smoothly
 */
const MapFlyTo: React.FC<{ center: [number, number] | null; zoom?: number }> = ({ center, zoom = 14 }) => {
  const map = useMap();
  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
};

export const AdminSmartGpsModal: React.FC<AdminSmartGpsModalProps> = ({
  isOpen,
  onClose,
  targetPanoramas,
  allPanoramas,
  onSaved,
}) => {
  const { batchUpdatePanoramas } = useAdmin();

  const [items, setItems] = useState<ItemCoords[]>([]);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Auto-detection states
  const [isSearchingNominatim, setIsSearchingNominatim] = useState(false);
  const [nominatimLocation, setNominatimLocation] = useState<{
    query: string;
    name: string;
    lat: number;
    lon: number;
  } | null>(null);

  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(13);

  // Initialize items from targetPanoramas
  useEffect(() => {
    if (!isOpen || targetPanoramas.length === 0) {
      setItems([]);
      setActiveIdx(0);
      setNominatimLocation(null);
      return;
    }

    const initItems: ItemCoords[] = targetPanoramas.map((p) => {
      const hasValidGps = p.lat !== null && p.lon !== null && !(p.lat === 0 && p.lon === 0);
      const initialSource: 'exif' | 'manual' | 'auto' | 'editor' = p.gps_source || (hasValidGps ? 'exif' : 'manual');
      return {
        panorama: p,
        lat: hasValidGps ? p.lat : null,
        lon: hasValidGps ? p.lon : null,
        gps_source: initialSource,
        isModified: false,
      };
    });

    setItems(initItems);
    setActiveIdx(0);
    setStatusMessage(null);

    // Initial map centering
    const firstWithGps = initItems.find((it) => it.lat !== null && it.lon !== null);
    if (firstWithGps && firstWithGps.lat && firstWithGps.lon) {
      setMapCenter([firstWithGps.lat, firstWithGps.lon]);
      setMapZoom(16);
    } else {
      // Default to Europe/Slovakia if no GPS yet
      setMapCenter([48.1486, 17.1077]);
      setMapZoom(7);
    }
  }, [isOpen, targetPanoramas]);

  // A) SAME-DATE GPS CANDIDATE SEARCH
  const sameDateCandidates = useMemo(() => {
    if (!isOpen || items.length === 0) return [];
    const results: { date: string; match: Panorama; count: number }[] = [];
    const targetDates = new Set(
      items
        .map((it) => it.panorama.date?.split('T')[0])
        .filter((d): d is string => Boolean(d))
    );

    targetDates.forEach((dateStr) => {
      // Find catalog panoramas with same date and valid GPS
      const matches = allPanoramas.filter(
        (p) =>
          p.date?.startsWith(dateStr) &&
          p.lat !== null &&
          p.lon !== null &&
          !(p.lat === 0 && p.lon === 0)
      );
      if (matches.length > 0) {
        results.push({
          date: dateStr,
          match: matches[0],
          count: matches.length,
        });
      }
    });

    return results;
  }, [isOpen, items, allPanoramas]);

  // B) ROUGH LOCATION QUERY FROM FOLDER / FILENAME VIA NOMINATIM
  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    const firstPano = items[0].panorama;
    const cleanQuery = extractLocationQuery(firstPano.folder, firstPano.original_filename || firstPano.filename);

    if (!cleanQuery || cleanQuery.length < 3) return;

    let isSubscribed = true;
    setIsSearchingNominatim(true);

    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(cleanQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isSubscribed) return;
        setIsSearchingNominatim(false);
        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            setNominatimLocation({
              query: cleanQuery,
              name: data[0].display_name,
              lat,
              lon,
            });
            // If items don't have GPS, zoom to this Nominatim discovery!
            const anyHasGps = items.some((it) => it.lat !== null && it.lon !== null);
            if (!anyHasGps) {
              setMapCenter([lat, lon]);
              setMapZoom(13);
            }
          }
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          setIsSearchingNominatim(false);
          console.warn('Nominatim search failed:', err);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, items]);

  if (!isOpen || items.length === 0) return null;

  // Apply Same-Date GPS to all or unmapped items (sets gps_source: 'auto')
  const handleApplySameDateGps = (match: Panorama) => {
    if (match.lat === null || match.lon === null) return;
    const baseLat = match.lat;
    const baseLon = match.lon;

    setItems((prev) =>
      prev.map((item, idx) => {
        // Scatter slightly in a circle (radius ~15m) so pins are individually draggable
        const angle = (idx / prev.length) * 2 * Math.PI;
        const offsetLat = Math.sin(angle) * 0.00012;
        const offsetLon = Math.cos(angle) * 0.00018;
        return {
          ...item,
          lat: baseLat + offsetLat,
          lon: baseLon + offsetLon,
          gps_source: 'auto',
          isModified: true,
        };
      })
    );

    setMapCenter([baseLat, baseLon]);
    setMapZoom(17);
    setStatusMessage(`Použité GPS z ${match.city || 'katalógu'} pre ${items.length} panorám (označené na review).`);
  };

  // Apply Nominatim location to all items (sets gps_source: 'auto')
  const handleApplyNominatimLocation = () => {
    if (!nominatimLocation) return;
    const { lat, lon } = nominatimLocation;

    setItems((prev) =>
      prev.map((item, idx) => {
        const angle = (idx / prev.length) * 2 * Math.PI;
        const offsetLat = Math.sin(angle) * 0.00015;
        const offsetLon = Math.cos(angle) * 0.00022;
        return {
          ...item,
          lat: lat + offsetLat,
          lon: lon + offsetLon,
          gps_source: 'auto',
          isModified: true,
        };
      })
    );

    setMapCenter([lat, lon]);
    setMapZoom(16);
    setStatusMessage(`Umiestnené v lokalite "${nominatimLocation.query}" (označené na review).`);
  };

  // Map Click Handler: place active item or all unplaced items (sets gps_source: 'manual')
  const handleMapClick = (lat: number, lon: number) => {
    const unplacedCount = items.filter((it) => it.lat === null).length;

    // If active item has no coords or user clicked to place active item:
    setItems((prev) => {
      // If multiple unplaced items and first click: place all with small scatter
      if (unplacedCount > 1 && prev[activeIdx].lat === null) {
        return prev.map((item, idx) => {
          const angle = (idx / prev.length) * 2 * Math.PI;
          const offsetLat = Math.sin(angle) * 0.00012;
          const offsetLon = Math.cos(angle) * 0.00018;
          return {
            ...item,
            lat: lat + offsetLat,
            lon: lon + offsetLon,
            gps_source: 'manual',
            isModified: true,
          };
        });
      }

      // Otherwise, update current active item
      return prev.map((item, idx) => {
        if (idx === activeIdx) {
          return {
            ...item,
            lat,
            lon,
            gps_source: 'manual',
            isModified: true,
          };
        }
        return item;
      });
    });

    setStatusMessage(`Nastavené súradnice: ${formatCoordinates(lat, lon)}`);
  };

  // Drag marker end (sets gps_source: 'manual')
  const handleMarkerDragEnd = (idx: number, newLat: number, newLon: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i === idx) {
          return {
            ...item,
            lat: newLat,
            lon: newLon,
            gps_source: 'manual',
            isModified: true,
          };
        }
        return item;
      })
    );
    setActiveIdx(idx);
    setStatusMessage(`Presunutá #${idx + 1}: ${formatCoordinates(newLat, newLon)}`);
  };

  // Save modified items to D1
  const handleSaveToD1 = async () => {
    const toSave = items.filter((it) => it.isModified && it.lat !== null && it.lon !== null);
    if (toSave.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      // Save each item with its unique coordinates and gps_source
      for (const it of toSave) {
        await batchUpdatePanoramas({
          ids: [String(it.panorama.id)],
          lat: it.lat,
          lon: it.lon,
          gps_source: it.gps_source,
        });
      }

      setStatusMessage(`Úspešne uložené GPS pre ${toSave.length} panorám do D1.`);
      onSaved?.(
        toSave.map((it) => ({
          id: String(it.panorama.id),
          lat: it.lat!,
          lon: it.lon!,
        }))
      );

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setStatusMessage(err?.message || 'Chyba pri ukladaní GPS');
    } finally {
      setIsSaving(false);
    }
  };

  const activeItem = items[activeIdx];
  const placedCount = items.filter((it) => it.lat !== null && it.lon !== null).length;

  return (
    <div
      className="fixed inset-0 z-[3500] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl h-[92vh] glass-panel-elevated rounded-3xl border border-cyan-500/40 shadow-2xl flex flex-col overflow-hidden relative animate-slide-up text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-zinc-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-950/60">
              <Navigation className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate">
                  Smart GPS Priraďovanie Panorám
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold">
                  {placedCount} / {items.length} umiestnených
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate">
                Kliknite na mapu pre umiestnenie celej skupiny, alebo potiahnite špendlíky pre doladenie
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Smart Suggestions Action Bar */}
        {(sameDateCandidates.length > 0 || nominatimLocation) && (
          <div className="px-5 py-2.5 bg-gradient-to-r from-amber-500/15 via-cyan-500/10 to-zinc-900 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Inteligentné návrhy:</span>
              </span>

              {/* A) Same Date 1-click apply */}
              {sameDateCandidates.map(({ date, match, count }) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => handleApplySameDateGps(match)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 border border-amber-400/50 font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                  title={`Použiť GPS z dňa ${date} (${match.city || 'katalóg'})`}
                >
                  <Calendar className="w-3 h-3 text-amber-300" />
                  <span>
                    Rovnaký dátum {date} ({match.city || 'lokalita'} • {count} ks)
                  </span>
                </button>
              ))}

              {/* B) Nominatim location */}
              {nominatimLocation && (
                <button
                  type="button"
                  onClick={handleApplyNominatimLocation}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/25 hover:bg-cyan-500/40 text-cyan-200 border border-cyan-400/50 font-semibold transition-all cursor-pointer shadow-sm active:scale-95 truncate max-w-xs sm:max-w-md"
                  title={nominatimLocation.name}
                >
                  <Globe2 className="w-3 h-3 text-cyan-300 shrink-0" />
                  <span className="truncate">Názov zo zložky: "{nominatimLocation.query}"</span>
                </button>
              )}
            </div>

            {statusMessage && (
              <span className="text-cyan-300 font-mono text-[11px] truncate">{statusMessage}</span>
            )}
          </div>
        )}

        {/* Main Body: Map & Sidebar Stepper */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
          {/* Leaflet Picker Map */}
          <div className="flex-1 h-full relative bg-zinc-950">
            <MapContainer
              center={[48.1486, 17.1077]}
              zoom={7}
              className="w-full h-full"
              style={{ background: '#090a0f' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />

              <MapClickHandler onMapClick={handleMapClick} />
              <MapFlyTo center={mapCenter} zoom={mapZoom} />

              {/* Render Draggable Markers for all items with coords */}
              {items.map((it, idx) => {
                if (it.lat === null || it.lon === null) return null;
                const isSelected = idx === activeIdx;

                return (
                  <Marker
                    key={it.panorama.id}
                    position={[it.lat, it.lon]}
                    icon={createPlacedIcon(idx, isSelected, it.gps_source === 'auto')}
                    draggable={true}
                    eventHandlers={{
                      click: () => setActiveIdx(idx),
                      dragend: (e) => {
                        const marker = e.target;
                        const pos = marker.getLatLng();
                        handleMarkerDragEnd(idx, pos.lat, pos.lng);
                      },
                    }}
                  >
                    <Tooltip permanent={isSelected} direction="top" offset={[0, -18]}>
                      <span className="font-mono text-xs font-bold">
                        #{idx + 1} {it.panorama.city || it.panorama.filename}
                      </span>
                    </Tooltip>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Instruction Callout Overlay */}
            <div className="absolute top-3 left-3 z-[1000] pointer-events-none">
              <div className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/15 text-xs text-zinc-300 shadow-xl flex items-center gap-2">
                <Move className="w-3.5 h-3.5 text-cyan-400" />
                <span>Potiahnutím špendlíka zmeníte polohu</span>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Panoramas Stepper & Inspection List */}
          <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-white/10 bg-zinc-950/90 flex flex-col shrink-0 min-h-[14rem] md:min-h-0">
            {/* Active Panorama Spotlight Header */}
            {activeItem && (
              <div className="p-3.5 border-b border-white/10 bg-white/5 space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                    Aktívna panoráma #{activeIdx + 1} z {items.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={activeIdx === 0}
                      onClick={() => setActiveIdx((prev) => Math.max(0, prev - 1))}
                      className="p-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={activeIdx === items.length - 1}
                      onClick={() => setActiveIdx((prev) => Math.min(items.length - 1, prev + 1))}
                      className="p-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-14 h-9 rounded-lg bg-zinc-900 border border-white/15 overflow-hidden shrink-0 relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 text-zinc-400">
                      <HardDrive className="w-3.5 h-3.5 text-amber-400/80" />
                    </div>
                    <img
                      src={`/thumbnails/${cleanPanoPath(activeItem.panorama.filename)}`}
                      alt=""
                      onError={(e) => {
                        const target = e.currentTarget;
                        const clean = cleanPanoPath(activeItem.panorama.filename);
                        if (!target.src.includes('/panoramas_2k/')) {
                          target.src = `/panoramas_2k/${clean}`;
                        } else if (!target.src.includes('/thumbnails/')) {
                          target.src = `${panoConfig.storage.thumbnailsUrl}/${clean}`;
                        } else {
                          target.style.display = 'none';
                        }
                      }}
                      className="w-full h-full object-cover relative z-10"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {activeItem.panorama.city && activeItem.panorama.city !== 'Unknown'
                        ? activeItem.panorama.city
                        : activeItem.panorama.filename}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-mono truncate">
                      {formatPanoramaDate(activeItem.panorama.date)} • {activeItem.panorama.width}px
                    </p>
                  </div>
                </div>

                {/* Coords state */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                  <span className="text-zinc-400">GPS súradnice:</span>
                  {activeItem.lat !== null && activeItem.lon !== null ? (
                    <span className="font-mono text-cyan-300 font-bold">
                      {formatCoordinates(activeItem.lat, activeItem.lon)}
                    </span>
                  ) : (
                    <span className="text-rose-400 font-medium">Neumiestnené (Kliknite na mapu)</span>
                  )}
                </div>

                {/* GPS Status / Source Selector */}
                {activeItem.lat !== null && activeItem.lon !== null && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                    <span className="text-zinc-400">Stav overenia:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setItems((prev) =>
                            prev.map((item, i) =>
                              i === activeIdx ? { ...item, gps_source: 'auto', isModified: true } : item
                            )
                          );
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          activeItem.gps_source === 'auto'
                            ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-950/40 ring-1 ring-white/20'
                            : 'bg-white/10 hover:bg-white/20 text-zinc-400'
                        }`}
                        title="Označiť ako automaticky pridelené, vyžadujúce kontrolu"
                      >
                        🟡 Review
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setItems((prev) =>
                            prev.map((item, i) =>
                              i === activeIdx ? { ...item, gps_source: 'manual', isModified: true } : item
                            )
                          );
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          activeItem.gps_source === 'manual'
                            ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/40 ring-1 ring-white/20'
                            : 'bg-white/10 hover:bg-white/20 text-zinc-400'
                        }`}
                        title="Označiť ako manuálne overené a presné"
                      >
                        🔵 Overené
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stepper items list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
              {items.map((it, idx) => {
                const isSelected = idx === activeIdx;
                const hasGps = it.lat !== null && it.lon !== null;
                const status = hasGps
                  ? it.gps_source === 'auto'
                    ? 'auto_needs_review'
                    : it.gps_source === 'manual'
                    ? 'manual_editor'
                    : 'original_exif'
                  : 'no_gps';

                return (
                  <div
                    key={it.panorama.id}
                    onClick={() => {
                      setActiveIdx(idx);
                      if (it.lat && it.lon) {
                        setMapCenter([it.lat, it.lon]);
                        setMapZoom(17);
                      }
                    }}
                    className={`p-2 rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-950/40'
                        : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/5 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                          hasGps
                            ? it.gps_source === 'auto'
                              ? 'bg-amber-500 text-zinc-950'
                              : 'bg-cyan-500 text-zinc-950'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {it.panorama.original_filename || it.panorama.filename}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {hasGps ? formatCoordinates(it.lat!, it.lon!) : 'Chýba GPS'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      <GpsStatusBadge status={status} size="xs" showLabel={false} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions Footer */}
            <div className="p-3 border-t border-white/10 bg-zinc-950 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-3 py-2 rounded-xl glass-button text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
              >
                Zavrieť
              </button>
              <button
                type="button"
                onClick={handleSaveToD1}
                disabled={isSaving || placedCount === 0}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Ukladám...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Uložiť ({placedCount}) do D1</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
