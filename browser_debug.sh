#!/bin/bash
# browser_debug.sh
# Purpose: Install Firefox and Reinstall Chromium to debug resolution issues on RPi 3.5" Display

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_PATH="$SCRIPT_DIR/app/index.html"

# ARGUMENT HANDLING
if [ "$1" == "--test-firefox" ]; then
    echo "[INFO] Launching Firefox Kiosk..."
    echo "URL: file://$APP_PATH"
    export DISPLAY=:0
    firefox-esr --kiosk "file://$APP_PATH"
    exit 0
fi

if [ "$1" == "--test-chromium" ]; then
    echo "[INFO] Launching Chromium Kiosk..."
    bash "$SCRIPT_DIR/start_kiosk.sh"
    exit 0
fi

echo "[INFO] Starting Browser Setup..."

# 1. Install Firefox ESR
echo "[STEP 1/2] Installing Firefox ESR..."
sudo apt update
sudo apt install -y firefox-esr

# 2. Reinstall Chromium
echo "[STEP 2/2] Purging and Reinstalling Chromium..."
# Remove package and config
sudo apt remove -y --purge chromium chromium-browser chromium-common chromium-rpi-mods
sudo apt autoremove -y
# Optional: Clear local user config
echo "[INFO] Cleaning local Chromium config (~/.config/chromium)..."
rm -rf ~/.config/chromium
rm -rf ~/.cache/chromium

echo "[INFO] Installing Chromium (RPi Optimized if available)..."
if sudo apt install -y chromium-browser chromium-rpi-mods; then
    echo "[SUCCESS] Installed chromium-browser (RPi version)."
else
    echo "[WARN] chromium-browser not found. Installing standard chromium..."
    sudo apt install -y chromium
fi

echo "========================================================"
echo "   SETUP COMPLETE"
echo "========================================================"
echo "Run the specific tests using:"
echo "  bash browser_debug.sh --test-firefox"
echo "  bash browser_debug.sh --test-chromium"
echo "========================================================"
