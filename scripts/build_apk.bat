@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo                      FamDoc Android Debug APK Builder
echo ==============================================================================
echo.

:: 1. Run environment check
call "%~dp0setup_android.bat"
if %errorlevel% neq 0 (
    echo [ERROR] Environment check failed.
    exit /b %errorlevel%
)

:: 2. Ensure builds/debug output directory exists
set "OUTPUT_DIR=%~dp0..\builds\debug"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

:: 3. Change directory to android
pushd "%~dp0..\android"

echo.
echo [BUILD] Building FamDoc Debug APK with Gradle...
echo Running: gradlew.bat assembleDebug

if exist "gradlew.bat" (
    call gradlew.bat assembleDebug
) else (
    call gradle assembleDebug
)

if %errorlevel% neq 0 (
    echo [ERROR] Gradle build failed with exit code %errorlevel%!
    popd
    exit /b %errorlevel%
)

popd

:: 4. Locate and Copy Generated APK
set "GENERATED_APK=%~dp0..\android\app\build\outputs\apk\debug\app-debug.apk"
set "FINAL_APK=%OUTPUT_DIR%\FamDoc-debug.apk"

if exist "%GENERATED_APK%" (
    copy /y "%GENERATED_APK%" "%FINAL_APK%" >nul
    echo.
    echo ==============================================================================
    echo                      BUILD SUCCEEDED!
    echo ==============================================================================
    echo.
    echo APK Location:
    echo   %FINAL_APK%
    echo.
    for %%F in ("%FINAL_APK%") do (
        echo File Size: %%~zF bytes
        echo Timestamp: %%~tF
    )
    echo.
    echo To install on a connected Android phone/emulator:
    echo   adb install -r "%FINAL_APK%"
    echo.
) else (
    echo [WARNING] Build completed but generated APK was not found at:
    echo   %GENERATED_APK%
)

exit /b 0
