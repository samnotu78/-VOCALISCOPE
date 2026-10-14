import { useState, useId } from 'react';
import {
  ChevronLeft,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Info,
  Database,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  Sparkles,
  Mic,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { MetricCard } from './MetricCard';
import { formatDuration, formatNumber, formatFrequency, formatDifference, cn } from '../lib/utils';
import { ComparisonResponse, AnalysisFeatures } from '../lib/api';

interface ComparisonViewProps {
  data: ComparisonResponse;
  onBack: () => void;
  onInspectRecording?: (recording: { filename: string; features: AnalysisFeatures }) => void;
}

interface MetricDefinition {
  key: keyof AnalysisFeatures;
  label: string;
  unit: string;
  format: (v: number | null | undefined) => string;
  formatDiff: (diff: number | null | undefined) => string;
}

const METRIC_CONFIG: MetricDefinition[] = [
  {
    key: 'duration_seconds',
    label: 'Total Duration',
    unit: 's',
    format: (v) => (v !== null && v !== undefined ? formatDuration(v) : '—'),
    formatDiff: (d) => (d !== null && d !== undefined ? `${formatDifference(d, 2)}s` : '—'),
  },
  {
    key: 'estimated_active_seconds',
    label: 'Estimated Active Speech',
    unit: 's',
    format: (v) => (v !== null && v !== undefined ? formatDuration(v) : '—'),
    formatDiff: (d) => (d !== null && d !== undefined ? `${formatDifference(d, 2)}s` : '—'),
  },
  {
    key: 'estimated_silence_seconds',
    label: 'Silence / Low-Energy Time',
    unit: 's',
    format: (v) => (v !== null && v !== undefined ? formatDuration(v) : '—'),
    formatDiff: (d) => (d !== null && d !== undefined ? `${formatDifference(d, 2)}s` : '—'),
  },
  {
    key: 'mean_rms_energy',
    label: 'Mean RMS Frame Energy',
    unit: 'RMS',
    format: (v) => formatNumber(v as number, 5),
    formatDiff: (d) => formatDifference(d, 5),
  },
  {
    key: 'estimated_pitch_median_hz',
    label: 'Median Pitch (F0)',
    unit: 'Hz',
    format: (v) => formatFrequency(v as number),
    formatDiff: (d) => (d !== null && d !== undefined ? `${formatDifference(d, 1)} Hz` : '—'),
  },
  {
    key: 'pitch_p10_hz',
    label: 'Pitch Floor (P10)',
    unit: 'Hz',
    format: (v) => formatFrequency(v as number),
    formatDiff: (d) => (d !== null && d !== undefined ? `${formatDifference(d, 1)} Hz` : '—'),
  },
  {
    key: 'pitch_p90_hz',
    label: 'Pitch Ceiling (P90)',
    unit: 'Hz',
    format: (v) => formatFrequency(v as number),
    formatDiff: (d) => (d !== null && d !== undefined ? `${formatDifference(d, 1)} Hz` : '—'),
  },
];

type DirectionType = 'higher' | 'lower' | 'no-change' | 'unavailable';

interface MetricDirection {
  type: DirectionType;
  label: string;
  badgeClass: string;
  icon: 'up' | 'down' | 'neutral' | 'none';
}

function getMetricDirection(diff: number | null | undefined): MetricDirection {
  if (diff === null || diff === undefined || Number.isNaN(diff)) {
    return {
      type: 'unavailable',
      label: 'Unavailable',
      badgeClass: 'bg-bg-elevated text-text-muted border-border',
      icon: 'none',
    };
  }
  if (Math.abs(diff) < 1e-7) {
    return {
      type: 'no-change',
      label: 'No change',
      badgeClass: 'bg-bg-elevated text-text-muted border-border',
      icon: 'neutral',
    };
  }
  if (diff > 0) {
    return {
      type: 'higher',
      label: 'Higher',
      badgeClass: 'bg-cyan-sonar/10 text-cyan-sonar border-cyan-sonar/30',
      icon: 'up',
    };
  }
  return {
    type: 'lower',
    label: 'Lower',
    badgeClass: 'bg-blue-sonar/10 text-blue-sonar border-blue-sonar/30',
    icon: 'down',
  };
}

export function ComparisonView({ data, onBack, onInspectRecording }: ComparisonViewProps) {
  const [, setActiveTab] = useState('metrics');
  const gradientId = useId();

  const { clear, rushed, differences, interpretation_note } = data;

  const clearRange =
    clear.features.pitch_p90_hz !== null && clear.features.pitch_p10_hz !== null
      ? clear.features.pitch_p90_hz - clear.features.pitch_p10_hz
      : null;

  const rushedRange =
    rushed.features.pitch_p90_hz !== null && rushed.features.pitch_p10_hz !== null
      ? rushed.features.pitch_p90_hz - rushed.features.pitch_p10_hz
      : null;

  const rangeDiff = clearRange !== null && rushedRange !== null ? rushedRange - clearRange : null;
  const medianDiff = differences.estimated_pitch_median_hz;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-sonar animate-pulse" aria-hidden="true" />
            <span className="text-xs uppercase tracking-wider font-mono text-cyan-sonar font-semibold">
              Comparative Acoustic Analysis
            </span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight mt-1">Benchmark Delivery Comparison</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Objective delta analysis across baseline and hurried speech conditions
          </p>
        </div>
        <Button variant="secondary" onClick={onBack} className="w-full sm:w-auto self-start sm:self-auto">
          <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          Back to Upload
        </Button>
      </div>

      {/* Recording Baseline Cards */}
      <div className="grid lg:grid-cols-2 gap-4">
        {[
          {
            tag: 'Baseline Recording',
            condition: 'Clear Delivery',
            rec: clear,
            borderColor: 'border-cyan-sonar/40',
            indicatorColor: 'bg-cyan-sonar',
            accentText: 'text-cyan-sonar',
            bgGlow: 'bg-cyan-sonar/5',
          },
          {
            tag: 'Comparative Condition',
            condition: 'Rushed Delivery',
            rec: rushed,
            borderColor: 'border-violet-sonar/40',
            indicatorColor: 'bg-violet-sonar',
            accentText: 'text-violet-sonar',
            bgGlow: 'bg-violet-sonar/5',
          },
        ].map(({ tag, condition, rec, borderColor, indicatorColor, accentText, bgGlow }) => (
          <Card key={rec.filename} className={cn('relative overflow-hidden transition-all border', borderColor)}>
            <div className={cn('absolute top-0 left-0 right-0 h-1', indicatorColor)} aria-hidden="true" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border border-border bg-bg-elevated text-text-secondary">
                  <span className={cn('w-1.5 h-1.5 rounded-full', indicatorColor)} aria-hidden="true" />
                  {tag}
                </span>
                <span className="text-[11px] font-mono text-text-muted truncate max-w-[180px]">
                  {rec.features.sample_rate_hz ? `${rec.features.sample_rate_hz} Hz` : 'Audio Track'}
                </span>
              </div>
              <CardTitle className="flex items-center gap-2 text-lg text-text-primary mt-2">
                <Database className={cn('h-4 w-4 flex-shrink-0', accentText)} aria-hidden="true" />
                <span>{condition}</span>
              </CardTitle>
              <CardDescription className="font-mono text-xs text-text-muted truncate">
                File: {rec.filename}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 bg-bg-elevated rounded-lg border border-border">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-mono">Duration</p>
                  <p className="font-mono text-text-primary text-base font-semibold mt-0.5 tabular-nums">
                    {formatDuration(rec.features.duration_seconds)}
                  </p>
                </div>
                <div className="p-2.5 bg-bg-elevated rounded-lg border border-border">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-mono">Active Speech</p>
                  <p className="font-mono text-text-primary text-base font-semibold mt-0.5 tabular-nums">
                    {formatDuration(rec.features.estimated_active_seconds)}
                  </p>
                </div>
                <div className="p-2.5 bg-bg-elevated rounded-lg border border-border">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-mono">Low-Energy</p>
                  <p className="font-mono text-text-primary text-base font-semibold mt-0.5 tabular-nums">
                    {formatDuration(rec.features.estimated_silence_seconds)}
                  </p>
                </div>
                <div className="p-2.5 bg-bg-elevated rounded-lg border border-border">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-mono">Mean RMS</p>
                  <p className="font-mono text-text-primary text-base font-semibold mt-0.5 tabular-nums">
                    {formatNumber(rec.features.mean_rms_energy, 4)}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-bg-elevated/70 rounded-lg border border-border flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-text-muted">Median Pitch: </span>
                  <span className="text-text-primary font-semibold tabular-nums">
                    {formatFrequency(rec.features.estimated_pitch_median_hz)}
                  </span>
                </div>
                <div className="text-text-muted">
                  <span>P10: </span>
                  <span className="text-text-secondary tabular-nums">
                    {formatFrequency(rec.features.pitch_p10_hz)}
                  </span>
                  <span className="mx-1 text-border-strong">|</span>
                  <span>P90: </span>
                  <span className="text-text-secondary tabular-nums">
                    {formatFrequency(rec.features.pitch_p90_hz)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-border/60">
                <span>Low-energy intervals: <strong className="text-text-secondary font-mono">{rec.features.temporal_evidence.length}</strong></span>
                <span>
                  Threshold:{' '}
                  <span className="font-mono text-text-secondary">
                    {rec.features.temporal_evidence[0]
                      ? formatNumber(rec.features.temporal_evidence[0].measurement.recording_relative_threshold_rms, 5)
                      : '—'}{' '}
                    RMS
                  </span>
                </span>
              </div>

              {onInspectRecording && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onInspectRecording(rec)}
                  className="w-full text-xs font-mono hover:border-accent-border"
                >
                  Inspect Single-Recording Breakdown →
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs for In-Depth Scientific Comparison */}
      <Tabs defaultValue="metrics" onChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto bg-bg-surface border border-border p-1">
          <TabsTrigger value="metrics" className="text-xs sm:text-sm font-medium">
            Metric Differences
          </TabsTrigger>
          <TabsTrigger value="rubric" className="text-xs sm:text-sm font-medium">
            Rubric Contrast (Track C)
          </TabsTrigger>
          <TabsTrigger value="pitch" className="text-xs sm:text-sm font-medium">
            Pitch Comparison
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs sm:text-sm font-medium">
            Temporal Comparison
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: METRIC DIFFERENCES */}
        <TabsContent value="metrics" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border/80">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Measured Differences (Rushed − Clear)</CardTitle>
                  <CardDescription className="text-xs text-text-secondary mt-1">
                    Differences are computed strictly as Rushed minus Clear measurements. Directional tags reflect physical magnitude, not qualitative merit.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1 text-cyan-sonar">
                    <span className="w-2 h-2 rounded-full bg-cyan-sonar" /> Clear Baseline
                  </span>
                  <span className="inline-flex items-center gap-1 text-violet-sonar">
                    <span className="w-2 h-2 rounded-full bg-violet-sonar" /> Rushed Condition
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {/* Desktop Column Header */}
              <div className="hidden md:grid grid-cols-12 gap-3 pb-2.5 px-4 text-xs font-mono uppercase tracking-wider text-text-muted border-b border-border/60">
                <div className="col-span-4">Acoustic Metric</div>
                <div className="col-span-2 text-right">Clear Baseline</div>
                <div className="col-span-2 text-right">Rushed Condition</div>
                <div className="col-span-2 text-right">Difference (Δ)</div>
                <div className="col-span-2 text-right">Direction</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/60">
                {METRIC_CONFIG.map(({ key, label, unit, format, formatDiff }) => {
                  const clearVal = clear.features[key];
                  const rushedVal = rushed.features[key];
                  const diff = differences[key as keyof typeof differences];
                  const direction = getMetricDirection(diff);

                  return (
                    <div
                      key={key}
                      className="py-3 px-3 sm:px-4 rounded-lg transition-colors hover:bg-bg-elevated/40 flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-3 items-start md:items-center"
                    >
                      {/* Metric Name & Unit */}
                      <div className="md:col-span-4 w-full flex items-baseline justify-between md:block">
                        <span className="text-sm font-medium text-text-primary">{label}</span>
                        <span className="text-xs font-mono text-text-muted ml-2">({unit})</span>
                      </div>

                      {/* Clear Baseline Value */}
                      <div className="md:col-span-2 w-full flex justify-between md:justify-end items-center text-xs sm:text-sm font-mono tabular-nums text-text-secondary">
                        <span className="text-[11px] font-sans text-text-muted md:hidden">Clear:</span>
                        <span className="text-text-primary">{format(clearVal as number | null)}</span>
                      </div>

                      {/* Rushed Value */}
                      <div className="md:col-span-2 w-full flex justify-between md:justify-end items-center text-xs sm:text-sm font-mono tabular-nums text-text-secondary">
                        <span className="text-[11px] font-sans text-text-muted md:hidden">Rushed:</span>
                        <span className="text-text-primary">{format(rushedVal as number | null)}</span>
                      </div>

                      {/* Difference (Delta) */}
                      <div className="md:col-span-2 w-full flex justify-between md:justify-end items-center text-xs sm:text-sm font-mono tabular-nums font-semibold">
                        <span className="text-[11px] font-sans text-text-muted font-normal md:hidden">Delta (Δ):</span>
                        <span
                          className={cn(
                            diff === null || diff === undefined
                              ? 'text-text-muted font-normal'
                              : Math.abs(diff) < 1e-7
                              ? 'text-text-muted'
                              : diff > 0
                              ? 'text-cyan-sonar'
                              : 'text-blue-sonar'
                          )}
                        >
                          {formatDiff(diff)}
                        </span>
                      </div>

                      {/* Direction Tag */}
                      <div className="md:col-span-2 w-full flex justify-between md:justify-end items-center">
                        <span className="text-[11px] font-sans text-text-muted md:hidden">Direction:</span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium border',
                            direction.badgeClass
                          )}
                        >
                          {direction.icon === 'up' && <ArrowUpRight className="h-3 w-3" aria-hidden="true" />}
                          {direction.icon === 'down' && <ArrowDownRight className="h-3 w-3" aria-hidden="true" />}
                          {direction.icon === 'neutral' && <Minus className="h-3 w-3" aria-hidden="true" />}
                          {direction.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Methodological Interpretation Note */}
          <Card className="bg-bg-elevated border-border-strong">
            <CardContent className="pt-4 pb-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-cyan-sonar flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs sm:text-sm text-text-secondary space-y-1">
                <p className="font-semibold text-text-primary">Acoustic Interpretation Boundary</p>
                <p className="leading-relaxed">{interpretation_note}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: RUBRIC CONTRAST */}
        <TabsContent value="rubric" className="space-y-6">
          <Card className="border-border-strong bg-bg-surface overflow-hidden">
            <CardHeader className="border-b border-border bg-bg-elevated/40 p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-sonar font-semibold">
                      Track C • Contrastive Analytics
                    </span>
                    <span className="text-border text-xs">•</span>
                    <span className="text-[10px] font-mono text-text-muted">Grounded Rubric Evaluation</span>
                  </div>
                  <CardTitle className="text-xl text-text-primary mt-1">Contrastive Rubric Scoring</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Deterministic 0–100 rubric evaluations comparing Clear baseline against Rushed delivery across four acoustic dimensions.
                  </CardDescription>
                </div>

                {/* Score Comparison Pill */}
                <div className="flex items-center gap-3 bg-bg-elevated border border-border rounded-xl p-3">
                  <div className="text-center px-2">
                    <span className="text-[10px] font-mono uppercase text-cyan-sonar">Clear</span>
                    <p className="text-2xl font-mono font-bold text-text-primary tabular-nums mt-0.5">
                      {clear.features.rubric ? clear.features.rubric.overall_score.toFixed(1) : '—'}
                    </p>
                  </div>
                  <span className="text-text-muted font-mono font-bold">vs</span>
                  <div className="text-center px-2">
                    <span className="text-[10px] font-mono uppercase text-violet-sonar">Rushed</span>
                    <p className="text-2xl font-mono font-bold text-text-primary tabular-nums mt-0.5">
                      {rushed.features.rubric ? rushed.features.rubric.overall_score.toFixed(1) : '—'}
                    </p>
                  </div>
                  <div className="h-8 w-[1px] bg-border mx-1" />
                  <div className="text-center px-2">
                    <span className="text-[10px] font-mono uppercase text-text-muted">Delta</span>
                    <p className={`text-base font-mono font-bold tabular-nums mt-0.5 ${
                      (data.rubric_differences?.overall_score ?? 0) < 0
                        ? 'text-rose-400'
                        : (data.rubric_differences?.overall_score ?? 0) > 0
                        ? 'text-lime-sonar'
                        : 'text-text-muted'
                    }`}>
                      {data.rubric_differences?.overall_score !== undefined
                        ? (data.rubric_differences.overall_score > 0 ? `+${data.rubric_differences.overall_score.toFixed(1)}` : data.rubric_differences.overall_score.toFixed(1))
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-6">
              {/* 4 Dimension Contrast Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    key: 'cadence_pacing' as const,
                    name: 'Cadence & Pacing',
                    weight: '30%',
                    icon: <Clock className="h-4 w-4 text-cyan-sonar" />,
                    clearDim: clear.features.rubric?.dimensions.cadence_pacing,
                    rushedDim: rushed.features.rubric?.dimensions.cadence_pacing,
                    diff: data.rubric_differences?.cadence_pacing,
                  },
                  {
                    key: 'pause_discipline' as const,
                    name: 'Pause Pattern & Discipline',
                    weight: '25%',
                    icon: <Activity className="h-4 w-4 text-lime-sonar" />,
                    clearDim: clear.features.rubric?.dimensions.pause_discipline,
                    rushedDim: rushed.features.rubric?.dimensions.pause_discipline,
                    diff: data.rubric_differences?.pause_discipline,
                  },
                  {
                    key: 'pitch_variation' as const,
                    name: 'Pitch Variation & Expressiveness',
                    weight: '25%',
                    icon: <Sparkles className="h-4 w-4 text-blue-sonar" />,
                    clearDim: clear.features.rubric?.dimensions.pitch_variation,
                    rushedDim: rushed.features.rubric?.dimensions.pitch_variation,
                    diff: data.rubric_differences?.pitch_variation,
                  },
                  {
                    key: 'energy_dynamics' as const,
                    name: 'Energy Dynamics & Stability',
                    weight: '20%',
                    icon: <Mic className="h-4 w-4 text-indigo-400" />,
                    clearDim: clear.features.rubric?.dimensions.energy_dynamics,
                    rushedDim: rushed.features.rubric?.dimensions.energy_dynamics,
                    diff: data.rubric_differences?.energy_dynamics,
                  },
                ].map(({ key, name, weight, icon, clearDim, rushedDim, diff }) => (
                  <div
                    key={key}
                    className="bg-bg-elevated/60 border border-border rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-bg-surface border border-border">
                          {icon}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-text-primary leading-tight">{name}</h4>
                          <span className="text-[10px] font-mono text-text-muted uppercase">Weight: {weight}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                        <span className="text-cyan-sonar font-semibold">
                          {clearDim ? clearDim.score.toFixed(1) : '—'}
                        </span>
                        <span className="text-text-muted">vs</span>
                        <span className="text-violet-sonar font-semibold">
                          {rushedDim ? rushedDim.score.toFixed(1) : '—'}
                        </span>
                        {diff !== undefined && (
                          <span className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${
                            diff < 0 ? 'bg-rose-400/10 text-rose-400 border border-rose-400/20' : diff > 0 ? 'bg-lime-sonar/10 text-lime-sonar border border-lime-sonar/20' : 'bg-bg-elevated text-text-muted'
                          }`}>
                            {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                      <div className="p-2 bg-bg-surface/80 rounded border border-border">
                        <span className="text-cyan-sonar font-semibold block text-[10px] uppercase">Clear Baseline</span>
                        <span className="text-text-secondary leading-snug line-clamp-3 mt-0.5">
                          {clearDim?.rationale}
                        </span>
                      </div>
                      <div className="p-2 bg-bg-surface/80 rounded border border-border">
                        <span className="text-violet-sonar font-semibold block text-[10px] uppercase">Rushed Condition</span>
                        <span className="text-text-secondary leading-snug line-clamp-3 mt-0.5">
                          {rushedDim?.rationale}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Temporal Flaw Grounding Ground-Truth Contrast Panel */}
              <div className="p-4 bg-bg-elevated/70 border border-border-strong rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-cyan-sonar" />
                    <h4 className="text-sm font-semibold text-text-primary">
                      Track C Ground-Truth Temporal Flaw Annotations
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted uppercase">
                    dataset/labels.json
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 bg-bg-surface rounded-lg border border-cyan-sonar/20 space-y-2">
                    <div className="flex items-center justify-between text-cyan-sonar font-semibold">
                      <span>clear.mp4 (Reference)</span>
                      <span>0 Flaws Grounded</span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed font-sans">
                      All 4 pause intervals align strictly with grammatical clause boundaries (sentence 1 end at 3.84s, sentence 2 end at 7.33s, clause 1 at 9.07s, clause 2 at 11.34s). Zero mid-clause breaks or speech surges.
                    </p>
                  </div>

                  <div className="p-3 bg-bg-surface rounded-lg border border-rose-400/20 space-y-2">
                    <div className="flex items-center justify-between text-rose-400 font-semibold">
                      <span>rushed.mp4 (Contrastive)</span>
                      <span>4 Grounded Flaws</span>
                    </div>
                    <ul className="text-[11px] text-text-secondary space-y-1 list-disc list-inside">
                      <li><strong className="text-text-primary">02.78s - 03.05s:</strong> Mid-clause hesitation gap</li>
                      <li><strong className="text-text-primary">04.12s - 04.61s:</strong> Articulation stumble before &apos;success&apos;</li>
                      <li><strong className="text-text-primary">05.85s - 08.61s:</strong> Pacing surge burst (16 words @ ~348 WPM)</li>
                      <li><strong className="text-text-primary">10.11s - 10.83s:</strong> Mid-phrase hesitation pause (720ms)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: PITCH COMPARISON */}
        <TabsContent value="pitch" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Pitch Distribution Distribution Card */}
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border/80">
                <CardTitle className="text-lg">Pitch Distribution Comparison</CardTitle>
                <CardDescription className="text-xs">
                  Fundamental frequency (F0) extracted with YIN algorithm within human vocal limits (65–400 Hz)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                {[
                  {
                    key: 'estimated_pitch_median_hz',
                    label: 'Median Pitch (F0)',
                    clear: clear.features.estimated_pitch_median_hz,
                    rushed: rushed.features.estimated_pitch_median_hz,
                    description: 'Distribution midpoint',
                  },
                  {
                    key: 'pitch_p10_hz',
                    label: 'Pitch Floor (P10)',
                    clear: clear.features.pitch_p10_hz,
                    rushed: rushed.features.pitch_p10_hz,
                    description: '10th percentile lowest sustained fundamental frequency',
                  },
                  {
                    key: 'pitch_p90_hz',
                    label: 'Pitch Ceiling (P90)',
                    clear: clear.features.pitch_p90_hz,
                    rushed: rushed.features.pitch_p90_hz,
                    description: '90th percentile highest sustained fundamental frequency',
                  },
                ].map(({ label, clear: cVal, rushed: rVal, description }) => {
                  const minHz = 65;
                  const maxHz = 400;
                  const cPos =
                    cVal !== null ? Math.max(0, Math.min(100, ((cVal - minHz) / (maxHz - minHz)) * 100)) : null;
                  const rPos =
                    rVal !== null ? Math.max(0, Math.min(100, ((rVal - minHz) / (maxHz - minHz)) * 100)) : null;

                  return (
                    <div key={label} className="space-y-2 p-3 bg-bg-elevated/40 rounded-xl border border-border">
                      <div className="flex items-baseline justify-between text-xs sm:text-sm">
                        <div>
                          <span className="font-semibold text-text-primary">{label}</span>
                          <p className="text-[11px] text-text-muted mt-0.5">{description}</p>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                          <span className="text-cyan-sonar font-medium">Clear: {formatFrequency(cVal)}</span>
                          <span className="text-text-muted">|</span>
                          <span className="text-violet-sonar font-medium">Rushed: {formatFrequency(rVal)}</span>
                        </div>
                      </div>

                      {/* Visual Frequency Axis */}
                      <div className="h-6 bg-bg-surface rounded-md border border-border-strong relative flex items-center px-2 overflow-hidden">
                        {/* Connecting bar between the two points */}
                        {cPos !== null && rPos !== null && (
                          <div
                            className="absolute top-1.5 bottom-1.5 bg-text-secondary/15 rounded-sm"
                            style={{
                              left: `${Math.min(cPos, rPos)}%`,
                              width: `${Math.abs(rPos - cPos)}%`,
                            }}
                          />
                        )}

                        {/* Baseline marker (Cyan) */}
                        {cPos !== null && (
                          <div
                            className="absolute top-1 bottom-1 w-1.5 bg-cyan-sonar rounded-sm shadow-[0_0_8px_rgba(0,242,254,0.6)] z-10"
                            style={{ left: `calc(${cPos}% - 3px)` }}
                            title={`Clear: ${formatFrequency(cVal)}`}
                          />
                        )}

                        {/* Comparative marker (Violet) */}
                        {rPos !== null && (
                          <div
                            className="absolute top-1 bottom-1 w-1.5 bg-violet-sonar rounded-sm shadow-[0_0_8px_rgba(168,85,247,0.6)] z-10"
                            style={{ left: `calc(${rPos}% - 3px)` }}
                            title={`Rushed: ${formatFrequency(rVal)}`}
                          />
                        )}

                        {cVal === null && rVal === null && (
                          <div className="w-full text-center text-[10px] text-text-muted font-mono">
                            No sustained pitch detected within 65–400 Hz range
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between text-[10px] text-text-muted font-mono px-0.5">
                        <span>65 Hz (Vocal Floor)</span>
                        <span>400 Hz (Vocal Ceiling)</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Pitch Span & Scientifically Neutral Interpretation */}
            <Card className="border-border flex flex-col">
              <CardHeader className="pb-3 border-b border-border/80">
                <CardTitle className="text-lg">Pitch Range Measurements</CardTitle>
                <CardDescription className="text-xs">
                  Spread between upper (P90) and lower (P10) pitch limits
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-5 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="Clear Pitch Range"
                    value={clearRange !== null ? formatNumber(clearRange, 1) : '—'}
                    unit="Hz"
                  />
                  <MetricCard
                    label="Rushed Pitch Range"
                    value={rushedRange !== null ? formatNumber(rushedRange, 1) : '—'}
                    unit="Hz"
                  />
                  <MetricCard
                    label="Range Delta (P90−P10)"
                    value={rangeDiff !== null ? formatDifference(rangeDiff, 1) : '—'}
                    unit="Hz"
                    trend={rangeDiff !== null ? (Math.abs(rangeDiff) < 0.1 ? 'neutral' : 'neutral') : 'neutral'}
                    trendLabel={
                      rangeDiff !== null
                        ? Math.abs(rangeDiff) < 0.1
                          ? 'No change'
                          : rangeDiff > 0
                          ? 'Wider spread'
                          : 'Narrower spread'
                        : 'Unavailable'
                    }
                  />
                  <MetricCard
                    label="Median F0 Shift"
                    value={medianDiff !== null && medianDiff !== undefined ? formatDifference(medianDiff, 1) : '—'}
                    unit="Hz"
                    trend="neutral"
                    trendLabel={
                      medianDiff !== null && medianDiff !== undefined
                        ? Math.abs(medianDiff) < 0.1
                          ? 'No change'
                          : medianDiff > 0
                          ? 'Higher midpoint'
                          : 'Lower midpoint'
                        : 'Unavailable'
                    }
                  />
                </div>

                {/* Scientifically cautious pitch interpretation requirement */}
                <div className="p-4 bg-bg-elevated rounded-xl border border-border-strong space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-primary font-mono">
                    <Info className="h-4 w-4 text-cyan-sonar" />
                    <span>Scientific Pitch Interpretation Guide</span>
                  </div>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                    Pitch range describes the spread between the measured lower and upper pitch percentiles. Median
                    pitch describes the centre of the measured pitch distribution. These measurements alone do not
                    establish emotion, vocal quality, or the cause of a delivery difference.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: TEMPORAL COMPARISON */}
        <TabsContent value="timeline" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {[
              {
                label: 'Clear Delivery',
                tag: 'Baseline',
                data: clear,
                accentColor: '#00f2fe',
                borderColor: 'border-cyan-sonar/30',
                textColor: 'text-cyan-sonar',
                gradientId: `${gradientId}-clear`,
              },
              {
                label: 'Rushed Delivery',
                tag: 'Comparative',
                data: rushed,
                accentColor: '#a855f7',
                borderColor: 'border-violet-sonar/30',
                textColor: 'text-violet-sonar',
                gradientId: `${gradientId}-rushed`,
              },
            ].map(({ label, tag, data: rec, accentColor, borderColor, textColor, gradientId: trackId }) => {
              const duration = rec.features.duration_seconds || 1;
              const intervals = rec.features.temporal_evidence;

              return (
                <Card key={rec.filename} className={cn('border', borderColor)}>
                  <CardHeader className="pb-3 border-b border-border/80">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base text-text-primary">
                        <Database className={cn('h-4 w-4', textColor)} aria-hidden="true" />
                        <span>{label}</span>
                      </CardTitle>
                      <span className="text-xs font-mono text-text-muted">
                        {intervals.length} interval{intervals.length !== 1 ? 's' : ''} detected
                      </span>
                    </div>
                    <CardDescription className="text-xs text-text-muted font-mono truncate">
                      File: {rec.filename} ({duration.toFixed(2)}s duration)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {/* Visual Timeline SVG */}
                    <div className="p-3 bg-bg-surface rounded-xl border border-border">
                      <svg
                        width="100%"
                        height="90"
                        viewBox="0 0 540 90"
                        className="w-full"
                        role="img"
                        aria-label={`${label} temporal evidence timeline`}
                      >
                        <defs>
                          <linearGradient id={trackId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={accentColor} stopOpacity="0.85" />
                            <stop offset="100%" stopColor={accentColor} stopOpacity="0.35" />
                          </linearGradient>
                        </defs>

                        {/* Baseline Track Background */}
                        <rect x="20" y="24" width="500" height="28" rx="4" fill="var(--color-bg-elevated)" stroke="var(--color-border-strong)" strokeWidth="1" />

                        {/* Interval Blocks */}
                        {intervals.map((event, index) => {
                          const startX = 20 + Math.max(0, Math.min(500, (event.start_seconds / duration) * 500));
                          const endX = 20 + Math.max(0, Math.min(500, (event.end_seconds / duration) * 500));
                          const eventWidth = Math.max(3, endX - startX);

                          return (
                            <rect
                              key={index}
                              x={startX}
                              y="26"
                              width={eventWidth}
                              height="24"
                              rx="3"
                              fill={`url(#${trackId})`}
                            >
                              <title>
                                {`Interval #${index + 1}: ${event.start_seconds.toFixed(2)}s – ${event.end_seconds.toFixed(2)}s (Duration: ${event.measurement.duration_seconds.toFixed(2)}s, RMS: ${event.measurement.mean_frame_rms.toFixed(5)})`}
                              </title>
                            </rect>
                          );
                        })}

                        {/* Time Ticks */}
                        <line x1="20" y1="56" x2="20" y2="62" stroke="var(--color-text-muted)" strokeWidth="1" />
                        <line x1="145" y1="56" x2="145" y2="60" stroke="var(--color-border-strong)" strokeWidth="1" />
                        <line x1="270" y1="56" x2="270" y2="62" stroke="var(--color-text-muted)" strokeWidth="1" />
                        <line x1="395" y1="56" x2="395" y2="60" stroke="var(--color-border-strong)" strokeWidth="1" />
                        <line x1="520" y1="56" x2="520" y2="62" stroke="var(--color-text-muted)" strokeWidth="1" />

                        {/* Time Labels */}
                        <text x="20" y="74" fill="var(--color-text-muted)" fontSize="10" fontFamily="monospace">0.0s</text>
                        <text x="270" y="74" fill="var(--color-text-muted)" fontSize="10" fontFamily="monospace" textAnchor="middle">
                          {(duration / 2).toFixed(1)}s
                        </text>
                        <text x="520" y="74" fill="var(--color-text-muted)" fontSize="10" fontFamily="monospace" textAnchor="end">
                          {duration.toFixed(1)}s
                        </text>
                      </svg>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-text-muted font-mono">
                      <span>Threshold RMS: {intervals[0] ? formatNumber(intervals[0].measurement.recording_relative_threshold_rms, 5) : '—'}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: accentColor }} />
                        Low-Energy Frame Intervals
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Temporal Comparison Metrics Summary */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border/80">
              <CardTitle className="text-lg">Temporal Evidence Count Comparison</CardTitle>
              <CardDescription className="text-xs">
                Comparison of low-energy acoustic drop intervals extracted using recording-relative RMS gating
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard
                label="Clear Intervals"
                value={clear.features.temporal_evidence.length.toString()}
                unit="events"
              />
              <MetricCard
                label="Rushed Intervals"
                value={rushed.features.temporal_evidence.length.toString()}
                unit="events"
              />
              {(() => {
                const clearCount = clear.features.temporal_evidence.length;
                const rushedCount = rushed.features.temporal_evidence.length;
                const countDiff = rushedCount - clearCount;

                return (
                  <MetricCard
                    label="Interval Difference"
                    value={formatDifference(countDiff, 0)}
                    unit="events"
                    trend="neutral"
                    trendLabel={
                      countDiff === 0
                        ? 'No change'
                        : countDiff > 0
                        ? `Higher (+${countDiff})`
                        : `Lower (${countDiff})`
                    }
                  />
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}