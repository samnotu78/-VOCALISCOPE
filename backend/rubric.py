"""Deterministic Rubric Scoring Module for Acoustic Speech Analytics.

Provides mathematically bounded, reproducible 0-100 rubric evaluations across
four measurable acoustic dimensions:
1. Cadence & Pacing (articulation stability, active speech ratio)
2. Pause Pattern & Discipline (pause distribution, hesitation penalties)
3. Pitch Variation & Expressiveness (F0 dynamic range, semitone spread)
4. Energy Dynamics & Projection (RMS level, dynamic stability)

Includes an overall composite score with documented formula, transparent
rationales, actionable recommendations, and explicit scientific limitations.
Scores are strictly deterministic: identical acoustic measurements produce
identical scores.
"""

from __future__ import annotations

import math
from typing import Any


def _get_band(score: float) -> str:
    """Classify a 0-100 score into a standardized performance band."""
    if score >= 85.0:
        return "Exemplary"
    if score >= 70.0:
        return "Proficient"
    if score >= 55.0:
        return "Developing"
    return "Needs Attention"


def score_cadence_pacing(
    duration_s: float,
    active_s: float,
) -> dict[str, Any]:
    """Evaluate speech cadence and pacing based on active speech ratio.

    Communicative presentations typically exhibit an active speech ratio of
    0.72 - 0.82 (leaving 18% - 28% for clause breathing and cognitive pauses).
    Active ratio > 0.88 indicates hurried or breathless delivery.
    Active ratio < 0.65 indicates fragmented or sparse delivery.
    """
    if duration_s <= 0.0:
        return {
            "name": "Cadence & Pacing",
            "score": 0.0,
            "band": "Needs Attention",
            "metrics": {
                "duration_seconds": 0.0,
                "active_seconds": 0.0,
                "active_ratio": 0.0,
                "target_active_ratio": 0.77,
            },
            "rationale": "Audio duration was zero or invalid.",
            "recommendations": "Record or upload an audio file containing speech.",
            "limitations": "Cadence is derived from recording-relative energy activity without word tokenization.",
        }

    active_ratio = min(1.0, max(0.0, active_s / duration_s))
    target_ratio = 0.77

    # Continuous penalty based on absolute deviation from target ratio
    deviation = abs(active_ratio - target_ratio)
    raw_score = 100.0 - (deviation * 135.0)
    score = round(max(15.0, min(100.0, raw_score)), 1)
    band = _get_band(score)

    if active_ratio > 0.85:
        rationale = (
            f"Active speech ratio is {active_ratio:.1%}, which is above the optimal "
            f"range (72%–82%). Speech flow has minimal pause buffering, indicating rushed pacing."
        )
        recommendations = (
            "Deliberately introduce brief 300–500ms pauses between major clauses and sentence endings "
            "to give listeners time to absorb key points."
        )
    elif active_ratio < 0.65:
        rationale = (
            f"Active speech ratio is {active_ratio:.1%}, below the optimal range (72%–82%). "
            f"Delivery contains extended inactivity or fragmented gaps."
        )
        recommendations = (
            "Aim for a steadier speaking rhythm with continuous phrase execution between planned pauses."
        )
    else:
        rationale = (
            f"Active speech ratio is {active_ratio:.1%}, aligning well with natural communicative "
            f"cadence (target: ~77% active, 23% natural pause time)."
        )
        recommendations = "Maintain this balanced temporal pacing across longer speaking segments."

    return {
        "name": "Cadence & Pacing",
        "score": score,
        "band": band,
        "metrics": {
            "duration_seconds": round(duration_s, 2),
            "active_seconds": round(active_s, 2),
            "active_ratio": round(active_ratio, 3),
            "target_active_ratio": target_ratio,
        },
        "rationale": rationale,
        "recommendations": recommendations,
        "limitations": "Pacing evaluates short-time energy frames and does not compute words-per-minute or phoneme rates.",
    }


