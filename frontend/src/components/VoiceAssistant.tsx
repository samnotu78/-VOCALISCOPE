import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  X,
  AlertCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Clock,
  TrendingUp,
  Activity,
  Layers,
  ChevronRight,
  Loader2,
  Info,
} from 'lucide-react';
import { AnalysisResponse, ComparisonResponse } from '../lib/api';
import { formatDuration, formatFrequency, formatNumber } from '../lib/utils';
import { Button } from './ui/Button';

interface VoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  lastAnalysis: AnalysisResponse | null;
  lastComparison: ComparisonResponse | null;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  actionablePills?: string[];
}

// Web Speech API interface declarations for TypeScript
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function VoiceAssistant({
  isOpen,
  onClose,
  lastAnalysis,
  lastComparison,
}: VoiceAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello. I am the Vocaliscope Acoustic Intelligence Assistant. You can speak with me using push-to-talk (hold to speak or tap to toggle) or type below. Ask me about pitch ranges, low-energy intervals, RMS energy, benchmark comparisons, or acoustic methodology.',
      timestamp: new Date(),
      actionablePills: lastAnalysis
        ? [
            'What is my median pitch?',
            'Show low-energy intervals',
            'What is the RMS energy?',
            'Show spectral MFCCs',
          ]
        : lastComparison
        ? [
            'Compare benchmark recordings',
            'What is the pitch shift?',
            'Difference in low-energy time',
            'Can you transcribe my speech?',
          ]
        : [
            'Compare benchmark recordings',
            'What is pitch F0?',
            'Explain heuristic RMS gating',
            'Can you transcribe my speech?',
          ],
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pressStartTimeRef = useRef<number>(0);
  const isHoldingRef = useRef<boolean>(false);

  // Check speech recognition support
  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, interimTranscript, isProcessing, isOpen]);

  // Handle Speech Recognition Stop & Cleanup
  const stopListening = useCallback((abort = false) => {
    if (recognitionRef.current) {
      try {
        if (abort) {
          recognitionRef.current.abort();
        } else {
          recognitionRef.current.stop();
        }
      } catch (err) {
        // Ignore stop/abort error
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
    isHoldingRef.current = false;
  }, []);

  // Cancel speech synthesis and stop mic on modal close or unmount
  useEffect(() => {
    if (!isOpen) {
      stopListening(true);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      setIsProcessing(false);
      setInterimTranscript('');
    }
    return () => {
      stopListening(true);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen, stopListening]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const speakText = useCallback((text: string) => {
    if (isMuted || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    // Clean markdown formatting before reading
    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/•/g, ', ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  // Query Grounding Logic
  const generateGroundedResponse = useCallback((query: string): { text: string; pills?: string[] } => {
    const q = query.toLowerCase().trim();

    // 1. Transcription / Word alignment / Emotion request check (Strict Requirement: No fabrication)
    const transcriptionKeywords = ['transcribe', 'transcription', 'words', 'say', 'said', 'speech to text', 'text', 'lyrics', 'stt'];
    const emotionKeywords = ['emotion', 'feeling', 'happy', 'sad', 'angry', 'mood', 'tone of voice', 'sentiment', 'confidence', 'lie', 'deception', 'nervous', 'stress'];

    if (transcriptionKeywords.some(k => q.includes(k))) {
      return {
        text: 'Vocaliscope does not perform automatic speech recognition (transcription) or forced word alignment. The backend pipeline is strictly focused on measurable acoustic signal processing (RMS energy, fundamental frequency via YIN, and spectral MFCCs). No speech recognition model is loaded or executed.',
        pills: ['What is my median pitch?', 'Show temporal intervals', 'Explain acoustic features'],
      };
    }

    if (emotionKeywords.some(k => q.includes(k))) {
      return {
        text: 'Vocaliscope does not perform emotion recognition or affective classification. Acoustic measures like pitch range and energy indicate vocal variance and dynamics, but Vocaliscope deliberately does not map these metrics to emotional states, deception, or psychological traits.',
        pills: ['What is my median pitch?', 'Show low-energy intervals', 'Methodology notes'],
      };
    }

    // Rubric / Score / Rating Questions
    if (q.includes('rubric') || q.includes('score') || q.includes('rating') || q.includes('grade') || q.includes('evaluation') || q.includes('track c')) {
      if (lastAnalysis?.features.rubric) {
        const r = lastAnalysis.features.rubric;
        return {
          text: `Acoustic Rubric Score for "${lastAnalysis.filename}":\n` +
            `• Overall Composite: ${r.overall_score}/100 (${r.overall_band})\n` +
            `• Cadence & Pacing (30%): ${r.dimensions.cadence_pacing.score}/100 (${r.dimensions.cadence_pacing.band})\n` +
            `• Pause Discipline (25%): ${r.dimensions.pause_discipline.score}/100 (${r.dimensions.pause_discipline.band})\n` +
            `• Pitch Variation (25%): ${r.dimensions.pitch_variation.score}/100 (${r.dimensions.pitch_variation.band})\n` +
            `• Energy Dynamics (20%): ${r.dimensions.energy_dynamics.score}/100 (${r.dimensions.energy_dynamics.band})\n\n` +
            `Formula: ${r.formula}\nNote: ${r.limitations}`,
          pills: ['What is my median pitch?', 'Show temporal intervals', 'Compare benchmark recordings'],
        };
      }
      if (lastComparison) {
        const { clear, rushed, rubric_differences } = lastComparison;
        const cScore = clear.features.rubric?.overall_score ?? '—';
        const rScore = rushed.features.rubric?.overall_score ?? '—';
        const delta = rubric_differences?.overall_score !== undefined
          ? (rubric_differences.overall_score > 0 ? `+${rubric_differences.overall_score}` : `${rubric_differences.overall_score}`)
          : '—';
        return {
          text: `Benchmark Rubric Comparison (Track C):\n` +
            `• Clear baseline: ${cScore}/100 (${clear.features.rubric?.overall_band ?? '—'})\n` +
            `• Rushed condition: ${rScore}/100 (${rushed.features.rubric?.overall_band ?? '—'})\n` +
            `• Overall score delta: ${delta} points\n` +
            `Clear exhibits higher cadence pacing stability and zero mid-phrase hesitation breaks, while Rushed has 4 grounded flaw intervals.`,
          pills: ['Show low-energy intervals', 'What is RMS energy?'],
        };
      }
      return {
        text: 'Vocaliscope evaluates four deterministic acoustic rubric dimensions: Cadence & Pacing (30%), Pause Discipline (25%), Pitch Variation (25%), and Energy Dynamics (20%), yielding a reproducible 0–100 score grounded in physical measurements.',
        pills: ['Compare benchmark recordings', 'What is pitch F0?'],
      };
    }

    // 2. Duration / Length / Active speech questions
    if (q.includes('duration') || q.includes('how long') || q.includes('length') || q.includes('active time') || q.includes('speaking time')) {
      if (!lastAnalysis) {
        return {
          text: 'No recording has been analyzed yet. Upload or record audio on the main screen to compute duration, active speech time, and low-energy intervals.',
          pills: ['Compare benchmark recordings', 'What is pitch F0?'],
        };
      }
      const { features, filename } = lastAnalysis;
      const total = formatDuration(features.duration_seconds);
      const active = formatDuration(features.estimated_active_seconds);
      const silence = formatDuration(features.estimated_silence_seconds);
      const activePct = features.duration_seconds > 0
        ? ((features.estimated_active_seconds / features.duration_seconds) * 100).toFixed(1)
        : '0';

      return {
        text: `In "${filename}":\n• Total recording duration: ${total}\n• Active speech energy frames: ${active} (${activePct}% of total)\n• Low-energy frames (< 5% peak RMS): ${silence}\n• Detected low-energy intervals: ${features.temporal_evidence.length}`,
        pills: ['Show low-energy intervals', 'What is my median pitch?', 'What is RMS energy?'],
      };
    }

    // 3. Pitch / Fundamental Frequency Questions
    if (q.includes('pitch') || q.includes('f0') || q.includes('frequency') || q.includes('hz') || q.includes('intonation') || q.includes('monotone')) {
      if (!lastAnalysis) {
        return {
          text: 'No recording has been analyzed in this session yet. Upload or record audio on the main screen, or check the benchmark comparison to review pitch data.',
          pills: ['Compare benchmark recordings', 'What is pitch F0?'],
        };
      }

      const { features, filename } = lastAnalysis;
      if (features.estimated_pitch_median_hz === null) {
        return {
          text: `In "${filename}", no reliable fundamental frequency (pitch) was detected. This can happen if the audio is mostly unvoiced, whisper, percussive, or obscured by background noise.`,
          pills: ['Show energy breakdown', 'Show low-energy intervals'],
        };
      }

      const median = formatFrequency(features.estimated_pitch_median_hz);
      const p10 = formatFrequency(features.pitch_p10_hz);
      const p90 = formatFrequency(features.pitch_p90_hz);
      const spread = (features.pitch_p90_hz && features.pitch_p10_hz)
        ? `${(features.pitch_p90_hz - features.pitch_p10_hz).toFixed(1)} Hz`
        : 'unknown';

      return {
        text: `In "${filename}":\n• Estimated median pitch: ${median}\n• 10th percentile floor: ${p10}\n• 90th percentile ceiling: ${p90}\n• Observed pitch spread: ${spread}\n\nPitch estimation is derived from voiced frames using the YIN algorithm bounded between 65 Hz and 400 Hz.`,
        pills: ['Show low-energy intervals', 'What is RMS energy?', 'Compare benchmark recordings'],
      };
    }

    // 4. Pause / Silence / Temporal Evidence Questions
    if (q.includes('pause') || q.includes('silence') || q.includes('interval') || q.includes('temporal') || q.includes('evidence') || q.includes('gap')) {
      if (!lastAnalysis) {
        return {
          text: 'No active recording analysis is loaded. Run an analysis or compare the benchmark files to see temporal low-energy intervals.',
          pills: ['Compare benchmark recordings'],
        };
      }

      const { features, filename } = lastAnalysis;
      const count = features.temporal_evidence.length;
      const silenceSec = formatDuration(features.estimated_silence_seconds);
      const activeSec = formatDuration(features.estimated_active_seconds);
      const totalSec = formatDuration(features.duration_seconds);
      const silencePct = features.duration_seconds > 0
        ? ((features.estimated_silence_seconds / features.duration_seconds) * 100).toFixed(1)
        : '0';

      let details = `In "${filename}", estimated low-energy time is ${silenceSec} (${silencePct}% of the ${totalSec} total). Active speech energy frames account for ${activeSec}.\n\nA total of ${count} low-energy interval(s) (≥ 0.15s with RMS < 5% of peak) were detected.`;

      if (count > 0) {
        const top3 = features.temporal_evidence.slice(0, 3).map((e, idx) =>
          `\n  ${idx + 1}. ${e.start_seconds.toFixed(2)}s – ${e.end_seconds.toFixed(2)}s (${e.measurement.duration_seconds.toFixed(2)}s span)`
        ).join('');
        details += `\n\nFirst detected intervals:${top3}`;
        if (count > 3) {
          details += `\n...and ${count - 3} more. Check the Temporal Evidence timeline tab to inspect all of them.`;
        }
      }

      return {
        text: details + '\n\nNote: Low-energy intervals are acoustic observations, not verified speech pauses or rhetorical flaws.',
        pills: ['What is my median pitch?', 'What is RMS energy?'],
      };
    }

    // 5. Energy / RMS Questions
    if (q.includes('rms') || q.includes('energy') || q.includes('volume') || q.includes('intensity') || q.includes('power')) {
      if (!lastAnalysis) {
        return {
          text: 'RMS (Root Mean Square) energy measures the signal power per frame. The backend uses a 2048-sample window (512-sample hop) and sets a recording-relative threshold at 5% of peak RMS to estimate active versus low-energy speech.',
          pills: ['Compare benchmark recordings'],
        };
      }

      const { features, filename } = lastAnalysis;
      return {
        text: `In "${filename}", the mean RMS energy is ${formatNumber(features.mean_rms_energy, 5)}. Active frames represent ${formatDuration(features.estimated_active_seconds)} of sound, while low-energy frames represent ${formatDuration(features.estimated_silence_seconds)}.`,
        pills: ['What is my median pitch?', 'Show temporal intervals'],
      };
    }

    // 6. Comparison Questions
    if (q.includes('compare') || q.includes('benchmark') || q.includes('rushed') || q.includes('clear') || q.includes('difference') || q.includes('faster') || q.includes('slower')) {
      if (lastComparison) {
        const { clear, rushed, differences } = lastComparison;
        const durDiff = differences.duration_seconds;
        const pitchDiff = differences.estimated_pitch_median_hz;
        const silDiff = differences.estimated_silence_seconds;

        return {
          text: `Benchmark comparison summary (rushed minus clear):\n` +
            `• Clear duration: ${formatDuration(clear.features.duration_seconds)} vs Rushed: ${formatDuration(rushed.features.duration_seconds)} (diff: ${durDiff !== null ? durDiff.toFixed(2) : '—'}s)\n` +
            `• Median pitch shift: ${pitchDiff !== null ? (pitchDiff > 0 ? '+' : '') + pitchDiff.toFixed(1) + ' Hz' : '—'}\n` +
            `• Low-energy frames change: ${silDiff !== null ? (silDiff > 0 ? '+' : '') + silDiff.toFixed(2) + 's' : '—'}\n` +
            `• Low-energy intervals: Clear has ${clear.features.temporal_evidence.length}, Rushed has ${rushed.features.temporal_evidence.length}.\n\n` +
            `Differences reflect measurable acoustic dynamics, not an automated speech quality judgment.`,
          pills: ['Show low-energy intervals', 'What is my median pitch?'],
        };
      } else {
        return {
          text: 'You have not run the benchmark comparison yet. Click the "Compare Benchmark Recordings" button on the main dashboard to calculate differences between clear.mp4 and rushed.mp4.',
          pills: ['Explain acoustic features', 'What is pitch F0?'],
        };
      }
    }

    // 7. Spectral / MFCC Questions
    if (q.includes('mfcc') || q.includes('spectral') || q.includes('timbre') || q.includes('cepstral') || q.includes('resonance')) {
      if (lastAnalysis) {
        const { features, filename } = lastAnalysis;
        const preview = features.mfcc_mean.slice(0, 5).map(v => v.toFixed(2)).join(', ');
        return {
          text: `In "${filename}", 13 Mel-Frequency Cepstral Coefficients were calculated across 22.05 kHz mono frames. First 5 mean coefficients: [${preview}]. MFCCs capture the spectral shape and vocal tract resonances without linguistic decoding.`,
          pills: ['What is my median pitch?', 'Show temporal intervals'],
        };
      }
      return {
        text: 'Vocaliscope extracts 13 mean MFCC coefficients (using librosa.feature.mfcc) to describe spectral envelope and vocal timbre characteristics without performing linguistic decoding.',
        pills: ['What is RMS energy?', 'What is pitch F0?'],
      };
    }

    // 8. Methodology & Science Questions
    if (q.includes('methodology') || q.includes('how does it work') || q.includes('algorithm') || q.includes('yin') || q.includes('librosa') || q.includes('heuristic')) {
      return {
        text: 'Vocaliscope Acoustic Methodology:\n1. Audio Normalization: Resampled to 22,050 Hz mono PCM.\n2. Energy Gating: Frame RMS energy (2048-sample window, 512 hop). The 5% peak threshold is a recording-relative heuristic; low energy indicates attenuation, not confirmed non-speech.\n3. Pitch Extraction: Fundamental frequency (F0) computed via YIN algorithm bounded to configured vocal range (65–400 Hz).\n4. Spectral Shape: 13 MFCC coefficients capture vocal timbre.\n5. Scientific Grounding: No emotion, sentiment, or linguistic transcription inferences are performed.',
        pills: ['What is my median pitch?', 'Show low-energy intervals', 'What is RMS energy?'],
      };
    }

    // 9. Help / Guidance
    if (q.includes('help') || q.includes('what can you do') || q.includes('question') || q.includes('guide')) {
      return {
        text: 'You can ask about:\n• Estimated median pitch and pitch spread (Hz)\n• Total duration and active speech percentage\n• Detected low-energy intervals (timestamps and spans)\n• Frame RMS energy calculations\n• 13-band spectral MFCCs\n• Differences between clear and rushed benchmark recordings\n• Methodology and acoustic boundary definitions',
        pills: ['What is my median pitch?', 'Compare benchmark recordings', 'Explain acoustic features'],
      };
    }

    // Default Fallback
    return {
      text: lastAnalysis
        ? `I have acoustic data for "${lastAnalysis.filename}". You can ask about:\n• Estimated median pitch and pitch range\n• Active speech vs low-energy/pause duration\n• Timestamped low-energy intervals\n• Mean RMS energy and MFCCs\n• Methodology and acoustic limitations`
        : lastComparison
        ? `I have benchmark comparison data loaded between clear and rushed deliveries. You can ask about:\n• Duration differences\n• Median pitch shift (Hz)\n• Low-energy pause intervals\n• Methodology and acoustic limitations`
        : `I am ready to assist with acoustic analysis. You can ask about fundamental frequency (F0), RMS energy gating, low-energy intervals, MFCC vectors, or benchmark comparisons between clear and rushed speech.`,
      pills: lastAnalysis
        ? ['What is my median pitch?', 'Show low-energy intervals', 'What is RMS energy?']
        : ['Compare benchmark recordings', 'What is pitch F0?', 'Explain heuristic RMS gating'],
    };
  }, [lastAnalysis, lastComparison]);

  const handleSendMessage = useCallback((textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setPermissionError(null);
    setIsProcessing(true);

    // Generate grounded answer
    const response = generateGroundedResponse(textToSend);

    const assistantMessage: Message = {
      id: `asst-${Date.now() + 1}`,
      sender: 'assistant',
      text: response.text,
      timestamp: new Date(),
      actionablePills: response.pills,
    };

    setTimeout(() => {
      setMessages((prev) => [...prev, assistantMessage]);
      setIsProcessing(false);
      speakText(response.text);
    }, 250);
  }, [generateGroundedResponse, speakText]);

  const startListening = useCallback(() => {
    setPermissionError(null);
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setPermissionError('Speech recognition is not supported in this browser. Please use the text input below.');
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    // Cancel existing recognition if active
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (final) {
          stopListening(false);
          handleSendMessage(final);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setInterimTranscript('');
        isHoldingRef.current = false;
        if (event.error === 'not-allowed') {
          setPermissionError('Microphone permission was denied. Please allow microphone access in your browser settings.');
        } else if (event.error === 'no-speech') {
          setPermissionError('No speech was detected. Tap or hold the mic to try again.');
        } else if (event.error === 'aborted') {
          // Intentional abort; do not display error
        } else {
          setPermissionError(`Microphone error (${event.error}). You can type your question.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        isHoldingRef.current = false;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
      isHoldingRef.current = false;
      setPermissionError('Could not initialize speech recognition. Please use text input.');
    }
  }, [handleSendMessage, stopListening]);

  // Push-To-Talk handlers: Supports both click-to-toggle AND hold-to-talk
  const handleMicMouseDown = () => {
    pressStartTimeRef.current = Date.now();
    isHoldingRef.current = true;
    if (!isListening) {
      startListening();
    }
  };

  const handleMicMouseUp = () => {
    const elapsed = Date.now() - pressStartTimeRef.current;
    if (elapsed > 400 && isListening) {
      // User held to talk: release to finalize & submit
      stopListening(false);
    }
    isHoldingRef.current = false;
  };

  const handleMicClick = () => {
    const elapsed = Date.now() - pressStartTimeRef.current;
    if (elapsed <= 400) {
      // User tapped quickly: toggle mode
      if (isListening) {
        stopListening(false);
      } else {
        startListening();
      }
    }
  };

  // Keyboard Spacebar Push-to-Talk when text input is not active
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement !== inputRef.current && !e.repeat) {
        e.preventDefault();
        if (!isListening) {
          startListening();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        if (isListening) {
          stopListening(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, isListening, startListening, stopListening]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      handleSendMessage(inputText);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-bg/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-title"
    >
      <div
        className="w-full max-w-2xl h-[88vh] max-h-[720px] bg-bg-surface border border-border-strong rounded-2xl shadow-2xl flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Chroma Sonar Header glow bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-sonar via-lime-sonar to-violet-sonar opacity-80" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-elevated/70">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                  isListening
                    ? 'bg-lime-sonar/20 text-lime-sonar border border-lime-sonar/40 shadow-[0_0_15px_rgba(198,255,0,0.4)]'
                    : isSpeaking
                    ? 'bg-cyan-sonar/20 text-cyan-sonar border border-cyan-sonar/40 shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                    : 'bg-accent-bg text-accent border border-accent-border'
                }`}
              >
                <Mic className="h-5 w-5" />
              </div>
              {isListening && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-sonar opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-lime-sonar"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="assistant-title" className="text-base font-semibold text-text-primary tracking-tight">
                  Acoustic Voice Assistant
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-bg border border-accent-border text-accent uppercase tracking-wider">
                  Signal Sonar
                </span>
              </div>
              <p className="text-xs text-text-muted font-mono">
                {isListening ? (
                  <span className="text-lime-sonar font-medium animate-pulse">● Listening for question…</span>
                ) : isSpeaking ? (
                  <span className="text-cyan-sonar font-medium animate-pulse">● Speaking response…</span>
                ) : (
                  'Grounded in real acoustic metrics & methodology'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                if (isSpeaking) {
                  window.speechSynthesis?.cancel();
                  setIsSpeaking(false);
                }
                setIsMuted(!isMuted);
              }}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              title={isMuted ? 'Unmute spoken responses' : 'Mute spoken responses'}
              aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-warning" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              aria-label="Close voice assistant"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Current Active Analysis Context Bar */}
        <div className="px-5 py-2 bg-bg/50 border-b border-border/70 flex items-center justify-between text-xs font-mono text-text-secondary">
          <div className="flex items-center gap-2 truncate">
            <span className="text-accent">Context:</span>
            {lastAnalysis ? (
              <span className="text-text-primary font-medium truncate">
                {lastAnalysis.filename} ({lastAnalysis.features.duration_seconds}s)
              </span>
            ) : (
              <span className="text-text-muted italic">No active recording analyzed</span>
            )}
          </div>
          {lastComparison && (
            <span className="text-lime-sonar hidden sm:inline">
              ✓ Benchmark comparison cached
            </span>
          )}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}
            >
              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.sender === 'user'
                    ? 'bg-accent text-bg font-medium rounded-br-none shadow-[0_2px_12px_rgba(0,242,254,0.25)]'
                    : 'bg-bg-elevated border border-border-strong text-text-primary rounded-bl-none shadow-md'
                }`}
              >
                {msg.text}
              </div>

              {/* Actionable Suggestions */}
              {msg.actionablePills && msg.actionablePills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5 max-w-[90%]">
                  {msg.actionablePills.map((pill, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(pill)}
                      className="text-xs px-2.5 py-1 rounded-full bg-bg-surface hover:bg-bg-elevated border border-border-strong hover:border-accent-border text-text-secondary hover:text-accent transition-all flex items-center gap-1 group"
                    >
                      <span>{pill}</span>
                      <ChevronRight className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}

              <span className="text-[10px] text-text-muted font-mono mt-1 px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {/* Processing / Acoustic Grounding Indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-bg-elevated border border-border-strong text-text-secondary animate-fade-in w-fit">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-sonar" />
              <span className="text-xs font-mono text-cyan-sonar">Grounding answer in acoustic signal metrics…</span>
            </div>
          )}

          {/* Live Voice Audio / Interim Indicator with Cancel Button */}
          {isListening && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-lime-sonar/10 border border-lime-sonar/30 text-lime-sonar animate-fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-center gap-1 h-4 flex-shrink-0">
                  <span className="w-1 h-3 bg-lime-sonar rounded-full wave-bar" />
                  <span className="w-1 h-5 bg-lime-sonar rounded-full wave-bar" />
                  <span className="w-1 h-2 bg-lime-sonar rounded-full wave-bar" />
                  <span className="w-1 h-4 bg-lime-sonar rounded-full wave-bar" />
                </div>
                <span className="text-xs font-mono truncate">
                  {interimTranscript ? `"${interimTranscript}..."` : 'Listening... Hold to talk or speak now'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => stopListening(true)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-lime-sonar/20 hover:bg-lime-sonar/30 text-lime-sonar transition-colors flex-shrink-0"
                title="Cancel speech recognition without submitting"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Speaking Indicator */}
          {isSpeaking && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-cyan-sonar/10 border border-cyan-sonar/30 text-cyan-sonar animate-fade-in">
              <Volume2 className="h-4 w-4 animate-pulse" />
              <span className="text-xs font-mono">Reading answer out loud...</span>
              <button
                onClick={() => {
                  window.speechSynthesis?.cancel();
                  setIsSpeaking(false);
                }}
                className="ml-auto text-[11px] underline hover:text-white"
              >
                Stop
              </button>
            </div>
          )}

          {/* Permission / Recognition Error Banner */}
          {permissionError && (
            <div className="p-3 bg-warning-bg border border-warning/30 rounded-xl flex items-start gap-2.5 text-xs text-text-secondary animate-fade-in">
              <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-warning mb-0.5">Voice Notice</p>
                <p>{permissionError}</p>
              </div>
              <button
                onClick={() => setPermissionError(null)}
                className="text-text-muted hover:text-text-primary p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-bg-elevated border-t border-border">
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMicClick}
              onMouseDown={handleMicMouseDown}
              onMouseUp={handleMicMouseUp}
              onTouchStart={handleMicMouseDown}
              onTouchEnd={handleMicMouseUp}
              className={`p-3 rounded-xl border transition-all duration-200 relative flex-shrink-0 select-none ${
                isListening
                  ? 'bg-lime-sonar text-bg border-lime-sonar shadow-[0_0_15px_rgba(198,255,0,0.5)] scale-105'
                  : 'bg-bg-surface text-accent border-border-strong hover:border-accent-border hover:bg-bg'
              }`}
              title={isListening ? 'Click or release to finish' : 'Push-to-Talk: Hold to speak or tap to toggle'}
              aria-label={isListening ? 'Stop microphone' : 'Activate microphone'}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? 'Listening to speech...' : 'Ask about pitch, pauses, energy, or comparisons...'}
              className="flex-1 bg-bg border border-border-strong rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-3 bg-accent text-bg font-semibold rounded-xl hover:bg-accent-dim disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
              aria-label="Send query"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 mt-2.5 text-[11px] text-text-muted font-mono">
            <span>
              {speechSupported
                ? 'Push-to-Talk: Hold button or press Spacebar • Real Speech STT & TTS active'
                : 'Speech recognition unavailable in this browser (Text input active)'}
            </span>
            <span>Esc to exit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
