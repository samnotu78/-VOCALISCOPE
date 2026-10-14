import { useEffect } from 'react';
import { X, Info, AlertCircle, Clock, TrendingDown, Database } from 'lucide-react';
import { formatDuration, formatNumber } from '../lib/utils';
import { TemporalEvidenceEvent } from '../lib/api';
import { Button } from './ui/Button';
import { CardHeader, CardTitle, CardContent } from './ui/Card';

interface EventDetailProps {
  event: TemporalEvidenceEvent | null;
  onClose: () => void;
  duration: number;
}

export function EventDetail({ event, onClose, duration }: EventDetailProps) {
  useEffect(() => {
    if (!event) return;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [event, onClose]);

  if (!event) return null;

  const startPct = duration > 0 ? ((event.start_seconds / duration) * 100).toFixed(1) : '0.0';
  const endPct = duration > 0 ? ((event.end_seconds / duration) * 100).toFixed(1) : '0.0';
  const energyRatio =
    event.measurement.recording_relative_threshold_rms > 0
      ? ((event.measurement.mean_frame_rms / event.measurement.recording_relative_threshold_rms) * 100).toFixed(1)
      : '—';

  const getEventTitle = (type: string) => {
    switch (type) {
      case 'hesitation_pause':
        return 'Extended Hesitation Pause';
      case 'pacing_surge_interval':
        return 'Pacing Surge Burst';
      case 'pitch_monotony_interval':
        return 'Pitch Monotony Flatline';
      default:
        return 'Low-Energy Acoustic Interval';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
    >
      <div
        className="w-full max-w-lg bg-bg-surface border border-border-strong rounded-xl shadow-2xl animate-fade-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 border-b border-border bg-bg-elevated/50">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-sonar font-semibold">
              Temporal Evidence Inspection
            </span>
            <CardTitle id="event-detail-title" className="text-base text-text-primary mt-0.5">
              {getEventTitle(event.event)}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close event details"
            className="h-8 w-8 p-0 text-text-muted hover:text-text-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </CardHeader>

        <CardContent className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Time & Position Badge */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-bg-elevated rounded-lg border border-border text-center">
            <div>
              <p className="text-[10px] uppercase font-mono text-text-muted">Start Time</p>
              <p className="font-mono text-sm font-semibold text-text-primary mt-0.5 tabular-nums">
                {event.start_seconds.toFixed(2)}s
              </p>
              <p className="text-[10px] font-mono text-text-muted">{startPct}%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-mono text-text-muted">End Time</p>
              <p className="font-mono text-sm font-semibold text-text-primary mt-0.5 tabular-nums">
                {event.end_seconds.toFixed(2)}s
              </p>
              <p className="text-[10px] font-mono text-text-muted">{endPct}%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-mono text-text-muted">Duration</p>
              <p className="font-mono text-sm font-semibold text-cyan-sonar mt-0.5 tabular-nums">
                {event.measurement.duration_seconds.toFixed(2)}s
              </p>
              <p className="text-[10px] font-mono text-text-muted">{(event.measurement.duration_seconds * 1000).toFixed(0)} ms</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-mono text-text-muted">Threshold Ratio</p>
              <p className="font-mono text-sm font-semibold text-text-primary mt-0.5 tabular-nums">
                {energyRatio}%
              </p>
              <p className="text-[10px] font-mono text-text-muted">of peak gate</p>
            </div>
          </div>

          {/* Precise Acoustic Measurements */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-cyan-sonar" aria-hidden="true" />
              Measured Frame Parameters
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-bg-elevated/60 rounded border border-border">
                <span className="text-text-muted block text-[11px]">Mean Frame RMS</span>
                <span className="text-text-primary font-semibold text-sm tabular-nums">
                  {formatNumber(event.measurement.mean_frame_rms ?? 0, 6)}
                </span>
              </div>
              <div className="p-2.5 bg-bg-elevated/60 rounded border border-border">
                <span className="text-text-muted block text-[11px]">Recording Threshold RMS</span>
                <span className="text-text-primary font-semibold text-sm tabular-nums">
                  {formatNumber(event.measurement.recording_relative_threshold_rms ?? 0, 6)}
                </span>
              </div>
              {event.measurement.pitch_std_hz !== undefined && (
                <div className="p-2.5 bg-bg-elevated/60 rounded border border-border">
                  <span className="text-text-muted block text-[11px]">Pitch Std Dev</span>
                  <span className="text-purple-400 font-semibold text-sm tabular-nums">
                    {event.measurement.pitch_std_hz.toFixed(2)} Hz
                  </span>
                </div>
              )}
              {event.measurement.energy_ratio_to_mean !== undefined && (
                <div className="p-2.5 bg-bg-elevated/60 rounded border border-border">
                  <span className="text-text-muted block text-[11px]">Energy Burst Ratio</span>
                  <span className="text-rose-400 font-semibold text-sm tabular-nums">
                    {event.measurement.energy_ratio_to_mean.toFixed(2)}× mean
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Heuristic Interpretation */}
          <div className="p-3.5 bg-bg-elevated rounded-lg border border-border space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-sonar font-mono">
              <Info className="h-4 w-4" aria-hidden="true" />
              <span>Acoustic Interpretation</span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              {event.interpretation}
            </p>
          </div>

          {/* Measurement Limitations */}
          <div className="p-3.5 bg-bg-elevated rounded-lg border border-border space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-sonar font-mono">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <span>Scientific Measurement Limitations</span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              {event.limitations}
            </p>
          </div>

          <div className="pt-2">
            <Button variant="secondary" className="w-full text-xs font-mono" onClick={onClose}>
              Dismiss Inspection (Esc)
            </Button>
          </div>
        </CardContent>
      </div>
    </div>
  );
}