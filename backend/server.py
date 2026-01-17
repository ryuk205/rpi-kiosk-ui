import os
import uvicorn
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import socket
import json
from dotenv import load_dotenv
import google.generativeai as genai
import platform
import glob
import random

# --- Helper for Cross-Platform ---
IS_WINDOWS = platform.system() == "Windows"

# --- Configuration ---
load_dotenv() # Load .env file
HOST = "0.0.0.0"
PORT = 8000
UI_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../app"))
MEDIA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../media"))
MEDIA_CONFIG_FILE = os.path.join(UI_DIR, "../media_config.json")
CONFIG_FILE = os.path.join(UI_DIR, "config.json")
NOTES_FILE = os.path.join(UI_DIR, "notes.txt")
# MESSAGE_FILE is now dynamic via media_config

def get_media_config():
    default_media = {
        "screensaver_path": os.path.join(UI_DIR, "../media"),
        "message_file": os.path.join(UI_DIR, "message.txt"),
        "play_order": "random"
    }
    if not os.path.exists(MEDIA_CONFIG_FILE):
        return default_media
    try:
        with open(MEDIA_CONFIG_FILE, 'r') as f:
            return json.load(f)
    except:
        return default_media

# Configure Gemini
api_key = os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash-lite')
    print("[INFO] Gemini Agent Configured")
else:
    model = None
    print("[WARN] No GOOGLE_API_KEY found. Agent will be offline.")

print(f"[DEBUG] UI_DIR Configured as: {UI_DIR}")
print(f"[DEBUG] Checking if exists: {os.path.exists(UI_DIR)}")

app = FastAPI()

# --- Helpers ---
def load_config():
    default_config = {
        "city": "New York", 
        "accentColor": "#00f3ff", 
        "brightness": "100",
        "screensaverTimeout": "0"
    }
    if not os.path.exists(CONFIG_FILE):
        return default_config
    try:
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)
            # Merge with defaults to ensure all keys exist
            for key, val in default_config.items():
                if key not in config:
                    config[key] = val
            return config
    except:
        return default_config

def save_config(data):
    try:
        print(f"[DEBUG] Attempting to write to {CONFIG_FILE}")
        with open(CONFIG_FILE, 'w') as f:
            json.dump(data, f, indent=4)
        print("[DEBUG] Write successful")
    except Exception as e:
        print(f"[ERROR] Failed to write config: {e}")
        raise e

def get_ip_address():
    try:
        # Connect to a public DNS to guess the correct local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def get_cpu_temp():
    if IS_WINDOWS:
        return "WinDev"
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            temp_c = int(f.read()) / 1000.0
            return f"{temp_c:.1f}°C"
    except:
        return "N/A"

def get_cpu_load():
    if IS_WINDOWS:
        return "0%"
    try:
        # Simple load average for 1 min
        load1, load5, load15 = os.getloadavg()
        # Convert to percentage (rough estimate based on 4 cores)
        cpu_count = os.cpu_count() or 4
        load_pct = int((load1 / cpu_count) * 100)
        return f"{load_pct}%"
    except:
        return "N/A"

def get_ram_usage():
    if IS_WINDOWS:
        return "WinDev"
    try:
        with open('/proc/meminfo', 'r') as f:
            lines = f.readlines()
        
        mem_total = 0
        mem_avail = 0
        for line in lines:
            if 'MemTotal' in line:
                mem_total = int(line.split()[1])
            if 'MemAvailable' in line:
                mem_avail = int(line.split()[1])
        
        if mem_total > 0:
            used_pct = int(((mem_total - mem_avail) / mem_total) * 100)
            return f"{used_pct}%"
    except:
        return "N/A"

# --- API Models ---
class ChatRequest(BaseModel):
    message: str

class ConfigRequest(BaseModel):
    city: str
    accentColor: str
    brightness: str
    screensaverTimeout: str

class NoteRequest(BaseModel):
    content: str

# --- API Endpoints ---
@app.get("/api/system")
async def get_system_info():
    return {
        "ip": get_ip_address(),
        "temp": get_cpu_temp(),
        "load": get_cpu_load(),
        "ram": get_ram_usage(),
        "status": "online"
    }

@app.get("/api/settings")
async def get_settings():
    return load_config()

@app.post("/api/settings")
async def update_settings(config: ConfigRequest):
    data = config.dict()
    print(f"[DEBUG] Saving Config: {data}")
    save_config(data)
    # Debug: Check if file exists immediately
    print(f"[DEBUG] File exists after save? {os.path.exists(CONFIG_FILE)} at {CONFIG_FILE}")
    return {"status": "saved", "config": data}

@app.get("/api/notes")
async def get_notes():
    if not os.path.exists(NOTES_FILE):
        return {"content": ""}
    try:
        with open(NOTES_FILE, "r") as f:
            content = f.read()
        return {"content": content}
    except Exception as e:
        print(f"[ERROR] Read Notes: {e}")
        return {"content": "Error loading notes."}

