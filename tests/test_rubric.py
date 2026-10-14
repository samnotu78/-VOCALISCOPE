"""Unit tests for deterministic rubric scoring."""

import unittest
from backend.rubric import (
    calculate_rubric,
    score_cadence_pacing,
    score_pause_discipline,
    score_pitch_variation,
    score_energy_dynamics,
)


class TestRubricScoring(unittest.TestCase):
    def setUp(self):
        self.sample_features = {
            "duration_seconds": 13.63,
            "estimated_active_seconds": 10.36,
            "estimated_silence_seconds": 3.28,
            "mean_rms_energy": 0.06421,
            "estimated_pitch_median_hz": 169.4,
            "pitch_p10_hz": 95.0,
            "pitch_p90_hz": 195.0,
            "temporal_evidence": [
                {
                    "event": "low_energy_interval",
                    "start_seconds": 3.84,
                    "end_seconds": 4.30,
                    "measurement": {"duration_seconds": 0.46, "mean_frame_rms": 0.001},
                },
                {
                    "event": "low_energy_interval",
                    "start_seconds": 7.32,
                    "end_seconds": 7.65,
                    "measurement": {"duration_seconds": 0.33, "mean_frame_rms": 0.001},
                },
            ],
        }

    def test_reproducibility_deterministic(self):
        """Identical inputs must produce bit-for-bit identical results."""
        res1 = calculate_rubric(self.sample_features)
        res2 = calculate_rubric(self.sample_features)
        self.assertEqual(res1["overall_score"], res2["overall_score"])
        self.assertEqual(res1["overall_band"], res2["overall_band"])
        self.assertEqual(res1["dimensions"], res2["dimensions"])

    def test_score_ranges(self):
        """All dimension and overall scores must be strictly between 0 and 100."""
        res = calculate_rubric(self.sample_features)
        self.assertGreaterEqual(res["overall_score"], 0.0)
        self.assertLessEqual(res["overall_score"], 100.0)
        for key, dim in res["dimensions"].items():
            self.assertGreaterEqual(dim["score"], 0.0, f"Dimension {key} score < 0")
            self.assertLessEqual(dim["score"], 100.0, f"Dimension {key} score > 100")
            self.assertIn(dim["band"], ["Exemplary", "Proficient", "Developing", "Needs Attention"])
            self.assertIn("rationale", dim)
            self.assertIn("recommendations", dim)
            self.assertIn("limitations", dim)

    def test_zero_duration_edge_case(self):
        """Zero duration input must not crash or divide by zero."""
        empty = {
            "duration_seconds": 0.0,
            "estimated_active_seconds": 0.0,
            "estimated_silence_seconds": 0.0,
            "mean_rms_energy": 0.0,
            "estimated_pitch_median_hz": None,
            "pitch_p10_hz": None,
            "pitch_p90_hz": None,
            "temporal_evidence": [],
        }
        res = calculate_rubric(empty)
        self.assertEqual(res["overall_score"], 0.0)
        self.assertEqual(res["dimensions"]["cadence_pacing"]["score"], 0.0)
        self.assertEqual(res["dimensions"]["pause_discipline"]["score"], 0.0)

    def test_missing_pitch_edge_case(self):
        """None or unvoiced pitch must return safe fallback score and clear disclaimer."""
        res = score_pitch_variation(None, None, None)
        self.assertEqual(res["score"], 25.0)
        self.assertEqual(res["band"], "Needs Attention")
        self.assertIn("Insufficient voiced", res["rationale"])

    def test_monotone_pitch_penalty(self):
        """A flat pitch with under 2 semitones must be penalized as monotone."""
        # p10=150, p90=155 -> ratio ~1.033 -> 12*log2(1.033) = ~0.57 semitones
        res = score_pitch_variation(median_f0=152.0, p10_hz=150.0, p90_hz=155.0)
        self.assertLess(res["score"], 65.0)
        self.assertIn("monotone", res["rationale"].lower())

    def test_pause_hesitation_penalty(self):
        """Recordings with prolonged hesitation pauses must receive lower scores than clean pauses."""
        clean_events = [
            {"measurement": {"duration_seconds": 0.35}} for _ in range(4)
        ]
        hesitant_events = [
            {"measurement": {"duration_seconds": 1.40}} for _ in range(4)
        ]
        score_clean = score_pause_discipline(15.0, 3.5, clean_events)
        score_hesitant = score_pause_discipline(15.0, 5.6, hesitant_events)
        self.assertGreater(score_clean["score"], score_hesitant["score"])
        self.assertGreater(score_hesitant["metrics"]["hesitation_count"], 0)

    def test_energy_extremes(self):
        """Very quiet or near-clipping audio must receive lower energy scores."""
        quiet = score_energy_dynamics(0.001)
        clipping = score_energy_dynamics(0.45)
        normal = score_energy_dynamics(0.065)
        self.assertLess(quiet["score"], normal["score"])
        self.assertLess(clipping["score"], normal["score"])
        self.assertGreater(normal["score"], 85.0)

    def test_composite_formula_integrity(self):
        """Composite score must match the documented 30/25/25/20 linear combination."""
        res = calculate_rubric(self.sample_features)
        dims = res["dimensions"]
        expected = round(
            0.30 * dims["cadence_pacing"]["score"]
            + 0.25 * dims["pause_discipline"]["score"]
            + 0.25 * dims["pitch_variation"]["score"]
            + 0.20 * dims["energy_dynamics"]["score"],
            1,
        )
        self.assertAlmostEqual(res["overall_score"], expected, places=1)


if __name__ == "__main__":
    unittest.main()
