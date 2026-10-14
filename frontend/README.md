# Vocaliscope Frontend

Modern, evidence-based speech acoustic analysis workstation built with React 18, TypeScript, Vite, and Tailwind CSS v4.

Designed under the **SIGNAL NOIR × CHROMA SONAR** aesthetic: deep charcoal surfaces, electric cyan and acid lime acoustic indicators, precise tabular metrics, and interactive temporal evidence timelines.

---

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Vocaliscope Backend**: Running on `http://127.0.0.1:8000`

---

## Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
The frontend automatically references `VITE_API_BASE` from `.env`. By default, it connects to:
```bash
VITE_API_BASE=http://127.0.0.1:8000
```

### 3. Start Development Server
```bash
npm run dev
```
The application will be live at `http://127.0.0.1:5173`.

### 4. Build for Production
```bash
npm run build
```
Executes TypeScript typechecking (`tsc`) and Vite production bundle generation into `dist/`.

---

## Architectural Principles & Scientific Grounding

1. **Physical Feature Extraction**:
   - Computes RMS frame energy across 2048-sample windows.
   - Measures fundamental frequency (F0) using the YIN algorithm constrained to configured human vocal bounds (65–400 Hz).
   - Extracts 13-dimensional Mel-Frequency Cepstral Coefficients (MFCCs) representing spectral envelope shape.
2. **Heuristic Acoustic Gating**:
   - The 5% peak RMS threshold is an empirical heuristic for identifying acoustic energy drops. It is never misrepresented as confirmed linguistic silence or non-speech.
3. **No Speculative Emotion or Transcription Inferences**:
   - Features represent physical acoustic properties of the recording without asserting speaker emotion, intent, vocal health diagnosis, or automated transcription.
