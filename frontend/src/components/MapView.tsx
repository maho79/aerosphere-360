import { panoConfig } from '../config/panoConfig';
import { AuthorCreditBadge } from './AuthorCreditBadge';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Supercluster from 'supercluster';
import type { Panorama, GPSPanorama } from '../types';
import { getResolutionCategory, getHorizontalK, cleanPanoPath, getMegapixels, getPanoramaGpsStatus } from '../types';
import { GpsStatusBadge } from './GpsStatusBadge';
import { PanoViewer } from './PanoViewer';
import type { ProjectionMode } from './ThreePanoViewer';
import { SidebarFilter } from './SidebarFilter';
import { PinHoverCard } from './PinHoverCard';
import { Toast, type ToastMessage } from './Toast';
import { ActiveFiltersBar } from './ActiveFiltersBar';
import { getMapShareUrl, getInitialUrlParams, copyToClipboard, generateShareId, generateShareKey, resolveShareKey } from '../utils/share';
import { recordDetailedShare, recordShareClick } from '../utils/social';
import { getPanoramaCity, formatPanoramaDate, formatGroupDayTitle, formatPanoramaDateTime, getDistance, formatDistance, getSavedCameraState } from '../utils/geo';
import { extractPanoramaTags, normalizeText } from '../utils/tags';
import { detectPanoramaMoods, type SceneMood } from '../utils/sceneIntel';
import { buildTimelineClusters, type TimelineCluster } from '../utils/timelineClusters';
import { analytics } from '../utils/analytics';
import {
  MapPin,
  Calendar,
  Share2,
  RefreshCw,
  SquareDashed,
  Globe2,
  Trash2,
  X,
  Lock,
  RotateCcw,
  LayoutGrid,
  MoreVertical,
  Check,
  Layers,
  Heart,
  ZoomIn,
  ZoomOut,
  Film,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  CheckSquare,
  Square,
  Tag,
  Navigation,
  HardDrive,
  LocateFixed,
  History,
  Compass,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useViewMode } from '../context/ViewModeContext';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { getFavoritePanoIds } from '../utils/social';
import { AdminTagEditorModal } from './AdminTagEditorModal';
import { AdminSmartGpsModal } from './AdminSmartGpsModal';

// Ensure Leaflet always attaches the proper referrer policy so OpenStreetMap tile usage policy is respected
if (typeof L !== 'undefined' && L.TileLayer && L.TileLayer.prototype) {
  (L.TileLayer.prototype.options as any).referrerPolicy = 'strict-origin-when-cross-origin';
}

// Custom clean Glass Noir marker icon (Public - Cyan) - non-pulsing solid glowing dot with generous 38x38 hit target
const customPinIcon = L.divIcon({
  className: 'glass-marker-wrapper',
  html: `
    <div class="glass-marker-container">
      <div class="glass-marker-dot"></div>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  tooltipAnchor: [0, -20],
  popupAnchor: [0, -20],
});

// Custom glowing Red marker icon for Private Panoramas (Admin Mode) - non-pulsing with 38x38 hit target
const privatePinIcon = L.divIcon({
  className: 'glass-marker-wrapper private-marker',
  html: `
    <div class="glass-marker-container">
      <div class="glass-marker-dot" style="background: #f43f5e; box-shadow: 0 0 10px #f43f5e, 0 0 3px #fda4af;"></div>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  tooltipAnchor: [0, -20],
  popupAnchor: [0, -20],
});

// Custom glowing Amber marker icon for Panoramas with auto GPS needing review
const reviewPinIcon = L.divIcon({
  className: 'glass-marker-wrapper review-marker',
  html: `
    <div class="glass-marker-container">
      <div class="glass-marker-dot" style="background: #f59e0b; box-shadow: 0 0 12px #f59e0b, 0 0 4px #fde68a;"></div>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  tooltipAnchor: [0, -20],
  popupAnchor: [0, -20],
});

// Custom glowing Neon Cyan marker icon for Selected Panoramas (Admin Multi-Selection) with 38x38 hit target
const selectedPinIcon = L.divIcon({
  className: 'glass-marker-wrapper selected-marker',
  html: `
    <div class="glass-marker-container">
      <div class="glass-marker-dot" style="background: #38bdf8; box-shadow: 0 0 14px #38bdf8, 0 0 5px #fff; width: 14px; height: 14px;"></div>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  tooltipAnchor: [0, -20],
  popupAnchor: [0, -20],
});

