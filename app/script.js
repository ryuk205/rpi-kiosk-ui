document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    startClock();
    fetchSystemInfo();
    setupButtons();
    setupChat();
    // setupScreensaver(); // Disabled per user request "Keep screen on always"
    updateWeather();

    // Refresh weather every 30 mins
    setInterval(updateWeather, 30 * 60 * 1000);
    // Refresh message every 10s
    setInterval(fetchMessage, 10000);
    fetchMessage();
});

// Default Settings
const DEFAULT_CONFIG = {
    city: "New York",
    accentColor: "#00f3ff",
    brightness: "100",
    screensaverTimeout: "0" // 0 = Never
};

let userConfig = { ...DEFAULT_CONFIG };

async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            userConfig = await res.json();
            console.log("Loaded Config:", userConfig);
        }
    } catch (e) {
        console.error("Failed to load settings from backend", e);
    }
    applyConfig();
    setupScreensaver(); // Apply screensaver settings
    updateWeather(); // Initial weather fetch
}

async function saveSettings() {
    const cityInput = document.getElementById('setting-city');
    const colorInput = document.getElementById('setting-color');
    const brightInput = document.getElementById('setting-brightness');
    const screensaverInput = document.getElementById('setting-screensaver');

    const newConfig = {
        city: cityInput.value || "New York",
        accentColor: colorInput.value || "#00f3ff",
        brightness: brightInput.value || "100",
        screensaverTimeout: screensaverInput.value || "0"
    };

    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfig)
        });

        if (res.ok) {
            userConfig = newConfig;
            applyConfig();
            setupScreensaver(); // Refresh timer
            updateWeather(); // Refresh weather for new city
            toggleView('dashboard'); // Close settings
            alert("Settings Saved!");
        } else {
            const errText = await res.text();
            console.error("Server Error:", errText);
            alert("Server Failed to Save: " + errText);
        }
    } catch (e) {
        console.error("Save Error", e);
        alert("Error saving settings.");
    }
}

function applyConfig() {
    // Apply CSS Variables
    document.documentElement.style.setProperty('--accent-color', userConfig.accentColor);
    document.documentElement.style.setProperty('--accent-glow', userConfig.accentColor + '66'); // Add transparency

    // Apply Brightness
    document.body.style.filter = `brightness(${userConfig.brightness}%)`;

    // Update Inputs
    if (document.getElementById('setting-city'))
        document.getElementById('setting-city').value = userConfig.city;
    if (document.getElementById('setting-color'))
        document.getElementById('setting-color').value = userConfig.accentColor;
    if (document.getElementById('setting-brightness'))
        document.getElementById('setting-brightness').value = userConfig.brightness;
    if (document.getElementById('setting-screensaver'))
        document.getElementById('setting-screensaver').value = userConfig.screensaverTimeout;
}

