@echo off
setlocal enabledelayedexpansion

title FamDoc APK Auto-Updater
echo ==============================================================================
echo                      FamDoc APK Auto-Update and Install
echo ==============================================================================
echo.

:: 1. Run environment check
call "%~dp0setup_android.bat"
if %errorlevel% neq 0 (
    echo [ERROR] Environment setup check failed.
    pause
    exit /b %errorlevel%
)

:: 2. Ensure builds/debug output directory exists
set "OUTPUT_DIR=%~dp0..\builds\debug"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

:: 3. Build latest Debug APK
echo.
echo ==============================================================================
echo [STEP 1/3] Building latest FamDoc APK with Gradle...
echo ==============================================================================
pushd "%~dp0..\android"

if exist "gradlew.bat" (
    call gradlew.bat assembleDebug
) else (
    call gradle assembleDebug
)

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Gradle build failed with exit code %errorlevel%!
    popd
    pause
    exit /b %errorlevel%
)
popd

:: 4. Locate and Copy Generated APK
set "GENERATED_APK=%~dp0..\android\app\build\outputs\apk\debug\app-debug.apk"
set "FINAL_APK=%OUTPUT_DIR%\FamDoc-debug.apk"

if not exist "%GENERATED_APK%" (
    echo.
    echo [ERROR] Generated APK was not found at: %GENERATED_APK%
    pause
    exit /b 1
)

copy /y "%GENERATED_APK%" "%FINAL_APK%" >nul
echo.
echo [OK] Updated APK generated successfully:
echo   %FINAL_APK%

:: 5. Locate ADB
echo.
echo ==============================================================================
echo [STEP 2/3] Checking for connected Android phone or emulator via ADB...
echo ==============================================================================
set "ADB_EXE="
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

set "DEVICE_FOUND=0"
if not "%ADB_EXE%"=="" (
    for /f "skip=1 tokens=1,2" %%A in ('"%ADB_EXE%" devices') do (
        if "%%B"=="device" (
            set "DEVICE_FOUND=1"
            set "DEVICE_ID=%%A"
        )
    )
)

:: 6. Update APK on device or open folder
echo.
echo ==============================================================================
echo [STEP 3/3] Updating Application...
echo ==============================================================================

if "%DEVICE_FOUND%"=="1" (
    echo [INFO] Detected connected Android device: !DEVICE_ID!
    echo [INFO] Updating FamDoc on device [preserving user session and data]...
    "%ADB_EXE%" install -r "%FINAL_APK%"
    if !errorlevel! equ 0 (
        echo.
        echo ==============================================================================
        echo               SUCCESS: FamDoc updated on your phone!
        echo ==============================================================================
        echo Launching FamDoc on phone...
        "%ADB_EXE%" shell monkey -p com.famdoc.app.debug -c android.intent.category.LAUNCHER 1 >nul 2>&1
        if !errorlevel! neq 0 (
            "%ADB_EXE%" shell monkey -p com.famdoc.app -c android.intent.category.LAUNCHER 1 >nul 2>&1
        )
    ) else (
        echo.
        echo [WARNING] ADB install returned an error. Ensure device is unlocked and permits USB install.
    )
) else (
    echo [INFO] No phone connected via USB debugging.
    echo.
    echo Opening output folder so you can copy the updated APK to your phone:
    explorer /select,"%FINAL_APK%"
    echo.
    echo Transfer instructions:
    echo   1. Send the file FamDoc-debug.apk to your phone.
    echo   2. Open the file on your phone and tap Update.
)

echo.
echo ==============================================================================
echo                               Done!
echo ==============================================================================
echo.
pause
exit /b 0
