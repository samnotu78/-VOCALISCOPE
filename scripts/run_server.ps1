Write-Host "Starting Vocaliscope Backend Server..." -ForegroundColor Cyan
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$Uvicorn = Join-Path $ProjectRoot ".venv\Scripts\uvicorn.exe"
if (Test-Path $Uvicorn) {
    & $Uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
} else {
    uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
}
