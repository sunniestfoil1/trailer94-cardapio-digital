import React, { useState } from 'react';

export interface SeriesPoint {
  value: number;
  date: string;
  label?: string;
}

export type MetricAccent = 'emerald' | 'rose' | 'neutral' | 'amber' | 'sky' | 'purple';
export type ChartView = 'curve' | 'bars';

export interface MetricSeries {
  name: string;
  data: SeriesPoint[];
  accent?: MetricAccent;
}

export interface ChartSeries {
  name: string;
  data: SeriesPoint[];
  color: string;
}

export const ACCENTS: Record<MetricAccent, { stroke: string; text: string; fill: string }> = {
  emerald: {
    stroke: '#10b981',
    text: '#10b981',
    fill: 'rgba(16, 185, 129, 0.15)',
  },
  rose: {
    stroke: '#f43f5e',
    text: '#f43f5e',
    fill: 'rgba(244, 63, 94, 0.15)',
  },
  neutral: {
    stroke: '#64748b',
    text: '#64748b',
    fill: 'rgba(100, 116, 139, 0.15)',
  },
  amber: {
    stroke: '#f59e0b',
    text: '#f59e0b',
    fill: 'rgba(245, 158, 11, 0.15)',
  },
  sky: {
    stroke: '#0ea5e9',
    text: '#0ea5e9',
    fill: 'rgba(14, 165, 233, 0.15)',
  },
  purple: {
    stroke: '#a855f7',
    text: '#a855f7',
    fill: 'rgba(168, 85, 247, 0.15)',
  },
};

export const SERIES_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (Math.abs(n) >= 1_000) {
    return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return n.toString();
}

interface MetricChartProps {
  series: ChartSeries[];
  view: ChartView;
  defaultIndex?: number;
  valueFormatter?: (value: number) => string;
  dateFormatter?: (date: string) => string;
}

export function MetricChart({
  series,
  view,
  defaultIndex,
  valueFormatter = (v) => v.toLocaleString(),
  dateFormatter = (d) => d,
}: MetricChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const primarySeries = series[0];
  if (!primarySeries || !primarySeries.data.length) return null;

  const points = primarySeries.data;
  const activeIndex = hoverIndex ?? defaultIndex ?? points.length - 1;
  const activePoint = points[activeIndex] || points[points.length - 1];

  const values = points.map((p) => p.value);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 1);
  const range = maxVal - minVal || 1;

  const width = 300;
  const height = 180;
  const pad = 20;

  const getX = (idx: number) => pad + (idx / Math.max(points.length - 1, 1)) * (width - pad * 2);
  const getY = (val: number) => height - pad - ((val - minVal) / range) * (height - pad * 2);

  // Path SVG para curve
  const pathD = points.reduce((acc, pt, i) => {
    const x = getX(i);
    const y = getY(pt.value);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Area SVG para preenchimento
  const areaD = `${pathD} L ${getX(points.length - 1)} ${height} L ${getX(0)} ${height} Z`;

  return (
    <div className="relative h-full w-full pointer-events-auto">
      <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {view === 'curve' && (
          <>
            <path d={areaD} fill={primarySeries.color} fillOpacity={0.12} />
            <path d={pathD} fill="none" stroke={primarySeries.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {points.map((pt, i) => (
              <circle
                key={i}
                cx={getX(i)}
                cy={getY(pt.value)}
                r={i === activeIndex ? 5 : 3}
                fill={i === activeIndex ? primarySeries.color : '#ffffff'}
                stroke={primarySeries.color}
                strokeWidth={2}
                className="transition-all duration-150"
              />
            ))}
          </>
        )}

        {view === 'bars' && (
          <g>
            {points.map((pt, i) => {
              const x = getX(i) - 6;
              const barH = Math.max(4, height - pad - getY(pt.value));
              const y = height - pad - barH;
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={12}
                  height={barH}
                  rx={3}
                  fill={primarySeries.color}
                  fillOpacity={i === activeIndex ? 0.9 : 0.45}
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                  className="transition-opacity duration-150 cursor-pointer"
                />
              );
            })}
          </g>
        )}

        {/* Linha vertical interativa */}
        {points.map((_, i) => (
          <rect
            key={i}
            x={getX(i) - width / (points.length * 2)}
            y={0}
            width={width / points.length}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
            className="cursor-pointer"
          />
        ))}
      </svg>

      {/* Tooltip ao passar o mouse */}
      {activePoint && (
        <div
          className="absolute z-30 transform -translate-x-1/2 -translate-y-full pointer-events-none rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs text-white shadow-xl transition-all"
          style={{
            left: `${(getX(activeIndex) / width) * 100}%`,
            top: `${(getY(activePoint.value) / height) * 100 - 8}%`,
          }}
        >
          <div className="font-semibold">{valueFormatter(activePoint.value)}</div>
          <div className="text-[10px] text-slate-400">{dateFormatter(activePoint.date)}</div>
        </div>
      )}
    </div>
  );
}
