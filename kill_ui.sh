#!/bin/bash

# kill_ui.sh
# Stops the Chromium kiosk and the Python backend server.

echo "[INFO] Terminating Kiosk UI components..."

# 1. Kill Chromium
echo "Stopping Chromium..."
pkill -f chromium || echo "Chromium not running."

# 2. Kill Python Backend (Port 8000)
echo "Stopping Backend Server (Port 8000)..."
sudo fuser -k 8000/tcp 2>/dev/null || echo "Backend not running on port 8000."
pkill -f "python.*server.py" 2>/dev/null

# 3. Kill Heartbeat loops
echo "Cleaning up heartbeat processes..."
pkill -f "xset s reset" 2>/dev/null
pkill -f "start_kiosk.sh" 2>/dev/null

echo "[SUCCESS] UI and background processes stopped."
