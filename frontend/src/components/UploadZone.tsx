import React, { useCallback, useRef, useState, useEffect, DragEvent } from 'react';
import {
  FileAudio,
  Upload,
  AlertCircle,
  Loader2,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  X,
  Volume2,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { validateFile, SUPPORTED_FORMATS } from '../lib/api';
import { cn, formatDuration } from '../lib/utils';

interface UploadZoneProps {
  onAnalyze: (file: File) => Promise<void>;
  isAnalyzing: boolean;
  error: string | null;
  selectedFile: File | null;
  onClear: () => void;
}

export function UploadZone({
  onAnalyze,
  isAnalyzing,
  error,
  selectedFile,
  onClear,
}: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Clean up object URLs and audio streams on unmount
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropzoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragActive(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setRecordingError(validationError);
      return;
    }
    setRecordingError(null);
    await onAnalyze(file);
  }, [onAnalyze]);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleClick = () => {
    if (!isAnalyzing && !isRecording) {
      fileInputRef.current?.click();
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileSelect(file);
    }
    // Reset file input value so re-selecting same file triggers change
    if (e.target) e.target.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Microphone Recording Implementation
  const startRecording = async () => {
    setRecordingError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setRecordingError(
        'Microphone recording requires browser media support and a secure context (HTTPS or localhost).'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
        },
      });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      let chosenMime = '';
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          chosenMime = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          chosenMime = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          chosenMime = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          chosenMime = 'audio/ogg';
        }
      }

      const mediaRecorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime })
        : new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;

        if (audioChunksRef.current.length === 0) return;

        const effectiveMime = mediaRecorder.mimeType || chosenMime || 'audio/webm';
        const ext = effectiveMime.includes('mp4')
          ? '.mp4'
          : effectiveMime.includes('ogg')
          ? '.ogg'
          : effectiveMime.includes('wav')
          ? '.wav'
          : '.webm';

        const blob = new Blob(audioChunksRef.current, { type: effectiveMime });
        const recordedFile = new File([blob], `mic_recording_${Date.now()}${ext}`, {
          type: effectiveMime,
        });

        await handleFileSelect(recordedFile);
      };

      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordSeconds(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 119) {
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setRecordingError(
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please grant microphone access in browser settings.'
          : err.name === 'NotFoundError'
          ? 'No audio input hardware detected. Please connect a microphone.'
          : `Microphone access failed: ${err.message || 'unknown error'}`
      );
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore
        }
      }
      mediaRecorderRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordSeconds(0);
  };

  const togglePreviewPlay = () => {
    if (!audioPlayerRef.current || !selectedFile) return;
    if (previewPlaying) {
      audioPlayerRef.current.pause();
      setPreviewPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setPreviewPlaying(true);
    }
  };

  // 1. STATE: Selected File Waiting for Analysis
  if (selectedFile && !isAnalyzing) {
    const fileUrl = URL.createObjectURL(selectedFile);

    return (
      <Card className="w-full border-cyan-sonar/40 bg-bg-surface/90 shadow-[0_0_25px_rgba(0,242,254,0.08)]">
        <CardContent className="p-5 sm:p-7">
          <audio
            ref={audioPlayerRef}
            src={fileUrl}
            onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
            onEnded={() => setPreviewPlaying(false)}
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cyan-sonar/10 border border-cyan-sonar/30 flex items-center justify-center text-cyan-sonar">
                <FileAudio className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-text-primary text-base truncate max-w-sm sm:max-w-md">
                  {selectedFile.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-text-muted font-mono mt-0.5">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  {audioDuration !== null && !Number.isNaN(audioDuration) && (
                    <>
                      <span>•</span>
                      <span>~{formatDuration(audioDuration)} duration</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="text-cyan-sonar">Verified Format</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={togglePreviewPlay}
                className="flex-1 sm:flex-none text-xs font-mono"
                aria-label={previewPlaying ? 'Pause audio preview' : 'Play audio preview'}
              >
                {previewPlaying ? <Pause className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                <span>{previewPlaying ? 'Pause' : 'Listen'}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (audioPlayerRef.current) audioPlayerRef.current.pause();
                  setPreviewPlaying(false);
                  onClear();
                }}
                aria-label="Remove selected file"
                disabled={isAnalyzing}
                className="text-error hover:bg-error-bg hover:text-error text-xs font-mono"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                <span>Remove</span>
              </Button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-text-muted font-mono">
              Pipeline: 22.05 kHz resampling • YIN F0 (65–400 Hz) • RMS envelope • 13-dim MFCC
            </div>
            <Button
              onClick={() => onAnalyze(selectedFile)}
              disabled={isAnalyzing}
              className="w-full sm:w-auto bg-gradient-to-r from-cyan-sonar to-lime-sonar text-bg font-semibold shadow-[0_0_20px_rgba(0,242,254,0.25)] hover:opacity-95 text-xs font-mono py-2.5 px-5"
            >
              <Upload className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Run Acoustic Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 2. STATE: Analyzing in Progress
  if (isAnalyzing) {
    return (
      <Card className="w-full border-cyan-sonar/40 bg-bg-surface/90 shadow-[0_0_30px_rgba(0,242,254,0.1)]">
        <CardContent className="p-8 sm:p-12 text-center">
          <div className="relative mx-auto w-20 h-20 mb-6 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-cyan-sonar/40 animate-ping opacity-60" />
            <span className="absolute -inset-3 rounded-full border border-lime-sonar/30 animate-pulse" />
            <div className="w-16 h-16 rounded-full bg-cyan-sonar/10 border border-cyan-sonar flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-cyan-sonar animate-spin" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-text-primary tracking-tight mb-2">
            Acoustic Feature Extraction in Progress
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto mb-5 leading-relaxed font-mono">
            Resampling signal to 22.05 kHz mono • Computing short-time RMS energy frames • Tracking fundamental frequency via YIN (65–400 Hz) • Extracting Mel-frequency cepstral vectors
          </p>

          <div className="flex items-center justify-center gap-1.5 h-6">
            <span className="w-1.5 h-3 bg-cyan-sonar rounded-full animate-pulse" />
            <span className="w-1.5 h-6 bg-lime-sonar rounded-full animate-pulse delay-75" />
            <span className="w-1.5 h-4 bg-violet-sonar rounded-full animate-pulse delay-100" />
            <span className="w-1.5 h-7 bg-cyan-sonar rounded-full animate-pulse delay-150" />
            <span className="w-1.5 h-3 bg-lime-sonar rounded-full animate-pulse delay-200" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // 3. STATE: Active Microphone Recording
  if (isRecording) {
    const mins = Math.floor(recordSeconds / 60);
    const secs = recordSeconds % 60;
    const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    return (
      <Card className="w-full border-lime-sonar/50 bg-bg-surface/95 shadow-[0_0_25px_rgba(198,255,0,0.1)] animate-fade-in">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-lime-sonar/10 border border-lime-sonar/40">
                <span className="absolute inset-0 rounded-2xl border border-lime-sonar/50 animate-ping opacity-75" />
                <Mic className="h-7 w-7 text-lime-sonar" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-lime-sonar animate-pulse" />
                  <span className="text-xs uppercase font-mono tracking-wider text-lime-sonar font-semibold">
                    Recording Live Speech
                  </span>
                </div>
                <div className="text-3xl font-mono font-bold text-text-primary mt-1 tabular-nums">
                  {timeStr} <span className="text-xs text-text-muted font-normal">/ 2:00 max</span>
                </div>
                <p className="text-xs text-text-muted font-mono mt-0.5">
                  Microphone stream active • speak naturally at consistent distance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelRecording}
                className="flex-1 sm:flex-none text-xs font-mono text-text-muted hover:text-error hover:bg-error-bg"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={stopRecording}
                className="flex-1 sm:flex-none text-xs font-mono bg-lime-sonar text-bg hover:bg-lime-sonar/90 font-semibold shadow-[0_0_15px_rgba(198,255,0,0.3)]"
              >
                <Square className="h-3.5 w-3.5 fill-current mr-1.5" />
                Stop & Analyze
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 4. RESTING STATE: Upload Drag & Drop + Direct Microphone Entry
  return (
    <div className="w-full space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_FORMATS.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={isAnalyzing}
        aria-label="Select audio file for acoustic analysis"
      />

      {/* Main Drag-Drop Surface */}
      <div
        ref={dropzoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label="Drag and drop an audio file here or press Enter to browse files"
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden p-8 sm:p-12 text-center group select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-sonar focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          isDragActive
            ? 'border-cyan-sonar bg-cyan-sonar/10 shadow-[0_0_30px_rgba(0,242,254,0.18)]'
            : 'border-border-strong hover:border-cyan-sonar/50 hover:bg-bg-elevated/40'
        )}
      >
        <div className="relative z-10 flex flex-col items-center">
          <div
            className={cn(
              'mb-4 w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105',
              isDragActive
                ? 'bg-cyan-sonar/20 border border-cyan-sonar text-cyan-sonar'
                : 'bg-bg-surface border border-border text-cyan-sonar group-hover:border-cyan-sonar/40 shadow-sm'
            )}
          >
            <Upload className="h-7 w-7" aria-hidden="true" />
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight mb-1.5">
            {isDragActive ? 'Drop Audio File to Analyze' : 'Select Audio Recording for Inspection'}
          </h3>

          <p className="text-text-secondary text-xs sm:text-sm max-w-md mb-5 leading-relaxed">
            Drag and drop a speech recording here, or{' '}
            <span className="text-cyan-sonar font-medium underline underline-offset-4">browse local files</span>
          </p>

          {/* Formats & Boundaries Badge */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-bg-surface border border-border text-[11px] text-text-muted font-mono">
            <span>{SUPPORTED_FORMATS.map((f) => f.slice(1).toUpperCase()).join(' · ')}</span>
            <span className="text-border-strong">•</span>
            <span>Max 25 MB</span>
            <span className="text-border-strong">•</span>
            <span>Up to 120s recommended</span>
          </div>
        </div>
      </div>

      {/* Secondary Direct Input Card: Real Microphone Recording */}
      <div className="p-4 rounded-xl bg-bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bg-elevated border border-border flex items-center justify-center text-text-secondary">
            <Mic className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Direct Microphone Recording
            </p>
            <p className="text-xs text-text-muted font-mono mt-0.5">
              Capture audio through your browser microphone for immediate feature extraction
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={startRecording}
          className="text-xs font-mono hover:border-lime-sonar/40 hover:text-lime-sonar self-start sm:self-auto"
        >
          <Mic className="h-3.5 w-3.5 mr-1" />
          <span>Record Voice</span>
        </Button>
      </div>

      {/* Error Banners */}
      {(error || recordingError) && (
        <div
          className="p-4 rounded-xl bg-error-bg border border-error/30 flex items-start gap-3 animate-fade-in text-sm"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-semibold text-error text-xs uppercase tracking-wider font-mono">
              Input Validation / Recording Error
            </p>
            <p className="text-text-secondary text-xs sm:text-sm mt-0.5">{error || recordingError}</p>
          </div>
          <button
            onClick={() => setRecordingError(null)}
            className="text-text-muted hover:text-text-primary p-1 text-xs"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}