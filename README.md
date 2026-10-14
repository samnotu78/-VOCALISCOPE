# Vocaliscope

**Multimodal AI Hackathon 2026 — Track C: Contrastive Speech Analytics & Temporal Flaw Grounding**

Evidence-based contrastive speech analytics engine and acoustic temporal flaw grounding workstation.

Vocaliscope extracts mathematically bounded physical acoustic indicators—fundamental frequency (F0 contour), frame RMS energy, speech/pause intervals, and spectral cepstra (MFCCs)—to ground temporal speech flaws and evaluate delivery quality via a deterministic, reproducible 4-dimension rubric.

---

## Track C Alignment & Key Capabilities

1. **Deterministic Rubric Scoring Module (`backend/rubric.py`)**:
   - Strictly repeatable 0–100 composite score computed from physical signal metrics.
   - Four distinct dimensions:
     - **Cadence & Pacing (30%)**: Active speech ratio vs. calibrated communicative baseline (72%–82%).
     - **Pause Pattern & Discipline (25%)**: Distribution of pause intervals, penalizing hesitation pauses (≥ 750ms) and excessive fragmentation.
     - **Pitch Variation & Expressiveness (25%)**: F0 dynamic range in semitones (10th to 90th percentile spread) to prevent inflection flatlines (monotone) or erratic pitch octave jumps.
     - **Energy Dynamics & Stability (20%)**: Root Mean Square frame energy calibrated for vocal projection without clipping.
   - Formula: `0.30 * Cadence + 0.25 * Pause + 0.25 * Pitch + 0.20 * Energy`.
   - Explicit scientific limitation disclosures and actionable speaker recommendations returned for every dimension.

2. **Temporal Flaw Grounding (`backend/analyzer.py`)**:
   - Contrastive flaw detection with exact millisecond start/end timestamps, duration, and physical delta measurements:
     - `low_energy_interval`: Inter-phrase pause attenuation below recording-relative threshold.
     - `hesitation_pause`: Mid-utterance silence gaps exceeding 700ms indicating disfluency.
     - `pacing_surge_interval`: High-density vocal bursts (> 2.2s, > 1.3× mean RMS) indicating rushed phrasing.
     - `pitch_monotony_interval`: Sustained flat pitch (std < 3.5 Hz for ≥ 0.9s) indicating monotone delivery.
   - Interactive SVG Timeline with color-coded flaw intervals, keyboard navigation, and deep-dive measurement modal.

3. **Curated Demonstration Dataset & Ground Truth (`dataset/`)**:
   - `clear.mp4` (~13.63s): Calibrated reference recording exhibiting clause-aligned pauses.
   - `rushed.mp4` (~13.48s): Contrastive recording exhibiting mid-clause hesitations and rapid syllable surges.
   - `transcript.txt`: Word-for-word timestamped spoken transcript for both recordings.
   - `labels.json`: Machine-readable ground truth annotations defining flaw boundaries and causal explanations.

4. **Interactive Evidence Workstation & Real-Time Voice Assistant (`frontend/`)**:
   - Signal Noir × Chroma Sonar design identity built with React, TypeScript, and Vite.
   - Voice Assistant powered by Web Speech API for hands-free queries about acoustic metrics and rubric evaluations.

---

## Directory Structure

```
Vocaliscope/
├── backend/
│   ├── __init__.py
│   ├── analyzer.py          # Acoustic feature extraction and temporal flaw detector
│   ├── rubric.py            # Deterministic 4-dimension rubric scoring engine
│   └── main.py              # FastAPI endpoints (/, /health, /analyze, /compare)
├── dataset/
│   ├── README.md            # Dataset provenance and methodology reference
│   ├── clear.mp4            # Benchmark clear presentation recording
│   ├── rushed.mp4           # Benchmark rushed presentation recording
│   ├── transcript.txt       # Timestamped spoken transcripts
│   └── labels.json          # Ground-truth temporal flaw annotations
├── docs/
│   ├── API.md               # Complete REST API reference
│   └── ARCHITECTURE.md      # Signal processing pipeline and architecture
├── frontend/                # React / TypeScript / Vite workstation
│   ├── src/
│   │   ├── components/      # Workstation components (RubricScorecardView, Timeline, EventDetail, VoiceAssistant)
│   │   ├── lib/api.ts       # Typed API contracts and endpoints
│   └── README.md
├── tests/
│   ├── __init__.py
│   ├── test_analyzer.py     # Unit tests for acoustic extractor
│   ├── test_rubric.py       # Unit tests for deterministic rubric scoring
│   └── test_endpoints.py    # Tests for API endpoints and contrastive comparisons
├── scripts/                 # Convenience launcher scripts
├── requirements.txt         # Production runtime dependencies
└── README.md                # Project documentation
```

---

## Quickstart

### 1. Backend Service
```powershell
# Activate Python environment
.\.venv\Scripts\Activate.ps1

# Start FastAPI server on port 8000
.\.venv\Scripts\uvicorn.exe backend.main:app --host 127.0.0.1 --port 8000
```
- API Base: `http://127.0.0.1:8000`
- Interactive Swagger Documentation: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### 2. Frontend Workstation
```powershell
cd frontend
npm install
npm run dev
```
- Workstation URL: `http://127.0.0.1:5173`
- Production Build: `npm run build`

### 3. Automated Test Suite (22 Unit Tests)
```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

---

## API Endpoints Summary

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `GET /` | `GET` | Service status and readiness message |
| `GET /health` | `GET` | Health status probe (`{"status": "healthy"}`) |
| `POST /analyze` | `POST` | Upload audio/video (WAV, MP3, M4A, FLAC, OGG, WebM, MP4) for acoustic feature extraction, temporal flaw grounding, and rubric scoring |
| `POST /compare` | `POST` | Contrastive evaluation between `clear.mp4` and `rushed.mp4`, returning feature deltas, rubric differences, and flaw grounding |

---

## Scientific Limitations & AI Disclosure

1. **Acoustic Boundaries**: Vocaliscope processes physical audio signals (frame energy, fundamental frequency, MFCC cepstra). It intentionally does not assess rhetorical persuasion, emotional truth, accent suitability, or psychological sentiment.
2. **Reproducibility Guarantee**: All rubric scores are 100% deterministic mathematical transformations of objective measurements. Identical audio files consistently yield identical scores across runs.
3. **AI Disclosure**: Developed with pair-programming assistance within Antigravity for the Multimodal AI Hackathon 2026. All acoustic calculations, mathematical formulas, signal gating thresholds, and ground truth data have been empirically verified against the live codebase.