def score_pause_discipline(
    duration_s: float,
    silence_s: float,
    evidence_events: list[dict[str, Any]],
) -> dict[str, Any]:
    """Evaluate pause discipline, frequency, and hesitation breaks.

    Optimal pause structure distributes natural breath and clause breaks (0.2s - 0.6s)
    without extended hesitations (>= 0.75s) or excessive fragmentation.
    """
    if duration_s <= 0.0:
        return {
            "name": "Pause Pattern & Discipline",
            "score": 0.0,
            "band": "Needs Attention",
            "metrics": {
                "pause_count": 0,
                "hesitation_count": 0,
                "silence_ratio": 0.0,
            },
            "rationale": "Audio duration was zero.",
            "recommendations": "Provide a valid speech recording.",
            "limitations": "Pauses are defined by energy drops below the recording-relative threshold.",
        }

    silence_ratio = min(1.0, max(0.0, silence_s / duration_s))
    
    # Count low-energy pauses and identify hesitation gaps (>= 0.75s)
    pause_durations = [
        event.get("measurement", {}).get("duration_seconds", 0.0)
        for event in evidence_events
        if "duration_seconds" in event.get("measurement", {})
    ]
    pause_count = len(pause_durations)
    hesitation_count = sum(1 for d in pause_durations if d >= 0.75)

    base = 94.0
    # Penalty for silence ratio outside 0.18 - 0.28
    ratio_error = max(0.0, abs(silence_ratio - 0.23) - 0.05)
    ratio_penalty = ratio_error * 110.0

    # Penalty for hesitation pauses (>= 0.75s)
    hesitation_penalty = hesitation_count * 6.5

    # Penalty for excessive fragmentation (> 7 pauses per 10 seconds)
    rate_per_10s = (pause_count / max(1.0, duration_s)) * 10.0
    fragmentation_penalty = max(0.0, rate_per_10s - 7.0) * 4.0

    raw_score = base - ratio_penalty - hesitation_penalty - fragmentation_penalty
    score = round(max(15.0, min(100.0, raw_score)), 1)
    band = _get_band(score)

    if hesitation_count > 0:
        rationale = (
            f"Detected {pause_count} low-energy intervals, including {hesitation_count} "
            f"hesitation pause(s) exceeding 750ms. Total silence ratio is {silence_ratio:.1%}."
        )
        recommendations = (
            "Replace unintended hesitation silences with deliberate, measured clause transitions. "
            "Rehearse transitions to minimize mid-phrase pausing."
        )
    elif pause_count == 0:
        rationale = "No low-energy pauses detected; speech was delivered continuously without pauses."
        recommendations = "Incorporate intentional pauses at punctuation boundaries to avoid listener fatigue."
    else:
        rationale = (
            f"Recorded {pause_count} well-proportioned pauses totaling {silence_ratio:.1%} "
            f"of recording time with zero prolonged hesitation gaps."
        )
        recommendations = "Continue using purposeful pauses to punctuate key ideas and structural transitions."

    return {
        "name": "Pause Pattern & Discipline",
        "score": score,
        "band": band,
        "metrics": {
            "pause_count": pause_count,
            "hesitation_count": hesitation_count,
            "silence_seconds": round(silence_s, 2),
            "silence_ratio": round(silence_ratio, 3),
        },
        "rationale": rationale,
        "recommendations": recommendations,
        "limitations": "Pauses are defined by acoustic energy dropping below relative threshold, not syntactic parse trees.",
    }


