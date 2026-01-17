#!/bin/bash

# disable_boot_start.sh
# Disables the automatic launch of the Kiosk UI on boot.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAUNCH_CMD="$SCRIPT_DIR/start_kiosk.sh"
AUTOSTART_FILE="$HOME/.config/lxsession/LXDE-pi/autostart"

echo "[INFO] Disabling Autostart..."

if [ -f "$AUTOSTART_FILE" ]; then
    # Remove the line containing our launch command
    sed -i "\|$LAUNCH_CMD|d" "$AUTOSTART_FILE"
    echo "Removed $LAUNCH_CMD from $AUTOSTART_FILE."
fi

# Remove .desktop autostart
XDG_DESKTOP="$HOME/.config/autostart/kiosk.desktop"
if [ -f "$XDG_DESKTOP" ]; then
    rm "$XDG_DESKTOP"
    echo "Removed $XDG_DESKTOP."
fi

echo "[SUCCESS] Autostart disabled."
