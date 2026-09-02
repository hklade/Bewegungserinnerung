#!/usr/bin/env bash
set -euo pipefail

# Node-Abhängigkeiten & Browser für Tests
npm install
npx playwright install --with-deps chrome

# X11/VNC-Tooling für den headless Browser
sudo apt-get update
sudo apt-get install -y xauth x11vnc novnc websockify

# Test-Reporting
npm install -g allure-commandline

# Claude Code: Skills & Plugins
npx skills@latest add mattpocock/skills --skill=wayfinder
claude plugin marketplace add anthropics/claude-plugins-official
claude plugin install github@claude-plugins-official --scope user