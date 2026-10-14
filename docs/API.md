# Vocaliscope API Documentation

The Vocaliscope backend exposes a REST API powered by FastAPI for acoustic speech feature extraction and comparison.

## Base URL
```
http://127.0.0.1:8000
```

Interactive OpenAPI Documentation (Swagger UI):
- `http://127.0.0.1:8000/docs`

---

## Endpoints

### 1. Root Information
- **Method**: `GET`
- **Path**: `/`
- **Description**: Returns project metadata and operational status.
- **Response** (`200 OK`):
  ```json
  {
    "project": "Vocaliscope",
    "status": "running",
    "message": "Speech analysis API is ready."
  }
  ```

---

### 2. Health Check
- **Method**: `GET`
- **Path**: `/health`
- **Description**: Lightweight health probe for readiness/liveness monitoring.
- **Response** (`200 OK`):
  ```json
  {
    "status": "healthy"
  }
  ```

---

### 3. Speech Audio Analysis
- **Method**: `POST`
- **Path**: `/analyze`
- **Description**: Upload an audio or video file to extract quantitative acoustic speech features.
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `file`: Binary audio or video file (maximum size: 25 MB).
- **Supported Formats**: `.wav`, `.mp3`, `.m4a`, `.flac`, `.ogg`, `.webm`, `.mp4`
- **Response** (`200 OK`):
  ```json
  {
    "filename": "speech_sample.wav",
    "features": {
      "duration_seconds": 13.63,
      "estimated_active_seconds": 12.89,
      "estimated_silence_seconds": 0.74,
      "mean_rms_energy": 0.06673,
      "estimated_pitch_median_hz": 169.4,
      "pitch_p10_hz": 68.34,
      "pitch_p90_hz": 250.28,
      "mfcc_mean": [-241.7343, 97.8468, 17.9733, ...],
      "sample_rate_hz": 22050,
      "temporal_evidence": [
        {
          "event": "low_energy_interval",
          "start_seconds": 2.14,
          "end_seconds": 2.48,
          "measurement": {
            "mean_frame_rms": 0.00031,
            "recording_relative_threshold_rms": 0.002,
            "duration_seconds": 0.34
          },
          "interpretation": "Frame energy stayed below the recording-relative threshold; this may be a pause or quiet audio.",
          "limitations": "Energy alone cannot distinguish silence from quiet speech, and this event is not a word or speech-boundary alignment."
        }
      ],
      "rubric": {
        "overall_score": 89.5,
        "overall_band": "Exemplary",
        "formula": "0.30 * Cadence + 0.25 * Pause + 0.25 * Pitch + 0.20 * Energy",
        "weights": { "cadence_pacing": 0.3, "pause_discipline": 0.25, "pitch_variation": 0.25, "energy_dynamics": 0.2 },
        "dimensions": {
          "cadence_pacing": { "score": 98.6, "band": "Exemplary", "rationale": "...", "recommendations": "..." },
          "pause_discipline": { "score": 92.5, "band": "Exemplary", "rationale": "...", "recommendations": "..." },
          "pitch_variation": { "score": 75.0, "band": "Proficient", "rationale": "...", "recommendations": "..." },
          "energy_dynamics": { "score": 93.8, "band": "Exemplary", "rationale": "...", "recommendations": "..." }
        },
        "summary": "Overall acoustic rubric score is 89.5/100 (Exemplary).",
        "limitations": "Scores are deterministic mathematical mappings of acoustic physical features..."
      },
      "temporal_analysis_note": "Temporal evidence intervals are timestamped from short-time acoustic frames (RMS energy and fundamental frequency). No transcription or forced alignment is performed without a configured ASR model.",
      "note": "Pitch and activity are estimates. Silence detection is threshold-based; these metrics alone do not determine speech quality or rhetorical effectiveness."
    }
  }
```

`temporal_evidence` contains grounded physical intervals: `low_energy_interval`, `hesitation_pause`, `pacing_surge_interval`, and `pitch_monotony_interval`. Times refer to the decoded audio timeline.

- **Error Responses**:
  - `400 Bad Request`: Empty file uploaded.
  - `413 Payload Too Large`: Upload exceeds 25 MB limit.
  - `415 Unsupported Media Type`: Extension not in allowed list.
  - `422 Unprocessable Entity`: Audio decoding or acoustic extraction failed.

---

### 4. Benchmark Recording Comparison
- **Method**: `POST`
- **Path**: `/compare`
- **Description**: Computes and contrasts acoustic features across reference dataset recordings (`clear.mp4` vs `rushed.mp4`).
- **Response** (`200 OK`):
  ```json
  {
    "comparison": "rushed minus clear",
    "clear": {
      "filename": "clear.mp4",
      "features": { ... }
    },
    "rushed": {
      "filename": "rushed.mp4",
      "features": { ... }
    },
    "differences": {
      "duration_seconds": -0.15,
      "estimated_active_seconds": -0.75,
      "estimated_silence_seconds": 0.59,
      "mean_rms_energy": 0.0011,
      "estimated_pitch_median_hz": -3.37,
      "pitch_p10_hz": -1.31,
      "pitch_p90_hz": -29.53
    },
    "rubric_differences": {
      "overall_score": -0.8,
      "cadence_pacing": -6.4,
      "pause_discipline": -2.5,
      "pitch_variation": 6.5,
      "energy_dynamics": 0.3
    },
    "interpretation_note": "Differences are measured acoustic changes, not a speech-quality score. These two recordings are demonstration examples, not a scientifically validated dataset. Duration differences can also reflect pauses and delivery speed."
  }
  ```
