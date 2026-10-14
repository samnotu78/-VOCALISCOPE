"""Acoustic feature extraction with recording-relative temporal evidence."""

import numpy as np
import librosa

from backend.rubric import calculate_rubric


def _runs(mask: np.ndarray) -> list[tuple[int, int]]:
    """Return half-open index ranges for consecutive true values."""
    edges = np.diff(np.pad(mask.astype(np.int8), (1, 1)))
    starts = np.flatnonzero(edges == 1)
    ends = np.flatnonzero(edges == -1)
    return list(zip(starts.tolist(), ends.tolist()))


def analyze_audio(file_path: str) -> dict:
    """Extract measurable acoustic features, timestamped evidence events, and rubric scores."""
    try:
        y, sr = librosa.load(file_path, sr=22050, mono=True)
    except Exception as exc:
        raise ValueError("The audio file is empty or could not be decoded.") from exc
    if len(y) == 0:
        raise ValueError("The audio file is empty.")

    duration = len(y) / sr
    frame_length, hop_length = 2048, 512
    rms = librosa.feature.rms(
        y=y, frame_length=frame_length, hop_length=hop_length, center=True
    )[0]
    # This is a recording-relative energy gate, not a speech detector.
    threshold = max(float(np.max(rms)) * 0.05, 1e-6)
    active_mask = rms > threshold
    frame_times = librosa.frames_to_time(
        np.arange(len(rms)), sr=sr, hop_length=hop_length
    )
    frame_duration = hop_length / sr
    active_ranges = _runs(active_mask)
    activity_seconds = sum((end - start) * frame_duration for start, end in active_ranges)
    silence_seconds = max(0.0, duration - min(duration, activity_seconds))

    evidence = []
    # 1. Low-energy intervals & mid-utterance hesitation pauses
    for start, end in (_runs(~active_mask) if float(np.max(rms)) > 1e-6 else []):
        start_s = max(0.0, float(frame_times[start] - frame_duration / 2))
        end_s = min(duration, float(frame_times[min(end - 1, len(frame_times) - 1)] + frame_duration / 2))
        span = end_s - start_s
        if span < 0.15:
            continue

        is_mid_utterance = start_s > 0.5 and end_s < (duration - 0.5)
        is_hesitation = span >= 0.70 and is_mid_utterance

        event_name = "hesitation_pause" if is_hesitation else "low_energy_interval"
        interpretation = (
            f"Extended low-energy pause ({span:.2f}s) mid-utterance exceeding 700ms; indicates hesitation or stumble."
            if is_hesitation
            else "Frame energy stayed below the recording-relative threshold; this may be a pause or quiet audio."
        )

        evidence.append({
            "event": event_name,
            "start_seconds": round(start_s, 3),
            "end_seconds": round(end_s, 3),
            "measurement": {
                "mean_frame_rms": round(float(np.mean(rms[start:end])), 6),
                "recording_relative_threshold_rms": round(threshold, 6),
                "duration_seconds": round(span, 3),
            },
            "interpretation": interpretation,
            "limitations": "Energy alone cannot distinguish silence from quiet speech, and this event is not a word or speech-boundary alignment.",
        })
        if len(evidence) >= 50:
            break

    f0 = librosa.yin(y, fmin=65, fmax=400, sr=sr)
    valid_f0 = f0[np.isfinite(f0) & (f0 >= 65) & (f0 <= 400)]
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)

    # 2. Pitch monotony detection (sustained voiced segments >= 0.9s with std < 4.0 Hz)
    voiced_mask = np.isfinite(f0) & (f0 >= 65) & (f0 <= 400)
    for start, end in _runs(voiced_mask):
        start_s = max(0.0, float(frame_times[start] - frame_duration / 2))
        end_s = min(duration, float(frame_times[min(end - 1, len(frame_times) - 1)] + frame_duration / 2))
        span = end_s - start_s
        if span >= 0.9:
            seg_f0 = f0[start:end]
            f0_std = float(np.std(seg_f0))
            if f0_std < 4.0:
                evidence.append({
                    "event": "pitch_monotony_interval",
                    "start_seconds": round(start_s, 3),
                    "end_seconds": round(end_s, 3),
                    "measurement": {
                        "mean_frame_rms": round(float(np.mean(rms[start:end])), 6),
                        "recording_relative_threshold_rms": round(threshold, 6),
                        "duration_seconds": round(span, 3),
                        "mean_f0_hz": round(float(np.mean(seg_f0)), 1),
                        "pitch_std_hz": round(f0_std, 2),
                    },
                    "interpretation": f"Voiced pitch standard deviation remained at {f0_std:.1f} Hz for {span:.2f}s, indicating lack of pitch modulation (monotone delivery).",
                    "limitations": "YIN pitch tracking can register flat fundamental frequency on sustained vowels or ambient periodic signals.",
                })

    # 3. Pacing surge detection (extended high-energy bursts >= 2.2s with elevated RMS)
    overall_mean_rms = float(np.mean(rms))
    if overall_mean_rms > 1e-6:
        for start, end in active_ranges:
            start_s = max(0.0, float(frame_times[start] - frame_duration / 2))
            end_s = min(duration, float(frame_times[min(end - 1, len(frame_times) - 1)] + frame_duration / 2))
            span = end_s - start_s
            burst_rms = float(np.mean(rms[start:end]))
            if span >= 2.2 and burst_rms >= (1.3 * overall_mean_rms):
                evidence.append({
                    "event": "pacing_surge_interval",
                    "start_seconds": round(start_s, 3),
                    "end_seconds": round(end_s, 3),
                    "measurement": {
                        "mean_frame_rms": round(burst_rms, 6),
                        "recording_relative_threshold_rms": round(threshold, 6),
                        "duration_seconds": round(span, 3),
                        "energy_ratio_to_mean": round(burst_rms / overall_mean_rms, 2),
                    },
                    "interpretation": f"Continuous high-energy vocal burst ({span:.2f}s, {burst_rms / overall_mean_rms:.1f}x mean RMS) without pauses, characteristic of hurried phrasing.",
                    "limitations": "Continuous energy activity indicates unbroken phonation but cannot count syllables or words without speech recognition.",
                })

    # Sort all evidence chronologically
    evidence.sort(key=lambda ev: (ev["start_seconds"], ev["end_seconds"]))

    features = {
        "duration_seconds": round(duration, 2),
        "estimated_active_seconds": round(min(duration, activity_seconds), 2),
        "estimated_silence_seconds": round(silence_seconds, 2),
        "mean_rms_energy": round(float(np.mean(rms)), 5),
        "estimated_pitch_median_hz": round(float(np.median(valid_f0)), 2) if valid_f0.size else None,
        "pitch_p10_hz": round(float(np.percentile(valid_f0, 10)), 2) if valid_f0.size else None,
        "pitch_p90_hz": round(float(np.percentile(valid_f0, 90)), 2) if valid_f0.size else None,
        "mfcc_mean": [round(float(value), 4) for value in np.mean(mfcc, axis=1)],
        "sample_rate_hz": sr,
        "temporal_evidence": evidence,
        "temporal_analysis_note": "Temporal evidence intervals are timestamped from short-time acoustic frames (RMS energy and fundamental frequency). No transcription or forced alignment is performed without a configured ASR model.",
        "note": "Pitch and activity are estimates. Activity uses a recording-relative energy threshold; these metrics alone do not determine speech quality or rhetorical effectiveness.",
    }

    features["rubric"] = calculate_rubric(features)
    return features