@app.post("/api/notes")
async def save_notes(note: NoteRequest):
    try:
        with open(NOTES_FILE, "w") as f:
            f.write(note.content)
        return {"status": "saved"}
    except Exception as e:
        print(f"[ERROR] Save Notes: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/api/message")
async def get_message():
    config = get_media_config()
    msg_path = config.get("message_file")
    
    # Resolve relative path if needed
    if not os.path.isabs(msg_path):
        msg_path = os.path.abspath(os.path.join(UI_DIR, msg_path))

    if not os.path.exists(msg_path):
        return {"content": "Message file not found"}
    try:
        with open(msg_path, "r") as f:
            content = f.read()
        return {"content": content}
    except Exception as e:
        return {"content": "Error reading message"}

# --- Media & Screensaver ---
@app.get("/api/screensaver/playlist")
async def get_playlist():
    config = get_media_config()
    media_path = config.get("screensaver_path", "")
    
    if not os.path.isabs(media_path):
        media_path = os.path.abspath(os.path.join(UI_DIR, media_path))
    
    if not os.path.exists(media_path):
        return {"files": []}
        
    # Extensions to look for
    extensions = ['*.mp4', '*.webm', '*.jpg', '*.jpeg', '*.png', '*.gif']
    files = []
    
    for ext in extensions:
        files.extend(glob.glob(os.path.join(media_path, ext)))
        
    # Sort Order
    order = config.get("play_order", "random").lower()
    
    if order == "random":
        random.shuffle(files)
    elif order == "fifo" or order == "lilo": # Oldest First
        files.sort(key=os.path.getmtime)
    elif order == "filo" or order == "lifo": # Newest First
        files.sort(key=os.path.getmtime, reverse=True)
    elif order == "name_az":
        files.sort()
    elif order == "name_za":
        files.sort(reverse=True)
        
    # Convert to API URLs
    playlist = []
    for f in files:
        filename = os.path.basename(f)
        playlist.append({
            "url": f"/api/media_stream?file={filename}",
            "type": "video" if f.lower().endswith(('.mp4', '.webm')) else "image"
        })
        
    return {"playlist": playlist}

@app.get("/api/media_stream")
async def media_stream(file: str):
    config = get_media_config()
    media_path = config.get("screensaver_path", "")
    
    if not os.path.isabs(media_path):
        media_path = os.path.abspath(os.path.join(UI_DIR, media_path))
        
    file_path = os.path.join(media_path, file)
    
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    return JSONResponse(content={"error": "File not found"}, status_code=404)

# --- Chat Agent ---
@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    if not model:
        return {"response": "Error: Agent API Key not configured."}
    
    try:
        user_msg = request.message
        # Simple generation for now (no history)
        response = model.generate_content(user_msg)
        return {"response": response.text}
    except Exception as e:
        print(f"[ERROR] Gemini API Error: {e}")
        return {"response": "I'm having trouble connecting to my brain right now."}

# --- System Macros ---
@app.post("/api/shutdown")
async def system_shutdown():
    print("[INFO] Shutting down system...")
    if IS_WINDOWS:
        print("[MOCK] Windows System Shutdown Prevented")
        return {"status": "mock_shutdown"}
    os.system("sudo shutdown now")
    return {"status": "shutdown_initiated"}

@app.post("/api/reboot")
async def system_reboot():
    print("[INFO] Rebooting system...")
    if IS_WINDOWS:
        print("[MOCK] Windows System Reboot Prevented")
        return {"status": "mock_reboot"}
    os.system("sudo reboot")
    return {"status": "reboot_initiated"}

@app.post("/api/quit")
async def quit_ui():
    print("[INFO] Exiting Kiosk...")
    if IS_WINDOWS:
         print("[MOCK] Windows UI Quit Prevented")
         return {"status": "mock_quit"}
    os.system("pkill chromium")
    return {"status": "exiting_ui"}

# --- Static File Serving ---
# Serve the Media folder (Screensavers)
if os.path.exists(MEDIA_DIR):
    app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")
else:
    print(f"[WARN] Media directory not found: {MEDIA_DIR}")

# Serve the UI folder (CSS, JS)
app.mount("/static", StaticFiles(directory=UI_DIR), name="static")

# Serve index.html at root
@app.get("/")
async def read_index():
    path = os.path.join(UI_DIR, "index.html")
    if os.path.exists(path):
        return FileResponse(path)
    return JSONResponse(content={"error": "index.html not found"}, status_code=404)

if __name__ == "__main__":
    print(f"Starting Server at http://{HOST}:{PORT}")
    print(f"Serving UI from: {UI_DIR}")
    try:
        print(f"[DEBUG] Files in UI_DIR: {os.listdir(UI_DIR)}")
    except:
        pass
    uvicorn.run(app, host=HOST, port=PORT)
