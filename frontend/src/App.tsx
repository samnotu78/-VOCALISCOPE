import { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { AnalysisView } from './components/AnalysisView';
import { ComparisonView } from './components/ComparisonView';
import { VoiceAssistant } from './components/VoiceAssistant';
import { analyzeAudio, compareRecordings, checkHealth, API_BASE } from './lib/api';
import { AnalysisResponse, ComparisonResponse } from './lib/api';
import {
  Activity,
  ArrowRight,
  AlertCircle,
  BarChart3,
  Mic,
  ShieldCheck,
  Waves,
  Play,
  RotateCcw,
} from 'lucide-react';
import { Button } from './components/ui/Button';

type View = 'upload' | 'analysis' | 'comparison';

function App() {
  const [view, setView] = useState<View>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [voiceAssistantOpen, setVoiceAssistantOpen] = useState(false);
  const [apiHealthy, setApiHealthy] = useState(true);
  const [lastAnalysisForAssistant, setLastAnalysisForAssistant] = useState<AnalysisResponse | null>(null);
  const [lastComparisonForAssistant, setLastComparisonForAssistant] = useState<ComparisonResponse | null>(null);

  // Check API health on mount and periodically
  const verifyApi = useCallback(() => {
    checkHealth()
      .then(() => setApiHealthy(true))
      .catch(() => setApiHealthy(false));
  }, []);

  useEffect(() => {
    verifyApi();
    const interval = setInterval(verifyApi, 15000);
    return () => clearInterval(interval);
  }, [verifyApi]);

  // Global keyboard shortcut: Alt+V toggles Voice Assistant
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        setVoiceAssistantOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleAnalyze = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeAudio(file);
      setAnalysisResult(result);
      setLastAnalysisForAssistant(result);
      setSelectedFile(null);
      setView('analysis');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  const handleNewAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setSelectedFile(null);
    setError(null);
    setView('upload');
  }, []);

  const handleCompare = useCallback(async () => {
    setIsComparing(true);
    setError(null);
    try {
      const result = await compareRecordings();
      setComparisonResult(result);
      setLastComparisonForAssistant(result);
      setView('comparison');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comparison failed');
    } finally {
      setIsComparing(false);
    }
  }, []);

  // Quick Demo Loader: loads benchmark recording directly into single analysis view
  const handleLoadBenchmarkDemo = useCallback(
    async (type: 'clear' | 'rushed') => {
      setIsAnalyzing(true);
      setError(null);
      try {
        let comp = comparisonResult;
        if (!comp) {
          comp = await compareRecordings();
          setComparisonResult(comp);
          setLastComparisonForAssistant(comp);
        }
        const target = type === 'clear' ? comp.clear : comp.rushed;
        const response: AnalysisResponse = {
          filename: target.filename,
          features: target.features,
        };
        setAnalysisResult(response);
        setLastAnalysisForAssistant(response);
        setView('analysis');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load benchmark demo recording');
      } finally {
        setIsAnalyzing(false);
      }
    },
    [comparisonResult]
  );

  const handleInspectRecordingFromComparison = useCallback((rec: { filename: string; features: any }) => {
    const res: AnalysisResponse = {
      filename: rec.filename,
      features: rec.features,
    };
    setAnalysisResult(res);
    setLastAnalysisForAssistant(res);
    setView('analysis');
  }, []);

  const handleBackToUpload = useCallback(() => {
    setView('upload');
  }, []);

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col selection:bg-cyan-sonar/30 selection:text-cyan-sonar">
      {/* Global Application Header */}
      <Header
        onVoiceAssistantClick={() => setVoiceAssistantOpen(!voiceAssistantOpen)}
        voiceAssistantOpen={voiceAssistantOpen}
        apiHealthy={apiHealthy}
        currentView={view}
        filename={analysisResult?.filename}
        onNavigateHome={() => setView('upload')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Navigation View Switcher (available when active results exist) */}
        {(analysisResult || comparisonResult) && (
          <nav
            aria-label="Workspace views"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 p-1.5 bg-bg-surface border border-border rounded-xl"
          >
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setView('upload')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  view === 'upload'
                    ? 'bg-cyan-sonar text-bg font-semibold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                }`}
              >
                + New Recording
              </button>
              {analysisResult && (
                <button
                  onClick={() => setView('analysis')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all truncate max-w-[220px] ${
                    view === 'analysis'
                      ? 'bg-cyan-sonar text-bg font-semibold shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  }`}
                >
                  Analysis ({analysisResult.filename})
                </button>
              )}
              {comparisonResult && (
                <button
                  onClick={() => setView('comparison')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    view === 'comparison'
                      ? 'bg-cyan-sonar text-bg font-semibold shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  }`}
                >
                  Benchmark Comparison
                </button>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVoiceAssistantOpen(true)}
              className="text-xs font-mono text-cyan-sonar hidden sm:flex items-center gap-1.5 hover:bg-cyan-sonar/10"
            >
              <Mic className="h-3.5 w-3.5" />
              <span>Grounded Voice Query</span>
            </Button>
          </nav>
        )}

        {/* API Unhealthy Alert */}
        {!apiHealthy && (
          <div
            className="mb-6 p-4 bg-error-bg border border-error/30 rounded-xl flex items-start justify-between gap-3 animate-fade-in"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-semibold text-error">Acoustic Signal Engine Disconnected</p>
                <p className="text-text-secondary text-xs mt-0.5 leading-relaxed font-mono">
                  Cannot connect to the FastAPI acoustic server at <code className="bg-bg px-1.5 py-0.5 rounded text-cyan-sonar">{API_BASE}</code>. Ensure the service is active with <code className="bg-bg px-1.5 py-0.5 rounded">uvicorn backend.main:app</code>.
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={verifyApi} className="text-xs font-mono flex-shrink-0">
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Retry Connection
            </Button>
          </div>
        )}

        {/* Global Error Banner */}
        {error && !isAnalyzing && !isComparing && (
          <div
            className="mb-6 p-4 bg-error-bg border border-error/30 rounded-xl flex items-start justify-between gap-3 animate-fade-in"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-error text-xs uppercase tracking-wider font-mono">Operation Failed</p>
                <p className="text-xs sm:text-sm text-text-secondary mt-0.5 font-mono">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-text-muted hover:text-text-primary p-1 text-xs"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* VIEW: UPLOAD & LANDING WORKSTATION */}
        {view === 'upload' && (
          <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Editorial Signal Noir Hero Section */}
            <div className="text-center relative pt-2 pb-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-sonar/10 border border-cyan-sonar/30 text-cyan-sonar text-xs font-mono mb-4 shadow-[0_0_15px_rgba(0,242,254,0.12)]">
                <span className="w-2 h-2 rounded-full bg-lime-sonar animate-pulse" />
                ACOUSTIC SIGNAL ENGINE • NOIR INSTRUMENTATION
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-text-primary mb-3 sm:mb-4">
                Evidence-Based Speech Analysis
              </h1>

              <p className="text-sm sm:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed">
                Physical acoustic feature extraction: calibrated RMS energy envelopes, configured YIN pitch tracking, and 13-dimensional spectral MFCC distributions.
              </p>
            </div>

            {/* Input Zone: Drag-Drop & Direct Microphone Capture */}
            <div className="bg-bg-elevated/40 border border-border rounded-2xl p-4 sm:p-7 backdrop-blur-sm shadow-xl">
              <UploadZone
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
                error={error}
                selectedFile={selectedFile}
                onClear={handleClearFile}
              />
            </div>

            {/* Benchmark Comparison & Quick Sample Access */}
            <div className="p-5 sm:p-6 rounded-2xl bg-bg-surface border border-border shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-cyan-sonar" />
                    Comparative Acoustic Benchmark Engine
                  </h3>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                    Evaluate differences between calibrated reference deliveries (<code className="font-mono text-cyan-sonar">clear.mp4</code> vs <code className="font-mono text-violet-sonar">rushed.mp4</code>) across physical metrics.
                  </p>
                </div>

                <Button
                  onClick={handleCompare}
                  disabled={isComparing}
                  className="bg-bg-elevated hover:bg-bg border border-border-strong text-text-primary hover:border-cyan-sonar/40 whitespace-nowrap shadow-sm text-xs font-mono py-2.5 px-4"
                >
                  {isComparing ? 'Computing Benchmarks…' : 'Compare Clear vs Rushed'}
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>

              {/* Instant Single-Recording Sample Triggers */}
              <div className="pt-3 border-t border-border flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-text-muted">Directly inspect calibrated baseline sample:</span>
                <button
                  onClick={() => handleLoadBenchmarkDemo('clear')}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-sonar/10 border border-cyan-sonar/30 text-cyan-sonar hover:bg-cyan-sonar/20 transition-colors"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>Clear Delivery (clear.mp4)</span>
                </button>
                <button
                  onClick={() => handleLoadBenchmarkDemo('rushed')}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-sonar/10 border border-violet-sonar/30 text-violet-sonar hover:bg-violet-sonar/20 transition-colors"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>Rushed Delivery (rushed.mp4)</span>
                </button>
              </div>
            </div>

            {/* Methodology & Boundary Foundations */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="p-4 rounded-xl bg-bg-surface/50 border border-border space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-sonar/10 border border-cyan-sonar/30 flex items-center justify-center text-cyan-sonar mb-2">
                  <Activity className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-text-primary">
                  Heuristic RMS Gating
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Computes frame energy across 2048-sample windows. The 5% peak threshold is a recording-relative heuristic; low energy indicates signal attenuation, not confirmed non-speech.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-bg-surface/50 border border-border space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-lime-sonar/10 border border-lime-sonar/30 flex items-center justify-center text-lime-sonar mb-2">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-text-primary">
                  Configured YIN F0 (65–400 Hz)
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Pitch bounds (65–400 Hz) represent the configured analysis range for the YIN algorithm, not a universal vocal ceiling. Reports median, P10 floor, and P90 ceiling.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-bg-surface/50 border border-border space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-violet-sonar/10 border border-violet-sonar/30 flex items-center justify-center text-violet-sonar mb-2">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-text-primary">
                  Scientific Integrity
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  No hallucinated transcripts, forced alignments, or emotion classification. Measurements quantify physical audio signal features without heuristic overreach.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: ANALYSIS RESULTS */}
        {view === 'analysis' && analysisResult && (
          <AnalysisView
            features={analysisResult.features}
            filename={analysisResult.filename}
            onNewAnalysis={handleNewAnalysis}
          />
        )}

        {/* VIEW: COMPARISON RESULTS */}
        {view === 'comparison' && comparisonResult && (
          <ComparisonView
            data={comparisonResult}
            onBack={handleBackToUpload}
            onInspectRecording={handleInspectRecordingFromComparison}
          />
        )}

        {/* GLOBAL VOICE ASSISTANT DRAWER */}
        <VoiceAssistant
          isOpen={voiceAssistantOpen}
          onClose={() => setVoiceAssistantOpen(false)}
          lastAnalysis={lastAnalysisForAssistant}
          lastComparison={lastComparisonForAssistant}
        />
      </main>

      {/* Global Application Footer */}
      <footer className="border-t border-border py-4 mt-auto bg-bg-elevated/50 text-xs text-text-muted font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Vocaliscope Acoustic Signal Engine • Librosa / FastAPI / React 18</span>
          <span className="text-text-secondary">Designed for Signal Noir × Chroma Sonar</span>
        </div>
      </footer>
    </div>
  );
}

export default App;