@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo                      FamDoc Android Environment Setup
echo ==============================================================================
echo.

:: 1. Check Android SDK
echo [1/4] Checking Android SDK...
if not "%ANDROID_HOME%"=="" (
    set "SDK_PATH=%ANDROID_HOME%"
) else if not "%ANDROID_SDK_ROOT%"=="" (
    set "SDK_PATH=%ANDROID_SDK_ROOT%"
) else if exist "%LOCALAPPDATA%\Android\Sdk" (
    set "SDK_PATH=%LOCALAPPDATA%\Android\Sdk"
) else (
    echo [ERROR] Android SDK not found!
    echo Please install Android Studio or set ANDROID_HOME environment variable.
    exit /b 1
)
echo [OK] Android SDK detected at: %SDK_PATH%

:: Create or update local.properties in android directory
set "LOCAL_PROPS=%~dp0..\android\local.properties"
set "ESCAPED_SDK=%SDK_PATH:\=\\%"
echo sdk.dir=%ESCAPED_SDK%> "%LOCAL_PROPS%"
echo [OK] Configured android/local.properties

:: 2. Check Java JDK
echo.
echo [2/4] Checking Java JDK...
if "%JAVA_HOME%"=="" (
    for /d %%D in ("%ProgramFiles%\Eclipse Adoptium\jdk-*") do (
        if exist "%%D\bin\java.exe" set "JAVA_HOME=%%D"
    )
    for /d %%D in ("%ProgramFiles%\Java\jdk-*") do (
        if exist "%%D\bin\java.exe" set "JAVA_HOME=%%D"
    )
    for /d %%D in ("%ProgramFiles%\Microsoft\jdk-*") do (
        if exist "%%D\bin\java.exe" set "JAVA_HOME=%%D"
    )
    if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" (
        set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
    )
)

if not "%JAVA_HOME%"=="" (
    set "PATH=%JAVA_HOME%\bin;%PATH%"
    echo [OK] Using Java JDK at: %JAVA_HOME%
) else (
    where java >nul 2>nul
    if %errorlevel% equ 0 (
        for /f "tokens=3" %%g in ('java -version 2^>^&1 ^| findstr /i "version"') do (
            echo [OK] Java detected: %%g
        )
    ) else (
        echo [WARNING] Java not found in PATH.
        echo To install JDK 17 automatically via Windows Package Manager, run:
        echo   winget install EclipseAdoptium.Temurin.17.JDK
        echo Or download from: https://adoptium.net/temurin/releases/?version=17
    )
)

:: 3. Check ADB and Platform Tools
echo.
echo [3/4] Checking ADB and Platform Tools...
if exist "%SDK_PATH%\platform-tools\adb.exe" (
    echo [OK] ADB found at: %SDK_PATH%\platform-tools\adb.exe
) else (
    echo [WARNING] adb.exe not found in platform-tools.
)

:: 4. Verify Project Structure
echo.
echo [4/4] Verifying Android Project Structure...
if exist "%~dp0..\android\app\build.gradle.kts" (
    echo [OK] Android App module found.
) else (
    echo [ERROR] android/app/build.gradle.kts not found!
    exit /b 1
)

echo.
echo ==============================================================================
echo              Android Environment Setup Completed Successfully!
echo ==============================================================================
echo You can now build the application with:
echo   scripts\build_apk.bat       (Debug APK)
echo   scripts\build_release.bat   (Release APK and AAB)
echo.
exit /b 0
