@echo off
cd /d "%~dp0"
echo Starting portfolio site at http://localhost:3456
echo Unity games need this server — do not open index.html directly.
echo Press Ctrl+C to stop.
start "" "http://localhost:3456"
python serve.py
