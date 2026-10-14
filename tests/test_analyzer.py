import os
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
import soundfile as sf

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.analyzer import analyze_audio
from backend.main import convert_to_wav, DATASET_DIR


class TestAudioAnalyzer(unittest.TestCase):
    def setUp(self):
        self.clear_mp4 = DATASET_DIR / "clear.mp4"
        self.temp_files = []

    def tearDown(self):
        for temp_file in self.temp_files:
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except OSError:
                    pass

    def test_dataset_clear_recording_exists(self):
        self.assertTrue(
            self.clear_mp4.exists(),
            f"Expected dataset recording at {self.clear_mp4}",
        )

    def test_analyze_audio_features(self):
        self.assertTrue(self.clear_mp4.exists())
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_wav:
            wav_path = temp_wav.name
            self.temp_files.append(wav_path)

        convert_to_wav(str(self.clear_mp4), wav_path)
        self.assertTrue(os.path.exists(wav_path))
        self.assertGreater(os.path.getsize(wav_path), 44)

        features = analyze_audio(wav_path)

        expected_keys = [
            "duration_seconds",
            "estimated_active_seconds",
            "estimated_silence_seconds",
            "mean_rms_energy",
            "estimated_pitch_median_hz",
            "pitch_p10_hz",
            "pitch_p90_hz",
            "mfcc_mean",
            "sample_rate_hz",
            "temporal_evidence",
            "temporal_analysis_note",
            "note",
        ]
        for key in expected_keys:
            self.assertIn(key, features)

        self.assertGreater(features["duration_seconds"], 0)
        self.assertEqual(features["sample_rate_hz"], 22050)
        self.assertEqual(len(features["mfcc_mean"]), 13)
        self.assertIsNotNone(features["estimated_pitch_median_hz"])
        for event in features["temporal_evidence"]:
            self.assertGreaterEqual(event["start_seconds"], 0)
            self.assertGreater(event["end_seconds"], event["start_seconds"])
            self.assertLessEqual(event["end_seconds"], features["duration_seconds"] + 0.02)
            self.assertIn("measurement", event)
            self.assertIn("interpretation", event)
            self.assertIn("limitations", event)

    def test_analyze_empty_file_raises_value_error(self):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_wav:
            empty_path = temp_wav.name
            self.temp_files.append(empty_path)

        with self.assertRaises(ValueError):
            analyze_audio(empty_path)

    def test_invalid_audio_raises_value_error(self):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_wav:
            temp_wav.write(b"not a wav file")
            invalid_path = temp_wav.name
            self.temp_files.append(invalid_path)
        with self.assertRaises((ValueError, RuntimeError)):
            analyze_audio(invalid_path)

    def test_silent_audio_has_no_false_activity_events(self):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_wav:
            silent_path = temp_wav.name
            self.temp_files.append(silent_path)
        sf.write(silent_path, np.zeros(22050, dtype=np.float32), 22050)
        features = analyze_audio(silent_path)
        self.assertEqual(features["temporal_evidence"], [])
        self.assertEqual(features["estimated_active_seconds"], 0)


if __name__ == "__main__":
    unittest.main()
