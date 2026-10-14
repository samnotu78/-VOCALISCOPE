import { Mic, Activity, Radio, Cpu } from 'lucide-react';
import { Button } from './ui/Button';
import { API_BASE } from '../lib/api';

interface HeaderProps {
  onVoiceAssistantClick: () => void;
  voiceAssistantOpen: boolean;
  apiHealthy?: boolean;
  currentView?: 'upload' | 'analysis' | 'comparison';
  filename?: string;
  onNavigateHome?: () => void;
}

export function Header({
  onVoiceAssistantClick,
  voiceAssistantOpen,
  apiHealthy = true,
  currentView = 'upload',
  filename,
  onNavigateHome,
}: HeaderProps) {
  const viewLabels = {
    upload: 'Input & Recording',
    analysis: filename ? `Analysis: ${filename}` : 'Acoustic Analysis',
    comparison: 'Benchmark Comparison',
  };

  return (
    <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur-md border-b border-border transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Workspace Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-sonar rounded-lg group"
              aria-label="Vocaliscope Home"
            >
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-bg-surface border border-cyan-sonar/40 shadow-[0_0_12px_rgba(0,242,254,0.18)] transition-transform group-hover:scale-105">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-cyan-sonar"
                  aria-hidden="true"
                >
                  <path d="M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2" />
                </svg>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-tight text-text-primary group-hover:text-cyan-sonar transition-colors">
                    Vocaliscope
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-lime-sonar/15 text-lime-sonar border border-lime-sonar/30 uppercase tracking-widest hidden sm:inline">
                    Sonar v0.5
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted truncate max-w-[200px] sm:max-w-xs">
                  <span className="hidden md:inline">Signal Engine</span>
                  <span className="hidden md:inline text-border-strong">•</span>
                  <span className="text-text-secondary truncate">{viewLabels[currentView]}</span>
                </div>
              </div>
            </button>
          </div>

          {/* Right Status Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
            {/* Live API Health indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-colors ${
                apiHealthy
                  ? 'bg-lime-sonar/10 text-lime-sonar border-lime-sonar/30'
                  : 'bg-error-bg text-error border-error/30'
              }`}
              title={apiHealthy ? `Engine Online (${API_BASE})` : `Engine Offline (${API_BASE})`}
              aria-label={apiHealthy ? 'Acoustic engine online' : 'Acoustic engine offline'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  apiHealthy ? 'bg-lime-sonar animate-pulse' : 'bg-error'
                }`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline font-medium">
                {apiHealthy ? 'Engine Online' : 'Engine Offline'}
              </span>
            </div>

            {/* Voice Assistant Toggle */}
            <Button
              variant={voiceAssistantOpen ? 'primary' : 'secondary'}
              size="sm"
              onClick={onVoiceAssistantClick}
              aria-pressed={voiceAssistantOpen}
              aria-label={voiceAssistantOpen ? 'Close voice assistant' : 'Open voice assistant'}
              className={`transition-all duration-200 text-xs font-mono ${
                voiceAssistantOpen
                  ? 'bg-cyan-sonar text-bg shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                  : 'hover:border-cyan-sonar/40'
              }`}
            >
              <Mic className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden md:inline">Voice Assistant</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}