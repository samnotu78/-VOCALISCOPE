import { cn } from '../lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  className?: string;
}

export function MetricCard({ label, value, unit, trend, trendLabel, className }: MetricCardProps) {
  const trendColors = {
    up: 'text-accent',
    down: 'text-warning',
    neutral: 'text-text-muted',
  };

  const trendIcons = {
    up: '▲',
    down: '▼',
    neutral: '●',
  };

  return (
    <div
      className={cn(
        'bg-bg-surface border border-border rounded-xl p-4 sm:p-5 transition-all duration-200 hover:border-border-strong',
        className
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-mono font-semibold text-text-primary tabular-nums">{value}</span>
            {unit && <span className="text-sm text-text-muted font-mono self-end mb-1">{unit}</span>}
          </div>
        </div>
        {(trend || trendLabel) && (
          <div className={cn('flex items-center gap-1.5 text-xs font-medium', trendColors[trend || 'neutral'])}>
            <span aria-hidden="true">{trendIcons[trend || 'neutral']}</span>
            {trendLabel && <span>{trendLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}