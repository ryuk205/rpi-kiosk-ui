#!/bin/bash

# Script to launch the Kiosk Browser pointing to the local UI
# Get the absolute path to the HTML file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# --- Python Backend Setup ---
# Kill any existing server instance on Port 8000
echo "[INFO] Killing port 8000..."
fuser -k 8000/tcp || true

# --- Cleanup Handler ---
cleanup() {
    echo ""
    echo "[INFO] Stopping Kiosk..."
    kill $BACKEND_PID 2>/dev/null
    kill $HEARTBEAT_PID 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM
# -----------------------

VENV_DIR="$SCRIPT_DIR/.venv"
REQ_FILE="$SCRIPT_DIR/backend/requirements.txt"

# Ensure UI directory is writable for config.json
chmod -R 777 "$SCRIPT_DIR/app"

# Create/Activate Virtual Environment
if [ ! -d "$VENV_DIR" ]; then
    echo "[INFO] Creating Python Virtual Environment at $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"
    
    if [ -f "$REQ_FILE" ]; then
        echo "[INFO] Installing Dependencies from $REQ_FILE..."
        pip install -r "$REQ_FILE"
    else
        echo "[WARN] No requirements.txt found at $REQ_FILE"
        pip install fastapi uvicorn google-adk python-dotenv
    fi
else
    echo "[INFO] Activating Virtual Environment..."
    source "$VENV_DIR/bin/activate"
fi

# Start the Python Backend
echo "[INFO] Starting Python Backend..."
# Script is in UI/, server is in UI/backend/
python "$SCRIPT_DIR/backend/server.py" > /tmp/backend_log.txt 2>&1 &
BACKEND_PID=$!

# Wait for server to be ready
sleep 3
# ----------------------------

# Detect if we are running in X11
if [ -z "$DISPLAY" ]; then export DISPLAY=:0; fi

# --- Power Management (Keep Screen ON) ---
# Disable Screen Saver
xset s off
# Disable DPMS (Energy Star) features
xset -dpms
# Disable blanking
xset s noblank
# -----------------------------------------

pkill -o chromium

# --- Heartbeat to Keep Screen ON ---
# xset sometimes gets overridden by LightDM after a while.
# This loop forces the screen to stay awake.
(
    while true; do
        xset s reset > /dev/null 2>&1
        xset s 0 0 > /dev/null 2>&1
        xset dpms 0 0 0 > /dev/null 2>&1
        xset -dpms > /dev/null 2>&1
        xset s off > /dev/null 2>&1
        sleep 60
    done
) &
HEARTBEAT_PID=$!
# -----------------------------------

echo "Launching Kiosk at http://localhost:8000..."

# Clear Cache / Temp Profile
rm -rf /tmp/chromium_kiosk_test

chromium --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --check-for-update-interval=31536000 \
    --overscroll-history-navigation=0 \
    --incognito \
    --force-device-scale-factor=1.0 \
    --password-store=basic \
    --disable-gpu \
    --disable-software-rasterizer \
    --disable-dev-shm-usage \
    --disable-features=PowerCheck \
    --window-size=320,480 \
    --user-data-dir=/tmp/chromium_kiosk_test \
    "http://localhost:8000"
