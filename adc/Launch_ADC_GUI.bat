@echo off
cd /d "%~dp0"
where py >nul 2>&1
if %ERRORLEVEL%==0 (
    py gui_main.py
) else (
    python gui_main.py
)
if errorlevel 1 pause
