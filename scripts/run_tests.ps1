Write-Host "Running Vocaliscope Test Suite..." -ForegroundColor Cyan
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$Python = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
if (Test-Path $Python) {
    & $Python -m unittest discover -s tests -v
} else {
    python -m unittest discover -s tests -v
}
