# Vocaliscope — Official Devpost Submission Kit
**Multimodal AI Hackathon 2026 — Track C: Contrastive Speech Analytics & Temporal Flaw Grounding**

---

## 1. Devpost Project Header Fields

- **Project Title**:  
  `Vocaliscope: Contrastive Speech Analytics & Temporal Flaw Grounding`

- **Tagline (under 200 characters)**:  
  `Evidence-based speech analytics workstation that grounds delivery flaws to exact timestamps with a deterministic 4-dimension rubric and real-time voice assistant.`

- **Track Selection**:  
  `Track C: Contrastive Speech Analytics & Temporal Flaw Grounding`

- **Built With (Tags)**:  
  `python, fastapi, librosa, numpy, scipy, react, typescript, vite, tailwindcss, web-speech-api, ffmpeg`

- **GitHub Repository**:  
  `https://github.com/samnotu78/vocaliscope` *(or user's target repository)*

- **Demo Video URL**:  
  `[Paste your 3–10 min YouTube Unlisted Link here]`

- **Artifacts Attached / Links**:  
  - Technical Report (6-page PDF): `docs/Vocaliscope_Track_C_Technical_Report.pdf`
  - Clean Source Archive: `vocaliscope_submission.zip` (0.88 MB)

---

## 2. Devpost Long-Form Project Description

*(Copy-paste this directly into the Devpost "About the Project" editor)*

### Inspiration
Public speaking and high-stakes presentations often suffer from subconscious delivery flaws: unmetered pacing surges, abrupt mid-clause hesitations, and monotone inflections. Existing AI coaching tools provide vague, ungrounded judgments (e.g. "Pacing: 7/10") or hallucinate subjective emotional states without pointing to physical acoustic evidence. We built **Vocaliscope** to replace black-box speculation with verifiable physical signal processing and millisecond-precision temporal flaw grounding.

### What it does
Vocaliscope is an evidence-based speech analysis workstation and API built specifically for Track C:
1. **Deterministic 4-Dimension Rubric Scoring**: Evaluates speech delivery across Cadence & Pacing (30%), Pause Discipline (25%), Pitch Variation (25%), and Energy Dynamics (20%), yielding a mathematically bounded, 100% reproducible 0–100 score. Processing the same audio file $N$ times produces bit-for-bit identical results.
2. **Temporal Flaw Grounding**: Isolates exact start/end timestamps and physical measurement deltas for four distinct acoustic flaw classes:
   - `hesitation_pause`: Mid-utterance disfluent silences $\ge 700\text{ ms}$.
   - `pacing_surge_interval`: Prolonged rapid vocal bursts delivered without pause buffering ($> 2.2\text{ s}$ at $> 1.3\times$ mean RMS).
   - `pitch_monotony_interval`: Voiced inflection flatlines ($\sigma(F_0) < 4.0\text{ Hz}$ for $\ge 0.9\text{ s}$).
   - `low_energy_interval`: Quantified inter-phrase attenuation below recording-relative threshold.
3. **Contrastive Benchmark Spectrum**: Evaluates a calibrated demonstration pair (`clear.mp4` vs `rushed.mp4`) vocalizing the identical 27-word reference target script, supported by human ground-truth flaw annotations (`dataset/labels.json`) and timestamped word transcripts (`dataset/transcript.txt`).
4. **Interactive Evidence Workstation**: Built in Signal Noir × Chroma Sonar design with interactive SVG timeline tracks, zoomable pitch contours, clickable flaw inspection modals, and a hands-free **Real-Time Voice Assistant** that answers queries strictly from measured acoustic data.

### How we built it
- **Signal Normalization**: Audio streams extracted via `imageio-ffmpeg` and standardized to 22,050 Hz 16-bit mono PCM.
- **Acoustic Engine**: Short-time frame RMS energy envelopes ($N=2048, H=512$), bounded fundamental frequency ($F_0$) tracking via YIN ($65–400\text{ Hz}$), and 13-coefficient MFCC spectral timbre vectors.
- **Backend Service**: High-performance FastAPI ASGI microservice with sub-second analysis pipelines, strict payload validation, and CORS security.
- **Frontend Workstation**: React 19, TypeScript, and Vite 8, featuring responsive SVG charts, accessible modal inspectors, and Web Speech API speech recognition and synthesis.
- **Rigorous Testing**: 22 automated unit tests covering signal extraction, mathematical rubric determinism, boundary conditions (zero duration, missing pitch, extreme energy), and contrastive deltas.

### Scientific Honesty & Limitations
- **No Subjective Overclaiming**: Vocaliscope measures physical acoustic signals (amplitude, frequency, spectral cepstra). It intentionally does not attempt to evaluate rhetorical persuasion, emotional truth, accent suitability, or grammatical correctness.
- **Acoustic Framing**: In the absence of heavy ASR forced alignment models, temporal grounding operates on short-time acoustic energy frames and YIN pitch cycles.
- **Demonstration Scope**: The demonstration dataset ($N=2$ recordings, single male speaker) is designed as a controlled contrastive test harness, not a generalized multi-speaker population standard.

### Accomplishments that we're proud of
- Achieving 100% mathematical determinism across all rubric scoring dimensions.
- Zero-dependency compilation of an academic-grade 6-page technical report (`docs/Vocaliscope_Track_C_Technical_Report.pdf`).
- Full end-to-end integration: from raw audio upload and recording to interactive timeline flaw inspection and voice assistant queries.
- 22/22 unit tests passing in 2.6 seconds and sub-600ms frontend production builds.

---

## 3. Demo Video 3-Minute Walkthrough Script

*(Record this in 1 take to meet the 3–10 min YouTube video requirement)*

- **[0:00 – 0:45] Introduction & Track C Problem Statement**:
  - Introduce Vocaliscope for Multimodal AI Hackathon 2026, Track C.
  - State the problem: why subjective LLM coaching fails and why deterministic temporal flaw grounding is necessary.
- **[0:45 – 1:30] Contrastive Benchmark Demo (`clear` vs `rushed`)**:
  - Open the dashboard at `http://127.0.0.1:5173`.
  - Click "Compare Benchmark Recordings".
  - Show the side-by-side contrast between `clear.mp4` and `rushed.mp4`.
  - Highlight the Rubric Scorecard: Clear ($89.5$) vs Rushed ($88.7$).
  - Point out the Cadence Delta ($-6.4\text{ pts}$) and Pause Discipline Delta ($-2.5\text{ pts}$).
- **[1:30 – 2:30] Temporal Flaw Grounding & Timeline**:
  - Show the ground-truth flaw table from `dataset/labels.json`.
  - Switch to the Temporal Comparison tab and Single Recording view.
  - Click on the amber Hesitation Pause interval at $10.11\text{ s} - 10.83\text{ s}$ ($720\text{ ms}$).
  - Open the inspection modal showing the exact millisecond duration, mean frame RMS, threshold ratio, and causal explanation.
- **[2:30 – 3:15] Voice Assistant & Architecture**:
  - Demonstrate the voice assistant: ask *"What is my rubric score?"* or *"What is my median pitch?"*.
  - Show that the assistant answers strictly with computed acoustic facts.
  - Show the terminal running the 22/22 passing unit tests.
- **[3:15 – 3:45] Conclusion & Scientific Limitations**:
  - Conclude with the explicit disclosures (acoustic proxy, non-subjective, deterministic).