async function updateWeather() {
    const display = document.getElementById('weather-display');
    console.log("Weather Update Triggered. City:", userConfig.city);

    if (!userConfig.city) {
        display.textContent = "No City Configured";
        return;
    }

    try {
        display.textContent = "Loading...";

        // 1. Geocode
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(userConfig.city)}&count=1&language=en&format=json`;
        console.log("Fetching Geo:", geoUrl);

        const geoRes = await fetch(geoUrl);
        if (!geoRes.ok) throw new Error("GeoAPI Network Error");

        const geoData = await geoRes.json();
        console.log("Geo Data:", geoData);

        if (!geoData.results || geoData.results.length === 0) {
            display.textContent = `City '${userConfig.city}' not found`;
            return;
        }

        const { latitude, longitude, name } = geoData.results[0];

        // 2. Weather
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
        console.log("Fetching Weather:", weatherUrl);

        const weatherRes = await fetch(weatherUrl);
        if (!weatherRes.ok) throw new Error("WeatherAPI Network Error");

        const weatherData = await weatherRes.json();
        console.log("Weather Data:", weatherData);

        const temp = weatherData.current_weather.temperature;
        display.textContent = `${name}: ${temp}°C`;

    } catch (e) {
        console.error("Weather Error:", e);
        display.textContent = "Weather Error: " + e.message;
    }
}

function startClock() {
    const timeEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');

    function update() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeEl.textContent = `${hours}:${minutes}`;

        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('en-US', options);
    }
    update();
    setInterval(update, 1000);
}

async function fetchSystemInfo() {
    try {
        const res = await fetch('/api/system');
        if (res.ok) {
            const data = await res.json();
            document.getElementById('ip-address').textContent = data.ip;
            if (data.temp) {
                const temp = data.temp;
                const load = data.load || "--%";
                const ram = data.ram || "--%";
                document.getElementById('cpu-temp').textContent = `CPU: ${temp} | Load: ${load} | RAM: ${ram}`;
            }
        }
    } catch (e) {
        document.getElementById('ip-address').textContent = "Offline";
    }
    setTimeout(() => {
        const overlay = document.getElementById('ip-overlay');
        const mainBox = document.getElementById('main-content-box');

        if (overlay) overlay.classList.add('fade-out');
        if (mainBox) mainBox.classList.add('visible');
    }, 15000);
}

function setupButtons() {
    // ACTION BUTTONS
    const buttons = document.querySelectorAll('.btn, .btn-small, .macro-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            handleAction(action);
        });
    });

    // SAVE BUTTON
    document.getElementById('save-settings').addEventListener('click', saveSettings);

    // Real-time Brightness Preview
    const brightInput = document.getElementById('setting-brightness');
    if (brightInput) {
        brightInput.addEventListener('input', (e) => {
            document.body.style.filter = `brightness(${e.target.value}%)`;
        });
    }
}

function handleAction(action) {
    console.log("Action:", action);
    switch (action) {
        case 'open-settings': toggleView('settings'); break;
        case 'close-settings': toggleView('dashboard'); break;
        case 'open-chat': toggleView('agent'); break;
        case 'close-chat': toggleView('dashboard'); break;
        case 'restart-ui': window.location.reload(); break;

        case 'system-shutdown':
            fetch('/api/shutdown', { method: 'POST' });
            alert("Shutting Down...");
            break;

        case 'system-reboot':
            fetch('/api/reboot', { method: 'POST' });
            alert("Rebooting...");
            break;

        case 'exit-app':
            fetch('/api/quit', { method: 'POST' });
            // No alert needed, browser will close
            break;
    }
}

function toggleView(viewName) {
    const dashboard = document.getElementById('dashboard-view');
    const agent = document.getElementById('agent-view');
    const settings = document.getElementById('settings-view');

    // Hide all
    dashboard.classList.add('hidden');
    agent.classList.add('hidden');
    settings.classList.add('hidden');

    // Show one
    if (viewName === 'agent') {
        agent.classList.remove('hidden');
        setTimeout(() => document.getElementById('chat-input').focus(), 100);
    } else if (viewName === 'settings') {
        settings.classList.remove('hidden');
    } else {
        dashboard.classList.remove('hidden');
    }
}

function setupChat() {
    const sendBtn = document.getElementById('send-btn');
    const input = document.getElementById('chat-input');
    const history = document.getElementById('chat-history');

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        appendMessage('user', text);
        input.value = '';

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            appendMessage('agent', data.response);
        } catch (e) {
            appendMessage('agent', "Error: Could not reach backend.");
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function appendMessage(sender, text) {
        const div = document.createElement('div');
        div.classList.add('msg', sender === 'user' ? 'user-msg' : 'agent-msg');
        div.textContent = text;
        history.appendChild(div);
        history.scrollTop = history.scrollHeight;
    }
}

function setupScreensaver() {
    // 1. Cleanup existing timers/listeners regardless of new setting
    if (window.screensaverResetTimer) {
        window.removeEventListener('keydown', window.screensaverResetTimer);
        window.removeEventListener('click', window.screensaverResetTimer);
        window.removeEventListener('mousemove', window.screensaverResetTimer);
        clearTimeout(window.screensaverTimerId);
        clearTimeout(window.screensaverMediaTimer);
        window.screensaverResetTimer = null;
    }

    // If timeout is 0 or "0", disable screensaver
    if (!userConfig.screensaverTimeout || userConfig.screensaverTimeout == "0") {
        console.log("Screensaver Disabled");
        return;
    }

    const TIMEOUT_MS = parseInt(userConfig.screensaverTimeout);
    const container = document.getElementById('screensaver-container');
    const video = document.getElementById('screensaver-video');
    const img = document.getElementById('screensaver-image');

    // Playlist State
    let playlist = [];
    let currentIndex = 0;

    // Fetch Playlist
    async function loadPlaylist() {
        try {
            const res = await fetch('/api/screensaver/playlist');
            if (res.ok) {
                const data = await res.json();
                playlist = data.playlist || [];
                console.log(`Playlist loaded: ${playlist.length} items`);
            }
        } catch (e) {
            console.error("Playlist Load Error", e);
        }
    }

    // Play Logic
    function playNext() {
        if (playlist.length === 0) return;

        const item = playlist[currentIndex];
        console.log("Playing:", item);

        // Hide all first (reset)
        video.classList.add('hidden');
        img.classList.add('hidden');

        if (item.type === 'video') {
            video.classList.remove('hidden');
            video.src = item.url;
            video.play().catch(e => console.log("Play Fail", e));
            // Listener for end is set below once globally
        } else {
            img.classList.remove('hidden');
            img.src = item.url;
            // For images, set timeout to next
            window.screensaverMediaTimer = setTimeout(() => {
                nextIndex();
                playNext();
            }, 10000); // 10 seconds per image
        }
    }

    function nextIndex() {
        currentIndex = (currentIndex + 1) % playlist.length;
    }

    // One-time listeners
    if (!window.screensaverInitDone) {
        video.addEventListener('ended', () => {
            nextIndex();
            playNext();
        });
        video.addEventListener('error', (e) => {
            console.log("Video Error, skipping", e);
            nextIndex();
            setTimeout(playNext, 1000);
        });
        window.screensaverInitDone = true;
    }


    let idleTimer;

    function resetTimer() {
        if (!container.classList.contains('hidden')) {
            container.classList.add('hidden');
            video.pause();
            video.src = ""; // Stop buffer
            clearTimeout(window.screensaverMediaTimer);
        }
        clearTimeout(idleTimer);
        idleTimer = setTimeout(showScreensaver, TIMEOUT_MS);
        window.screensaverTimerId = idleTimer;
    }

    async function showScreensaver() {
        await loadPlaylist(); // Reload playlist fresh
        if (playlist.length === 0) return;

        container.classList.remove('hidden');
        currentIndex = 0; // Restart from beginning? Or keep random? 
        // If random is enforced by backend shuffle, 0 is fine.
        playNext();
    }

    // Store reference to remove later
    window.screensaverResetTimer = resetTimer;

    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer); // Add click to wake
    window.addEventListener('mousemove', resetTimer); // Add mousemove to wake
    resetTimer();
    console.log(`Screensaver Active: ${TIMEOUT_MS}ms`);
}

async function fetchMessage() {
    const el = document.getElementById('message-content');
    if (!el) return;
    try {
        const res = await fetch('/api/message');
        if (res.ok) {
            const data = await res.json();
            el.innerHTML = data.content.replace(/\n/g, "<br>");
        }
    } catch (e) {
        console.error("Message Fetch Error", e);
    }
}




