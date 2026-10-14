import { useState } from 'react';
import { Activity, TrendingUp, Database, Info, ChevronLeft, ShieldCheck, Waves } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { MetricCard } from './MetricCard';
import { Timeline } from './Timeline';
import { EventDetail } from './EventDetail';
import { RubricScorecardView } from './RubricScorecardView';
import { formatDuration, formatNumber, formatFrequency, cn } from '../lib/utils';
import { AnalysisFeatures, TemporalEvidenceEvent } from '../lib/api';

interface AnalysisViewProps {
  features: AnalysisFeatures;
  filename: string;
  onNewAnalysis: () => void;
}

export function AnalysisView({ features, filename, onNewAnalysis }: AnalysisViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<TemporalEvidenceEvent | null>(null);
  const [, setActiveTab] = useState('overview');

  const {
    duration_seconds,
    estimated_active_seconds,
    estimated_silence_seconds,
    mean_rms_energy,
    estimated_pitch_median_hz,
    pitch_p10_hz,
    pitch_p90_hz,
    mfcc_mean,
    sample_rate_hz,
    temporal_evidence,
    temporal_analysis_note,
    note,
  } = features;

  const activePercent = duration_seconds > 0 ? ((estimated_active_seconds / duration_seconds) * 100).toFixed(1) : '0.0';
  const lowEnergyPercent = (100 - parseFloat(activePercent)).toFixed(1);

  const pitchSpan =
    pitch_p90_hz !== null && pitch_p10_hz !== null ? pitch_p90_hz - pitch_p10_hz : null;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Workstation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-sonar animate-pulse" aria-hidden="true" />
            <span className="text-xs uppercase tracking-wider font-mono text-cyan-sonar font-semibold">
              Acoustic Evidence Workstation
            </span>
            <span className="text-border-strong">|</span>
            <span className="text-xs font-mono text-text-muted">
              {sample_rate_hz ? `${sample_rate_hz} Hz Sample Rate` : 'Single Recording Analysis'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight mt-1 truncate max-w-xl">
            {filename}
          </h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Physical signal feature extraction: RMS envelopes, YIN F0 distribution, and spectral MFCCs
          </p>
        </div>
        <Button variant="secondary" onClick={onNewAnalysis} className="w-full sm:w-auto self-start sm:self-auto">
          <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          New Recording
        </Button>
      </div>

      {/* Primary Headline Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <MetricCard
          label="Total Duration"
          value={formatDuration(duration_seconds)}
          unit="seconds"
        />
        <MetricCard
          label="Estimated Active Speech"
          value={formatDuration(estimated_active_seconds)}
          unit={`${activePercent}%`}
          trend="neutral"
          trendLabel="of duration"
        />
        <MetricCard
          label="Silence / Low Energy"
          value={formatDuration(estimated_silence_seconds)}
          unit={`${lowEnergyPercent}%`}
          trend="neutral"
          trendLabel="of duration"
        />
        <MetricCard
          label="Mean Frame RMS"
          value={formatNumber(mean_rms_energy, 5)}
          unit="RMS"
        />
      </div>

      {/* Investigation Tabs */}
      <Tabs defaultValue="overview" onChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto bg-bg-surface border border-border p-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm font-medium">
            Overview & Energy
          </TabsTrigger>
          {features.rubric && (
            <TabsTrigger value="rubric" className="text-xs sm:text-sm font-medium">
              Rubric Scorecard ({features.rubric.overall_score.toFixed(0)})
            </TabsTrigger>
          )}
          <TabsTrigger value="pitch" className="text-xs sm:text-sm font-medium">
            Pitch & Prosody (F0)
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs sm:text-sm font-medium">
            Temporal Evidence ({temporal_evidence.length})
          </TabsTrigger>
          <TabsTrigger value="spectral" className="text-xs sm:text-sm font-medium">
            Spectral MFCCs
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW & ENERGY */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Rubric Overview Banner */}
          {features.rubric && (
            <div className="p-4 bg-bg-surface border border-border-strong rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-cyan-sonar/10 border border-cyan-sonar/30 flex items-center justify-center font-mono font-bold text-cyan-sonar text-lg shrink-0">
                  {features.rubric.overall_score.toFixed(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-primary">Track C • Acoustic Rubric Evaluation</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-elevated border border-border text-cyan-sonar">
                      {features.rubric.overall_band}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{features.rubric.summary}</p>
                </div>
              </div>
              <div className="text-xs font-mono text-text-muted shrink-0 text-right">
                <span className="block text-[10px] uppercase text-text-muted">Formula</span>
                <span className="text-text-primary text-[11px]">{features.rubric.formula}</span>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Energy Distribution Card */}
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border/80">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-cyan-sonar" aria-hidden="true" />
                  Energy Distribution & Gating
                </CardTitle>
                <CardDescription className="text-xs text-text-secondary mt-1">
                  Root Mean Square (RMS) frame energy across 2048-sample analysis windows
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-5">
                <div className="p-4 bg-bg-elevated rounded-xl border border-border">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-2xl sm:text-3xl font-mono font-semibold text-text-primary tabular-nums">
                        {formatNumber(mean_rms_energy, 4)}
                      </p>
                      <p className="text-[11px] text-text-muted uppercase tracking-wider font-mono mt-1">
                        Mean RMS
                      </p>
                    </div>
                    <div className="border-l border-border pl-3">
                      <p className="text-2xl sm:text-3xl font-mono font-semibold text-cyan-sonar tabular-nums">
                        {activePercent}%
                      </p>
                      <p className="text-[11px] text-text-muted uppercase tracking-wider font-mono mt-1">
                        Active Speech
                      </p>
                    </div>
                    <div className="border-l border-border pl-3">
                      <p className="text-2xl sm:text-3xl font-mono font-semibold text-text-primary tabular-nums">
                        {temporal_evidence.length}
                      </p>
                      <p className="text-[11px] text-text-muted uppercase tracking-wider font-mono mt-1">
                        Low-Energy Events
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Active speech frames ({activePercent}%):</span>
                    <span className="text-text-primary tabular-nums">
                      {estimated_active_seconds.toFixed(2)}s / {duration_seconds.toFixed(2)}s
                    </span>
                  </div>
                  <div className="h-2.5 bg-bg-surface rounded-full overflow-hidden border border-border">
                    <div
                      className="h-full bg-cyan-sonar rounded-full transition-all duration-300"
                      style={{ width: `${activePercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-text-secondary">Low-energy / silence frames ({lowEnergyPercent}%):</span>
                    <span className="text-text-primary tabular-nums">
                      {estimated_silence_seconds.toFixed(2)}s / {duration_seconds.toFixed(2)}s
                    </span>
                  </div>
                  <div className="h-2.5 bg-bg-surface rounded-full overflow-hidden border border-border">
                    <div
                      className="h-full bg-blue-sonar/60 rounded-full transition-all duration-300"
                      style={{ width: `${lowEnergyPercent}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-text-muted font-mono pt-2 border-t border-border/60 flex items-center justify-between">
                  <span>Relative Threshold RMS:</span>
                  <span className="text-text-secondary tabular-nums">
                    {temporal_evidence[0]
                      ? formatNumber(temporal_evidence[0].measurement.recording_relative_threshold_rms, 6)
                      : '—'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Methodology & Boundaries Card */}
            <Card className="border-border flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-border/80">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5 text-cyan-sonar" aria-hidden="true" />
                  Scientific Methodology Notes
                </CardTitle>
                <CardDescription className="text-xs text-text-secondary mt-1">
                  Algorithmic specifications and measurement boundaries
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs sm:text-sm text-text-secondary">
                <div className="p-3 bg-bg-elevated rounded-lg border border-border">
                  <p className="font-semibold text-text-primary mb-1 text-xs uppercase tracking-wider font-mono">
                    Energy Thresholding Gating
                  </p>
                  <p className="leading-relaxed">{note}</p>
                </div>

                <div className="p-3 bg-bg-elevated rounded-lg border border-border">
                  <p className="font-semibold text-text-primary mb-1 text-xs uppercase tracking-wider font-mono">
                    Temporal Interval Extraction
                  </p>
                  <p className="leading-relaxed">{temporal_analysis_note}</p>
                </div>

                <div className="p-3 bg-bg-elevated rounded-lg border border-border-strong flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-cyan-sonar flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-text-secondary leading-relaxed">
                    <strong className="text-text-primary">Acoustic Boundary:</strong> Low-energy intervals represent continuous frames falling below the recording-relative threshold. They indicate acoustic signal attenuation, but do not classify phonetic word boundaries, speech disfluencies, or emotional delivery.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: RUBRIC SCORECARD */}
        {features.rubric && (
          <TabsContent value="rubric" className="space-y-6">
            <RubricScorecardView scorecard={features.rubric} />
          </TabsContent>
        )}

        {/* TAB 2: PITCH & PROSODY (F0) */}
        <TabsContent value="pitch" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Fundamental Frequency Card */}
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border/80">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-cyan-sonar" aria-hidden="true" />
                  Fundamental Frequency (F0) Distribution
                </CardTitle>
                <CardDescription className="text-xs text-text-secondary mt-1">
                  Extracted via the YIN algorithm with pitch tracking confined to human vocal limits (65–400 Hz)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-5">
                {estimated_pitch_median_hz !== null ? (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <MetricCard
                        label="Median Pitch (F0)"
                        value={formatFrequency(estimated_pitch_median_hz)}
                        unit=""
                        trend="neutral"
                        trendLabel="Midpoint"
                      />
                      <MetricCard
                        label="Pitch Floor (P10)"
                        value={formatFrequency(pitch_p10_hz)}
                        unit=""
                        trend="neutral"
                        trendLabel="10th %ile"
                      />
                      <MetricCard
                        label="Pitch Ceiling (P90)"
                        value={formatFrequency(pitch_p90_hz)}
                        unit=""
                        trend="neutral"
                        trendLabel="90th %ile"
                      />
                    </div>

                    {/* Visual Pitch Range Track */}
                    <div className="p-4 bg-bg-elevated rounded-xl border border-border space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-text-muted">Observed P10–P90 Range:</span>
                        <span className="text-text-primary font-semibold tabular-nums">
                          {pitchSpan !== null ? `${formatNumber(pitchSpan, 1)} Hz` : '—'}
                        </span>
                      </div>

                      <div className="h-6 bg-bg-surface rounded-md border border-border-strong relative flex items-center px-2 overflow-hidden">
                        {pitch_p10_hz !== null && pitch_p90_hz !== null && (
                          <div
                            className="absolute top-1.5 bottom-1.5 bg-cyan-sonar/20 rounded-sm"
                            style={{
                              left: `${Math.max(0, Math.min(100, ((pitch_p10_hz - 65) / (400 - 65)) * 100))}%`,
                              right: `${Math.max(0, Math.min(100, 100 - ((pitch_p90_hz - 65) / (400 - 65)) * 100))}%`,
                            }}
                          />
                        )}
                        {estimated_pitch_median_hz !== null && (
                          <div
                            className="absolute top-1 bottom-1 w-1.5 bg-cyan-sonar rounded-sm shadow-[0_0_8px_rgba(0,242,254,0.6)] z-10"
                            style={{
                              left: `calc(${Math.max(0, Math.min(100, ((estimated_pitch_median_hz - 65) / (400 - 65)) * 100))}% - 3px)`,
                            }}
                            title={`Median F0: ${formatFrequency(estimated_pitch_median_hz)}`}
                          />
                        )}
                      </div>

                      <div className="flex justify-between text-[10px] text-text-muted font-mono px-0.5">
                        <span>65 Hz (Analysis Floor)</span>
                        <span>400 Hz (Analysis Ceiling)</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-text-muted p-6 bg-bg-elevated rounded-xl border border-border">
                    <p className="font-medium text-text-primary">No Sustained Pitch Detected</p>
                    <p className="text-xs mt-1">
                      Signal energy in this recording may be primarily unvoiced, whispering, or below periodic tracking thresholds.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scientific Pitch Interpretation Guide */}
            <Card className="border-border flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-border/80">
                <CardTitle className="text-lg">Scientific Pitch Metrics Guide</CardTitle>
                <CardDescription className="text-xs text-text-secondary mt-1">
                  Objective physical definitions of measured pitch parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs sm:text-sm text-text-secondary">
                <div className="p-3 bg-bg-elevated rounded-lg border border-border">
                  <p className="font-semibold text-text-primary text-xs font-mono uppercase tracking-wider mb-1">
                    Median Pitch (F0)
                  </p>
                  <p className="leading-relaxed">
                    Describes the mathematical center of the fundamental frequency distribution across voiced frames (50th percentile). Reflects physical vocal fold vibration rate under current recording conditions.
                  </p>
                </div>

                <div className="p-3 bg-bg-elevated rounded-lg border border-border">
                  <p className="font-semibold text-text-primary text-xs font-mono uppercase tracking-wider mb-1">
                    Pitch Floor (P10) & Ceiling (P90)
                  </p>
                  <p className="leading-relaxed">
                    The 10th and 90th percentiles enclose 80% of detected voiced frames, filtering out isolated octave-tracking errors and transient glottal noise at onset/offset transitions.
                  </p>
                </div>

                <div className="p-3 bg-bg-elevated rounded-lg border border-border-strong space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-sonar font-mono">
                    <Info className="h-4 w-4" aria-hidden="true" />
                    <span>Scientific Interpretation Caution</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Pitch range describes the spread between the measured lower and upper pitch percentiles. Median pitch describes the centre of the measured pitch distribution. These measurements alone do not establish emotion, vocal quality, or speaker intent.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: TEMPORAL EVIDENCE */}
        <TabsContent value="timeline" className="space-y-6">
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border/80">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Database className="h-5 w-5 text-cyan-sonar" aria-hidden="true" />
                    Interactive Temporal Evidence Timeline
                  </CardTitle>
                  <CardDescription className="text-xs text-text-secondary mt-1">
                    {temporal_evidence.length} low-energy acoustic interval{temporal_evidence.length !== 1 ? 's' : ''} detected (≥150 ms duration, energy &lt; 5% recording peak RMS).
                  </CardDescription>
                </div>
                {selectedEvent && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedEvent(null)}
                    className="text-xs font-mono self-start sm:self-auto"
                  >
                    Clear Selection
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Timeline
                evidence={temporal_evidence}
                duration={duration_seconds}
                onSelectEvent={setSelectedEvent}
                selectedEvent={selectedEvent}
              />
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border/60 py-3 text-xs font-mono text-text-muted">
              <span>
                Relative Gating Threshold:{' '}
                <strong className="text-text-secondary tabular-nums">
                  {temporal_evidence[0]
                    ? formatNumber(temporal_evidence[0].measurement.recording_relative_threshold_rms, 6)
                    : '—'}
                </strong>{' '}
                RMS
              </span>
              <span>
                {selectedEvent
                  ? `Selected: [${selectedEvent.start_seconds.toFixed(2)}s – ${selectedEvent.end_seconds.toFixed(2)}s]`
                  : 'Click any interval bar on the timeline to inspect full frame metrics'}
              </span>
            </CardFooter>
          </Card>

          {/* Detailed Modal Inspector for Selected Interval */}
          <EventDetail
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            duration={duration_seconds}
          />
        </TabsContent>

        {/* TAB 4: SPECTRAL MFCCS */}
        <TabsContent value="spectral" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border">
              <CardHeader className="pb-3 border-b border-border/80">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Waves className="h-5 w-5 text-cyan-sonar" aria-hidden="true" />
                  Mel-Frequency Cepstral Coefficients (MFCCs)
                </CardTitle>
                <CardDescription className="text-xs text-text-secondary mt-1">
                  13-coefficient arithmetic mean vector computed across all short-time Fourier transform windows
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono" role="table">
                    <thead>
                      <tr className="text-left text-text-muted border-b border-border/60 uppercase tracking-wider text-[11px]">
                        <th className="pb-2.5 font-semibold w-24">Coefficient</th>
                        <th className="pb-2.5 font-semibold text-right w-28">Mean Value</th>
                        <th className="pb-2.5 font-semibold pl-6">Relative Spectral Shape</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {mfcc_mean.map((value, index) => {
                        // Normalize visualization: typical MFCC range roughly -150 to +150
                        const normWidth = Math.min(100, Math.max(0, 50 + (value / 6) * 50));

                        return (
                          <tr key={index} className="hover:bg-bg-elevated/40 transition-colors">
                            <td className="py-2.5 text-text-secondary font-medium">
                              {index === 0 ? 'c0 (Energy)' : `c${index}`}
                            </td>
                            <td className="py-2.5 text-right font-semibold text-text-primary tabular-nums">
                              {formatNumber(value, 4)}
                            </td>
                            <td className="py-2.5 pl-6">
                              <div className="h-2.5 bg-bg-surface rounded-full overflow-hidden border border-border relative flex items-center">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all duration-200',
                                    index === 0 ? 'bg-cyan-sonar' : 'bg-blue-sonar/75'
                                  )}
                                  style={{ width: `${normWidth}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-border/80">
                <CardTitle className="text-lg">Spectral Envelope Principles</CardTitle>
                <CardDescription className="text-xs text-text-secondary mt-1">
                  Physical basis of Mel-scale cepstral feature representation
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs sm:text-sm text-text-secondary">
                <div className="p-3 bg-bg-elevated rounded-lg border border-border">
                  <p className="font-semibold text-text-primary text-xs font-mono uppercase tracking-wider mb-1">
                    Coefficient 0 (Log Energy)
                  </p>
                  <p className="leading-relaxed">
                    Represents overall spectral power and average signal frame energy across the entire audio duration.
                  </p>
                </div>

                <div className="p-3 bg-bg-elevated rounded-lg border border-border">
                  <p className="font-semibold text-text-primary text-xs font-mono uppercase tracking-wider mb-1">
                    Coefficients 1–12 (Resonances)
                  </p>
                  <p className="leading-relaxed">
                    Map broad vocal tract resonance envelopes and spectral tilt. Extracted using discrete cosine transforms of triangular mel-filterbank log energies.
                  </p>
                </div>

                <div className="p-3 bg-bg-elevated rounded-lg border border-border-strong space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-sonar font-mono">
                    <Info className="h-4 w-4" aria-hidden="true" />
                    <span>Scientific Boundary</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Averaged MFCCs quantify physical frequency balance. They are descriptive acoustic features and do not imply automated emotion classification or speaker biometric verification.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}