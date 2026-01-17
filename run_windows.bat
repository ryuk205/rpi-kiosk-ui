@echo off
echo ==========================================
echo   Starting Kiosk Preview (Windows Mode)
echo ==========================================

cd backend

:: Start the server in a new window so we can see logs
start "Kiosk Backend" cmd /k "python server.py"

:: Wait a moment for server to boot
timeout /t 3 /nobreak >nul

:: Open the default browser
start http://localhost:8000

echo.
echo Preview running! 
echo Close the backend window to stop the server.
pause
