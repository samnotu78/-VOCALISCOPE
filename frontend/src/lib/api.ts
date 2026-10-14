export type TemporalEventType =
  | 'low_energy_interval'
  | 'hesitation_pause'
  | 'pitch_monotony_interval'
  | 'pacing_surge_interval';

export interface TemporalEvidenceEvent {
  event: TemporalEventType;
  start_seconds: number;
  end_seconds: number;
  measurement: {
    mean_frame_rms: number;
    recording_relative_threshold_rms: number;
    duration_seconds: number;
    pitch_std_hz?: number;
    mean_f0_hz?: number;
    energy_ratio_to_mean?: number;
  };
  interpretation: string;
  limitations: string;
}

export interface RubricDimension {
  name: string;
  score: number;
  band: 'Exemplary' | 'Proficient' | 'Developing' | 'Needs Attention';
  metrics: Record<string, number | null | undefined>;
  rationale: string;
  recommendations: string;
  limitations: string;
}

export interface RubricScorecard {
  overall_score: number;
  overall_band: 'Exemplary' | 'Proficient' | 'Developing' | 'Needs Attention';
  formula: string;
  weights: {
    cadence_pacing: number;
    pause_discipline: number;
    pitch_variation: number;
    energy_dynamics: number;
  };
  dimensions: {
    cadence_pacing: RubricDimension;
    pause_discipline: RubricDimension;
    pitch_variation: RubricDimension;
    energy_dynamics: RubricDimension;
  };
  summary: string;
  limitations: string;
}

export interface AnalysisFeatures {
  duration_seconds: number;
  estimated_active_seconds: number;
  estimated_silence_seconds: number;
  mean_rms_energy: number;
  estimated_pitch_median_hz: number | null;
  pitch_p10_hz: number | null;
  pitch_p90_hz: number | null;
  mfcc_mean: number[];
  sample_rate_hz: number;
  temporal_evidence: TemporalEvidenceEvent[];
  temporal_analysis_note: string;
  note: string;
  rubric?: RubricScorecard;
}

export interface AnalysisResponse {
  filename: string;
  features: AnalysisFeatures;
}

export interface ComparisonFeatures {
  filename: string;
  features: AnalysisFeatures;
}

export interface ComparisonDifferences {
  duration_seconds: number | null;
  estimated_active_seconds: number | null;
  estimated_silence_seconds: number | null;
  mean_rms_energy: number | null;
  estimated_pitch_median_hz: number | null;
  pitch_p10_hz: number | null;
  pitch_p90_hz: number | null;
}

export interface ComparisonResponse {
  comparison: string;
  clear: ComparisonFeatures;
  rushed: ComparisonFeatures;
  differences: ComparisonDifferences;
  rubric_differences?: Record<string, number>;
  interpretation_note: string;
}

export interface HealthResponse {
  status: string;
}

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      detail = errorData.detail || detail;
    } catch {
      // Use default detail
    }
    throw new Error(detail);
  }
  return response.json();
}

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`);
  return handleResponse(response);
}

export async function analyzeAudio(file: File): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(response);
}

export async function compareRecordings(): Promise<ComparisonResponse> {
  const response = await fetch(`${API_BASE}/compare`, {
    method: 'POST',
  });
  return handleResponse(response);
}

export const SUPPORTED_FORMATS = [
  '.wav', '.mp3', '.m4a', '.flac', '.ogg', '.webm', '.mp4'
];

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export function validateFile(file: File): string | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!SUPPORTED_FORMATS.includes(ext)) {
    return `Unsupported format. Supported: ${SUPPORTED_FORMATS.join(', ')}`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size: 25 MB`;
  }
  if (file.size === 0) {
    return 'File is empty';
  }
  return null;
}