import io
import sys
import asyncio
import unittest
from pathlib import Path
from fastapi import UploadFile, HTTPException

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.main import (
    app,
    root,
    health,
    analyze,
    find_dataset_recording,
    compare_recordings,
    DATASET_DIR,
)


class TestVocaliscopeEndpoints(unittest.TestCase):
    def test_routes_registered(self):
        registered_paths = {route.path for route in app.routes}
        self.assertIn("/", registered_paths)
        self.assertIn("/health", registered_paths)
        self.assertIn("/analyze", registered_paths)
        self.assertIn("/compare", registered_paths)

    def test_cors_origins(self):
        cors_middlewares = [
            m for m in app.user_middleware if m.cls.__name__ == "CORSMiddleware"
        ]
        self.assertTrue(len(cors_middlewares) > 0)
        allow_origins = cors_middlewares[0].kwargs.get("allow_origins", [])
        self.assertIn("http://localhost:5173", allow_origins)
        self.assertIn("http://127.0.0.1:5173", allow_origins)

    def test_root_endpoint(self):
        response = root()
        self.assertEqual(response.get("project"), "Vocaliscope")
        self.assertEqual(response.get("status"), "running")
        self.assertIn("ready", response.get("message", "").lower())

    def test_health_endpoint(self):
        response = health()
        self.assertEqual(response, {"status": "healthy"})

    def test_find_dataset_recordings(self):
        clear_path = find_dataset_recording("clear")
        rushed_path = find_dataset_recording("rushed")

        self.assertTrue(clear_path.is_file())
        self.assertEqual(clear_path.stem.lower(), "clear")
        self.assertTrue(rushed_path.is_file())
        self.assertEqual(rushed_path.stem.lower(), "rushed")

    def test_compare_recordings_endpoint(self):
        result = compare_recordings()

        self.assertEqual(result.get("comparison"), "rushed minus clear")
        self.assertIn("clear", result)
        self.assertIn("rushed", result)
        self.assertIn("differences", result)
        self.assertIn("interpretation_note", result)

        clear_data = result["clear"]
        rushed_data = result["rushed"]
        differences = result["differences"]

        self.assertEqual(clear_data.get("filename"), "clear.mp4")
        self.assertEqual(rushed_data.get("filename"), "rushed.mp4")

        # Verify key feature metrics
        for feature_set in (clear_data["features"], rushed_data["features"]):
            self.assertIn("duration_seconds", feature_set)
            self.assertIn("estimated_active_seconds", feature_set)
            self.assertIn("estimated_silence_seconds", feature_set)
            self.assertIn("mean_rms_energy", feature_set)
            self.assertIn("estimated_pitch_median_hz", feature_set)

        # Verify differences calculations
        expected_diff_keys = [
            "duration_seconds",
            "estimated_active_seconds",
            "estimated_silence_seconds",
            "mean_rms_energy",
            "estimated_pitch_median_hz",
            "pitch_p10_hz",
            "pitch_p90_hz",
        ]
        for key in expected_diff_keys:
            self.assertIn(key, differences)
            self.assertIsNotNone(differences[key])
            self.assertAlmostEqual(
                differences[key],
                round(rushed_data["features"][key] - clear_data["features"][key], 4),
            )

        # Verify rubric differences calculations
        self.assertIn("rubric_differences", result)
        self.assertIn("overall_score", result["rubric_differences"])
        self.assertIn("cadence_pacing", result["rubric_differences"])

        for recording in (clear_data, rushed_data):
            duration = recording["features"]["duration_seconds"]
            self.assertIn("rubric", recording["features"])
            rubric = recording["features"]["rubric"]
            self.assertGreaterEqual(rubric["overall_score"], 0.0)
            self.assertLessEqual(rubric["overall_score"], 100.0)
            self.assertIn("cadence_pacing", rubric["dimensions"])
            self.assertIn("pause_discipline", rubric["dimensions"])
            self.assertIn("pitch_variation", rubric["dimensions"])
            self.assertIn("energy_dynamics", rubric["dimensions"])

            for event in recording["features"]["temporal_evidence"]:
                self.assertGreaterEqual(event["start_seconds"], 0)
                self.assertGreater(event["end_seconds"], event["start_seconds"])
                self.assertLessEqual(event["end_seconds"], duration + 0.02)

    def test_analyze_empty_file_returns_400(self):
        empty_upload = UploadFile(filename="empty.wav", file=io.BytesIO(b""))
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(analyze(empty_upload))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("empty", ctx.exception.detail.lower())

    def test_analyze_unsupported_extension_returns_415(self):
        txt_upload = UploadFile(filename="document.txt", file=io.BytesIO(b"hello world"))
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(analyze(txt_upload))
        self.assertEqual(ctx.exception.status_code, 415)
        self.assertIn("use wav", ctx.exception.detail.lower())

    def test_analyze_valid_recording(self):
        clear_path = DATASET_DIR / "clear.mp4"
        self.assertTrue(clear_path.exists())
        with open(clear_path, "rb") as fp:
            upload = UploadFile(filename="clear.mp4", file=fp)
            result = asyncio.run(analyze(upload))
            self.assertEqual(result["filename"], "clear.mp4")
            self.assertIn("features", result)
            self.assertGreater(result["features"]["duration_seconds"], 0)
            self.assertGreater(len(result["features"]["temporal_evidence"]), 0)
            self.assertIn("rubric", result["features"])
            self.assertGreaterEqual(result["features"]["rubric"]["overall_score"], 0.0)


if __name__ == "__main__":
    unittest.main()
