import { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Activity,
  Mic,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { RubricScorecard, RubricDimension } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';

interface RubricScorecardViewProps {
  scorecard: RubricScorecard;
  title?: string;
  subtitle?: string;
  className?: string;
}

function getBandColor(band: string) {
  switch (band) {
    case 'Exemplary':
      return {
        badge: 'bg-lime-sonar/10 text-lime-sonar border-lime-sonar/30',
        text: 'text-lime-sonar',
        bar: 'bg-lime-sonar',
        glow: 'shadow-[0_0_15px_rgba(57,255,20,0.2)]',
      };
    case 'Proficient':
      return {
        badge: 'bg-cyan-sonar/10 text-cyan-sonar border-cyan-sonar/30',
        text: 'text-cyan-sonar',
        bar: 'bg-cyan-sonar',
        glow: 'shadow-[0_0_15px_rgba(0,242,254,0.2)]',
      };
    case 'Developing':
      return {
        badge: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
        text: 'text-amber-400',
        bar: 'bg-amber-400',
        glow: 'shadow-[0_0_15px_rgba(251,191,36,0.2)]',
      };
    default:
      return {
        badge: 'bg-rose-400/10 text-rose-400 border-rose-400/30',
        text: 'text-rose-400',
        bar: 'bg-rose-400',
        glow: 'shadow-[0_0_15px_rgba(251,113,133,0.2)]',
      };
  }
}

function getDimensionIcon(dimKey: string) {
  switch (dimKey) {
    case 'cadence_pacing':
      return <Clock className="h-4 w-4 text-cyan-sonar" aria-hidden="true" />;
    case 'pause_discipline':
      return <Activity className="h-4 w-4 text-lime-sonar" aria-hidden="true" />;
    case 'pitch_variation':
      return <Sparkles className="h-4 w-4 text-blue-sonar" aria-hidden="true" />;
    case 'energy_dynamics':
      return <Mic className="h-4 w-4 text-indigo-400" aria-hidden="true" />;
    default:
      return <Activity className="h-4 w-4 text-cyan-sonar" aria-hidden="true" />;
  }
}

export function RubricScorecardView({
  scorecard,
  title = 'Deterministic Acoustic Rubric Scorecard',
  subtitle = 'Objective 0–100 evaluations grounded in measured physical acoustic features',
  className = '',
}: RubricScorecardViewProps) {
  const [showLimitations, setShowLimitations] = useState(false);
  const overallColors = getBandColor(scorecard.overall_band);

  const dimensionKeys: (keyof typeof scorecard.dimensions)[] = [
    'cadence_pacing',
    'pause_discipline',
    'pitch_variation',
    'energy_dynamics',
  ];

  return (
    <Card className={`border-border-strong bg-bg-surface overflow-hidden ${className}`}>
      {/* Header with Composite Score & Performance Band */}
      <CardHeader className="border-b border-border bg-bg-elevated/40 p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-sonar font-semibold">
                Track C • Rubric Evaluation
              </span>
              <span className="text-border text-xs">•</span>
              <span className="text-[10px] font-mono text-text-muted">Reproducible &amp; Deterministic</span>
            </div>
            <CardTitle className="text-lg sm:text-xl text-text-primary mt-1">{title}</CardTitle>
            <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
          </div>

          {/* Big Composite Score Pill */}
          <div className="flex items-center gap-4 bg-bg-elevated border border-border rounded-xl p-3 sm:px-5">
            <div className="text-right">
              <p className="text-[10px] font-mono uppercase text-text-muted">Composite Score</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className={`text-3xl sm:text-4xl font-mono font-bold tabular-nums ${overallColors.text}`}>
                  {scorecard.overall_score.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-text-muted">/100</span>
              </div>
            </div>
            <div className="h-10 w-[1px] bg-border" aria-hidden="true" />
            <div>
              <p className="text-[10px] font-mono uppercase text-text-muted">Classification</p>
              <Badge variant="outline" className={`mt-1 font-mono text-xs px-2.5 py-0.5 ${overallColors.badge}`}>
                {scorecard.overall_band}
              </Badge>
            </div>
          </div>
        </div>

        {/* Formula breakdown and summary */}
        <div className="mt-4 pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-text-muted">
            <span className="text-text-secondary font-semibold">Formula:</span>
            <span className="bg-bg-elevated px-2 py-0.5 rounded border border-border text-[11px] text-text-primary">
              {scorecard.formula}
            </span>
          </div>
          <span className="text-text-muted text-[11px]">{scorecard.summary}</span>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* 4 Dimension Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dimensionKeys.map((key) => {
            const dim: RubricDimension = scorecard.dimensions[key];
            if (!dim) return null;
            const dimColors = getBandColor(dim.band);
            const icon = getDimensionIcon(key);

            return (
              <div
                key={key}
                className="bg-bg-elevated/60 border border-border rounded-xl p-4.5 space-y-3 transition-colors hover:border-border-strong flex flex-col justify-between"
              >
                <div>
                  {/* Dimension Title & Score */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-bg-surface border border-border">
                        {icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary leading-tight">
                          {dim.name}
                        </h4>
                        <span className="text-[10px] font-mono text-text-muted uppercase">
                          Weight: {((scorecard.weights[key] || 0.25) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      <Badge variant="outline" className={`font-mono text-[10px] px-2 py-0.5 ${dimColors.badge}`}>
                        {dim.band}
                      </Badge>
                      <div className="font-mono font-bold text-base tabular-nums text-text-primary">
                        {dim.score.toFixed(1)}
                        <span className="text-[10px] text-text-muted font-normal">/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2.5 w-full bg-bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${dimColors.bar}`}
                      style={{ width: `${Math.max(5, Math.min(100, dim.score))}%` }}
                    />
                  </div>

                  {/* Rationale text */}
                  <p className="mt-3 text-xs text-text-secondary leading-relaxed">
                    {dim.rationale}
                  </p>
                </div>

                <div>
                  {/* Actionable recommendation */}
                  <div className="mt-3 p-2.5 bg-bg-surface/80 rounded-lg border border-border/70 flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-sonar mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="text-[11px] text-text-primary leading-normal">
                      <span className="font-semibold text-cyan-sonar">Actionable: </span>
                      {dim.recommendations}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cautious Limitations Collapsible Banner */}
        <div className="border border-border rounded-lg bg-bg-elevated/30 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowLimitations(!showLimitations)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-mono text-text-muted hover:text-text-secondary hover:bg-bg-elevated/50 transition-colors"
            aria-expanded={showLimitations}
          >
            <span className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-cyan-sonar" aria-hidden="true" />
              <span>Scientific Measurement Disclosure &amp; Scope Limitations</span>
            </span>
            {showLimitations ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showLimitations && (
            <div className="px-4 py-3 border-t border-border text-xs text-text-secondary leading-relaxed bg-bg-surface/40">
              <p>{scorecard.limitations}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
