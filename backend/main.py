
import os
import tempfile
import subprocess
from pathlib import Path

import imageio_ffmpeg
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from backend.analyzer import analyze_audio

app = FastAPI(
    title="Vocaliscope API",
    description="Evidence-based speech analysis and temporal flaw grounding.",
    version="0.5.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 25 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm", ".mp4"
}

PROJECT_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = PROJECT_DIR / "dataset"


def convert_to_wav(source_path: str, wav_path: str) -> None:
    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()

    result = subprocess.run(
        [
            ffmpeg_path,
            "-nostdin",
            "-hide_banner",
            "-loglevel", "error",
            "-y",
            "-i", source_path,
            "-vn",
            "-t", "120",
            "-ac", "1",
            "-ar", "22050",
            "-c:a", "pcm_s16le",
            wav_path,
        ],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )

    if result.returncode != 0:
        raise ValueError("The recording could not be decoded.")

    if not os.path.exists(wav_path) or os.path.getsize(wav_path) <= 44:
        raise ValueError("No usable audio was found.")


def find_dataset_recording(label: str) -> Path:
    matches = [
        path
        for path in DATASET_DIR.iterdir()
        if path.is_file()
        and path.stem.lower() == label
        and path.suffix.lower() in ALLOWED_EXTENSIONS
    ] if DATASET_DIR.exists() else []

    if not matches:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Could not find '{label}' audio in the dataset folder. "
                "Check that the file is named clear or rushed and "
                "keep its audio extension."
            ),
        )

    if len(matches) > 1:
        raise HTTPException(
            status_code=400,
            detail=f"More than one '{label}' recording was found. Keep only one.",
        )

    return matches[0]


def analyze_file(source_path: str) -> dict:
    wav_path = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=".wav"
        ) as temporary:
            wav_path = temporary.name

        convert_to_wav(source_path, wav_path)
        return analyze_audio(wav_path)

    finally:
        if wav_path and os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except OSError:
                pass


@app.get("/")
def root():
    return {
        "project": "Vocaliscope",
        "status": "running",
        "message": "Speech analysis API is ready.",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    filename = file.filename or "audio"
    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="Use WAV, MP3, M4A, FLAC, OGG, WebM, or MP4.",
        )

    source_path = None

    try:
        contents = await file.read(MAX_FILE_SIZE + 1)

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty.",
            )

        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Maximum file size is 25 MB.",
            )

        with tempfile.NamedTemporaryFile(
            delete=False, suffix=extension
        ) as temporary:
            temporary.write(contents)
            source_path = temporary.name

        try:
            features = analyze_file(source_path)
        except subprocess.TimeoutExpired as exc:
            raise HTTPException(
                status_code=422,
                detail="Audio conversion took too long. Try a shorter recording.",
            ) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail="The recording could not be analysed.",
            ) from exc

        return {
            "filename": filename,
            "features": features,
        }

    finally:
        if source_path and os.path.exists(source_path):
            try:
                os.remove(source_path)
            except OSError:
                pass

        await file.close()


@app.post("/compare")
def compare_recordings():
    clear_path = find_dataset_recording("clear")
    rushed_path = find_dataset_recording("rushed")

    try:
        clear_features = analyze_file(str(clear_path))
        rushed_features = analyze_file(str(rushed_path))
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(
            status_code=422,
            detail="Audio conversion took too long. Try shorter recordings.",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail="One or both recordings could not be analysed.",
        ) from exc

    numeric_fields = [
        "duration_seconds",
        "estimated_active_seconds",
        "estimated_silence_seconds",
        "mean_rms_energy",
        "estimated_pitch_median_hz",
        "pitch_p10_hz",
        "pitch_p90_hz",
    ]

    differences = {}

    for field in numeric_fields:
        clear_value = clear_features.get(field)
        rushed_value = rushed_features.get(field)

        if (
            isinstance(clear_value, (int, float))
            and isinstance(rushed_value, (int, float))
        ):
            differences[field] = round(
                rushed_value - clear_value, 4
            )
        else:
            differences[field] = None

    rubric_differences = {}
    clear_rubric = clear_features.get("rubric", {})
    rushed_rubric = rushed_features.get("rubric", {})
    if clear_rubric and rushed_rubric:
        rubric_differences = {
            "overall_score": round(
                rushed_rubric.get("overall_score", 0.0) - clear_rubric.get("overall_score", 0.0), 1
            ),
            "cadence_pacing": round(
                rushed_rubric.get("dimensions", {}).get("cadence_pacing", {}).get("score", 0.0)
                - clear_rubric.get("dimensions", {}).get("cadence_pacing", {}).get("score", 0.0),
                1,
            ),
            "pause_discipline": round(
                rushed_rubric.get("dimensions", {}).get("pause_discipline", {}).get("score", 0.0)
                - clear_rubric.get("dimensions", {}).get("pause_discipline", {}).get("score", 0.0),
                1,
            ),
            "pitch_variation": round(
                rushed_rubric.get("dimensions", {}).get("pitch_variation", {}).get("score", 0.0)
                - clear_rubric.get("dimensions", {}).get("pitch_variation", {}).get("score", 0.0),
                1,
            ),
            "energy_dynamics": round(
                rushed_rubric.get("dimensions", {}).get("energy_dynamics", {}).get("score", 0.0)
                - clear_rubric.get("dimensions", {}).get("energy_dynamics", {}).get("score", 0.0),
                1,
            ),
        }

    return {
        "comparison": "rushed minus clear",
        "clear": {
            "filename": clear_path.name,
            "features": clear_features,
        },
        "rushed": {
            "filename": rushed_path.name,
            "features": rushed_features,
        },
        "differences": differences,
        "rubric_differences": rubric_differences,
        "interpretation_note": (
            "Differences are measured acoustic changes, not a speech-quality "
            "score. These two recordings are demonstration examples, not a "
            "scientifically validated dataset. Duration differences can also "
            "reflect pauses and delivery speed."
        ),
    }