def score_pitch_variation(
    median_f0: float | None,
    p10_hz: float | None,
    p90_hz: float | None,
) -> dict[str, Any]:
    """Evaluate fundamental frequency (F0) dynamic range and inflection.

    Expressive human speech typically exhibits 6 to 16 semitones of dynamic range
    between the 10th and 90th percentiles. Monotone delivery (< 4 semitones)
    reduces engagement, while extreme variance (> 22 semitones) often indicates
    uncontrolled pitch jumps or vocal fry tracking artifacts.
    """
    if (
        median_f0 is None
        or p10_hz is None
        or p90_hz is None
        or p10_hz <= 0.0
        or p90_hz <= p10_hz
    ):
        return {
            "name": "Pitch Variation & Expressiveness",
            "score": 25.0,
            "band": "Needs Attention",
            "metrics": {
                "median_f0_hz": median_f0,
                "p10_hz": p10_hz,
                "p90_hz": p90_hz,
                "semitone_range": 0.0,
            },
            "rationale": "Insufficient voiced fundamental frequency detected in the 65–400 Hz range.",
            "recommendations": "Ensure voice is clearly voiced into the microphone without whispering or heavy background noise.",
            "limitations": "Pitch tracking uses librosa.yin across a 65–400 Hz search interval.",
        }

    semitone_range = 12.0 * math.log2(p90_hz / p10_hz)
    hz_range = p90_hz - p10_hz

    if semitone_range < 5.0:
        # Constrained / monotone delivery
        raw_score = 45.0 + (semitone_range / 5.0) * 35.0
        rationale = (
            f"Pitch dynamic range is {semitone_range:.1f} semitones ({hz_range:.1f} Hz spread). "
            f"Inflection is relatively flat (monotone tendency below 5 semitones)."
        )
        recommendations = (
            "Vary pitch dynamically on emphasized keywords and apply rising or falling inflections "
            "at question marks and clause boundaries."
        )
    elif semitone_range <= 16.0:
        # Natural expressive band
        raw_score = 85.0 + min(15.0, (semitone_range - 5.0) * 1.36)
        rationale = (
            f"Pitch dynamic range is {semitone_range:.1f} semitones ({hz_range:.1f} Hz spread) "
            f"around a median F0 of {median_f0:.1f} Hz. This indicates healthy, engaging vocal modulation."
        )
        recommendations = "Sustain this expressive pitch range to maintain listener interest."
    else:
        # Wide dynamic range or octave jumping / vocal fry artifacts
        raw_score = max(50.0, 100.0 - (semitone_range - 16.0) * 3.5)
        rationale = (
            f"Pitch dynamic range is {semitone_range:.1f} semitones ({hz_range:.1f} Hz spread). "
            f"High pitch dispersion may reflect dramatic inflection or vocal fry octave jumps."
        )
        recommendations = (
            "Ensure pitch shifts are controlled and intentional, avoiding abrupt register jumps."
        )

    score = round(max(15.0, min(100.0, raw_score)), 1)
    band = _get_band(score)

    return {
        "name": "Pitch Variation & Expressiveness",
        "score": score,
        "band": band,
        "metrics": {
            "median_f0_hz": round(median_f0, 1),
            "p10_hz": round(p10_hz, 1),
            "p90_hz": round(p90_hz, 1),
            "semitone_range": round(semitone_range, 2),
            "hz_range": round(hz_range, 1),
        },
        "rationale": rationale,
        "recommendations": recommendations,
        "limitations": "F0 is estimated with YIN between 65–400 Hz and may include octave-halving in low vocal fry.",
    }


def score_energy_dynamics(
    mean_rms: float,
) -> dict[str, Any]:
    """Evaluate overall acoustic energy level and projection stability.

    Healthy speech recordings show calibrated mean RMS in the range 0.04 to 0.15.
    Very low energy (< 0.01) indicates poor microphone gain or mumbling, while
    very high energy (> 0.30) risks digital clipping and acoustic distortion.
    """
    if mean_rms <= 0.003:
        return {
            "name": "Energy Dynamics & Stability",
            "score": 20.0,
            "band": "Needs Attention",
            "metrics": {
                "mean_rms_energy": round(mean_rms, 6),
            },
            "rationale": f"Mean RMS energy is very low ({mean_rms:.5f}); audio signal is faint or inaudible.",
            "recommendations": "Speak closer to the microphone or increase input gain to ensure clear vocal projection.",
            "limitations": "Energy reflects recording gain, room acoustics, and vocal projection simultaneously.",
        }

    if mean_rms >= 0.35:
        return {
            "name": "Energy Dynamics & Stability",
            "score": 45.0,
            "band": "Needs Attention",
            "metrics": {
                "mean_rms_energy": round(mean_rms, 6),
            },
            "rationale": f"Mean RMS energy is very high ({mean_rms:.5f}); signal is near digital clipping limit.",
            "recommendations": "Step slightly back from the microphone or lower input gain to prevent harsh clipping.",
            "limitations": "Energy level depends on capture distance and hardware preamp settings.",
        }

    # Communicative sweet spot around 0.055 - 0.090
    log_offset = abs(math.log10(mean_rms / 0.065))
    raw_score = 94.0 - (log_offset * 32.0)
    score = round(max(25.0, min(100.0, raw_score)), 1)
    band = _get_band(score)

    if log_offset < 0.25:
        rationale = (
            f"Mean frame RMS energy ({mean_rms:.4f}) is well calibrated for clear vocal projection "
            f"without digital saturation."
        )
        recommendations = "Maintain consistent vocal support and microphone distance."
    elif mean_rms < 0.065:
        rationale = (
            f"Mean frame RMS energy ({mean_rms:.4f}) is on the softer side. Vocal clarity could "
            f"benefit from stronger abdominal projection."
        )
        recommendations = "Project voice with steady breath support to ensure every consonant is audible."
    else:
        rationale = (
            f"Mean frame RMS energy ({mean_rms:.4f}) indicates assertive projection. Ensure loud "
            f"passages do not introduce microphone distortion."
        )
        recommendations = "Keep energy dynamic rather than uniformly loud across all sentences."

    return {
        "name": "Energy Dynamics & Stability",
        "score": score,
        "band": band,
        "metrics": {
            "mean_rms_energy": round(mean_rms, 5),
        },
        "rationale": rationale,
        "recommendations": recommendations,
        "limitations": "Root mean square energy measures physical amplitude, not vocal timbre or phonetic precision.",
    }


