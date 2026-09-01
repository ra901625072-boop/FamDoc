@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo                 FamDoc Android Production Release Builder
echo ==============================================================================
echo.

:: 1. Run environment check
call "%~dp0setup_android.bat"
if %errorlevel% neq 0 (
    echo [ERROR] Environment check failed.
    exit /b %errorlevel%
)

:: 2. Ensure builds/release output directory exists
set "OUTPUT_DIR=%~dp0..\builds\release"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

:: 3. Change directory to android
pushd "%~dp0..\android"

echo.
echo [BUILD] Compiling Release APK and Google Play App Bundle (AAB)...
echo Running: gradlew.bat assembleRelease bundleRelease

if exist "gradlew.bat" (
    call gradlew.bat assembleRelease bundleRelease
) else (
    call gradle assembleRelease bundleRelease
)

if %errorlevel% neq 0 (
    echo [ERROR] Release build failed with exit code %errorlevel%!
    popd
    exit /b %errorlevel%
)

popd

:: 4. Locate and Copy Release Artifacts
set "SRC_RELEASE_APK=%~dp0..\android\app\build\outputs\apk\release\app-release-unsigned.apk"
if not exist "%SRC_RELEASE_APK%" (
    set "SRC_RELEASE_APK=%~dp0..\android\app\build\outputs\apk\release\app-release.apk"
)

set "SRC_RELEASE_AAB=%~dp0..\android\app\build\outputs\bundle\release\app-release.aab"

set "DEST_APK=%OUTPUT_DIR%\FamDoc-release.apk"
set "DEST_AAB=%OUTPUT_DIR%\FamDoc-release.aab"

if exist "%SRC_RELEASE_APK%" (
    copy /y "%SRC_RELEASE_APK%" "%DEST_APK%" >nul
    echo [OK] Copied Release APK to: %DEST_APK%
)

if exist "%SRC_RELEASE_AAB%" (
    copy /y "%SRC_RELEASE_AAB%" "%DEST_AAB%" >nul
    echo [OK] Copied Release AAB to: %DEST_AAB%
)

echo.
echo ==============================================================================
echo                   PRODUCTION RELEASE BUILD COMPLETE!
echo ==============================================================================
echo.
echo Artifacts available in: %OUTPUT_DIR%
echo   - APK: %DEST_APK%
echo   - AAB: %DEST_AAB%
echo.
exit /b 0
