# Vocaliscope Demonstration Dataset
**Track C: Contrastive Speech Analytics & Temporal Flaw Grounding**

This directory contains the reference demonstration audio-visual recordings, ground-truth transcripts, and flaw annotations used for contrastive acoustic analysis and temporal flaw grounding in Vocaliscope.

---

## Files

| File | Duration | Sample Rate | Description |
| :--- | :--- | :--- | :--- |
| `clear.mp4` | ~13.63s | 22,050 Hz mono (from 48 kHz AAC) | Benchmark recording exhibiting deliberate cadence, clause-aligned pauses, and steady projection. |
| `rushed.mp4` | ~13.48s | 22,050 Hz mono (from 48 kHz AAC) | Demonstration recording exhibiting rushed articulation bursts, mid-phrase hesitations, and uneven pacing. |
| `transcript.txt` | — | Text | Verified spoken word-for-word transcript with millisecond timestamps and clause boundaries for both recordings. |
| `labels.json` | — | JSON | Machine-readable ground-truth annotations containing temporal flaw intervals, acoustic baselines, and provenance. |

---

## Reference Script

Both recordings vocalize the exact same standardized target script (27 words):

> *"Good communication is important for success. When we speak clearly, people understand our ideas. We should control our pace, pause at the right moment, and speak with confidence."*

---

## Ground-Truth Flaw Annotations (`labels.json`)

`rushed.mp4` contains four grounded flaw events contrasted against `clear.mp4`:
1. **Mid-Clause Hesitation** (`02.78s - 03.05s`): Unplanned pause mid-predicate (*"Good communication is... [pause] important"*).
2. **Articulation Stumble** (`04.12s - 04.61s`): Acoustic hesitation before pronouncing *"success"*.
3. **Pacing Surge** (`05.85s - 08.61s`): Compressed syllable cluster of 16 words delivered at ~348 WPM with omitted clause breaks.
4. **Hesitation Pause** (`10.11s - 10.83s`): Extended 720ms silence gap mid-phrase before concluding the final sentence.

---

## API Usage

- **`POST /compare`**: Automatically loads `clear.mp4` and `rushed.mp4`, decodes audio streams to mono PCM WAV, computes acoustic features (F0, RMS energy, MFCCs), evaluates the deterministic 4-dimension rubric, and returns contrastive deltas.

---

## Provenance & Scientific Limitations

> **Acoustic Notice:**
> - These two recordings are demonstration examples, not a statistically generalized multi-speaker population dataset.
> - Acoustic features (RMS frame energy, YIN pitch tracking, MFCC cepstra) reflect physical sound characteristics and recording conditions. They do not evaluate linguistic semantics, accent, emotional authenticity, or rhetorical quality.
