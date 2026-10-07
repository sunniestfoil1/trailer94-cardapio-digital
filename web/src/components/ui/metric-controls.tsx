import React from 'react';
import { LineChart, BarChart2, ChevronDown } from 'lucide-react';
import type { ChartView } from './metric-chart';

export interface PeriodOption {
  label: string;
  points?: number;
}

interface ViewToggleProps {
  value: ChartView;
  onChange: (view: ChartView) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="pointer-events-auto inline-flex items-center gap-0.5 rounded-lg border border-border/40 bg-muted/30 p-0.5 text-muted-foreground">
      <button
        type="button"
        onClick={() => onChange('curve')}
        className={`rounded-md p-1 transition-colors ${
          value === 'curve' ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'
        }`}
        title="Curve View"
      >
        <LineChart className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onChange('bars')}
        className={`rounded-md p-1 transition-colors ${
          value === 'bars' ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'
        }`}
        title="Bars View"
      >
        <BarChart2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface PeriodSelectProps {
  value: string;
  options: PeriodOption[];
  onChange: (option: PeriodOption) => void;
  accentText?: string;
}

export function PeriodSelect({ value, options, onChange, accentText }: PeriodSelectProps) {
  return (
    <div className="pointer-events-auto relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => {
          const opt = options.find((o) => o.label === e.target.value);
          if (opt) onChange(opt);
        }}
        className="appearance-none bg-transparent pr-5 font-medium cursor-pointer focus:outline-none text-muted-foreground hover:text-foreground transition-colors"
        style={accentText ? { color: accentText } : undefined}
      >
        {options.map((opt) => (
          <option key={opt.label} value={opt.label} className="bg-slate-900 text-white">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-0 h-3.5 w-3.5 opacity-60" />
    </div>
  );
}
