@echo off
setlocal
cd /d %~dp0
echo Stopping stale API processes on port 3001 if present...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if($p){ Stop-Process -Id $p -Force }"
if not exist node_modules\.bin\vite.cmd (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed.
    pause
    exit /b 1
  )
)
echo Starting development server...
start "" /b node server.mjs
call npm run dev
if errorlevel 1 (
  echo.
  echo npm run dev failed.
  pause
  exit /b 1
)
endlocal