// Custom pulsing glowing marker icon for User's Current Location ("My Position")
const myLocationIcon = L.divIcon({
  className: 'my-location-marker-wrapper',
  html: `
    <div class="glass-my-location-container" title="Moja pozícia">
      <div class="glass-my-location-pulse"></div>
      <div class="glass-my-location-dot"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  tooltipAnchor: [0, -14],
  popupAnchor: [0, -14],
});

// Custom dynamic cluster badge icon generator
const createClusterIcon = (count: number) => {
  const size = count < 10 ? 34 : count < 100 ? 40 : 46;
  return L.divIcon({
    className: 'glass-cluster-wrapper',
    html: `
      <div class="glass-cluster-container" style="width: ${size}px; height: ${size}px; font-size: ${size < 36 ? 11 : size < 42 ? 12 : 13}px;">
        <span class="font-mono font-bold leading-none">${count}</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Custom subtle glowing anchor dot for unpacked dispersed cluster origin
const clusterOriginIcon = L.divIcon({
  className: 'cluster-origin-wrapper',
  html: `
    <div style="width: 8px; height: 8px; border-radius: 9999px; background: #06b6d4; box-shadow: 0 0 8px #06b6d4, 0 0 2px #fff; transform: translate(-4px, -4px); pointer-events: none;"></div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

// Custom numbered pin icon generator (Filmstrip mode) with 38x38 hit target
const createNumberedPinIcon = (
  num: number,
  isHovered: boolean,
  isSelected: boolean,
  isPrivate: boolean,
  isAutoReview: boolean = false
) => {
  const bg = isSelected
    ? 'linear-gradient(135deg, #0284c7, #38bdf8)'
    : isAutoReview
    ? 'linear-gradient(135deg, #d97706, #f59e0b)'
    : isPrivate
    ? 'linear-gradient(135deg, #e11d48, #f43f5e)'
    : isHovered
    ? 'linear-gradient(135deg, #f59e0b, #fde047)'
    : 'linear-gradient(135deg, #0891b2, #06b6d4)';
  const textColor = isHovered || isAutoReview ? '#090a0f' : '#ffffff';
  const ringStyle = isHovered
    ? 'box-shadow: 0 0 0 3px #fbbf24, 0 0 16px rgba(251, 191, 36, 0.9), 0 4px 10px rgba(0,0,0,0.8); transform: scale(1.22);'
    : isSelected
    ? 'box-shadow: 0 0 0 2px #38bdf8, 0 0 12px rgba(56, 189, 248, 0.8), 0 4px 8px rgba(0,0,0,0.7);'
    : 'box-shadow: 0 0 0 1.5px rgba(255,255,255,0.9), 0 4px 8px rgba(0,0,0,0.7);';

  return L.divIcon({
    className: 'numbered-pin-marker',
    html: `
      <div style="width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s ease-out;">
        <div style="width: 26px; height: 26px; border-radius: 9999px; background: ${bg}; color: ${textColor}; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: ${num >= 100 ? '10px' : '11px'}; font-weight: 900; line-height: 1; ${ringStyle}">
          ${num}
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    tooltipAnchor: [0, -20],
    popupAnchor: [0, -20],
  });
};

// Custom timeline cluster pin icon (#10 badge)
const createTimelineClusterPinIcon = (
  count: number,
  isHovered: boolean,
  isSelected: boolean
) => {
  const bg = isSelected
    ? 'linear-gradient(135deg, #0284c7, #38bdf8)'
    : isHovered
    ? 'linear-gradient(135deg, #f59e0b, #fde047)'
    : 'linear-gradient(135deg, #d97706, #f59e0b)';
  const textColor = '#090a0f';
  const ringStyle = isHovered
    ? 'box-shadow: 0 0 0 3px #fbbf24, 0 0 16px rgba(251, 191, 36, 0.9), 0 4px 10px rgba(0,0,0,0.8); transform: scale(1.22);'
    : isSelected
    ? 'box-shadow: 0 0 0 2px #38bdf8, 0 0 12px rgba(56, 189, 248, 0.8), 0 4px 8px rgba(0,0,0,0.7);'
    : 'box-shadow: 0 0 0 2px #fde047, 0 0 12px rgba(245, 158, 11, 0.8), 0 4px 8px rgba(0,0,0,0.7);';

  return L.divIcon({
    className: 'timeline-cluster-pin-marker',
    html: `
      <div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s ease-out;">
        <div style="min-width: 28px; height: 26px; padding: 0 6px; border-radius: 9999px; background: ${bg}; color: ${textColor}; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: ${count >= 100 ? '10px' : '11px'}; font-weight: 900; line-height: 1; ${ringStyle}">
          #${count}
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    tooltipAnchor: [0, -22],
    popupAnchor: [0, -22],
  });
};

interface MapMarqueeSelectorProps {
  active: boolean;
  onSelectBounds: (bounds: L.LatLngBounds) => void;
  onSingleClick?: (latlng: L.LatLng) => void;
}

const MapMarqueeSelector: React.FC<MapMarqueeSelectorProps> = ({
  active,
  onSelectBounds,
  onSingleClick,
}) => {
  const map = useMap();
  const rectRef = useRef<L.Rectangle | null>(null);
  const startPointRef = useRef<L.LatLng | null>(null);
  const startPixelRef = useRef<L.Point | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const container = map.getContainer();

    if (!active) {
      container.classList.remove('map-marquee-active');
      container.style.cursor = '';
      if (rectRef.current) {
        rectRef.current.remove();
        rectRef.current = null;
      }
      map.dragging.enable();
      map.boxZoom?.enable();
      map.doubleClickZoom?.enable();
      return;
    }

    container.classList.add('map-marquee-active');
    map.dragging.disable();
    map.boxZoom?.disable();
    map.doubleClickZoom?.disable();
    container.style.cursor = 'crosshair';

    const onWindowMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !startPointRef.current || !rectRef.current) return;
      e.preventDefault();
      try {
        const currentLatLng = map.mouseEventToLatLng(e);
        const bounds = L.latLngBounds(startPointRef.current, currentLatLng);
        rectRef.current.setBounds(bounds);
      } catch (_) {}
    };

    const onWindowMouseUp = (e: MouseEvent) => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);

      if (!isDraggingRef.current || !startPointRef.current) return;
      isDraggingRef.current = false;

      try {
        const endLatLng = map.mouseEventToLatLng(e);
        const startPx = startPixelRef.current;
        const endPx = map.mouseEventToContainerPoint(e);
        const distancePx = startPx ? startPx.distanceTo(endPx) : 100;

        if (distancePx > 7) {
          // Real box drag
          const bounds = L.latLngBounds(startPointRef.current, endLatLng);
          onSelectBounds(bounds);
          setTimeout(() => {
            if (rectRef.current) {
              rectRef.current.remove();
              rectRef.current = null;
            }
          }, 1000);
        } else {
          // Click on point
          if (rectRef.current) {
            rectRef.current.remove();
            rectRef.current = null;
          }
          onSingleClick?.(endLatLng);
        }
      } catch (_) {
        if (rectRef.current) {
          rectRef.current.remove();
          rectRef.current = null;
        }
      }

      startPointRef.current = null;
      startPixelRef.current = null;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const latlng = map.mouseEventToLatLng(e);
      isDraggingRef.current = true;
      startPointRef.current = latlng;
      startPixelRef.current = map.mouseEventToContainerPoint(e);

      if (rectRef.current) {
        rectRef.current.remove();
        rectRef.current = null;
      }

      rectRef.current = L.rectangle(
        L.latLngBounds(latlng, latlng),
        {
          color: '#38bdf8',
          weight: 2,
          fillColor: '#06b6d4',
          fillOpacity: 0.25,
          dashArray: '4, 4',
          interactive: false,
        }
      ).addTo(map);

      window.addEventListener('mousemove', onWindowMouseMove, { passive: false });
      window.addEventListener('mouseup', onWindowMouseUp);
    };

    container.addEventListener('mousedown', handleMouseDown);

    return () => {
      container.classList.remove('map-marquee-active');
      container.style.cursor = '';
      map.dragging.enable();
      map.boxZoom?.enable();
      map.doubleClickZoom?.enable();
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      if (rectRef.current) {
        rectRef.current.remove();
        rectRef.current = null;
      }
    };
  }, [active, map, onSelectBounds, onSingleClick]);

  return null;
};

interface MapControllerProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  hasInitialCoords: boolean;
  validPanoramas: GPSPanorama[];
  mapStyle?: string;
  flyToTarget?: { lat: number; lng: number; zoom: number; timestamp: number } | null;
  onMapChange: (lat: number, lng: number, zoom: number, bounds: L.LatLngBounds) => void;
  onMapReady?: (map: L.Map) => void;
}

const MapController: React.FC<MapControllerProps> = ({
  initialCenter,
  initialZoom,
  hasInitialCoords,
  validPanoramas,
  mapStyle,
  flyToTarget,
  onMapChange,
  onMapReady,
}) => {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    onMapReady?.(map);
  }, [map, onMapReady]);

  useEffect(() => {
    if (!initialized.current && validPanoramas.length > 0) {
      if (hasInitialCoords && initialCenter && initialZoom) {
        map.setView(initialCenter, initialZoom);
      } else {
        // Dynamically fit bounds to cover all panoramas exactly
        const bounds = L.latLngBounds(validPanoramas.map((p) => [p.lat, p.lon]));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        } else if (initialCenter && initialZoom) {
          map.setView(initialCenter, initialZoom);
        }
      }
      initialized.current = true;
      const center = map.getCenter();
      onMapChange(center.lat, center.lng, map.getZoom(), map.getBounds());
    }
  }, [hasInitialCoords, initialCenter, initialZoom, validPanoramas, map, onMapChange]);

  useEffect(() => {
    if (flyToTarget) {
      map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom, { duration: 0.8 });
    }
  }, [flyToTarget, map]);

  useEffect(() => {
    const container = map.getContainer();
    container.classList.remove('map-style-dark', 'map-style-voyager', 'map-style-satellite');
    if (mapStyle) {
      container.classList.add(`map-style-${mapStyle}`);
    }
  }, [mapStyle, map]);

  useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onMapChange(center.lat, center.lng, map.getZoom(), map.getBounds());
    },
    zoomend: () => {
      const center = map.getCenter();
      onMapChange(center.lat, center.lng, map.getZoom(), map.getBounds());
    },
  });

  return null;
};

interface PanoMapMarkerProps {
  pano: GPSPanorama;
  position: [number, number];
  keySuffix?: string;
  isSelected: boolean;
  isHovered: boolean;
  pinNumber?: number;
  isAdmin: boolean;
  isMarqueeActive: boolean;
  isTouchDevice: boolean;
  filmstripActive: boolean;
  onSelectPano: (pano: Panorama) => void;
  onToggleSelectPano: (id: string) => void;
  onHoverPano: (id: string | null) => void;
}

const PanoMapMarker: React.FC<PanoMapMarkerProps> = ({
  pano,
  position,
  keySuffix,
  isSelected,
  isHovered,
  pinNumber,
  isAdmin,
  isMarqueeActive,
  isTouchDevice,
  filmstripActive,
  onSelectPano,
  onToggleSelectPano,
  onHoverPano,
}) => {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (isTouchDevice || isMarqueeActive) {
      if (markerRef.current && (markerRef.current as any).getTooltip?.() && markerRef.current.isTooltipOpen()) {
        markerRef.current.closeTooltip();
      }
      return;
    }
    const marker = markerRef.current;
    if (!marker) return;

    try {
      const hasTooltip = typeof (marker as any).getTooltip === 'function' && Boolean((marker as any).getTooltip());
      if (!hasTooltip) return;

      if (isHovered) {
        const timer = setTimeout(() => {
          try {
            if (markerRef.current && (markerRef.current as any).getTooltip?.() && !markerRef.current.isTooltipOpen()) {
              markerRef.current.openTooltip();
            }
          } catch {}
        }, 10);
        return () => clearTimeout(timer);
      } else {
        if ((marker as any).getTooltip?.() && marker.isTooltipOpen()) {
          marker.closeTooltip();
        }
      }
    } catch {
      // Safe guard against missing tooltips or unmounted markers
    }
  }, [isHovered, isTouchDevice, isMarqueeActive]);

  const isAutoReview = getPanoramaGpsStatus(pano) === 'auto_needs_review';
  const isClusterRep = Boolean((pano as any).cluster_count);
  const icon =
    isClusterRep
      ? createTimelineClusterPinIcon((pano as any).cluster_count, isHovered, isSelected)
      : pinNumber !== undefined
      ? createNumberedPinIcon(
          pinNumber,
          isHovered,
          isSelected,
          Boolean(pano.is_private),
          isAutoReview
        )
      : isSelected
      ? selectedPinIcon
      : isAutoReview
      ? reviewPinIcon
      : pano.is_private
      ? privatePinIcon
      : customPinIcon;

  // Dynamically calculate tooltip placement so it never covers the dot and never clips off any edge
  let tooltipDirection: 'top' | 'bottom' | 'right' | 'left' = 'top';
  let tooltipOffset: [number, number] = [0, -12];

  try {
    const pt = map.latLngToContainerPoint(position);
    const size = map.getSize();

    const cardW = 290;
    const cardH = 285;
    const pinMargin = 22;
    const minX = 12;
    const maxX = size.x - 12;
    const minY = 55;
    const maxY = filmstripActive ? size.y - 150 : size.y - 15;

    const spaceAbove = pt.y - minY;
    const spaceBelow = maxY - pt.y;

    // Always prefer placing ABOVE the pin ('top').
    // Only flip to 'bottom' if space above is severely constrained (< 120px) AND space below is significantly larger.
    if (spaceAbove >= cardH + pinMargin || spaceAbove >= 120 || spaceAbove >= spaceBelow) {
      // 1. Fits cleanly ABOVE the pin (standard preferred)
      tooltipDirection = 'top';
      let xOffset = 0;
      if (pt.x - cardW / 2 < minX) {
        xOffset = minX + cardW / 2 - pt.x;
      } else if (pt.x + cardW / 2 > maxX) {
        xOffset = maxX - cardW / 2 - pt.x;
      }
      // If pin is near top, clamp yOffset so card top never clips above minY
      let yOffset = -pinMargin;
      const topEdge = pt.y - pinMargin - cardH;
      if (topEdge < minY) {
        yOffset = -pinMargin + (minY - topEdge);
      }
      tooltipOffset = [xOffset, yOffset];
    } else if (spaceBelow >= cardH + pinMargin) {
      // 2. Fits cleanly BELOW the pin
      tooltipDirection = 'bottom';
      let xOffset = 0;
      if (pt.x - cardW / 2 < minX) {
        xOffset = minX + cardW / 2 - pt.x;
      } else if (pt.x + cardW / 2 > maxX) {
        xOffset = maxX - cardW / 2 - pt.x;
      }
      tooltipOffset = [xOffset, pinMargin];
    } else {
      // 3. Vertical space is tight -> place to RIGHT or LEFT of dot
      const spaceRight = maxX - pt.x;
      const spaceLeft = pt.x - minX;
      const placeRight = spaceRight >= spaceLeft;

      tooltipDirection = placeRight ? 'right' : 'left';
      const xOffset = placeRight ? pinMargin : -pinMargin;

      let yOffset = 0;
      if (pt.y - cardH / 2 < minY) {
        yOffset = minY + cardH / 2 - pt.y;
      } else if (pt.y + cardH / 2 > maxY) {
        yOffset = maxY - cardH / 2 - pt.y;
      }
      tooltipOffset = [xOffset, yOffset];
    }
  } catch {
    tooltipDirection = 'top';
    tooltipOffset = [0, -12];
  }

  return (
    <Marker
      ref={markerRef}
      key={`pano-${pano.id}${keySuffix ? `-${keySuffix}` : ''}`}
      position={position}
      icon={icon}
      zIndexOffset={isHovered ? 1000 : undefined}
      eventHandlers={{
        click: (e) => {
          if (isMarqueeActive) {
            e.originalEvent.stopPropagation();
            onToggleSelectPano(pano.id);
            return;
          }
          if (
            isAdmin &&
            (e.originalEvent.ctrlKey ||
              e.originalEvent.shiftKey)
          ) {
            onToggleSelectPano(pano.id);
            return;
          }
          onSelectPano(pano);
        },
        mouseover: () => {
          if (isMarqueeActive) return;
          onHoverPano(String(pano.id));
        },
        mouseout: (e) => {
          if (isMarqueeActive) return;
          const related = (e.originalEvent as MouseEvent)?.relatedTarget as HTMLElement | null;
          if (related && (related.closest('.leaflet-tooltip') || related.closest('.glass-noir-tooltip'))) {
            return;
          }
          onHoverPano(null);
        },
      }}
    >
      {!isTouchDevice && !isMarqueeActive && (
        <Tooltip
          key={`tooltip-${tooltipDirection}-${tooltipOffset[0]}-${tooltipOffset[1]}`}
          direction={tooltipDirection}
          offset={tooltipOffset}
          opacity={1}
          className="glass-noir-tooltip"
          sticky={false}
          interactive={true}
        >
          <div
            onMouseLeave={() => {
              if (isHovered) {
                onHoverPano(null);
              }
            }}
          >
            <PinHoverCard
              panorama={pano}
              onExplore={() => onSelectPano(pano)}
            />
          </div>
        </Tooltip>
      )}
    </Marker>
  );
};

interface ClusteredMarkersProps {
  panoramas: GPSPanorama[];
  isAdmin: boolean;
  isMarqueeActive: boolean;
  selectedPanoIds: Set<string>;
  onSelectPano: (pano: Panorama) => void;
  onToggleSelectPano: (id: string) => void;
  filmstripMode: boolean;
  isFilmstripEligible: boolean;
  panoNumberMap: Map<string, number>;
  hoveredPanoId: string | null;
  onHoverPano: (id: string | null) => void;
}

const ClusteredMarkers: React.FC<ClusteredMarkersProps> = ({
  panoramas,
  isAdmin,
  isMarqueeActive,
  selectedPanoIds,
  onSelectPano,
  onToggleSelectPano,
  filmstripMode,
  isFilmstripEligible,
  panoNumberMap,
  hoveredPanoId,
  onHoverPano,
}) => {
  const { isMobileMode } = useViewMode();
  const map = useMap();
  const [zoom, setZoom] = useState<number>(() => Math.floor(map.getZoom()));
  const [bounds, setBounds] = useState<[number, number, number, number]>(() => {
    const b = map.getBounds();
    return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
  });

  const isTouchDevice = useMemo(() => {
    return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const activePinsRef = useRef<Array<{ pano: GPSPanorama; lat: number; lon: number }>>([]);

  useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      setZoom(Math.floor(map.getZoom()));
    },
    zoomend: () => {
      const b = map.getBounds();
      setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      setZoom(Math.floor(map.getZoom()));
    },
    click: (e) => {
      if (isMarqueeActive) return;
      const clickPt = e.containerPoint;
      let closestPano: GPSPanorama | null = null;
      let minDistance = Infinity;

      for (const item of activePinsRef.current) {
        const pinPt = map.latLngToContainerPoint([item.lat, item.lon]);
        const dist = clickPt.distanceTo(pinPt);
        if (dist < minDistance) {
          minDistance = dist;
          closestPano = item.pano;
        }
      }

      // Robust hit-testing: if user clicked anywhere within 36px of any visible panorama circle, open it immediately
      if (closestPano && minDistance <= 36) {
        if (
          isAdmin &&
          (e.originalEvent.ctrlKey ||
            e.originalEvent.shiftKey)
        ) {
          onToggleSelectPano(closestPano.id);
          return;
        }
        onSelectPano(closestPano);
      }
    },
  });

  const superclusterInstance = useMemo(() => {
    const index = new Supercluster({
      radius: 40,
      maxZoom: 19,
    });
    const points = panoramas.map((p) => ({
      type: 'Feature' as const,
      properties: {
        cluster: false,
        panoId: p.id,
        panorama: p,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [p.lon, p.lat],
      },
    }));
    index.load(points);
    return index;
  }, [panoramas]);

  const clusters = useMemo(() => {
    try {
      return superclusterInstance.getClusters(bounds, zoom);
    } catch {
      return [];
    }
  }, [superclusterInstance, bounds, zoom]);

  // Projected screen positions of all clusters and points for neighbor clearance analysis
  const projectedFeatures = useMemo(() => {
    return clusters.map((c, idx) => {
      const [lng, lat] = c.geometry.coordinates;
      const pt = map.project(L.latLng(lat, lng), zoom);
      const isCluster = Boolean(c.properties.cluster);
      const count = isCluster ? (c.properties.point_count as number) : 1;
      return {
        idx,
        cluster: c,
        lat,
        lng,
        pt,
        isCluster,
        count,
      };
    });
  }, [clusters, map, zoom]);

  // Decision map: should a cluster (< 10 items) be unpacked into individual pins?
  const unpackedClustersMap = useMemo(() => {
    const mapOfUnpacked = new Map<number, boolean>();

    for (const item of projectedFeatures) {
      if (!item.isCluster) continue;
      const clusterId = item.cluster.id as number;
      const count = item.count;

      // In filmstrip mode (< 31 panos on map) or at zoom >= 15, always unpack so all panoramas have pins
      if ((filmstripMode && isFilmstripEligible) || zoom >= 15) {
        mapOfUnpacked.set(clusterId, true);
        continue;
      }

      // Only clusters with fewer than 10 panoramas are unpacked
      if (count >= 10) {
        mapOfUnpacked.set(clusterId, false);
        continue;
      }

      // At zoom >= 15, always unpack so all panoramas are accessible even if meter-close
      if (zoom >= 15) {
        mapOfUnpacked.set(clusterId, true);
        continue;
      }

      // Find screen distance in pixels to nearest neighbor feature
      let minDistance = Infinity;
      for (const other of projectedFeatures) {
        if (other.idx === item.idx) continue;
        const dist = item.pt.distanceTo(other.pt);
        if (dist < minDistance) {
          minDistance = dist;
        }
      }

      // Dispersal footprint + neighbor clearance margin
      const dispersalRadius = count === 2 ? 22 : 24 + Math.min(count - 3, 6) * 3.5;
      const physicalBase = dispersalRadius + 28;

      let margin = 16;
      if (zoom <= 8) {
        margin = 32; // Strict on whole Slovakia zoom to keep dense clusters clean
      } else if (zoom <= 12) {
        margin = 16; // Generous on regional zoom (e.g. Kosice & Presov)
      } else if (zoom <= 15) {
        margin = 6;
      } else {
        margin = 0;
      }

      const threshold = physicalBase + margin;
      mapOfUnpacked.set(clusterId, minDistance >= threshold);
    }

    return mapOfUnpacked;
  }, [projectedFeatures, zoom, filmstripMode, isFilmstripEligible]);

  // Reusable helper to render standard interactive panorama pin
  const renderPanoMarker = (
    pano: GPSPanorama,
    position: [number, number],
    keySuffix?: string
  ) => {
    const isSelected = selectedPanoIds.has(String(pano.id));
    const isHovered = hoveredPanoId === String(pano.id);
    const pinNumber =
      filmstripMode && isFilmstripEligible
        ? panoNumberMap.get(String(pano.id))
        : undefined;

    return (
      <PanoMapMarker
        key={`pano-${pano.id}${keySuffix ? `-${keySuffix}` : ''}`}
        pano={pano}
        position={position}
        keySuffix={keySuffix}
        isSelected={isSelected}
        isHovered={isHovered}
        pinNumber={pinNumber}
        isAdmin={isAdmin}
        isMarqueeActive={isMarqueeActive}
        isTouchDevice={isTouchDevice}
        filmstripActive={filmstripMode && isFilmstripEligible}
        onSelectPano={onSelectPano}
        onToggleSelectPano={onToggleSelectPano}
        onHoverPano={onHoverPano}
      />
    );
  };

  const renderedPins: Array<{ pano: GPSPanorama; lat: number; lon: number }> = [];

  const markersElements = clusters.map((cluster) => {
    const [longitude, latitude] = cluster.geometry.coordinates;
    const { cluster: isCluster, point_count: pointCount } = cluster.properties;

    if (isCluster) {
      const clusterId = cluster.id as number;
      const shouldUnpack = unpackedClustersMap.get(clusterId);

      if (shouldUnpack) {
        try {
          const leaves = superclusterInstance.getLeaves(clusterId, Infinity);
          if (leaves.length > 0) {
            // Deterministic sort honoring filmstrip numbers
            leaves.sort((a, b) => {
              const idA = String(a.properties.panoId);
              const idB = String(b.properties.panoId);
              const numA = panoNumberMap.get(idA) ?? Infinity;
              const numB = panoNumberMap.get(idB) ?? Infinity;
              if (numA !== numB) return numA - numB;
              return idA.localeCompare(idB);
            });

            const centerPt = map.project(L.latLng(latitude, longitude), zoom);
            const N = leaves.length;

            // Check natural pairwise screen distances
            const projectedLeaves = leaves.map((leaf) => {
              const p = leaf.properties.panorama as GPSPanorama;
              return {
                leaf,
                pano: p,
                naturalPt: map.project(L.latLng(p.lat, p.lon), zoom),
              };
            });

            let anyOverlap = false;
            for (let i = 0; i < projectedLeaves.length; i++) {
              for (let j = i + 1; j < projectedLeaves.length; j++) {
                if (projectedLeaves[i].naturalPt.distanceTo(projectedLeaves[j].naturalPt) < 28) {
                  anyOverlap = true;
                  break;
                }
              }
              if (anyOverlap) break;
            }

            if (!anyOverlap) {
              // Natural coordinates already have >= 28px screen space, no offset or lines needed
              return (
                <React.Fragment key={`unpacked-cluster-${clusterId}`}>
                  {projectedLeaves.map(({ pano }) => {
                    renderedPins.push({ pano, lat: pano.lat, lon: pano.lon });
                    return renderPanoMarker(pano, [pano.lat, pano.lon]);
                  })}
                </React.Fragment>
              );
            }

            // Dispersal layout when meter-close or overlapping
            let offsets: Array<{ dx: number; dy: number }> = [];
            if (N === 2) {
              const R = 26;
              const p0 = projectedLeaves[0].naturalPt;
              const p1 = projectedLeaves[1].naturalPt;
              const dist = p0.distanceTo(p1);
              if (dist > 0.5) {
                const ux = (p1.x - p0.x) / dist;
                const uy = (p1.y - p0.y) / dist;
                offsets = [
                  { dx: -ux * R, dy: -uy * R },
                  { dx: ux * R, dy: uy * R },
                ];
              } else {
                const cos35 = 0.819;
                const sin35 = 0.574;
                offsets = [
                  { dx: -R * cos35, dy: R * sin35 },
                  { dx: R * cos35, dy: -R * sin35 },
                ];
              }
            } else {
              const R = 26 + Math.min(N - 3, 6) * 3.8;
              offsets = leaves.map((_, k) => {
                const angle = (2 * Math.PI * k) / N - Math.PI / 2;
                return {
                  dx: R * Math.cos(angle),
                  dy: R * Math.sin(angle),
                };
              });
            }

            return (
              <React.Fragment key={`unpacked-cluster-${clusterId}`}>
                {/* Subtle origin anchor dot marking the photo capture position */}
                <Marker
                  position={[latitude, longitude]}
                  icon={clusterOriginIcon}
                  // @ts-ignore
                  interactive={false}
                />

                {/* Connecting spider lines leading to each unpacked panorama */}
                {projectedLeaves.map(({ pano }, k) => {
                  const offset = offsets[k];
                  const displayPt = L.point(centerPt.x + offset.dx, centerPt.y + offset.dy);
                  const displayLatLng = map.unproject(displayPt, zoom);
                  const isHovered = hoveredPanoId === String(pano.id);

                  return (
                    <Polyline
                      key={`spider-line-${pano.id}`}
                      positions={[
                        [latitude, longitude],
                        [displayLatLng.lat, displayLatLng.lng],
                      ]}
                      pathOptions={{
                        color: isHovered ? '#38bdf8' : '#06b6d4',
                        weight: isHovered ? 2.5 : 1.5,
                        opacity: isHovered ? 0.95 : 0.65,
                        dashArray: '3, 4',
                        lineCap: 'round',
                      }}
                      eventHandlers={{
                        mouseover: () => {
                          if (isMarqueeActive) return;
                          onHoverPano(String(pano.id));
                        },
                        mouseout: () => {
                          if (isMarqueeActive) return;
                          onHoverPano(null);
                        },
                        click: () => {
                          if (isMarqueeActive) {
                            onToggleSelectPano(pano.id);
                            return;
                          }
                          onSelectPano(pano);
                        },
                      }}
                    />
                  );
                })}

                {/* Interactive dispersed panorama pins */}
                {projectedLeaves.map(({ pano }, k) => {
                  const offset = offsets[k];
                  const displayPt = L.point(centerPt.x + offset.dx, centerPt.y + offset.dy);
                  const displayLatLng = map.unproject(displayPt, zoom);
                  renderedPins.push({ pano, lat: displayLatLng.lat, lon: displayLatLng.lng });
                  return renderPanoMarker(
                    pano,
                    [displayLatLng.lat, displayLatLng.lng],
                    `unpacked-${clusterId}`
                  );
                })}
              </React.Fragment>
            );
          }
        } catch (err) {
          console.warn('Failed to unpack cluster leaves:', err);
        }
      }

      // Otherwise render regular cluster badge
      return (
        <Marker
          key={`cluster-${clusterId}-${longitude}-${latitude}`}
          position={[latitude, longitude]}
          icon={createClusterIcon(pointCount)}
          eventHandlers={{
            click: () => {
              try {
                const leaves = superclusterInstance.getLeaves(clusterId, Infinity);
                const currentZoom = map.getZoom();

                if (!leaves || leaves.length === 0) {
                  map.flyTo([latitude, longitude], Math.min(currentZoom + 2, 16), {
                    duration: 0.5,
                  });
                  return;
                }

                if (leaves.length === 1) {
                  const p = leaves[0].properties.panorama as GPSPanorama;
                  onSelectPano(p);
                  return;
                }

                let minLng = leaves[0].geometry.coordinates[0];
                let maxLng = minLng;
                let minLat = leaves[0].geometry.coordinates[1];
                let maxLat = minLat;
                for (const leaf of leaves) {
                  const [cLng, cLat] = leaf.geometry.coordinates;
                  if (cLng < minLng) minLng = cLng;
                  if (cLng > maxLng) maxLng = cLng;
                  if (cLat < minLat) minLat = cLat;
                  if (cLat > maxLat) maxLat = cLat;
                }

                const centerLat = (minLat + maxLat) / 2;
                const centerLng = (minLng + maxLng) / 2;

                const p1 = L.latLng(minLat, minLng);
                const p2 = L.latLng(maxLat, maxLng);
                const spanMeters = p1.distanceTo(p2);

                const isMobile = isMobileMode || window.innerWidth < 768;

                if (spanMeters < 30) {
                  // Panoramas are clustered at essentially the exact same viewpoint/location (< 30m)
                  // Don't overzoom to empty areas! Zoom safely to level 15 (or 16 if already >= 15),
                  // where unpacked spider dispersal pins display each panorama clearly.
                  const targetZoom = Math.min(Math.max(currentZoom + 2, 15), 16);
                  map.flyTo([centerLat, centerLng], targetZoom, {
                    duration: 0.5,
                    easeLinearity: 0.3,
                  });
                } else {
                  // Panoramas are spread out across a geographic area.
                  // Fit within bounds respecting mobile top header and bottom filmstrip/controls padding.
                  const bounds = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
                  const padTop = isMobile ? 80 : 60;
                  const padBottom = isMobile ? 140 : 80;
                  const padSide = isMobile ? 30 : 60;

                  const boundsZoom = bounds.isValid()
                    ? map.getBoundsZoom(bounds, false, L.point(padSide * 2, padTop + padBottom))
                    : 16;

                  // Never zoom deeper than boundsZoom (otherwise dots disappear outside screen),
                  // step at least +1 or +2 from currentZoom, and clamp to max 16.
                  const expansionZoom = superclusterInstance.getClusterExpansionZoom(clusterId);
                  const safeExpansion = Math.min(expansionZoom, boundsZoom);
                  const finalZoom = Math.min(
                    Math.max(safeExpansion, Math.min(currentZoom + 2, boundsZoom)),
                    16
                  );

                  map.flyToBounds(bounds, {
                    paddingTopLeft: [padSide, padTop],
                    paddingBottomRight: [padSide, padBottom],
                    maxZoom: finalZoom,
                    duration: 0.6,
                    easeLinearity: 0.3,
                  });
                }
              } catch {
                map.flyTo([latitude, longitude], Math.min(map.getZoom() + 2, 16));
              }
            },
          }}
        />
      );
    }

    const pano = cluster.properties.panorama as GPSPanorama;
    renderedPins.push({ pano, lat: pano.lat, lon: pano.lon });
    return renderPanoMarker(pano, [pano.lat, pano.lon]);
  });

  activePinsRef.current = renderedPins;

  return <>{markersElements}</>;
};

interface MapViewProps {
  panoramas: Panorama[];
  onRefreshPanoramas?: () => void;
  onExternalSelectPano?: (pano: Panorama) => void;
  isDeletedView?: boolean;
  onRegisterShareHandler?: (handler: (() => void) | undefined) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  panoramas,
  onRefreshPanoramas,
  onExternalSelectPano,
  isDeletedView = false,
  onRegisterShareHandler,
}) => {
  const {
    isAdmin,
    setShowAdminModal,
    selectedPanoIds,
    toggleSelectPano,
    selectPanos,
    deselectPanos,
    clearSelection,
    isPanoSelected,
    batchUpdatePanoramas,
    togglePanoramaPublic,
    recordPanoramaView,
  } = useAdmin();

  const location = useLocation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isMobileMode } = useViewMode();
  const initialParams = useMemo(() => getInitialUrlParams(), []);
  const [tilesMode, setTilesMode] = useState<boolean>(() => Boolean(initialParams.tilesMode));
  const [filmstripMode, setFilmstripMode] = useState<boolean>(() => Boolean(initialParams.filmstripMode));
  const [userDismissedFilmstrip, setUserDismissedFilmstrip] = useState<boolean>(false);
  const [explicitlyForcedFilmstrip, setExplicitlyForcedFilmstrip] = useState<boolean>(() => Boolean(initialParams.filmstripMode));
  const [filmstripSize, setFilmstripSize] = useState<'mini' | 'normal' | 'large'>('normal');
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const filmstripDrawerRef = useRef<HTMLDivElement | null>(null);
  const [filmstripHeight, setFilmstripHeight] = useState<number>(0);

  // On mobile devices, filmstrip defaults to normal size in portrait, and mini in landscape
  useEffect(() => {
    const handleOrientation = () => {
      if (typeof window !== 'undefined' && (isMobileMode || window.innerWidth < 768 || window.innerHeight < 550 || ('ontouchstart' in window && Math.min(window.innerWidth, window.innerHeight) < 600))) {
        const isLandscape = window.innerWidth > window.innerHeight;
        setFilmstripSize(isLandscape ? 'mini' : 'normal');
      }
    };
    handleOrientation();
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, [isMobileMode]);

  const [activeProjectionMode, setActiveProjectionMode] = useState<ProjectionMode>(() => {
    if (initialParams.panoProj && ['rectilinear', 'curved', 'little_planet'].includes(initialParams.panoProj)) {
      return initialParams.panoProj as ProjectionMode;
    }
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pano_projection_mode') : null;
    if (saved && ['rectilinear', 'curved', 'little_planet'].includes(saved)) {
      return saved as ProjectionMode;
    }
    return 'rectilinear';
  });
  const [hoveredPanoId, setHoveredPanoId] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const filmstripScrollRef = useRef<HTMLDivElement | null>(null);
  const isDeletedMode = isDeletedView || location.pathname === '/deleted' || location.search.includes('folder=!DELETED!');
  const [isMarqueeActive, setIsMarqueeActive] = useState<boolean>(false);
  const [showTagEditorModal, setShowTagEditorModal] = useState<boolean>(false);
  const [showSmartGpsModal, setShowSmartGpsModal] = useState<boolean>(false);
  const [smartGpsTargetPanos, setSmartGpsTargetPanos] = useState<Panorama[] | null>(null);
  const [openCalibrationOnPano, setOpenCalibrationOnPano] = useState<boolean>(false);

  // Shortcut T for Admin Tag Editor on multi-selected panoramas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if ((e.key === 't' || e.key === 'T') && isAdmin) {
        if (selectedPanoIds.size > 0) {
          e.preventDefault();
          setShowTagEditorModal(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin, selectedPanoIds]);

  const selectedPanosList = useMemo(() => {
    return panoramas.filter((p) => selectedPanoIds.has(String(p.id)));
  }, [panoramas, selectedPanoIds]);

  const handleScrollFilmstrip = (direction: 'left' | 'right') => {
    if (filmstripScrollRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      filmstripScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleTogglePanoPublic = async (e: React.MouseEvent, p: Panorama) => {
    e.stopPropagation();
    try {
      await togglePanoramaPublic(p.id, Boolean(p.is_private));
      onRefreshPanoramas?.();
    } catch (err) {
      console.error('Failed to toggle public state:', err);
    }
  };

  // Synchronize initial language if specified in URL (?lang=sk or ?lang=en)
  useEffect(() => {
    if (initialParams.lang && (initialParams.lang === 'sk' || initialParams.lang === 'en')) {
      if (i18n.language !== initialParams.lang) {
        i18n.changeLanguage(initialParams.lang);
      }
    }
  }, [initialParams.lang]);

  // Resolved shared map view (from ?key=xyz) – applied to Leaflet once the map has initialized
  const [sharedMapView, setSharedMapView] = useState<{ lat: number; lng: number; zoom: number } | null>(null);

  // Record click / visit on shared link if SID or key is present in URL
  useEffect(() => {
    if (initialParams.sid) {
      recordShareClick(initialParams.sid);
    }
    if (initialParams.shareKey) {
      resolveShareKey(initialParams.shareKey, initialParams.panoId).then((resolved) => {
        if (resolved?.found && resolved.params) {
          const p = resolved.params;
          const lat = Number(p.lat);
          const lng = Number(p.lng);
          if (!initialParams.panoId && !isNaN(lat) && !isNaN(lng)) {
            const zoom = p.zoom !== undefined && !isNaN(Number(p.zoom)) ? Number(p.zoom) : 12;
            setMapCenter([lat, lng]);
            setMapZoom(zoom);
            setSharedMapView({ lat, lng, zoom });
          }
          if (Array.isArray(p.years)) setSelectedYears(p.years);
          if (Array.isArray(p.months)) setSelectedMonths(p.months);
          if (Array.isArray(p.resolutions)) setSelectedResolutions(p.resolutions);
          if (Array.isArray(p.tags)) setSelectedTags(p.tags);
          if (p.searchQuery) setSearchQuery(p.searchQuery);
          if (p.onlyFavorites) setOnlyFavorites(true);
          if (p.onlyTimelineClusters) setOnlyTimelineClusters(true);
          if (p.filmstrip) {
            setExplicitlyForcedFilmstrip(true);
            setUserDismissedFilmstrip(false);
            setFilmstripMode(true);
          }
          if (p.tiles) setTilesMode(true);
          if (p.tileSize === 'large') setTileSize('large');
          if (p.tilesGroupBy === 'location' || p.tilesGroupBy === 'date') setTilesGroupBy(p.tilesGroupBy);
          if (p.style && ['dark', 'voyager', 'satellite'].includes(p.style)) setMapStyle(p.style);
          if (p.lang && (p.lang === 'sk' || p.lang === 'en')) i18n.changeLanguage(p.lang);
        }
      });
    }
  }, [initialParams.sid, initialParams.shareKey, initialParams.panoId]);

  // Filter out panoramas:
  // In normal mode: hide all deleted / !DELETED! (neither public nor normal private sees them)
  // In deleted mode: show ONLY panoramas marked deleted or in '!DELETED!'
  const activePanoramas = useMemo(() => {
    if (isDeletedMode) {
      return panoramas.filter((p) => p.is_deleted || p.folder === '!DELETED!');
    }
    return panoramas.filter((p) => !p.is_deleted && p.folder !== '!DELETED!');
  }, [panoramas, isDeletedMode]);

  // Filter only panoramas with valid GPS coordinates:
  // In normal mode: if !isAdmin, hide private ones.
  // In deleted mode: show them in private mode!
  const canViewPano = (p: Panorama): boolean =>
    isAdmin || (p.is_private === false && !p.is_deleted && p.folder !== '!DELETED!');

  // Admin-only visibility toggles (both on by default). Visitors never see private panoramas.
  const [showPublic, setShowPublic] = useState<boolean>(true);
  const [showPrivate, setShowPrivate] = useState<boolean>(true);

  const validPanoramas = useMemo<GPSPanorama[]>(() => {
    return activePanoramas.filter(
      (p): p is GPSPanorama => {
        if (!isAdmin && !(p.is_private === false && !p.is_deleted && p.folder !== '!DELETED!')) return false;
        if (isAdmin && !isDeletedMode) {
          const isPublic = p.is_private === false;
          if (isPublic && !showPublic) return false;
          if (!isPublic && !showPrivate) return false;
        }
        return (
          p.lat !== null &&
          p.lon !== null &&
          p.lat !== 0 &&
          p.lon !== 0 &&
          !isNaN(p.lat) &&
          !isNaN(p.lon)
        );
      }
    );
  }, [activePanoramas, isAdmin, isDeletedMode, showPublic, showPrivate]);

  const { publicGpsCount, privateGpsCount } = useMemo(() => {
    let pub = 0;
    let priv = 0;
    activePanoramas.forEach((p) => {
      const hasGps = (
        p.lat !== null &&
        p.lon !== null &&
        p.lat !== 0 &&
        p.lon !== 0 &&
        !isNaN(p.lat) &&
        !isNaN(p.lon)
      );
      if (hasGps && !p.is_deleted && p.folder !== '!DELETED!') {
        if (p.is_private === false) pub++;
        else priv++;
      }
    });
    return { publicGpsCount: pub, privateGpsCount: priv };
  }, [activePanoramas]);

  const [selectedPano, setSelectedPano] = useState<Panorama | null>(null);

  // Multi-select filter states
  const [selectedYears, setSelectedYears] = useState<string[]>(() => {
    if (initialParams.years && initialParams.years.length > 0) return initialParams.years;
    if (initialParams.year && initialParams.year !== 'all') return [initialParams.year];
    return [];
  });
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => {
    return initialParams.months || [];
  });
  const [selectedResolutions, setSelectedResolutions] = useState<string[]>(() => {
    return initialParams.resolutions || [];
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    return initialParams.tags || [];
  });
  const [selectedMoods, setSelectedMoods] = useState<string[]>(() => {
    return initialParams.moods || [];
  });
  const [searchQuery, setSearchQuery] = useState<string>(() => initialParams.searchQuery || '');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(() => Boolean(initialParams.onlyFavorites));
  const [onlyTimelineClusters, setOnlyTimelineClusters] = useState<boolean>(() => Boolean(initialParams.onlyTimelineClusters));
  const [favoritePanoIds, setFavoritePanoIds] = useState<string[]>(() => getFavoritePanoIds());

  // Compute all panorama IDs and clusters that belong to a timeline cluster (multi-capture across DIFFERENT DATES within 120m)
  const { clusters, panoToCluster, timelinePanoIds } = useMemo(() => {
    return buildTimelineClusters(validPanoramas, 120);
  }, [validPanoramas]);

  const timelineClusterPanoIds = timelinePanoIds;
  const timelineClustersCount = clusters.length;

  useEffect(() => {
    const handleFavChange = (e: any) => {
      if (e.detail?.favoriteIds) {
        setFavoritePanoIds(e.detail.favoriteIds);
      } else {
        setFavoritePanoIds(getFavoritePanoIds());
      }
    };
    window.addEventListener('pano_favorites_changed', handleFavChange);
    return () => window.removeEventListener('pano_favorites_changed', handleFavChange);
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => !isMobileMode && window.innerWidth >= 768);

  useEffect(() => {
    if (isMobileMode) {
      setSidebarOpen(false);
    }
  }, [isMobileMode]);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [mapStyle, setMapStyle] = useState<'dark' | 'voyager' | 'satellite'>(
    () => (initialParams.mapStyle as any) || 'dark'
  );
  const [showMapMenu, setShowMapMenu] = useState<boolean>(false);
  const [tileSize, setTileSize] = useState<'normal' | 'large'>(
    () => initialParams.tileSize || 'normal'
  );
  const [tilesGroupBy, setTilesGroupBy] = useState<'location' | 'date'>(() => {
    if (initialParams.tilesGroupBy) return initialParams.tilesGroupBy;
    const saved = typeof window !== 'undefined' ? localStorage.getItem('tiles_group_by') : null;
    if (saved === 'date' || saved === 'location') return saved;
    return 'location';
  });

  const handleToggleTilesGroupBy = (mode: 'location' | 'date') => {
    setTilesGroupBy(mode);
    try {
      localStorage.setItem('tiles_group_by', mode);
    } catch (_) {}
  };
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom: number; timestamp: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number; isApproximate?: boolean; cityName?: string } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Apply shared map view (?key=xyz) once panoramas are loaded, so it overrides the initial fitBounds
  const sharedViewAppliedRef = useRef(false);
  useEffect(() => {
    if (!sharedMapView || sharedViewAppliedRef.current || validPanoramas.length === 0) return;
    const t = setTimeout(() => {
      sharedViewAppliedRef.current = true;
      setFlyToTarget({ ...sharedMapView, timestamp: Date.now() });
    }, 150);
    return () => clearTimeout(t);
  }, [sharedMapView, validPanoramas.length]);

  const handleOpenMapAtCoords = (lat: number, lon: number, zoom = 15) => {
    setTilesMode(false);
    setFlyToTarget({ lat, lng: lon, zoom, timestamp: Date.now() });
    handleSelectPano(null);
  };

  // Synchronize filters to URL params
  const syncFiltersToUrl = (
    years: string[],
    months: string[],
    resolutions: string[],
    tags: string[] = selectedTags,
    moods: string[] = selectedMoods
  ) => {
    const url = new URL(window.location.href);
    if (years.length > 0) {
      url.searchParams.set('years', years.join(','));
      url.searchParams.delete('year');
    } else {
      url.searchParams.delete('years');
      url.searchParams.delete('year');
    }

    if (months.length > 0) {
      url.searchParams.set('months', months.join(','));
    } else {
      url.searchParams.delete('months');
      url.searchParams.delete('month');
    }

    if (resolutions.length > 0) {
      url.searchParams.set('res', resolutions.join(','));
    } else {
      url.searchParams.delete('res');
      url.searchParams.delete('resolutions');
    }

    if (tags.length > 0) {
      url.searchParams.set('tags', tags.map((t) => t.replace(/^#/, '')).join(','));
      url.searchParams.delete('tag');
    } else {
      url.searchParams.delete('tags');
      url.searchParams.delete('tag');
    }

    if (moods.length > 0) {
      url.searchParams.set('moods', moods.join(','));
      url.searchParams.delete('mood');
    } else {
      url.searchParams.delete('moods');
      url.searchParams.delete('mood');
    }

    window.history.replaceState({}, '', url.toString());
  };

  const handleToggleYear = (year: string) => {
    setSelectedYears((prev) => {
      const next = prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year];
      analytics.applyFilter('years', next);
      syncFiltersToUrl(next, selectedMonths, selectedResolutions, selectedTags, selectedMoods);
      return next;
    });
  };

  const handleClearYears = () => {
    setSelectedYears([]);
    analytics.applyFilter('years', []);
    syncFiltersToUrl([], selectedMonths, selectedResolutions, selectedTags, selectedMoods);
  };

  const handleToggleMonth = (month: string) => {
    setSelectedMonths((prev) => {
      const next = prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month];
      analytics.applyFilter('months', next);
      syncFiltersToUrl(selectedYears, next, selectedResolutions, selectedTags, selectedMoods);
      return next;
    });
  };

  const handleClearMonths = () => {
    setSelectedMonths([]);
    analytics.applyFilter('months', []);
    syncFiltersToUrl(selectedYears, [], selectedResolutions, selectedTags, selectedMoods);
  };

  const handleToggleResolution = (res: string) => {
    setSelectedResolutions((prev) => {
      const next = prev.includes(res) ? prev.filter((r) => r !== res) : [...prev, res];
      analytics.applyFilter('resolutions', next);
      syncFiltersToUrl(selectedYears, selectedMonths, next, selectedTags, selectedMoods);
      return next;
    });
  };

  const handleClearResolutions = () => {
    setSelectedResolutions([]);
    analytics.applyFilter('resolutions', []);
    syncFiltersToUrl(selectedYears, selectedMonths, [], selectedTags, selectedMoods);
  };

  const handleToggleTag = (tag: string) => {
    const formattedTag = tag.startsWith('#') ? tag : `#${tag}`;
    setSelectedTags((prev) => {
      const exists = prev.some((t) => t.toLowerCase() === formattedTag.toLowerCase());
      const next = exists
        ? prev.filter((t) => t.toLowerCase() !== formattedTag.toLowerCase())
        : [...prev, formattedTag];
      analytics.applyFilter('tags', next);
      syncFiltersToUrl(selectedYears, selectedMonths, selectedResolutions, next, selectedMoods);
      return next;
    });
  };

  const handleClearTags = () => {
    setSelectedTags([]);
    analytics.applyFilter('tags', []);
    syncFiltersToUrl(selectedYears, selectedMonths, selectedResolutions, [], selectedMoods);
  };

  const handleToggleMood = (moodId: string) => {
    setSelectedMoods((prev) => {
      const next = prev.includes(moodId) ? prev.filter((m) => m !== moodId) : [...prev, moodId];
      analytics.applyFilter('moods', next);
      syncFiltersToUrl(selectedYears, selectedMonths, selectedResolutions, selectedTags, next);
      return next;
    });
  };

  const handleClearMoods = () => {
    setSelectedMoods([]);
    analytics.applyFilter('moods', []);
    syncFiltersToUrl(selectedYears, selectedMonths, selectedResolutions, selectedTags, []);
  };

  const handleResetAllFilters = () => {
    setSelectedYears([]);
    setSelectedMonths([]);
    setSelectedResolutions([]);
    setSelectedTags([]);
    setSelectedMoods([]);
    setSearchQuery('');
    setOnlyFavorites(false);
    setOnlyTimelineClusters(false);
    syncFiltersToUrl([], [], [], [], []);
  };

  // Marquee rectangle selection handler
  const handleMarqueeBounds = (bounds: L.LatLngBounds) => {
    const selected: string[] = [];
    filteredPanoramas.forEach((p) => {
      if (bounds.contains([p.lat, p.lon])) {
        selected.push(p.id);
      }
    });

    if (selected.length > 0) {
      selectPanos(selected);
      showToast(`Selected ${selected.length} panoramas in area! (Total selected: ${selectedPanoIds.size + selected.length})`);
    } else {
      showToast('No panoramas found within the selected rectangle.');
    }
  };

  const handleMarqueeSingleClick = (latlng: L.LatLng) => {
    if (!mapInstance) return;
    const clickPt = mapInstance.latLngToContainerPoint(latlng);
    let closestPano: GPSPanorama | null = null;
    let minDistance = Infinity;

    for (const p of filteredPanoramas) {
      const pinPt = mapInstance.latLngToContainerPoint([p.lat, p.lon]);
      const dist = clickPt.distanceTo(pinPt);
      if (dist < minDistance) {
        minDistance = dist;
        closestPano = p;
      }
    }

    if (closestPano && minDistance <= 30) {
      toggleSelectPano(closestPano.id);
    }
  };

  // Bulk actions
  const handleBulkMakePublic = async () => {
    const ids = Array.from(selectedPanoIds);
    if (ids.length === 0) return;
    const res = await batchUpdatePanoramas({ ids, is_private: false, folder: null });
    if (res.success && res.count > 0) {
      clearSelection();
      showToast(`Zverejnené ${res.count} panorám (Public)!`);
    } else {
      showToast(`Chyba: Nepodarilo sa zverejniť panorámy (${res.error || 'neznáma chyba'}).`);
    }
  };

  const handleBulkMakePrivate = async () => {
    const ids = Array.from(selectedPanoIds);
    if (ids.length === 0) return;
    const res = await batchUpdatePanoramas({ ids, is_private: true });
    if (res.success && res.count > 0) {
      clearSelection();
      showToast(`Presunuté ${res.count} panorám do súkromného archívu!`);
    } else {
      showToast(`Chyba: Nepodarilo sa presunúť panorámy (${res.error || 'neznáma chyba'}).`);
    }
  };

  const handleBulkMarkDeleted = async () => {
    const ids = Array.from(selectedPanoIds);
    if (ids.length === 0) return;
    const confirmed = window.confirm(
      `Are you sure you want to mark ${ids.length} selected panoramas as DELETED? They will be moved to the "!DELETED!" folder and hidden from standard public and private views.`
    );
    if (!confirmed) return;
    const res = await batchUpdatePanoramas({ ids, is_deleted: true, folder: '!DELETED!', is_private: true });
    if (res.success && res.count > 0) {
      clearSelection();
      showToast(`Presunuté ${res.count} panorám do "!DELETED!" priečinka.`);
    } else {
      showToast(`Chyba: Nepodarilo sa zmazať panorámy (${res.error || 'neznáma chyba'}).`);
    }
  };

  const handleBulkRestore = async () => {
    const ids = Array.from(selectedPanoIds);
    if (ids.length === 0) return;
    const targetFolder = window.prompt(
      'Enter destination folder name for restored panoramas:',
      'Restored'
    );
    if (targetFolder === null) return;
    const folder = targetFolder.trim() || 'Restored';
    const res = await batchUpdatePanoramas({ ids, is_deleted: false, folder, is_private: true });
    if (res.success && res.count > 0) {
      clearSelection();
      showToast(`Obnovené ${res.count} panorám do priečinka "${folder}"!`);
    } else {
      showToast(`Chyba: Nepodarilo sa obnoviť panorámy (${res.error || 'neznáma chyba'}).`);
    }
  };

  const hasInitialCoords = Boolean(
    initialParams.lat !== undefined && initialParams.lng !== undefined && initialParams.zoom !== undefined
  );

  const [mapCenter, setMapCenter] = useState<[number, number]>(() => {
    if (initialParams.lat && initialParams.lng) {
      return [initialParams.lat, initialParams.lng];
    }
    return [48.1486, 17.1077];
  });
  const [mapZoom, setMapZoom] = useState<number>(initialParams.zoom || 5);

  // React to URL ?pano= query param dynamically
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const panoId = params.get('pano');
    if (panoId && panoramas.length > 0) {
      const found = panoramas.find((p) => String(p.id) === String(panoId));
      if (found && canViewPano(found)) {
        setSelectedPano((prev) => {
          if (prev?.id === found.id) return prev;
          setSidebarOpen(false);
          return found;
        });
        recordPanoramaView(found.id).then((newViews) => {
          found.views = newViews;
        }).catch(() => {});
      } else {
        params.delete('pano');
        const qs = params.toString();
        navigate({ search: qs ? `?${qs}` : '' }, { replace: true });
      }
    } else if (!panoId && selectedPano) {
      setSelectedPano(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, panoramas]);

  // Close the viewer if the open pano is no longer viewable
  useEffect(() => {
    if (selectedPano && !canViewPano(selectedPano)) {
      setSelectedPano(null);
      setSidebarOpen(!isMobileMode && window.innerWidth >= 768);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selectedPano, isMobileMode]);

  // Sync selected panorama to URL search query
  const handleSelectPano = (pano: Panorama | null) => {
    if (pano && !canViewPano(pano)) return;
    if (!pano) (window as any).__panoImmersive = false;
    if (pano) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(!isMobileMode && window.innerWidth >= 768);
      document.title = panoConfig.branding.appName || 'AeroSphere 360';
    }
    setSelectedPano(pano);
    if (pano) {
      onExternalSelectPano?.(pano);
      recordPanoramaView(pano.id).then((newViews) => {
        pano.views = newViews;
      });
    }
    const url = new URL(window.location.href);
    if (pano) {
      url.searchParams.set('pano', pano.id);
      url.searchParams.delete('key');
    } else {
      url.searchParams.delete('pano');
    }
    navigate({ search: url.search }, { replace: true });
  };

  // Filter panoramas by Years, Months, Resolutions, Search Query, and ORDER BY POPULARITY
  const filteredPanoramas = useMemo(() => {
    // When timeline clusters filter is active:
    // Display each cluster as a single representative panorama (#10) pointing to its newest capture.
    if (onlyTimelineClusters && !isDeletedMode) {
      const clusterRepresentatives: (GPSPanorama & { cluster_count?: number; cluster_id?: string; cluster_members?: Panorama[] })[] = [];

      for (const cluster of clusters) {
        const validMembers = cluster.members.filter((m) => {
          if (m.is_deleted || m.folder === '!DELETED!' || m.exclude_timeline) return false;
          if (!isAdmin && m.is_private) return false;
          if (isAdmin) {
            if (!showPublic && !m.is_private) return false;
            if (!showPrivate && m.is_private) return false;
          }
          return m.lat !== null && m.lon !== null;
        }) as GPSPanorama[];

        if (validMembers.length < 2) continue;

        // Pick newest capture as the representative
        validMembers.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const newest = validMembers[0];

        // Apply secondary filters across cluster captures
        if (selectedYears.length > 0) {
          const matches = validMembers.some((m) => {
            if (!m.date) return false;
            try { return selectedYears.includes(new Date(m.date).getFullYear().toString()); } catch { return false; }
          });
          if (!matches) continue;
        }

        if (selectedMonths.length > 0) {
          const matches = validMembers.some((m) => {
            if (!m.date) return false;
            try { return selectedMonths.includes(String(new Date(m.date).getMonth() + 1).padStart(2, '0')); } catch { return false; }
          });
          if (!matches) continue;
        }

        if (selectedResolutions.length > 0) {
          const matches = validMembers.some((m) => selectedResolutions.includes(getResolutionCategory(m.width)));
          if (!matches) continue;
        }

        if (onlyFavorites) {
          const matches = validMembers.some((m) => favoritePanoIds.includes(String(m.id)));
          if (!matches) continue;
        }

        if (selectedTags.length > 0) {
          const allTags = new Set(validMembers.flatMap((m) => extractPanoramaTags(m).map((t) => t.toLowerCase())));
          const matchesAll = selectedTags.every((st) => {
            const clean = st.startsWith('#') ? st.slice(1).toLowerCase() : st.toLowerCase();
            return allTags.has(st.toLowerCase()) || allTags.has(`#${clean}`) || allTags.has(clean);
          });
          if (!matchesAll) continue;
        }

        if (searchQuery.trim()) {
          const query = normalizeText(searchQuery);
          const cleanQuery = query.startsWith('#') ? query.slice(1) : query;
          const matches = validMembers.some((m) => {
            const cityMatch = normalizeText(m.city || '').includes(query);
            const countryMatch = normalizeText(m.country || '').includes(query);
            const nameMatch = normalizeText(m.original_filename || '').includes(query) || normalizeText(m.filename || '').includes(query);
            const folderMatch = normalizeText(m.folder || '').includes(query);
            const tags = extractPanoramaTags(m).map((t) => normalizeText(t));
            const tagMatch = tags.some((t) => t.includes(cleanQuery) || t === query);
            return cityMatch || countryMatch || nameMatch || folderMatch || tagMatch;
          });
          if (!matches) continue;
        }

        if (selectedMoods.length > 0) {
          const matches = validMembers.some((m) => {
            const moods = detectPanoramaMoods(m);
            return selectedMoods.some((sm) => moods.includes(sm as SceneMood));
          });
          if (!matches) continue;
        }

        clusterRepresentatives.push({
          ...newest,
          cluster_count: validMembers.length,
          cluster_id: cluster.id,
          cluster_members: validMembers,
        });
      }

      return clusterRepresentatives.sort((a, b) => {
        const vA = a.views || 0;
        const vB = b.views || 0;
        if (vB !== vA) return vB - vA;
        return (b.date || '').localeCompare(a.date || '');
      });
    }

    const list = validPanoramas.filter((p) => {
      // Filter by years (multi-select)
      if (selectedYears.length > 0) {
        if (!p.date) return false;
        try {
          const yr = new Date(p.date).getFullYear().toString();
          if (!selectedYears.includes(yr)) return false;
        } catch {
          return false;
        }
      }

      // Filter by months (multi-select: '01'..'12')
      if (selectedMonths.length > 0) {
        if (!p.date) return false;
        try {
          const d = new Date(p.date);
          const m = String(d.getMonth() + 1).padStart(2, '0');
          if (!selectedMonths.includes(m)) return false;
        } catch {
          return false;
        }
      }

      // Filter by resolution category (multi-select: '15K', '8K', etc.)
      if (selectedResolutions.length > 0) {
        const resCat = getResolutionCategory(p.width);
        if (!selectedResolutions.includes(resCat)) return false;
      }

      // Filter by favorites
      if (onlyFavorites && !isDeletedMode) {
        if (!favoritePanoIds.includes(String(p.id))) return false;
      }

      // Filter by timeline clusters only
      if (onlyTimelineClusters && !isDeletedMode) {
        if (!timelineClusterPanoIds.has(String(p.id))) return false;
      }

      // Filter by selected tags (AND logic across all selected tags)
      if (selectedTags.length > 0) {
        const panoTags = extractPanoramaTags(p).map((t) => t.toLowerCase());
        const matchesAll = selectedTags.every((st) => {
          const clean = st.startsWith('#') ? st.slice(1).toLowerCase() : st.toLowerCase();
          return (
            panoTags.includes(st.toLowerCase()) ||
            panoTags.includes(`#${clean}`) ||
            panoTags.includes(clean)
          );
        });
        if (!matchesAll) return false;
      }

      // Filter by search query (city, country, filename, folder, and hashtags)
      if (searchQuery.trim()) {
        const query = normalizeText(searchQuery);
        const cityMatch = normalizeText(p.city || '').includes(query);
        const countryMatch = normalizeText(p.country || '').includes(query);
        const nameMatch = normalizeText(p.original_filename || '').includes(query) || normalizeText(p.filename || '').includes(query);
        const folderMatch = normalizeText(p.folder || '').includes(query);
        const cleanQuery = query.startsWith('#') ? query.slice(1) : query;
        const tags = extractPanoramaTags(p).map((t) => normalizeText(t));
        const tagMatch = tags.some((t) => t.includes(cleanQuery) || t === query);
        if (!cityMatch && !countryMatch && !nameMatch && !folderMatch && !tagMatch) return false;
      }

      // Filter by AI atmospheric moods (OR logic across selected moods)
      if (selectedMoods.length > 0) {
        const panoMoods = detectPanoramaMoods(p);
        const matchesMood = selectedMoods.some((sm) => panoMoods.includes(sm as SceneMood));
        if (!matchesMood) return false;
      }

      return true;
    });

    // Public website: order by popularity (views count) then date
    return list.sort((a, b) => {
      const vA = a.views || 0;
      const vB = b.views || 0;
      if (vB !== vA) {
        return vB - vA;
      }
      return (b.date || '').localeCompare(a.date || '');
    });
  }, [validPanoramas, selectedYears, selectedMonths, selectedResolutions, selectedTags, selectedMoods, searchQuery, onlyFavorites, favoritePanoIds, onlyTimelineClusters, timelineClusterPanoIds, isDeletedMode, clusters, isAdmin, showPublic, showPrivate]);

  // Grouped panoramas by location or date for tiles view
  const groupedPanoramas = useMemo(() => {
    if (tilesGroupBy === 'date') {
      // Group by individual days (YYYY-MM-DD)
      const dayGroups = new Map<string, Panorama[]>();
      filteredPanoramas.forEach((p) => {
        const day = formatPanoramaDate(p.date) || 'unknown_date';
        if (!dayGroups.has(day)) {
          dayGroups.set(day, []);
        }
        dayGroups.get(day)!.push(p);
      });

      // Sort days in sequence (reverse chronological: newest day first, unknown dates last)
      const sortedDays = Array.from(dayGroups.keys()).sort((a, b) => {
        if (a === 'unknown_date') return 1;
        if (b === 'unknown_date') return -1;
        return b.localeCompare(a);
      });

      return sortedDays.map((day) => {
        const items = dayGroups.get(day) || [];
        // Within each day: sort internally by location, then by date and time
        items.sort((a, b) => {
          const locA = getPanoramaCity(a) || (a.country && a.country !== 'Unknown' ? a.country : '');
          const locB = getPanoramaCity(b) || (b.country && b.country !== 'Unknown' ? b.country : '');
          const locCmp = locA.localeCompare(locB);
          if (locCmp !== 0) return locCmp;
          return (b.date || '').localeCompare(a.date || '');
        });

        return {
          id: day,
          title: formatGroupDayTitle(day, i18n.language),
          rawKey: day,
          type: 'date' as const,
          items,
        };
      });
    }

    // Default: Group by location
    const locationGroups = new Map<string, Panorama[]>();
    filteredPanoramas.forEach((p) => {
      const loc = getPanoramaCity(p) || (p.country && p.country !== 'Unknown' ? p.country : t('other_locations'));
      if (!locationGroups.has(loc)) {
        locationGroups.set(loc, []);
      }
      locationGroups.get(loc)!.push(p);
    });

    return Array.from(locationGroups.entries())
      .map(([location, items]) => {
        // Within each location: sort by date and time (newest first)
        items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        return {
          id: location,
          title: location,
          rawKey: location,
          type: 'location' as const,
          items,
        };
      })
      .sort((a, b) => {
        if (b.items.length !== a.items.length) {
          return b.items.length - a.items.length;
        }
        return a.title.localeCompare(b.title);
      });
  }, [filteredPanoramas, tilesGroupBy, t, i18n.language]);

  // Track panoramas visible within current map viewport
  // If the bottom filmstrip is displayed, exclude panoramas physically covered/obscured by the filmstrip
  const visiblePanoramas = useMemo(() => {
    if (!mapBounds) {
      return filteredPanoramas;
    }

    const inBounds = filteredPanoramas.filter((p) => mapBounds.contains([p.lat, p.lon]));
    if (!mapInstance || filmstripHeight <= 0) {
      return inBounds;
    }

    try {
      const containerSize = mapInstance.getSize();
      // Filmstrip sits at the bottom with margin
      const filmstripTopY = containerSize.y - filmstripHeight - 12;

      return inBounds.filter((p) => {
        const pt = mapInstance.latLngToContainerPoint([p.lat, p.lon]);
        return pt.y < filmstripTopY;
      });
    } catch {
      return inBounds;
    }
  }, [filteredPanoramas, mapBounds, mapInstance, filmstripHeight]);

  // Sort visible panoramas West-to-East (ascending longitude) so left-to-right filmstrip matches map 1..N
  const sortedVisiblePanoramas = useMemo(() => {
    return [...visiblePanoramas].sort((a, b) => a.lon - b.lon);
  }, [visiblePanoramas]);

  // Filmstrip is eligible when 1..30 panoramas are visible
  const isFilmstripEligible = sortedVisiblePanoramas.length > 0 && sortedVisiblePanoramas.length <= 30;

  // Track rendered filmstrip drawer height to omit obscured pins from the filmstrip
  useEffect(() => {
    if (!filmstripDrawerRef.current) {
      setFilmstripHeight(0);
      return;
    }
    const el = filmstripDrawerRef.current;
    const updateH = () => setFilmstripHeight(el.offsetHeight);
    updateH();
    const ro = new ResizeObserver(updateH);
    ro.observe(el);
    return () => ro.disconnect();
  }, [filmstripMode, tilesMode, selectedPano, isFilmstripEligible, filmstripSize]);

  // Number mapping (1-based index)
  const panoNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    if (filmstripMode && isFilmstripEligible) {
      sortedVisiblePanoramas.forEach((p, idx) => {
        map.set(String(p.id), idx + 1);
      });
    }
    return map;
  }, [filmstripMode, isFilmstripEligible, sortedVisiblePanoramas]);

  // Auto-enable filmstrip whenever there are fewer than 31 panoramas on map (< 31 panos)
  useEffect(() => {
    const count = sortedVisiblePanoramas.length;
    if (isFilmstripEligible) {
      if (!userDismissedFilmstrip) {
        setFilmstripMode(true);
      }
    } else {
      if (!explicitlyForcedFilmstrip) {
        setFilmstripMode(false);
      }
      if (count >= 31) {
        setUserDismissedFilmstrip(false);
      }
    }
  }, [isFilmstripEligible, sortedVisiblePanoramas.length, userDismissedFilmstrip, explicitlyForcedFilmstrip]);

  // Handler for sharing the overview map with exact zoom, coordinates, language, active filters & toggles
  const handleShareOverviewMap = useCallback(async () => {
    const key = generateShareKey();
    const sid = `map_${key}`;
    const mapParams = {
      lat: mapCenter[0],
      lng: mapCenter[1],
      zoom: mapZoom,
      lang: i18n.language,
      years: selectedYears,
      months: selectedMonths,
      resolutions: selectedResolutions,
      tags: selectedTags,
      moods: selectedMoods,
      searchQuery: searchQuery.trim() || undefined,
      onlyFavorites: onlyFavorites || undefined,
      onlyTimelineClusters: onlyTimelineClusters || undefined,
      filmstrip: filmstripMode || undefined,
      tiles: tilesMode || undefined,
      tileSize: tileSize !== 'normal' ? tileSize : undefined,
      tilesGroupBy: tilesGroupBy !== 'location' ? tilesGroupBy : undefined,
      style: mapStyle !== 'dark' ? mapStyle : undefined,
    };
    const shareUrl = getMapShareUrl(mapCenter[0], mapCenter[1], mapZoom, undefined, key);
    const success = await copyToClipboard(shareUrl);
    if (success) {
      analytics.share('map', shareUrl);
      recordDetailedShare('map', sid, shareUrl, 'Prehľadová Mapa (Overview Map)', key, mapParams).catch(() => {});
      showToast(t('share_map_copied'));
    } else {
      showToast(t('unable_copy'));
    }
  }, [
    mapCenter,
    mapZoom,
    selectedYears,
    selectedMonths,
    selectedResolutions,
    selectedTags,
    selectedMoods,
    searchQuery,
    onlyFavorites,
    onlyTimelineClusters,
    filmstripMode,
    tilesMode,
    tileSize,
    tilesGroupBy,
    mapStyle,
    t,
    i18n.language,
  ]);

  // Register share handler so navbar share button invokes it
  useEffect(() => {
    if (onRegisterShareHandler) {
      onRegisterShareHandler(handleShareOverviewMap);
    }
    return () => {
      if (onRegisterShareHandler) {
        onRegisterShareHandler(undefined);
      }
    };
  }, [handleShareOverviewMap, onRegisterShareHandler]);

  const showToast = (message: string) => {
    setToast({
      id: Date.now().toString(),
      message,
      type: 'success',
    });
  };

  const locateViaIpFallback = useCallback(async (reason: 'denied' | 'unavailable') => {
    setIsLocating(true);
    try {
      let lat: number | null = null;
      let lon: number | null = null;
      let city: string | null = null;

      // 1. Try internal /api/panoramas/locate or /api/locate (Cloudflare request.cf)
      try {
        let res = await fetch('/api/panoramas/locate');
        if (!res.ok) {
          res = await fetch('/api/locate');
        }
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && typeof data.lat === 'number' && typeof data.lon === 'number') {
            lat = data.lat;
            lon = data.lon;
            city = data.city || null;
          }
        }
      } catch (_) {}

      // 2. Try external IP lookup if /api/locate didn't succeed (e.g. local dev / proxy)
      if (lat === null || lon === null) {
        try {
          const res = await fetch('https://ipwho.is/');
          if (res.ok) {
            const data = await res.json();
            if (data && data.success && data.latitude && data.longitude) {
              lat = data.latitude;
              lon = data.longitude;
              city = data.city || null;
            }
          }
        } catch (_) {}
      }

      if (lat !== null && lon !== null) {
        setIsLocating(false);
        const loc = { lat, lng: lon, accuracy: 5000, isApproximate: true, cityName: city || undefined };
        setUserLocation(loc);

        setFlyToTarget({
          lat,
          lng: lon,
          zoom: Math.max(mapZoom, 12),
          timestamp: Date.now(),
        });

        const isSk = i18n.language.startsWith('sk');
        if (reason === 'denied') {
          showToast(
            isSk
              ? `Prístup k GPS je v prehliadači/Windows zablokovaný. Nastavená približná poloha (${city || 'sieť IP'}). Pre presné GPS povoľte polohu v nastaveniach stránky.`
              : `Precise GPS is blocked in browser/Windows. Used approximate location (${city || 'network IP'}). Click lock icon in address bar to allow GPS.`
          );
        } else {
          showToast(
            isSk
              ? `GPS nie je na PC k dispozícii. Nastavená približná poloha (${city || 'sieť IP'}).`
              : `GPS is unavailable on PC. Used approximate location (${city || 'network IP'}).`
          );
        }
        return true;
      }
    } catch (_) {}

    setIsLocating(false);
    const isSk = i18n.language.startsWith('sk');
    showToast(
      isSk
        ? 'Prístup k polohe je zablokovaný. V adresnom riadku prehliadača kliknite na ikonu zámku/nastavení a povoľte Polohu.'
        : 'Location access was denied. Click the lock/tune icon in the browser address bar to allow Location access.'
    );
    return false;
  }, [mapZoom, showToast]);

  const handleLocateUser = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      locateViaIpFallback('unavailable');
      return;
    }

    if (tilesMode) {
      setTilesMode(false);
    }

    // If user is already located, toggle re-centering smoothly
    if (userLocation) {
      setFlyToTarget({
        lat: userLocation.lat,
        lng: userLocation.lng,
        zoom: Math.max(mapZoom, 14),
        timestamp: Date.now(),
      });
      return;
    }

    setIsLocating(true);

    const tryLowAccuracy = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          const { latitude, longitude, accuracy } = pos.coords;
          const loc = { lat: latitude, lng: longitude, accuracy, isApproximate: false };
          setUserLocation(loc);

          setFlyToTarget({
            lat: latitude,
            lng: longitude,
            zoom: Math.max(mapZoom, 14),
            timestamp: Date.now(),
          });

          showToast(
            i18n.language.startsWith('sk')
              ? 'Vaša poloha bola zameraná'
              : 'Your location was found'
          );
        },
        (err) => {
          console.warn('Geolocation low-accuracy failed:', err);
          locateViaIpFallback(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
        },
        {
          enableHighAccuracy: false,
          timeout: 6000,
          maximumAge: 60000,
        }
      );
    };

    // Try high accuracy first, fall back to low accuracy, then fall back to IP location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        const loc = { lat: latitude, lng: longitude, accuracy, isApproximate: false };
        setUserLocation(loc);

        setFlyToTarget({
          lat: latitude,
          lng: longitude,
          zoom: Math.max(mapZoom, 14),
          timestamp: Date.now(),
        });

        showToast(
          i18n.language.startsWith('sk')
            ? 'Vaša poloha bola zameraná (GPS)'
            : 'Your location was found (GPS)'
        );
      },
      (err) => {
        console.warn('Geolocation high-accuracy failed:', err);
        if (err.code === err.PERMISSION_DENIED) {
          locateViaIpFallback('denied');
        } else {
          tryLowAccuracy();
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 30000,
      }
    );
  }, [mapZoom, tilesMode, userLocation, locateViaIpFallback, showToast]);

  const nearestPanoToUser = useMemo(() => {
    if (!userLocation || validPanoramas.length === 0) return null;
    let nearest: GPSPanorama | null = null;
    let minDist = Infinity;
    for (const p of validPanoramas) {
      if (typeof p.lat !== 'number' || typeof p.lon !== 'number') continue;
      const d = getDistance(userLocation.lat, userLocation.lng, p.lat, p.lon);
      if (d < minDist) {
        minDist = d;
        nearest = p;
      }
    }
    if (!nearest) return null;
    return {
      pano: nearest,
      name: nearest.city || 'Panorama',
      distText: formatDistance(minDist),
    };
  }, [userLocation, validPanoramas]);

  const handleToggleTilesMode = () => {
    const next = !tilesMode;
    setTilesMode(next);
    analytics.switchViewMode(next ? 'tiles' : 'map');
  };

  const handleSelectMapStyle = (style: 'dark' | 'voyager' | 'satellite') => {
    setMapStyle(style);
    analytics.changeMapLayer(style);
    setShowMapMenu(false);
  };

  const hasAnyFilterActive = onlyFavorites || onlyTimelineClusters || selectedYears.length > 0 || selectedMonths.length > 0 || selectedResolutions.length > 0 || selectedTags.length > 0 || selectedMoods.length > 0 || Boolean(searchQuery.trim());

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#090a0f]">
      {/* AeroSphere 360 Attribution */}
      <AuthorCreditBadge variant="pill" className="absolute bottom-5 left-4 z-[400] hidden sm:flex" />

      {/* Sidebar Filter */}
      <SidebarFilter
        panoramas={validPanoramas}
        allPanoramas={isAdmin ? panoramas : validPanoramas}
        filteredPanoramas={filteredPanoramas}
        isDeletedMode={isDeletedMode}
        onSelectPanorama={handleSelectPano}
        selectedYears={selectedYears}
        onToggleYear={handleToggleYear}
        onClearYears={handleClearYears}
        selectedMonths={selectedMonths}
        onToggleMonth={handleToggleMonth}
        onClearMonths={handleClearMonths}
        selectedResolutions={selectedResolutions}
        onToggleResolution={handleToggleResolution}
        onClearResolutions={handleClearResolutions}
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
        onClearTags={handleClearTags}
        selectedMoods={selectedMoods}
        onToggleMood={handleToggleMood}
        onClearMoods={handleClearMoods}
        onlyFavorites={onlyFavorites}
        onToggleOnlyFavorites={() => setOnlyFavorites((prev) => !prev)}
        favoritesCount={favoritePanoIds.length}
        onlyTimelineClusters={onlyTimelineClusters}
        onToggleOnlyTimelineClusters={() => setOnlyTimelineClusters((prev) => !prev)}
        timelineClustersCount={timelineClustersCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredCount={filteredPanoramas.length}
        totalCount={validPanoramas.length}
        onShareMap={handleShareOverviewMap}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen((prev) => !prev)}
        isViewerOpen={!!selectedPano}
        onOpenSmartGps={(panos) => {
          setSmartGpsTargetPanos(panos);
          setShowSmartGpsModal(true);
        }}
      />

      {/* Floating Top Status Counter Pill */}
      <div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 z-[950] pointer-events-none max-w-[calc(100vw-5.5rem)] md:max-w-[calc(100vw-0.75rem)]">
        <div data-help="status_chips" className="pointer-events-auto flex flex-wrap justify-center items-center gap-1.5 md:gap-2.5 px-2.5 md:px-4 py-1.5 md:py-2 rounded-2xl glass-panel text-white shadow-2xl border border-white/10">
          <ActiveFiltersBar
            filteredCount={filteredPanoramas.length}
            totalCount={validPanoramas.length}
            onlyFavorites={onlyFavorites}
            onToggleOnlyFavorites={() => setOnlyFavorites((v) => !v)}
            onlyTimelineClusters={onlyTimelineClusters}
            onToggleOnlyTimelineClusters={() => setOnlyTimelineClusters((v) => !v)}
            selectedYears={selectedYears}
            onToggleYear={handleToggleYear}
            selectedMonths={selectedMonths}
            onToggleMonth={handleToggleMonth}
            selectedResolutions={selectedResolutions}
            onToggleResolution={handleToggleResolution}
            selectedTags={selectedTags}
            onToggleTag={handleToggleTag}
            selectedMoods={selectedMoods}
            onToggleMood={handleToggleMood}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery('')}
            onResetAllFilters={handleResetAllFilters}
            hasAnyFilterActive={hasAnyFilterActive}
            isDeletedMode={isDeletedMode}
          />

          {/* Admin: Public / Private visibility toggles */}
          {isAdmin && !isDeletedMode && (
            <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded-xl border border-white/10 ml-1">
              <button
                onClick={() => setShowPublic((v) => !v)}
                aria-pressed={showPublic}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  showPublic
                    ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/40'
                    : 'text-zinc-500 line-through border border-transparent hover:text-zinc-300'
                }`}
                title={showPublic ? t('hide_public') : t('show_public')}
              >
                <Globe2 className="w-3 h-3" />
                <span>{t('public')} ({publicGpsCount.toLocaleString()})</span>
              </button>
              <button
                onClick={() => setShowPrivate((v) => !v)}
                aria-pressed={showPrivate}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  showPrivate
                    ? 'bg-rose-500/25 text-rose-200 border border-rose-500/40'
                    : 'text-zinc-500 line-through border border-transparent hover:text-zinc-300'
                }`}
                title={showPrivate ? t('hide_private') : t('show_private')}
              >
                <Lock className="w-3 h-3" />
                <span>{t('private')} ({privateGpsCount.toLocaleString()})</span>
              </button>
            </div>
          )}

          {/* Marquee Select Tool Toggle */}
          {isAdmin && (
            <button
              onClick={() => {
                setIsMarqueeActive((prev) => {
                  const next = !prev;
                  if (next) setHoveredPanoId(null);
                  return next;
                });
              }}
              data-help="map_box_select"
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ml-1 cursor-pointer ${
                isMarqueeActive
                  ? 'bg-cyan-500 text-zinc-950 shadow-md ring-1 ring-cyan-300'
                  : 'hover:bg-white/10 text-cyan-400 hover:text-white'
              }`}
              title="Rectangle Marquee Selection (Click and drag on map to select multiple panoramas)"
            >
              <SquareDashed className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isMarqueeActive ? t('marquee_on') : t('box_select')}
              </span>
            </button>
          )}

          {/* Tiles Toggle Button */}
          <button
            onClick={handleToggleTilesMode}
            data-help="map_tiles_toggle"
            className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ml-1 cursor-pointer ${
              tilesMode
                ? 'bg-cyan-500 text-zinc-950 shadow-md ring-1 ring-cyan-300'
                : 'hover:bg-white/10 text-cyan-400 hover:text-white'
            }`}
            title={tilesMode ? t('view_map') : t('view_tiles')}
          >
            {tilesMode ? <MapPin className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{tilesMode ? t('map') : t('tiles')}</span>
          </button>

          {/* Filmstrip Toggle Button */}
          <button
            onClick={() => {
              const next = !filmstripMode;
              setFilmstripMode(next);
              if (next) {
                setUserDismissedFilmstrip(false);
                setExplicitlyForcedFilmstrip(true);
                if (tilesMode) setTilesMode(false);
              } else {
                setUserDismissedFilmstrip(true);
                setExplicitlyForcedFilmstrip(false);
              }
            }}
            data-help="map_filmstrip_toggle"
            className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ml-1 cursor-pointer ${
              filmstripMode
                ? 'bg-amber-400 text-zinc-950 shadow-md ring-1 ring-amber-300'
                : 'hover:bg-white/10 text-amber-400 hover:text-white'
            }`}
            title={
              filmstripMode
                ? (i18n.language.startsWith('sk') ? 'Skryť filmstrip' : 'Hide filmstrip')
                : (i18n.language.startsWith('sk') ? 'Zobraziť filmstrip (<30 panorám na mape)' : 'Show filmstrip (<30 panos on map)')
            }
          >
            <Film className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filmstrip</span>
          </button>

          {/* Timeline Clusters Toggle Button */}
          <button
            onClick={() => setOnlyTimelineClusters((prev) => !prev)}
            data-help="map_timeline_clusters_toggle"
            className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ml-1 cursor-pointer ${
              onlyTimelineClusters
                ? 'bg-amber-400 text-zinc-950 shadow-md ring-1 ring-amber-300 font-black'
                : 'hover:bg-white/10 text-amber-300 hover:text-white'
            }`}
            title={
              onlyTimelineClusters
                ? (i18n.language.startsWith('sk') ? 'Zobraziť všetky panorámy (vypnúť filter časových osí)' : 'Show all panoramas (disable timeline clusters filter)')
                : (i18n.language.startsWith('sk') ? 'Filtrovať len časové osi (lokality s viac zábermi v čase)' : 'Filter timeline clusters only (locations with multiple captures)')
            }
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{i18n.language.startsWith('sk') ? 'Časové osi' : 'Timeline'}</span>
            {timelineClustersCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  onlyTimelineClusters
                    ? 'bg-zinc-950 text-amber-300'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {timelineClustersCount}
              </span>
            )}
          </button>

          {/* My Position Button */}
          <button
            onClick={handleLocateUser}
            disabled={isLocating}
            data-help="map_my_position"
            className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ml-1 cursor-pointer ${
              userLocation
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 shadow-md ring-1 ring-cyan-400/30'
                : 'hover:bg-white/10 text-cyan-400 hover:text-white'
            }`}
            title={i18n.language.startsWith('sk') ? 'Moja pozícia' : 'My position'}
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-amber-400' : 'text-cyan-400'}`} />
            <span className="hidden sm:inline">
              {i18n.language.startsWith('sk') ? 'Moja pozícia' : 'My position'}
            </span>
          </button>

          {/* Tiles Size Switcher: Small vs ~3x Large 2K */}
          {tilesMode && (
            <button
              onClick={() => setTileSize((s) => (s === 'large' ? 'normal' : 'large'))}
              data-help="map_tiles_size_toggle"
              className="p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ml-1 cursor-pointer bg-white/10 hover:bg-white/20 text-cyan-300 hover:text-white border border-white/10"
              title={tileSize === 'large' ? 'Menšie dlaždice (Small)' : 'Väčšie dlaždice (~3x Large 2K)'}
            >
              {tileSize === 'large' ? <ZoomOut className="w-3.5 h-3.5 text-amber-400" /> : <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />}
              <span className="hidden sm:inline">
                {tileSize === 'large' ? (i18n.language.startsWith('sk') ? 'Menšie' : 'Smaller') : (i18n.language.startsWith('sk') ? 'Väčšie (2K)' : 'Larger (2K)')}
              </span>
            </button>
          )}

          {/* Tiles Grouping Switcher: Location vs Date */}
          {tilesMode && (
            <div
              data-help="map_tiles_group_toggle"
              className="flex items-center ml-1 bg-white/10 p-0.5 rounded-lg border border-white/10 text-xs font-bold"
            >
              <button
                type="button"
                onClick={() => handleToggleTilesGroupBy('location')}
                className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  tilesGroupBy === 'location'
                    ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
                title={i18n.language.startsWith('sk') ? 'Zoskupiť podľa miesta (lokality)' : 'Group by location'}
              >
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">
                  {t('group_location', 'Miesto')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleTilesGroupBy('date')}
                className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  tilesGroupBy === 'date'
                    ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
                title={i18n.language.startsWith('sk') ? 'Zoskupiť podľa dátumu (dní)' : 'Group by date'}
              >
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">
                  {t('group_date', 'Dátum')}
                </span>
              </button>
            </div>
          )}

          {/* Three dots menu: Map Layers & Share */}
          <div className="relative">
            <button
              onClick={() => setShowMapMenu((prev) => !prev)}
              data-help="map_menu_dots"
              className={`p-1.5 rounded-lg transition-all flex items-center justify-center text-xs font-bold ml-1 cursor-pointer ${
                showMapMenu
                  ? 'bg-cyan-500/30 text-cyan-200 ring-2 ring-cyan-500/30'
                  : 'hover:bg-white/10 text-zinc-400 hover:text-white'
              }`}
              title="Map options & base layers"
              aria-label="Map options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMapMenu && (
              <>
                <div
                  className="fixed inset-0 z-[1950] cursor-pointer"
                  onClick={() => setShowMapMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-52 glass-panel-elevated rounded-2xl p-2 border border-white/15 shadow-2xl animate-slide-up z-[2000] space-y-1 text-white">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Layers className="w-3 h-3" />
                  <span>{t('map_layer')}</span>
                </div>

                <button
                  onClick={() => handleSelectMapStyle('dark')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    mapStyle === 'dark'
                      ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40'
                      : 'text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-zinc-600" />
                    <span>{t('layer_dark')}</span>
                  </div>
                  {mapStyle === 'dark' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>

                <button
                  onClick={() => handleSelectMapStyle('voyager')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    mapStyle === 'voyager'
                      ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40'
                      : 'text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>{t('layer_street')}</span>
                  </div>
                  {mapStyle === 'voyager' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>

                <button
                  onClick={() => handleSelectMapStyle('satellite')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    mapStyle === 'satellite'
                      ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40'
                      : 'text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>{t('layer_satellite')}</span>
                  </div>
                  {mapStyle === 'satellite' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>

                <div className="pt-1 mt-1 border-t border-white/10 space-y-0.5">
                  <button
                    onClick={() => {
                      setShowMapMenu(false);
                      handleLocateUser();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <LocateFixed className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{i18n.language.startsWith('sk') ? 'Moja pozícia' : 'My position'}</span>
                  </button>
                  <button
                    onClick={() => { handleShareOverviewMap(); setShowMapMenu(false); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-violet-400" />
                    <span>{t('share_map_view')}</span>
                  </button>
                </div>
              </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Marquee Mode Active Helper Banner */}
      {isAdmin && isMarqueeActive && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto animate-fade-in">
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-cyan-950/90 backdrop-blur-xl border border-cyan-400 text-cyan-200 shadow-2xl shadow-cyan-950/80 text-xs font-semibold">
            <SquareDashed className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
            <span>{t('marquee_helper')}</span>
            <button
              onClick={() => setIsMarqueeActive(false)}
              className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] ml-1 cursor-pointer"
            >
              {t('done_cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Deleted Mode Banner */}
      {isDeletedMode && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto animate-fade-in">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-rose-500/50 text-zinc-200 shadow-2xl shadow-rose-950/80 text-xs font-semibold">
            <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{t('deleted_panos')} ({filteredPanoramas.length} items)</span>
            <Link
              to="/"
              className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] ml-2 transition-colors flex items-center gap-1 border border-white/10"
            >
              <span>{t('back_to_active')}</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}

      {/* Informative Banner when all panoramas are private and visitor is not admin */}
      {!isAdmin && validPanoramas.length === 0 && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto animate-fade-in">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/85 backdrop-blur-xl border border-amber-500/40 text-zinc-200 shadow-2xl text-xs font-semibold">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{t('all_private_banner', { count: activePanoramas.length })}</span>
            <button
              onClick={() => setShowAdminModal(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 font-bold border border-amber-500/50 text-[11px] cursor-pointer transition-all"
            >
              {t('admin_login')}
            </button>
          </div>
        </div>
      )}

      {/* Leaflet World Map Container */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        minZoom={2}
        maxZoom={18}
        className={`w-full h-full z-0 map-style-${mapStyle}`}
        zoomControl={false}
        boxZoom={false}
      >
        <MapController
          initialCenter={mapCenter}
          initialZoom={mapZoom}
          hasInitialCoords={hasInitialCoords}
          validPanoramas={validPanoramas}
          mapStyle={mapStyle}
          flyToTarget={flyToTarget}
          onMapChange={(lat, lng, zoom, bounds) => {
            setMapCenter([lat, lng]);
            setMapZoom(zoom);
            setMapBounds(bounds);
          }}
          onMapReady={setMapInstance}
        />

        {/* Admin Marquee Rectangle Selection Tool */}
        {isAdmin && (
          <MapMarqueeSelector
            active={isMarqueeActive}
            onSelectBounds={handleMarqueeBounds}
            onSingleClick={handleMarqueeSingleClick}
          />
        )}

        {/* OpenStreetMap Dark Mode */}
        {mapStyle === 'dark' && (
          <TileLayer
            key="osm-dark"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            className="dark-tiles"
            // @ts-ignore
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}

        {/* OpenStreetMap Standard Clean */}
        {mapStyle === 'voyager' && (
          <TileLayer
            key="osm-street"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            // @ts-ignore
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}

        {/* Esri Satellite Imagery */}
        {mapStyle === 'satellite' && (
          <TileLayer
            key="esri-sat"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
            // @ts-ignore
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}

        {/* Render Clustered GPS Pins with Supercluster (Smooth Zoom & Mobile 1-Tap) */}
        <ClusteredMarkers
          panoramas={filteredPanoramas}
          isAdmin={isAdmin}
          isMarqueeActive={isMarqueeActive}
          selectedPanoIds={selectedPanoIds}
          onSelectPano={handleSelectPano}
          onToggleSelectPano={toggleSelectPano}
          filmstripMode={filmstripMode}
          isFilmstripEligible={isFilmstripEligible}
          panoNumberMap={panoNumberMap}
          hoveredPanoId={hoveredPanoId}
          onHoverPano={setHoveredPanoId}
        />

        {/* User Current Position Marker ("My Position") */}
        {userLocation && (
          <>
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={myLocationIcon}
              zIndexOffset={999}
            >
              <Tooltip direction="top" offset={[0, -12]} opacity={1} className="glass-noir-tooltip">
                <div className="px-3 py-1.5 rounded-xl bg-zinc-950/95 backdrop-blur-md border border-cyan-400/50 text-xs text-white shadow-2xl flex items-center gap-2 pointer-events-none">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-pulse" />
                  <span className="font-bold tracking-wide">
                    {userLocation.isApproximate
                      ? (i18n.language.startsWith('sk')
                          ? `Približná poloha (${userLocation.cityName || 'sieť IP'})`
                          : `Approximate (${userLocation.cityName || 'IP network'})`)
                      : (i18n.language.startsWith('sk') ? 'Moja pozícia (GPS)' : 'My position (GPS)')}
                  </span>
                  {nearestPanoToUser && (
                    <span className="text-[10px] text-zinc-400">
                      · {nearestPanoToUser.name} ({nearestPanoToUser.distText})
                    </span>
                  )}
                </div>
              </Tooltip>
            </Marker>
            {userLocation.accuracy && userLocation.accuracy > 0 && userLocation.accuracy < 25000 && (
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={userLocation.accuracy}
                pathOptions={{
                  color: userLocation.isApproximate ? '#38bdf8' : '#06b6d4',
                  weight: 1.5,
                  dashArray: '4, 4',
                  fillColor: userLocation.isApproximate ? '#38bdf8' : '#06b6d4',
                  fillOpacity: 0.08,
                }}
              />
            )}
          </>
        )}
      </MapContainer>

      {/* Floating Quick Locate Button (bottom-right / side of map) */}
      {!tilesMode && (
        <button
          onClick={handleLocateUser}
          disabled={isLocating}
          className={`absolute ${
            filmstripMode && isFilmstripEligible ? 'bottom-36 md:bottom-40' : 'bottom-6 md:bottom-8'
          } right-3 md:right-4 z-[800] p-2.5 rounded-2xl glass-panel-elevated hover:bg-white/10 text-cyan-400 hover:text-white border border-white/15 shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 group`}
          title={i18n.language.startsWith('sk') ? 'Zamerať moju pozíciu' : 'Locate my position'}
          aria-label="My position"
        >
          <LocateFixed className={`w-5 h-5 ${isLocating ? 'animate-spin text-amber-400' : userLocation ? 'text-cyan-300' : 'text-cyan-400 group-hover:text-cyan-200'}`} />
        </button>
      )}

      {/* Tiles view: grouped by location */}
      {tilesMode && (
        <div className={`absolute inset-0 z-[500] overflow-y-auto bg-[#090a0f] pt-20 pb-8 px-4 md:pr-6 custom-scrollbar ${sidebarOpen ? 'md:pl-[25rem]' : 'md:pl-6'}`}>
          {filteredPanoramas.length === 0 ? (
            <div className="text-zinc-400 text-sm text-center mt-20">{t('no_panos_match')}</div>
          ) : (
            <div className="space-y-8 w-full">
              {groupedPanoramas.map((group) => (
                <div key={group.id} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      {group.type === 'date' ? (
                        <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                      ) : (
                        <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                      )}
                      <h3 className="text-sm font-bold text-white tracking-wide">{group.title}</h3>
                      {group.type === 'date' && group.rawKey !== 'unknown_date' && (
                        <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
                          ({group.rawKey})
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                        {group.items.length}
                      </span>
                    </div>

                    {isAdmin && group.items.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const ids = group.items.map((p) => String(p.id));
                          const allSelected = ids.every((id) => selectedPanoIds.has(id));
                          if (allSelected) {
                            deselectPanos(ids);
                          } else {
                            selectPanos(ids);
                          }
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          group.items.every((p) => selectedPanoIds.has(String(p.id)))
                            ? 'bg-cyan-500 text-zinc-950 shadow-md ring-1 ring-cyan-300'
                            : group.items.some((p) => selectedPanoIds.has(String(p.id)))
                            ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50'
                            : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10'
                        }`}
                        title={
                          group.items.every((p) => selectedPanoIds.has(String(p.id)))
                            ? (group.type === 'date' ? t('deselect_day', 'Zrušiť výber dňa') : t('deselect_location', 'Zrušiť výber v lokalite'))
                            : (group.type === 'date' ? t('select_day', 'Vybrať deň') : t('select_location', 'Vybrať lokalitu'))
                        }
                      >
                        {group.items.every((p) => selectedPanoIds.has(String(p.id))) ? (
                          <CheckSquare className="w-3.5 h-3.5" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {group.items.every((p) => selectedPanoIds.has(String(p.id)))
                            ? 'Všetko'
                            : group.type === 'date'
                            ? t('select_day', 'Vybrať deň')
                            : t('select_location', 'Vybrať lokalitu')}
                        </span>
                      </button>
                    )}
                  </div>

                  <div
                    className={
                      tileSize === 'large'
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4'
                        : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3'
                    }
                  >
                    {group.items.map((pano) => {
                      const tags = extractPanoramaTags(pano);
                      return (
                        <div
                          key={pano.id}
                          onClick={() => handleSelectPano(pano)}
                          className={`group relative aspect-[2/1] rounded-xl overflow-hidden border ${
                            selectedPanoIds.has(String(pano.id))
                              ? 'border-cyan-400 ring-2 ring-cyan-400/80 shadow-xl shadow-cyan-950/80'
                              : 'border-white/10 hover:border-cyan-400/80'
                          } bg-zinc-900 text-left transition-all cursor-pointer shadow-md ${
                            tileSize === 'large' ? 'shadow-xl hover:shadow-cyan-950/70 hover:scale-[1.01]' : ''
                          }`}
                          title={pano.filename}
                        >
                          {/* Offline Archive Fallback Badge & Placeholder */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 p-2 text-center pointer-events-none">
                            <div className="w-7 h-7 rounded-lg bg-zinc-800/90 border border-white/10 flex items-center justify-center mb-1 text-zinc-400 group-hover:text-amber-400 group-hover:border-amber-400/40 transition-colors">
                              <HardDrive className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[10px] font-bold text-zinc-300 line-clamp-1">{pano.folder || pano.filename.split('/').pop()}</span>
                            <span className="text-[8px] text-amber-400/90 font-medium">Offline archív ({pano.original_filepath ? pano.original_filepath.slice(0, 2) : 'E:'})</span>
                          </div>

                          <img
                            src={
                              tileSize === 'large'
                                ? `${panoConfig.storage.panoramas2kUrl}/${cleanPanoPath(pano.filename)}`
                                : `${panoConfig.storage.thumbnailsUrl}/${cleanPanoPath(pano.filename)}`
                            }
                            alt={pano.filename}
                            onError={(e) => {
                              const target = e.currentTarget;
                              const clean = cleanPanoPath(pano.filename);
                              if (tileSize === 'large' && target.src.includes('/panoramas_2k/')) {
                                target.src = `${panoConfig.storage.thumbnailsUrl}/${clean}`;
                              } else if (!target.src.includes('/thumbnails/')) {
                                target.src = `/thumbnails/${clean}`;
                              } else {
                                target.style.display = 'none';
                              }
                            }}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 relative z-10"
                          />

                          {/* Top Overlay over the sky: Location, Admin checkbox, Badges, Date/Time, and Tags */}
                          <div className={`absolute inset-x-0 top-0 z-20 pointer-events-none flex flex-col ${
                            tileSize === 'large'
                              ? 'p-2.5 bg-gradient-to-b from-black/90 via-black/60 to-transparent'
                              : 'p-1.5 bg-gradient-to-b from-black/90 via-black/60 to-transparent'
                          }`}>
                            {/* Top Row: Left (Admin checkbox + Location name), Right (Admin Toggle + Resolution badge) */}
                            <div className="flex items-center justify-between gap-1.5 w-full">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                {(pano as any).cluster_count && (
                                  <div
                                    className="shrink-0 pointer-events-auto px-1.5 py-0.5 rounded bg-amber-500 text-zinc-950 font-black text-[10px] flex items-center gap-1 shadow-md border border-amber-300 font-mono"
                                    title={i18n.language.startsWith('sk') ? `Časový klaster: ${(pano as any).cluster_count} záberov` : `Timeline cluster: ${(pano as any).cluster_count} captures`}
                                  >
                                    <History className="w-3 h-3 stroke-[2.5]" />
                                    <span>#{(pano as any).cluster_count}</span>
                                  </div>
                                )}
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if ((pano as any).cluster_members) {
                                        const memberIds = (pano as any).cluster_members.map((m: any) => String(m.id));
                                        const allSelected = memberIds.every((id: string) => selectedPanoIds.has(id));
                                        if (allSelected) {
                                          deselectPanos(memberIds);
                                        } else {
                                          selectPanos(memberIds);
                                        }
                                      } else {
                                        toggleSelectPano(String(pano.id));
                                      }
                                    }}
                                    className={`shrink-0 pointer-events-auto w-5 h-5 rounded flex items-center justify-center transition-all cursor-pointer ${
                                      (pano as any).cluster_members && (pano as any).cluster_members.every((m: any) => selectedPanoIds.has(String(m.id)))
                                        ? 'bg-cyan-500 text-zinc-950 shadow-md ring-1 ring-cyan-300'
                                        : selectedPanoIds.has(String(pano.id))
                                        ? 'bg-cyan-500 text-zinc-950 shadow-md ring-1 ring-cyan-300'
                                        : 'bg-black/60 text-white/70 hover:text-white border border-white/30 hover:border-cyan-400'
                                    }`}
                                    title={
                                      (pano as any).cluster_members
                                        ? (i18n.language.startsWith('sk') ? `Označiť všetky v klastri (${(pano as any).cluster_count})` : `Select all in cluster (${(pano as any).cluster_count})`)
                                        : (selectedPanoIds.has(String(pano.id)) ? 'Deselect panorama' : 'Select panorama')
                                    }
                                  >
                                    {((pano as any).cluster_members ? (pano as any).cluster_members.every((m: any) => selectedPanoIds.has(String(m.id))) : selectedPanoIds.has(String(pano.id))) ? (
                                      <CheckSquare className="w-3.5 h-3.5" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                                <span className={`font-bold text-white truncate drop-shadow-md ${
                                  tileSize === 'large' ? 'text-xs' : 'text-[10px]'
                                }`}>
                                  {getPanoramaCity(pano) || pano.original_filename || pano.filename}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {isAdmin && pano.is_private && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      togglePanoramaPublic(pano.id, true);
                                    }}
                                    className="pointer-events-auto px-1.5 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] flex items-center gap-1 shadow-md border border-emerald-400 transition-all cursor-pointer hover:scale-105 active:scale-95"
                                    title={t('add_to_public', 'Pridať do public')}
                                  >
                                    <Globe2 className="w-2.5 h-2.5" />
                                    <span>{t('add_to_public', 'Pridať')}</span>
                                  </button>
                                )}
                                {isAdmin && !pano.is_private && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      togglePanoramaPublic(pano.id, false);
                                    }}
                                    className="pointer-events-auto px-1.5 py-0.5 rounded-md bg-zinc-900/90 hover:bg-rose-600 text-cyan-300 hover:text-white font-bold text-[9px] flex items-center gap-1 shadow-md border border-cyan-500/40 hover:border-rose-400 transition-all cursor-pointer hover:scale-105 active:scale-95"
                                    title={t('make_private', 'Presunúť do súkromných')}
                                  >
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>Priv</span>
                                  </button>
                                )}
                                <div className="px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/20 text-[9px] font-bold text-zinc-300 font-mono shadow-sm">
                                  {getHorizontalK(pano.width)}
                                </div>
                              </div>
                            </div>

                            {/* Second Row: Date/Time + Tags */}
                            <div className="flex items-center flex-wrap gap-1 mt-1 overflow-hidden">
                              <span className={`text-zinc-300 font-mono shrink-0 drop-shadow mr-0.5 ${
                                tileSize === 'large' ? 'text-[10px]' : 'text-[8.5px]'
                              }`}>
                                {formatPanoramaDateTime(pano.date)}
                              </span>
                              {tags.length > 0 && tags.map((tg) => (
                                <button
                                  key={tg}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTag(tg);
                                  }}
                                  className={`pointer-events-auto rounded bg-cyan-500/25 hover:bg-cyan-500/45 text-cyan-200 border border-cyan-400/50 font-mono font-semibold transition-colors cursor-pointer truncate max-w-full drop-shadow-sm ${
                                    tileSize === 'large' ? 'px-1.5 py-0.2 text-[9.5px]' : 'px-1 py-0.2 text-[8px]'
                                  }`}
                                  title={`Filtrovať podľa tagu ${tg}`}
                                >
                                  {tg}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin Floating Bulk Action Toolbar */}
      {isAdmin && selectedPanoIds.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1500] pointer-events-auto animate-slide-up">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-cyan-500/50 shadow-2xl shadow-cyan-950/80 text-white">
            <div className="flex items-center gap-1.5 pr-2 border-r border-white/15">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-black text-cyan-300">
                {t('selected_count', { count: selectedPanoIds.size })}
              </span>
            </div>

            {/* If in isDeletedMode: Show Restore action */}
            {isDeletedMode ? (
              <button
                onClick={handleBulkRestore}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="Restore selected panoramas from !DELETED! to private archive"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('restore_selected')}</span>
              </button>
            ) : (
              <>
                {/* Make Public Button */}
                <button
                  onClick={handleBulkMakePublic}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
                  title="Set selected panoramas as Public"
                >
                  <Globe2 className="w-3.5 h-3.5" />
                  <span>{t('make_public')}</span>
                </button>

                {/* Make Private Button */}
                <button
                  onClick={handleBulkMakePrivate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
                  title="Move selected panoramas to Private archive"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{t('make_private')}</span>
                </button>

                {/* Tagy (T) Button */}
                <button
                  onClick={() => setShowTagEditorModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/35 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
                  title="Upraviť vlastné tagy pre vybrané panorámy (Kláves T)"
                >
                  <Tag className="w-3.5 h-3.5 text-purple-400" />
                  <span>Tagy (T)</span>
                </button>

                {/* Smart GPS Button */}
                <button
                  onClick={() => setShowSmartGpsModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
                  title="Smart GPS auto-kopírovanie z rovnakého dátumu a drag-and-drop na mape"
                >
                  <Navigation className="w-3.5 h-3.5 text-amber-400" />
                  <span>Smart GPS</span>
                </button>

                {/* 2 Panoramas Alignment Calibration Button */}
                {selectedPanoIds.size === 2 && (
                  <button
                    onClick={() => {
                      const selected = validPanoramas.filter((p) => selectedPanoIds.has(String(p.id)));
                      if (selected.length === 2) {
                        setOpenCalibrationOnPano(true);
                        handleSelectPano(selected[0]);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/25 hover:bg-cyan-500/40 text-cyan-200 hover:text-white border border-cyan-400/50 text-xs font-bold transition-all shadow-sm cursor-pointer"
                    title={i18n.language.startsWith('sk') ? 'Kalibrovať zarovnanie dvoch vybraných panorám (50% prekryv)' : 'Calibrate alignment of 2 selected panoramas (50% overlay)'}
                  >
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{i18n.language.startsWith('sk') ? 'Zarovnať 2' : 'Align 2'}</span>
                  </button>
                )}

                {/* Mark Deleted Button */}
                <button
                  onClick={handleBulkMarkDeleted}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-rose-950 text-zinc-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/40 text-xs font-bold transition-all cursor-pointer"
                  title="Mark selected panoramas as Deleted"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>{t('delete')}</span>
                </button>
              </>
            )}

            {/* Deselect All */}
            <button
              onClick={clearSelection}
              className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors ml-1 cursor-pointer"
              title={t('clear_selection')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Filmstrip Drawer (Active when filmstripMode is ON and not in viewer/tiles mode) */}
      {filmstripMode && !tilesMode && !selectedPano && (
        isFilmstripEligible ? (
          <div
            ref={filmstripDrawerRef}
            data-help="map_filmstrip_drawer"
            className={`absolute bottom-2 md:bottom-3 right-2 md:right-3 ${
              sidebarOpen ? 'left-2 md:left-[24.75rem]' : 'left-2 md:left-3'
            } z-[900] pointer-events-auto transition-all duration-300 ease-in-out animate-slide-up`}
          >
            <div className="glass-panel-elevated rounded-3xl p-3 border border-white/15 bg-zinc-950/95 backdrop-blur-2xl shadow-2xl flex flex-col gap-2 relative">
              {/* Header row */}
              <div className="flex items-center justify-between px-2 mb-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-amber-400" />
                    <span>{i18n.language.startsWith('sk') ? 'Panorámy na mape' : 'Map Panoramas'}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
                    {sortedVisiblePanoramas.length} {i18n.language.startsWith('sk') ? 'vo výreze' : 'visible'}
                  </span>
                  <span className="hidden lg:inline text-[10px] text-zinc-400 truncate">
                    {i18n.language.startsWith('sk')
                      ? '(od západu na východ, #1 = vľavo)'
                      : '(West to East, #1 = left)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Filmstrip Card Size Switcher */}
                  <div className="hidden xl:flex items-center bg-black/50 p-0.5 rounded-xl border border-white/10 text-[10px]">
                    <button
                      onClick={() => setFilmstripSize('mini')}
                      className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                        filmstripSize === 'mini' ? 'bg-white/20 text-white font-extrabold' : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Mini"
                    >
                      Mini
                    </button>
                    <button
                      onClick={() => setFilmstripSize('normal')}
                      className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                        filmstripSize === 'normal' ? 'bg-white/20 text-white font-extrabold' : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Normal"
                    >
                      Normal
                    </button>
                    <button
                      onClick={() => setFilmstripSize('large')}
                      className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                        filmstripSize === 'large' ? 'bg-white/20 text-white font-extrabold' : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Large"
                    >
                      Large
                    </button>
                  </div>

                  {/* Scroll controls & Close */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleScrollFilmstrip('left')}
                      className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Scroll Left"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleScrollFilmstrip('right')}
                      className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Scroll Right"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setUserDismissedFilmstrip(true);
                        setExplicitlyForcedFilmstrip(false);
                        setFilmstripMode(false);
                      }}
                      className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-rose-400 transition-colors ml-1 cursor-pointer"
                      title={i18n.language.startsWith('sk') ? 'Skryť filmstrip' : 'Hide filmstrip'}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Horizontal Scroll Cards */}
              <div
                ref={filmstripScrollRef}
                className="flex items-center gap-3 overflow-x-auto custom-scrollbar pb-1 pt-0.5 px-1 snap-x touch-pan-x scroll-smooth"
              >
                {sortedVisiblePanoramas.map((p, idx) => {
                  const num = idx + 1;
                  const isHovered = hoveredPanoId === String(p.id);
                  const resCat = getResolutionCategory(p.width);
                  const isPriv = Boolean(p.is_private);
                  const cardWidthClass =
                    filmstripSize === 'mini' ? 'w-32' : filmstripSize === 'large' ? 'w-64' : 'w-48';
                  const thumbHeightClass =
                    filmstripSize === 'mini' ? 'h-16' : filmstripSize === 'large' ? 'h-32' : 'h-24';

                  return (
                    <div
                      key={p.id}
                      data-pano-id={p.id}
                      onClick={() => handleSelectPano(p)}
                      onMouseEnter={() => setHoveredPanoId(String(p.id))}
                      onMouseLeave={() => setHoveredPanoId(null)}
                      className={`flex-none ${cardWidthClass} group cursor-pointer rounded-2xl overflow-hidden glass-panel transition-all duration-300 text-left relative snap-start ${
                        isHovered
                          ? 'border-amber-400 ring-2 ring-amber-400 shadow-xl shadow-amber-950/80 bg-amber-950/30 scale-[1.02]'
                          : isPriv
                          ? 'hover:border-rose-500/60 hover:bg-rose-950/20 border-white/10'
                          : 'hover:border-cyan-500/60 hover:bg-zinc-800/80 border-white/10'
                      }`}
                      title={`${num}. ${getPanoramaCity(p) || p.filename}`}
                    >
                      {/* Thumbnail */}
                      <div className={`relative w-full ${thumbHeightClass} bg-zinc-900 overflow-hidden`}>
                        {/* Offline Archive Fallback Badge & Placeholder */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 p-2 text-center pointer-events-none">
                          <div className="w-6 h-6 rounded-lg bg-zinc-800/90 border border-white/10 flex items-center justify-center mb-0.5 text-zinc-400">
                            <HardDrive className="w-3 h-3 text-amber-400/80" />
                          </div>
                          <span className="text-[9px] font-bold text-zinc-300 line-clamp-1">{p.folder || p.filename.split('/').pop()}</span>
                        </div>

                        <img
                          src={`${panoConfig.storage.thumbnailsUrl}/${cleanPanoPath(p.filename)}`}
                          alt={p.city || p.filename}
                          onError={(e) => {
                            const target = e.currentTarget;
                            const clean = cleanPanoPath(p.filename);
                            if (!target.src.includes('/thumbnails/')) {
                              target.src = `/thumbnails/${clean}`;
                            } else if (!target.src.includes('/panoramas_2k/')) {
                              target.src = `/panoramas_2k/${clean}`;
                            } else {
                              target.style.display = 'none';
                            }
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 relative z-10"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/60 via-transparent to-transparent z-10 pointer-events-none" />

                        {/* Admin Multi-select Checkbox (in both regular and cluster mode) */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if ((p as any).cluster_members) {
                                const memberIds = (p as any).cluster_members.map((m: any) => String(m.id));
                                const allSelected = memberIds.every((id: string) => selectedPanoIds.has(id));
                                if (allSelected) {
                                  deselectPanos(memberIds);
                                } else {
                                  selectPanos(memberIds);
                                }
                              } else {
                                toggleSelectPano(p.id);
                              }
                            }}
                            className={`absolute top-1.5 ${(p as any).cluster_count ? 'right-1.5' : 'left-1.5'} z-20 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                              (p as any).cluster_members && (p as any).cluster_members.every((m: any) => selectedPanoIds.has(String(m.id)))
                                ? 'bg-cyan-500 text-zinc-950 shadow-md ring-2 ring-cyan-300'
                                : isPanoSelected(p.id)
                                ? 'bg-cyan-500 text-zinc-950 shadow-md ring-2 ring-cyan-300'
                                : 'bg-black/60 text-white/70 hover:text-white border border-white/30 hover:border-cyan-400'
                            }`}
                            title={
                              (p as any).cluster_members
                                ? (i18n.language.startsWith('sk') ? `Označiť všetky v klastri (${(p as any).cluster_count})` : `Select all in cluster (${(p as any).cluster_count})`)
                                : (isPanoSelected(p.id) ? 'Deselect panorama' : 'Select panorama for bulk edit')
                            }
                          >
                            {((p as any).cluster_members ? (p as any).cluster_members.every((m: any) => selectedPanoIds.has(String(m.id))) : isPanoSelected(p.id)) ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        {/* Number or Timeline Cluster Badge (#10) */}
                        {(p as any).cluster_count ? (
                          <div
                            className="absolute top-1.5 left-1.5 px-2 h-6 rounded-lg bg-amber-500 text-zinc-950 font-black text-xs flex items-center gap-1 shadow-lg border border-amber-300 font-mono z-20"
                            title={i18n.language.startsWith('sk') ? `Časová os: ${(p as any).cluster_count} záberov` : `Timeline cluster: ${(p as any).cluster_count} captures`}
                          >
                            <History className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>#{(p as any).cluster_count}</span>
                          </div>
                        ) : (
                          <div
                            className={`absolute top-1.5 ${isAdmin ? 'left-8.5' : 'left-1.5'} min-w-6 h-6 px-1.5 rounded-lg ${
                              isHovered
                                ? 'bg-amber-400 text-zinc-950 ring-2 ring-amber-300'
                                : isPriv
                                ? 'bg-rose-500 text-white'
                                : 'bg-cyan-500 text-zinc-950'
                            } font-extrabold text-xs flex items-center justify-center shadow-lg border border-white/40 font-mono`}
                          >
                            #{num}
                          </div>
                        )}

                        {/* Top-Right Badges: GPS Status, Lock + Resolution (15K highlight) */}
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-20">
                          <GpsStatusBadge status={getPanoramaGpsStatus(p)} size="xs" showLabel={false} />

                          {isPriv && (
                            <div className="w-5 h-5 rounded-md bg-rose-500/90 text-white flex items-center justify-center shadow-md">
                              <Lock className="w-2.5 h-2.5" />
                            </div>
                          )}

                          {resCat === '15K' ? (
                            <div
                              className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-400 to-yellow-400 text-zinc-950 font-black text-[10px] flex items-center gap-0.5 shadow-md border border-amber-300 ring-1 ring-amber-400/50"
                              title="Ultra-Resolution 15K Panorama (15000-15999px wide)"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-zinc-950 fill-zinc-950" />
                              <span>15K</span>
                            </div>
                          ) : (
                            <div
                              className="px-1 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-zinc-200 border border-white/20 text-[9px] font-bold shadow-sm"
                              title={`Resolution: ${p.width}×${p.height}`}
                            >
                              <span>{resCat}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Info below thumbnail - hide in mini mode to keep it as a clean single-row strip of thumbnails */}
                      {filmstripSize !== 'mini' && (
                        <div className="p-2 space-y-1">
                          <div
                            className={`text-xs font-semibold text-white truncate ${
                              isHovered
                                ? 'text-amber-300'
                                : isPriv
                                ? 'group-hover:text-rose-300'
                                : 'group-hover:text-cyan-300'
                            } transition-colors`}
                          >
                            {getPanoramaCity(p)}
                          </div>
                          <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-400">
                            <span className="truncate">{formatPanoramaDate(p.date)}</span>
                            <span className="font-mono text-zinc-500 shrink-0">{getMegapixels(p.width, p.height)}</span>

                            {/* Admin GPS & Privacy Actions */}
                            {isAdmin && (
                              <div className="flex items-center gap-1 shrink-0">
                                {/* 1-Click GPS Confirmation if Auto Needs Review */}
                                {getPanoramaGpsStatus(p) === 'auto_needs_review' && (
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await batchUpdatePanoramas({ ids: [String(p.id)], gps_source: 'manual' });
                                      showToast('GPS potvrdené ako overené!');
                                    }}
                                    className="px-1.5 py-0.5 rounded-md bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 text-[9px] font-bold flex items-center gap-0.5 transition-all cursor-pointer shadow-xs"
                                    title="1-klik potvrdenie GPS polohy (označí ako overenú)"
                                  >
                                    <Check className="w-2.5 h-2.5" />
                                    <span>Overiť</span>
                                  </button>
                                )}

                                {/* Smart GPS Edit Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSmartGpsTargetPanos([p]);
                                    setShowSmartGpsModal(true);
                                  }}
                                  className="p-1 rounded-md bg-white/10 hover:bg-cyan-500/30 text-cyan-300 border border-white/10 hover:border-cyan-400 text-[9px] font-bold transition-all cursor-pointer"
                                  title="Upraviť GPS polohu v Smart GPS editore"
                                >
                                  <Navigation className="w-2.5 h-2.5" />
                                </button>

                                {/* Simple switch for public/private */}
                                <button
                                  type="button"
                                  onClick={(e) => handleTogglePanoPublic(e, p)}
                                  className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                                    isPriv
                                      ? 'bg-zinc-800/90 text-rose-300 border-rose-500/40 hover:bg-rose-500/20 shadow-sm'
                                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-sm'
                                  }`}
                                  title={isPriv ? 'Make public' : 'Make private'}
                                >
                                  <div
                                    className={`w-3 h-1.5 rounded-full p-0.5 flex items-center ${
                                      isPriv ? 'bg-zinc-700 justify-start' : 'bg-emerald-500 justify-end'
                                    }`}
                                  >
                                    <div className="w-0.5 h-0.5 rounded-full bg-white shadow-xs" />
                                  </div>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (explicitlyForcedFilmstrip && sortedVisiblePanoramas.length > 30) ? (
          /* Helper Pill when visible > 30 and user explicitly forced filmstrip */
          <div
            className={`absolute bottom-2 md:bottom-4 ${
              sidebarOpen ? 'left-2 md:left-[24.75rem]' : 'left-2 md:left-4'
            } right-2 md:right-4 z-[900] pointer-events-none animate-slide-up flex justify-center`}
          >
            <div className="pointer-events-auto glass-panel-elevated rounded-2xl p-2.5 sm:px-3.5 sm:py-2 border border-amber-500/40 bg-zinc-950/95 backdrop-blur-xl shadow-2xl flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-start gap-2 sm:gap-3 text-xs max-w-lg">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Film className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-zinc-200 text-[11px] sm:text-xs leading-tight">
                  {i18n.language.startsWith('sk')
                    ? `Na mape je ${sortedVisiblePanoramas.length} panorám. Pre filmstrip priblížte mapu (max 30).`
                    : `Map has ${sortedVisiblePanoramas.length} panos. Zoom in for filmstrip (max 30).`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                <button
                  onClick={() => {
                    setMapZoom((z) => Math.min(z + 1, 18));
                    setFlyToTarget({ lat: mapCenter[0], lng: mapCenter[1], zoom: Math.min(mapZoom + 1, 18), timestamp: Date.now() });
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 hover:text-white border border-amber-400/40 font-bold transition-all cursor-pointer text-xs"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>{i18n.language.startsWith('sk') ? 'Priblížiť' : 'Zoom in'}</span>
                </button>
                <button
                  onClick={() => {
                    setUserDismissedFilmstrip(true);
                    setExplicitlyForcedFilmstrip(false);
                    setFilmstripMode(false);
                  }}
                  className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title={i18n.language.startsWith('sk') ? 'Vypnúť filmstrip' : 'Dismiss'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : explicitlyForcedFilmstrip ? (
          /* No panoramas in viewport (only when explicitly requested) */
          <div
            className={`absolute bottom-2 md:bottom-4 ${
              sidebarOpen ? 'left-2 md:left-[24.75rem]' : 'left-2 md:left-4'
            } right-2 md:right-4 z-[900] pointer-events-none animate-slide-up flex justify-center`}
          >
            <div className="pointer-events-auto glass-panel-elevated rounded-2xl px-3 py-2 border border-white/15 bg-zinc-950/95 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-3 text-xs text-zinc-300 max-w-md">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[11px] sm:text-xs">
                  {i18n.language.startsWith('sk')
                    ? 'V aktuálnom výreze mapy nie sú žiadne panorámy.'
                    : 'No panoramas in the current map view.'}
                </span>
              </div>
              <button
                onClick={() => {
                  setUserDismissedFilmstrip(true);
                  setExplicitlyForcedFilmstrip(false);
                  setFilmstripMode(false);
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : null
      )}

      {/* Fullscreen Interactive 360 Panorama Viewer */}
      {selectedPano && canViewPano(selectedPano) && (
        <PanoViewer
          key="pano-viewer-main"
          panorama={selectedPano}
          initialLon={initialParams.panoLon}
          initialLat={initialParams.panoLat !== undefined ? initialParams.panoLat : getSavedCameraState().lat}
          initialFov={initialParams.panoFov !== undefined ? initialParams.panoFov : getSavedCameraState().fov}
          initialProjection={activeProjectionMode}
          currentProjectionMode={activeProjectionMode}
          onProjectionModeChange={(mode) => {
            setActiveProjectionMode(mode);
            try {
              localStorage.setItem('pano_projection_mode', mode);
            } catch {}
          }}
          allPanoramas={validPanoramas}
          filteredPanoramas={filteredPanoramas}
          showPublic={showPublic}
          showPrivate={showPrivate}
          timelineCluster={selectedPano ? panoToCluster.get(selectedPano.id) : undefined}
          initialOpenCalibration={openCalibrationOnPano}
          onClose={() => {
            setOpenCalibrationOnPano(false);
            handleSelectPano(null);
          }}
          onSelectPanorama={(p) => handleSelectPano(p)}
          onShowToast={showToast}
          isExplorerOpen={sidebarOpen}
          onToggleExplorer={() => setSidebarOpen((prev) => !prev)}
          onOpenMapAtCoords={handleOpenMapAtCoords}
          onlyFavorites={onlyFavorites}
          onToggleOnlyFavorites={() => setOnlyFavorites((v) => !v)}
          onlyTimelineClusters={onlyTimelineClusters}
          onToggleOnlyTimelineClusters={() => setOnlyTimelineClusters((v) => !v)}
          selectedYears={selectedYears}
          onToggleYear={handleToggleYear}
          selectedMonths={selectedMonths}
          onToggleMonth={handleToggleMonth}
          selectedResolutions={selectedResolutions}
          onToggleResolution={handleToggleResolution}
          selectedTags={selectedTags}
          onToggleTag={handleToggleTag}
          selectedMoods={selectedMoods}
          onToggleMood={handleToggleMood}
          searchQuery={searchQuery}
          onClearSearch={() => setSearchQuery('')}
          onResetAllFilters={handleResetAllFilters}
          hasAnyFilterActive={hasAnyFilterActive}
          totalCount={validPanoramas.length}
        />
      )}

      {/* Admin Tag Editor Modal */}
      {isAdmin && (
        <AdminTagEditorModal
          isOpen={showTagEditorModal}
          onClose={() => setShowTagEditorModal(false)}
          panoramas={selectedPanosList}
          allPanoramas={panoramas}
          onSaved={() => {
            showToast(i18n.language.startsWith('sk') ? 'Tagy úspešne uložené do D1' : 'Tags saved to D1');
          }}
        />
      )}

      {/* Admin Smart GPS Modal */}
      {isAdmin && (
        <AdminSmartGpsModal
          isOpen={showSmartGpsModal}
          onClose={() => {
            setShowSmartGpsModal(false);
            setSmartGpsTargetPanos(null);
          }}
          targetPanoramas={
            smartGpsTargetPanos ||
            (selectedPanosList.length > 0
              ? selectedPanosList
              : panoramas.filter((p) => p.lat === null || p.lon === null || (p.lat === 0 && p.lon === 0)))
          }
          allPanoramas={panoramas}
          onSaved={() => {
            showToast(i18n.language.startsWith('sk') ? 'GPS úspešne priradené a uložené do D1' : 'GPS assigned and saved to D1');
            onRefreshPanoramas?.();
          }}
        />
      )}

      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
