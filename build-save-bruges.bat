@echo off
cd /d "%~dp0source\save-bruges"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
echo Building Save Bruges into games/SaveBruge...
call npm run build
echo Done.
