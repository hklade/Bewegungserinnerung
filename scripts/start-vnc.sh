#!/usr/bin/env bash
# Startet ein virtuelles X-Display (Xvfb) mit VNC-Zugriff über den Browser (noVNC),
# damit man --headed-Playwright-Läufen im Devcontainer live zuschauen kann.
#
# Nutzung:
#   scripts/start-vnc.sh
#   → dann Port 6080 in VSCode forwarden/öffnen und in "vnc.html?autoconnect=true" verlinken
#   → in einem zweiten Terminal: DISPLAY=:99 npm run test:e2e:headed
set -euo pipefail

DISPLAY_NUM=":99"
VNC_PORT=5900
NOVNC_PORT=6080
RESOLUTION="1440x1200x24"

if pgrep -f "Xvfb ${DISPLAY_NUM}" > /dev/null; then
  echo "Xvfb läuft bereits auf ${DISPLAY_NUM}."
else
  echo "Starte Xvfb auf ${DISPLAY_NUM} (${RESOLUTION}) ..."
  Xvfb "${DISPLAY_NUM}" -screen 0 "${RESOLUTION}" &
  sleep 1
fi

if pgrep -f "x11vnc.*${DISPLAY_NUM}" > /dev/null; then
  echo "x11vnc läuft bereits."
else
  echo "Starte x11vnc auf Port ${VNC_PORT} ..."
  x11vnc -display "${DISPLAY_NUM}" -forever -shared -nopw -quiet -rfbport "${VNC_PORT}" &
  sleep 1
fi

if pgrep -f "websockify.*${NOVNC_PORT}" > /dev/null; then
  echo "noVNC/websockify läuft bereits auf Port ${NOVNC_PORT}."
else
  echo "Starte noVNC auf Port ${NOVNC_PORT} ..."
  websockify --web=/usr/share/novnc "${NOVNC_PORT}" "localhost:${VNC_PORT}" &
  sleep 1
fi

echo ""
echo "Fertig. In VSCode Port ${NOVNC_PORT} öffnen (PORTS-Tab → Preview/Open in Browser)"
echo "und den Pfad /vnc.html?autoconnect=true&resize=scale anhängen."
echo ""
echo "Playwright dann mit demselben Display starten, z. B.:"
echo "  DISPLAY=${DISPLAY_NUM} npm run test:e2e:headed"
