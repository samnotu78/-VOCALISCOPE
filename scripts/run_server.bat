@echo off
setlocal
echo Starting Vocaliscope Backend Server...
cd /d "%~dp0\.."
if exist ".venv\Scripts\uvicorn.exe" (
    ".venv\Scripts\uvicorn.exe" backend.main:app --host 127.0.0.1 --port 8000 --reload
) else (
    uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
)
pause
