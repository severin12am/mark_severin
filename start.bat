@echo off
cd /d "%~dp0"
echo Stopping any existing server on port 3456...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3456" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)
echo Starting portfolio site at http://localhost:3456
echo Unity games need this server — do not use python -m http.server.
echo Press Ctrl+C to stop.
start "" "http://localhost:3456"
python serve.py
