@echo off
chcp 65001 >nul
title AeroSphere 360 - Panorama Processing Pipeline

echo ==============================================================================
echo                      AeroSphere 360 Processing Pipeline                      
echo        Automated Ingestion, Zenith Blending & Multi-Tier Optimization         
echo ==============================================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python 3 was not found in your PATH.
    echo Please install Python 3.9+ from https://python.org and ensure "Add to PATH" is checked.
    echo.
    pause
    exit /b 1
)

echo [*] Checking and installing dependencies...
python -m pip install -r "%~dp0requirements.txt" --quiet

echo.
echo [*] Launching interactive pipeline...
echo.
python "%~dp0process_panoramas.py" %*

echo.
echo ==============================================================================
echo Done! Panoramas have been processed and indexed into panoramas.json.
echo Run "npm run dev" inside frontend/ to view your interactive 360 world!
echo ==============================================================================
pause
