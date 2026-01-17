# RPi Kiosk Dashboard

A high-performance, kiosk interface for the Raspberry Pi 4 using a 3.5" SPI display. Featuring real-time system monitoring, weather integration, an AI chat agent, and a dynamic mixed-media screensaver.

## 🚀 Key Features
- **Dashboard**: Real-time Clock, Weather (Open-Meteo), and System Health (CPU Temp, Load, RAM).
- **AI Chat Agent**: Integrated Gemini AI interface for on-device assistance.
- **System Macros**: Quick-access buttons for Shutdown, Reboot, and Refresh.
- **Dynamic Screensaver**: Supports a looping playlist of videos and images with configurable timeouts.
- **Persistent Settings**: Theme colors, city, brightness, and timers are saved across sessions.
- **Automation**: One-click scripts to enable/disable autostart at boot.

## 📁 Repository Structure
- `/app`: The frontend application (HTML, CSS, JS).
- `/backend`: FastAPI server handle system commands and data.
- `/media`: Default directory for screensaver videos and images.
- `/drivers`: Custom 16MHz optimized drivers for the 3.5" SPI display.

## 🛠️ Installation & Setup

### 1. Driver Installation
Custom Driver: https://github.com/ryuk205/custom-35-driver
Driver from Vendor: https://github.com/goodtft/LCD-show
Docs for the screen: https://www.lcdwiki.com/3.5inch_RPi_Display
Use any one of the repo to install the driver.

### 2. Configure Autostart (Console to Desktop)
To ensure the UI starts without needing a manual login:
```bash
sudo ./enable_console_autostart.sh
```

### 3. Launching the UI
You can start the UI manually from the `UI` directory:
```bash
cd UI
chmod +x *.sh
./start_kiosk.sh
```

## 🤖 Remote Management (SSH)
We have included specialized scripts for managing the kiosk remotely:

- **Enable Start at Boot**: `./enable_boot_start.sh`
- **Disable Start at Boot**: `./disable_boot_start.sh`
- **Emergency Kill**: `./kill_ui.sh` (Stops browser and backend server instantly)

## ⚙️ Configuration
The system uses two main config files:
- `UI/app/config.json`: Stores user settings (Theme, City, etc.).
- `UI/media_config.json`: Configures screensaver paths and play order (Random/FIFO).

## 📝 Hardware Note
The 3.5" SPI display (MPI3508) is sensitive to bus speeds. This project is configured to a stable **16MHz**. Overclocking to 32MHz or 64MHz may cause "white screen" or console freezing.
