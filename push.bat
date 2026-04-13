@echo off
if "%~1"=="" (
    echo Usage: push.bat "commit message"
    echo Example: push.bat "feat: add new feature"
    pause
    exit /b 1
)
powershell -ExecutionPolicy Bypass -File "%~dp0push.ps1" -Message "%~1"
pause