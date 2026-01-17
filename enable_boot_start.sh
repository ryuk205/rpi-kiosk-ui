#!/bin/bash

# enable_boot_start.sh
# Configures the system to launch the Kiosk UI automatically on boot.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAUNCH_CMD="$SCRIPT_DIR/start_kiosk.sh"
AUTOSTART_DIR="$HOME/.config/lxsession/LXDE-pi"
AUTOSTART_FILE="$AUTOSTART_DIR/autostart"

echo "[INFO] Configuring Autostart..."

# 1. Create directory if missing
if [ ! -d "$AUTOSTART_DIR" ]; then
    echo "Creating LXDE autostart directory..."
    mkdir -p "$AUTOSTART_DIR"
fi

# 2. Add launch command to LXDE autostart
if [ -f "$AUTOSTART_FILE" ]; then
    if ! grep -q "$LAUNCH_CMD" "$AUTOSTART_FILE"; then
        echo "@bash $LAUNCH_CMD" >> "$AUTOSTART_FILE"
        echo "Added to $AUTOSTART_FILE."
    fi
else
    {
        echo "@lxpanel --profile LXDE-pi"
        echo "@pcmanfm --desktop --profile LXDE-pi"
        echo "@xscreensaver -no-splash"
        echo "@bash $LAUNCH_CMD"
    } > "$AUTOSTART_FILE"
    echo "Created $AUTOSTART_FILE and added launch command."
fi

# 3. Add .desktop file autostart (XDG standard, more reliable on some Pi versions)
XDG_AUTOSTART_DIR="$HOME/.config/autostart"
mkdir -p "$XDG_AUTOSTART_DIR"
cat <<EOF > "$XDG_AUTOSTART_DIR/kiosk.desktop"
[Desktop Entry]
Type=Application
Name=RPi Kiosk UI
Exec=$LAUNCH_CMD
X-GNOME-Autostart-enabled=true
EOF
echo "Created $XDG_AUTOSTART_DIR/kiosk.desktop"

# 3. Ensure start_kiosk.sh is executable
chmod +x "$LAUNCH_CMD"

echo "[SUCCESS] Kiosk UI will now start automatically at boot (within the X session)."
echo "NOTE: This works with the 'Console Autologin' setup previously configured."
