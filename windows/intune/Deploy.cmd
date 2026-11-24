@echo off
setlocal
if /i "%~1"=="install" (
    set "script=Install-Klassenalarm.ps1"
) else if /i "%~1"=="uninstall" (
    set "script=Uninstall-Klassenalarm.ps1"
) else (
    exit /b 1
)
set "engine=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if exist "%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe" set "engine=%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe"
"%engine%" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0%script%"
exit /b %errorlevel%
