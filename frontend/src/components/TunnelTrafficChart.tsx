import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Panorama } from '../types';
import { computeTunnelTraffic, type DailyTrafficPoint } from '../utils/traffic';
import { Activity, HardDrive, FileText, TrendingUp, Calendar, Zap } from 'lucide-react';

interface TunnelTrafficChartProps {
  panoramas: Panorama[];
}

export const TunnelTrafficChart: React.FC<TunnelTrafficChartProps> = ({ panoramas }) => {
  const { t } = useTranslation();
  const [daysRange, setDaysRange] = useState<7 | 14 | 30>(14);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const traffic = useMemo(() => {
    return computeTunnelTraffic(panoramas, daysRange);
  }, [panoramas, daysRange]);

  const points = traffic.dailyPoints;

  // Chart layout dimensions
  const svgWidth = 800;
  const svgHeight = 280;
  const paddingLeft = 50;
  const paddingRight = 60;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Compute maximums for scales
  const maxFiles = useMemo(() => {
    const max = Math.max(...points.map((p) => p.filesCount), 1);
    return Math.ceil(max * 1.15);
  }, [points]);

  const maxMB = useMemo(() => {
    const max = Math.max(...points.map((p) => p.megabytes), 1);
    return Math.ceil(max * 1.15);
  }, [points]);

  // Coordinates helper
  const getX = (index: number) => {
    if (points.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (points.length - 1)) * chartWidth;
  };

  const getFilesY = (files: number) => {
    return paddingTop + chartHeight - (files / maxFiles) * chartHeight;
  };

  const getMbY = (mb: number) => {
    return paddingTop + chartHeight - (mb / maxMB) * chartHeight;
  };

  // Generate SVG path for the MB line and area fill
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, i) => {
      const x = getX(i);
      const y = getMbY(p.megabytes);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [points, maxMB]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const firstX = getX(0);
    const lastX = getX(points.length - 1);
    const bottomY = paddingTop + chartHeight;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [linePath, points]);

  const barWidth = Math.min(26, Math.max(12, Math.floor(chartWidth / (points.length * 2.2))));

  const formatTotalSize = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const hoveredPoint: DailyTrafficPoint | null = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="glass-panel-elevated p-6 rounded-3xl border border-white/10 space-y-6">
      {/* Header & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">{t('tunnel_traffic')}</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">{t('tunnel_traffic_desc')}</p>
        </div>

        {/* Days Filter Pills */}
        <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          {([7, 14, 30] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setDaysRange(r);
                setHoveredIndex(null);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                daysRange === r
                  ? 'bg-cyan-500 text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t(`traffic_${r}d`)}
            </button>
          ))}
        </div>
      </div>

      {/* Traffic Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>{t('data_transferred')}</span>
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-white">{formatTotalSize(traffic.totalMB)}</p>
          <p className="text-[10px] text-emerald-400 font-medium">Cloudflare Tunnel</p>
        </div>

        <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>{t('files_served')}</span>
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <p className="text-xl font-black text-white">{traffic.totalFiles.toLocaleString()}</p>
          <p className="text-[10px] text-cyan-400 font-medium">Web + Thumbs assets</p>
        </div>

        <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>{t('avg_daily')}</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-xl font-black text-white">{formatTotalSize(traffic.avgDailyMB)}</p>
          <p className="text-[10px] text-blue-400 font-medium">per day estimate</p>
        </div>

        <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>{t('peak_day')}</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-black text-white">
            {traffic.peakDay ? formatTotalSize(traffic.peakDay.megabytes) : '0 MB'}
          </p>
          <p className="text-[10px] text-amber-300 font-medium truncate">
            {traffic.peakDay ? `${traffic.peakDay.formattedDate} (${traffic.peakDay.filesCount} files)` : '-'}
          </p>
        </div>
      </div>

      {/* SVG Interactive Dual-Axis Chart */}
      <div className="relative bg-zinc-950/60 rounded-2xl p-3 border border-white/5 overflow-hidden">
        {/* Tooltip Card */}
        {hoveredPoint && hoveredIndex !== null && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none glass-panel px-3.5 py-2 rounded-xl border border-cyan-400/50 shadow-xl flex items-center gap-3 text-xs animate-fade-in"
          >
            <div className="flex items-center gap-1.5 text-zinc-300 font-semibold border-r border-white/10 pr-2.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>{hoveredPoint.formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-300 font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>{hoveredPoint.filesCount} files</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-300 font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{formatTotalSize(hoveredPoint.megabytes)}</span>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-56 sm:h-72 select-none"
        >
          <defs>
            {/* Area gradient for MB curve */}
            <linearGradient id="trafficAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>

            {/* Bar gradient for files count */}
            <linearGradient id="filesBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
            </linearGradient>

            <linearGradient id="filesBarHoverGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="1" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Background grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + chartHeight * (1 - ratio);
            const filesVal = Math.round(maxFiles * ratio);
            const mbVal = Math.round(maxMB * ratio);
            return (
              <g key={ratio}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.07)"
                  strokeDasharray="4 4"
                />
                {/* Left axis (Files count) */}
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="rgba(148, 163, 184, 0.7)"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {filesVal}
                </text>
                {/* Right axis (MB) */}
                <text
                  x={svgWidth - paddingRight + 8}
                  y={y + 3}
                  textAnchor="start"
                  fill="rgba(52, 211, 153, 0.8)"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {mbVal}M
                </text>
              </g>
            );
          })}

          {/* Area fill for MB curve */}
          <path d={areaPath} fill="url(#trafficAreaGrad)" />

          {/* Bars for Files count */}
          {points.map((p, i) => {
            const x = getX(i) - barWidth / 2;
            const barHeight = Math.max(2, (p.filesCount / maxFiles) * chartHeight);
            const y = paddingTop + chartHeight - barHeight;
            const isHovered = hoveredIndex === i;

            return (
              <g
                key={p.date}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Invisible hover capture zone */}
                <rect
                  x={getX(i) - chartWidth / (points.length * 2)}
                  y={paddingTop}
                  width={chartWidth / points.length}
                  height={chartHeight + paddingBottom}
                  fill="transparent"
                />
                {/* Visual bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill={isHovered ? 'url(#filesBarHoverGrad)' : 'url(#filesBarGrad)'}
                  stroke={isHovered ? '#bae6fd' : 'rgba(56, 189, 248, 0.4)'}
                  strokeWidth={isHovered ? 1.5 : 0.5}
                />
              </g>
            );
          })}

          {/* Transferred data curve (MB) */}
          <path
            d={linePath}
            fill="none"
            stroke="#10b981"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots on MB line */}
          {points.map((p, i) => {
            const x = getX(i);
            const y = getMbY(p.megabytes);
            const isHovered = hoveredIndex === i;

            return (
              <circle
                key={`dot-${p.date}`}
                cx={x}
                cy={y}
                r={isHovered ? 6 : 3.5}
                fill={isHovered ? '#34d399' : '#10b981'}
                stroke="#090a0f"
                strokeWidth={2}
                className="transition-all pointer-events-none"
              />
            );
          })}

          {/* X axis date labels */}
          {points.map((p, i) => {
            // Label every step or skip every other for density
            const step = daysRange === 30 ? 3 : daysRange === 14 ? 2 : 1;
            if (i % step !== 0 && i !== points.length - 1) return null;
            const x = getX(i);
            const y = paddingTop + chartHeight + 20;

            return (
              <text
                key={`label-${p.date}`}
                x={x}
                y={y}
                textAnchor="middle"
                fill={hoveredIndex === i ? '#38bdf8' : 'rgba(148, 163, 184, 0.75)'}
                fontSize="10"
                fontWeight={hoveredIndex === i ? 'bold' : 'normal'}
                fontFamily="monospace"
              >
                {p.formattedDate}
              </text>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/5 gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-cyan-500 inline-block" />
              <span className="text-zinc-300 font-medium">{t('files_served')} (bar)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 rounded bg-emerald-400 inline-block" />
              <span className="text-zinc-300 font-medium">{t('data_transferred')} (line, MB)</span>
            </div>
          </div>
          <span className="text-[11px] text-zinc-500">
            Hover over chart for daily details
          </span>
        </div>
      </div>
    </div>
  );
};
