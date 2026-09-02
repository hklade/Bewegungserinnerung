@echo off
setlocal
cd /d %~dp0
echo Stopping stale API processes on port 3001 if present...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if($p){ Stop-Process -Id $p -Force }"
set NEED_INSTALL=0
if not exist node_modules\.bin\vite.cmd set NEED_INSTALL=1
if not exist node_modules\@rollup\rollup-win32-x64-msvc set NEED_INSTALL=1

if %NEED_INSTALL%==1 (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed.
    pause
    exit /b 1
  )
)

if not exist node_modules\@rollup\rollup-win32-x64-msvc (
  echo.
  echo Rollup's native Windows binary is still missing after npm install.
  echo This is a known npm optional-dependency bug ^(npm/cli#4828^) - doing a clean reinstall...
  rd /s /q node_modules
  del /f /q package-lock.json 2>nul
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed after clean reinstall.
    pause
    exit /b 1
  )
  if not exist node_modules\@rollup\rollup-win32-x64-msvc (
    echo.
    echo Still missing after a clean reinstall - please check your npm/Node setup manually.
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
