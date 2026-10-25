import React from 'react';
import { MapPin, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { getPanoramaGpsStatus, type GpsStatus, type Panorama } from '../types';

interface GpsStatusBadgeProps {
  panorama?: Panorama;
  status?: GpsStatus;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export const GpsStatusBadge: React.FC<GpsStatusBadgeProps> = ({
  panorama,
  status: explicitStatus,
  size = 'sm',
  showLabel = true,
  className = '',
}) => {
  const status: GpsStatus = explicitStatus || (panorama ? getPanoramaGpsStatus(panorama) : 'no_gps');

  switch (status) {
    case 'no_gps':
      return (
        <span
          className={`inline-flex items-center gap-1 font-bold rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 backdrop-blur-md ${
            size === 'xs' ? 'px-1 py-0.2 text-[8px]' : size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
          } ${className}`}
          title="Bez GPS súradníc (Unmapped)"
        >
          <HelpCircle className={size === 'xs' ? 'w-2 h-2 text-rose-400' : size === 'sm' ? 'w-2.5 h-2.5 text-rose-400' : 'w-3 h-3 text-rose-400'} />
          {showLabel && <span>Bez GPS</span>}
        </span>
      );

    case 'auto_needs_review':
      return (
        <span
          className={`inline-flex items-center gap-1 font-bold rounded-md bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-xs shadow-amber-950/50 backdrop-blur-md ${
            size === 'xs' ? 'px-1 py-0.2 text-[8px]' : size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
          } ${className}`}
          title="Automatické GPS: vyžaduje kontrolu (Auto-assigned GPS, needs review)"
        >
          <AlertCircle className={size === 'xs' ? 'w-2 h-2 text-amber-400 animate-pulse' : size === 'sm' ? 'w-2.5 h-2.5 text-amber-400 animate-pulse' : 'w-3 h-3 text-amber-400 animate-pulse'} />
          {showLabel && <span>Na review</span>}
        </span>
      );

    case 'manual_editor':
      return (
        <span
          className={`inline-flex items-center gap-1 font-bold rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 backdrop-blur-md ${
            size === 'xs' ? 'px-1 py-0.2 text-[8px]' : size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
          } ${className}`}
          title="GPS overené v editore (Manual / Editor verified)"
        >
          <CheckCircle className={size === 'xs' ? 'w-2 h-2 text-cyan-300' : size === 'sm' ? 'w-2.5 h-2.5 text-cyan-300' : 'w-3 h-3 text-cyan-300'} />
          {showLabel && <span>Editor</span>}
        </span>
      );

    case 'original_exif':
      return (
        <span
          className={`inline-flex items-center gap-1 font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md ${
            size === 'xs' ? 'px-1 py-0.2 text-[8px]' : size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
          } ${className}`}
          title="Pôvodné GPS z fotoaparátu (EXIF)"
        >
          <MapPin className={size === 'xs' ? 'w-2 h-2 text-emerald-400' : size === 'sm' ? 'w-2.5 h-2.5 text-emerald-400' : 'w-3 h-3 text-emerald-400'} />
          {showLabel && <span>EXIF</span>}
        </span>
      );
  }
};