def calculate_rubric(features: dict[str, Any]) -> dict[str, Any]:
    """Compute complete deterministic rubric scorecard from extracted acoustic features.

    Weights:
    - Cadence & Pacing: 30%
    - Pause Pattern & Discipline: 25%
    - Pitch Variation & Expressiveness: 25%
    - Energy Dynamics & Stability: 20%
    """
    duration = float(features.get("duration_seconds", 0.0))
    active_s = float(features.get("estimated_active_seconds", 0.0))
    silence_s = float(features.get("estimated_silence_seconds", 0.0))
    mean_rms = float(features.get("mean_rms_energy", 0.0))
    median_f0 = features.get("estimated_pitch_median_hz")
    p10_hz = features.get("pitch_p10_hz")
    p90_hz = features.get("pitch_p90_hz")
    evidence = features.get("temporal_evidence", [])

    cadence = score_cadence_pacing(duration, active_s)
    pause = score_pause_discipline(duration, silence_s, evidence)
    pitch = score_pitch_variation(median_f0, p10_hz, p90_hz)
    energy = score_energy_dynamics(mean_rms)

    limitations = (
        "Rubric scores are deterministic mathematical transformations of objective acoustic signals "
        "(short-time frame RMS, YIN fundamental frequency, and temporal energy gating). They do NOT "
        "measure language proficiency, rhetorical persuasion, emotional truth, or accent suitability. "
        "Scores must be interpreted strictly as acoustic delivery proxies."
    )

    if duration <= 0.0:
        return {
            "overall_score": 0.0,
            "overall_band": "Needs Attention",
            "formula": "0.30 * Cadence + 0.25 * Pause + 0.25 * Pitch + 0.20 * Energy",
            "weights": {
                "cadence_pacing": 0.30,
                "pause_discipline": 0.25,
                "pitch_variation": 0.25,
                "energy_dynamics": 0.20,
            },
            "dimensions": {
                "cadence_pacing": cadence,
                "pause_discipline": pause,
                "pitch_variation": pitch,
                "energy_dynamics": energy,
            },
            "summary": "Audio duration was zero or invalid.",
            "limitations": limitations,
        }

    # Weighted composite score
    composite = (
        0.30 * cadence["score"]
        + 0.25 * pause["score"]
        + 0.25 * pitch["score"]
        + 0.20 * energy["score"]
    )
    overall_score = round(max(0.0, min(100.0, composite)), 1)
    overall_band = _get_band(overall_score)

    summary = (
        f"Overall acoustic rubric score is {overall_score}/100 ({overall_band}). "
        f"Cadence scored {cadence['score']}/100, pause discipline {pause['score']}/100, "
        f"pitch expressiveness {pitch['score']}/100, and energy dynamics {energy['score']}/100."
    )

    return {
        "overall_score": overall_score,
        "overall_band": overall_band,
        "formula": "0.30 * Cadence + 0.25 * Pause + 0.25 * Pitch + 0.20 * Energy",
        "weights": {
            "cadence_pacing": 0.30,
            "pause_discipline": 0.25,
            "pitch_variation": 0.25,
            "energy_dynamics": 0.20,
        },
        "dimensions": {
            "cadence_pacing": cadence,
            "pause_discipline": pause,
            "pitch_variation": pitch,
            "energy_dynamics": energy,
        },
        "summary": summary,
        "limitations": limitations,
    }
