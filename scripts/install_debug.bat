@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo                      Install FamDoc Debug APK via ADB
echo ==============================================================================
echo.

:: 1. Locate ADB
if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set "ADB_EXE=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
) else if not "%ANDROID_HOME%"=="" (
    if exist "%ANDROID_HOME%\platform-tools\adb.exe" (
        set "ADB_EXE=%ANDROID_HOME%\platform-tools\adb.exe"
    )
) else (
    where adb >nul 2>nul
    if %errorlevel% equ 0 set "ADB_EXE=adb"
)

if "%ADB_EXE%"=="" (
    echo [ERROR] ADB not found in standard Android SDK location!
    exit /b 1
)

:: 2. Check Device Connection
echo [1/2] Checking connected Android devices...
"%ADB_EXE%" devices
echo.

:: 3. Install APK
set "APK_PATH=%~dp0..\builds\debug\FamDoc-debug.apk"
if not exist "%APK_PATH%" (
    echo [ERROR] Debug APK not found at: %APK_PATH%
    echo Please run scripts\build_apk.bat first.
    exit /b 1
)

echo [2/2] Installing FamDoc Debug APK on connected device...
"%ADB_EXE%" install -r "%APK_PATH%"

if %errorlevel% equ 0 (
    echo.
    echo ==============================================================================
    echo                   SUCCESS: FamDoc Installed on Device!
    echo ==============================================================================
    echo Launching FamDoc on device...
    "%ADB_EXE%" shell monkey -p com.famdoc.app -c android.intent.category.LAUNCHER 1 >nul 2>&1
) else (
    echo.
    echo [ERROR] Installation failed. Ensure your phone is connected and "USB Debugging" is enabled.
)

echo.
exit /b %errorlevel%
