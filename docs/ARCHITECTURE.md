# Vocaliscope System Architecture

## Track C: Contrastive Speech Analytics & Temporal Flaw Grounding

Vocaliscope is an evidence-based speech analysis and temporal flaw grounding engine designed to evaluate vocal cadence, pause patterns, pitch modulation, and energy dynamics with mathematical reproducibility.

```
+-------------------------------------------------------------------------------+
|                               Client / Frontend                               |
|                  (React 19 / TypeScript / Vite 8 on :5173)                   |
|     - RubricScorecardView (0-100 composite + 4 dimensions + actionable advice)|
|     - Interactive SVG Timeline with flaw interval markers & keyboard nav       |
|     - EventDetail Inspector for grounded millisecond measurements             |
|     - Real-Time Voice Assistant (Web Speech API + acoustic grounding)         |
+---------------------------------------+---------------------------------------+
                                        | HTTP REST
                                        v
+-------------------------------------------------------------------------------+
|                               FastAPI Backend                                 |
|                         (backend/main.py on :8000)                            |
+-----------------------+-------------------------------+-----------------------+
                        |                               |
                        v                               v
+-------------------------------+   +-------------------------------------------+
|      FFmpeg Transcoding       |   |            Feature Extraction             |
|   (imageio_ffmpeg subprocess) |   |           (backend/analyzer.py)           |
|  - 22.05 kHz, mono, 16-bit    |   |  - RMS Energy (2048-window, 512-hop)      |
|  - Extracts audio from video  |   |  - Fundamental Frequency (YIN 65-400 Hz)  |
|  - 120-second safety timeout  |   |  - 13 Mel-Frequency Cepstral Coefficients |
+-------------------------------+   |  - Temporal Flaw Grounding:               |
                                    |    * low_energy_interval                  |
                                    |    * hesitation_pause (>= 700ms)          |
                                    |    * pacing_surge_interval (> 2.2s burst) |
                                    |    * pitch_monotony_interval (std < 4 Hz) |
                                    +---------------------+---------------------+
                                                          |
                                                          v
                                    +-------------------------------------------+
                                    |      Deterministic Rubric Engine          |
                                    |           (backend/rubric.py)             |
                                    |  - Cadence & Pacing (30%)                 |
                                    |  - Pause Discipline (25%)                 |
                                    |  - Pitch Variation (25%)                  |
                                    |  - Energy Dynamics (20%)                  |
                                    |  - 0-100 Bounded Deterministic Composite  |
                                    +---------------------+---------------------+
                                                          ^
                                                          |
                                    +---------------------+---------------------+
                                    |        Ground-Truth Dataset               |
                                    |             (dataset/)                    |
                                    |  - clear.mp4 & rushed.mp4                 |
                                    |  - transcript.txt (timestamped script)    |
                                    |  - labels.json (ground-truth flaws)       |
                                    +-------------------------------------------+
```

## Acoustic Processing Pipeline

1. **Ingestion & Validation**:
   - File uploads received at `/analyze` or referenced from `dataset/`.
   - Max file size: 25 MB. Supported formats include `.wav`, `.mp3`, `.m4a`, `.flac`, `.ogg`, `.webm`, `.mp4`.

2. **Transcoding & Normalization**:
   - Standardized via `imageio-ffmpeg` to 22,050 Hz, 16-bit PCM, single-channel (mono) WAV.
   - 120-second safety timeout guard.

3. **Feature Extraction & Temporal Flaw Grounding (`backend/analyzer.py`)**:
   - **Duration**: Total recording length in seconds.
   - **Active vs. Silence Duration**:
     - Short-time frame RMS energy (`rms > max(peak * 0.05, 1e-6)`).
   - **Temporal Flaw Grounding**:
     - `low_energy_interval`: Inter-phrase attenuation below recording threshold.
     - `hesitation_pause`: Mid-utterance silence gaps ≥ 700ms.
     - `pacing_surge_interval`: Prolonged active bursts (> 2.2s, > 1.3× mean RMS).
     - `pitch_monotony_interval`: Sustained voiced segments with standard deviation < 4.0 Hz.
   - **Pitch / Fundamental Frequency (F0)**:
     - Extracted via the YIN algorithm (`librosa.yin`) bounded to human speech range (65 Hz to 400 Hz).
     - Median, 10th percentile (P10), and 90th percentile (P90) pitch computed.
   - **Spectral Characterization**:
     - 13-coefficient Mel-frequency cepstral coefficients (MFCCs) mean vector.

4. **Deterministic Rubric Scoring (`backend/rubric.py`)**:
   - Computes reproducible 0–100 scores across 4 dimensions:
     - Cadence & Pacing (30% weight)
     - Pause Discipline (25% weight)
     - Pitch Variation (25% weight)
     - Energy Dynamics (20% weight)
   - Continuous mathematical penalty formulas; strictly reproducible (identical audio yields bit-for-bit identical scores).

5. **Contrastive Comparison (`/compare`)**:
   - Computes delta metrics and rubric score differences between baseline presentation (`clear.mp4`) and perturbed presentation (`rushed.mp4`).
