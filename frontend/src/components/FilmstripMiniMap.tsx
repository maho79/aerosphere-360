import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Panorama } from '../types';
import { Map, FolderLock } from 'lucide-react';

interface FilmstripMiniMapProps {
  currentPanorama: Panorama;
  nearbyPanoramas: (Panorama & { distance?: number })[];
  onSelectPanorama: (pano: Panorama) => void;
  hoveredIndex: number | null;
  onOpenMap?: (lat: number, lon: number, zoom?: number) => void;
}


export const FilmstripMiniMap: React.FC<FilmstripMiniMapProps> = ({
  currentPanorama,
  nearbyPanoramas,
  onSelectPanorama,
  hoveredIndex,
  onOpenMap,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (currentPanorama.lat === null || currentPanorama.lon === null) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      attributionControl: false,
      zoomControl: false,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: false,
      keyboard: false,
    });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const bounds = L.latLngBounds([]);

    // 1. Current Panorama Marker ("You are here" / Glowing Red Dot)
    const currentIcon = L.divIcon({
      className: 'current-pano-marker-wrapper',
      html: '<div class="current-mini-marker"><div class="current-mini-pulse"></div><div class="current-mini-dot"></div></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    const currentMarker = L.marker([currentPanorama.lat, currentPanorama.lon], {
      icon: currentIcon,
      zIndexOffset: 500,
    }).addTo(map);

    currentMarker.bindTooltip(
      '<div class="text-[11px] font-bold text-rose-400">Current Panorama<br/><span class="text-white">' +
        (currentPanorama.city || currentPanorama.original_filename) +
        '</span></div>',
      { direction: 'top', offset: [0, -10] }
    );

    bounds.extend([currentPanorama.lat, currentPanorama.lon]);

    // 2. Numbered Markers for Nearby Panoramas (1, 2, 3...)
    nearbyPanoramas.forEach((p, idx) => {
      if (p.lat === null || p.lon === null) return;

      const num = idx + 1;
      const pinIcon = L.divIcon({
        className: 'nearby-mini-marker-wrapper',
        html:
          '<div class="nearby-mini-pin" id="mini-pin-' +
          idx +
          '"><span>' +
          num +
          '</span></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([p.lat, p.lon], {
        icon: pinIcon,
        zIndexOffset: 100 + (nearbyPanoramas.length - idx),
      }).addTo(map);

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectPanorama(p);
      });

      marker.bindTooltip(
        '<div class="text-xs font-bold text-white">#' +
          num +
          ': ' +
          (p.city || p.original_filename) +
          (p.distance !== undefined ? '<br/><span class="text-cyan-400 font-mono font-semibold">' + Math.round(p.distance) + ' m</span>' : '') +
          '</div>',

        { direction: 'top', offset: [0, -10] }
      );

      bounds.extend([p.lat, p.lon]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [24, 24],
        maxZoom: 18,
      });
    } else {
      map.setView([currentPanorama.lat, currentPanorama.lon], 16);
    }

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [currentPanorama.id, currentPanorama.lat, currentPanorama.lon, nearbyPanoramas, onSelectPanorama]);

  // Update hovered marker highlight
  useEffect(() => {
    nearbyPanoramas.forEach((_, idx) => {
      const el = document.getElementById('mini-pin-' + idx);
      if (el) {
        if (hoveredIndex === idx) {
          el.classList.add('hovered');
        } else {
          el.classList.remove('hovered');
        }
      }
    });
  }, [hoveredIndex, nearbyPanoramas]);

  if (currentPanorama.lat === null || currentPanorama.lon === null || (currentPanorama.lat === 0 && currentPanorama.lon === 0)) {
    return (
      <div className="flex-none w-56 h-[142px] rounded-2xl overflow-hidden glass-panel border border-rose-500/40 relative select-none shadow-xl flex flex-col items-center justify-center p-3 text-center bg-zinc-950/80">
        <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-1.5 shadow-md shadow-rose-950/50">
          <FolderLock className="w-5 h-5" />
        </div>
        <span className="text-xs font-bold text-white truncate max-w-full px-2" title={currentPanorama.folder || 'Private Archive'}>
          {currentPanorama.folder || 'Private Archive'}
        </span>
        <span className="text-[10px] text-rose-300/80 mt-1 flex items-center gap-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span>{nearbyPanoramas.length + 1} photos in archive</span>
        </span>
      </div>
    );
  }

  const handleMapClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPanorama.lat !== null && currentPanorama.lon !== null && currentPanorama.lat !== 0) {
      const currentZoom = mapInstanceRef.current?.getZoom() || 15;
      onOpenMap?.(currentPanorama.lat, currentPanorama.lon, currentZoom);
    }
  };

  return (
    <div
      className="flex-none w-56 h-[142px] group rounded-2xl overflow-hidden glass-panel border border-cyan-500/40 hover:border-cyan-400 relative select-none shadow-xl cursor-pointer hover:shadow-cyan-950/70 hover:scale-[1.03] transition-all duration-300"
      onClick={handleMapClick}
      title="Kliknutím otvoríte túto lokalitu na hlavnej mape"
    >
      {/* Top Header Badge */}
      <div className="absolute top-1.5 left-1.5 right-1.5 z-[1000] flex items-center justify-between px-2.5 py-1 rounded-xl bg-zinc-950/85 backdrop-blur-md border border-white/10 pointer-events-none shadow-md">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
          <Map className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Overview</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-semibold text-cyan-300">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>{nearbyPanoramas.length} nearby</span>
        </div>
      </div>

      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full bg-[#0a0d14]" />

      {/* Hover Overlay Hint (Desktop) */}
      <div className="absolute inset-0 bg-cyan-950/30 opacity-0 group-hover:opacity-100 transition-opacity z-[900] pointer-events-none flex items-center justify-center">
        <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[10px] font-bold text-cyan-300 border border-cyan-500/40 shadow-lg flex items-center gap-1">
          <Map className="w-3 h-3" />
          <span>Zobraziť na mape ↗</span>
        </span>
      </div>

      {/* Bottom Legend */}
      <div className="absolute bottom-1 left-1.5 right-1.5 z-[1000] flex items-center justify-between px-2 py-0.5 rounded-lg bg-zinc-950/75 backdrop-blur-sm pointer-events-none text-[9px] text-zinc-400 font-medium">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span>You</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
          <span>#1..{nearbyPanoramas.length}</span>
        </span>
      </div>
    </div>
  );
};
