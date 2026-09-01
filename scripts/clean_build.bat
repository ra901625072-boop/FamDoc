@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo                      FamDoc Clean Build Utility
echo ==============================================================================
echo.

pushd "%~dp0..\android"

if exist "gradlew.bat" (
    call gradlew.bat clean
) else (
    call gradle clean
)

popd

:: Clean builds directory
if exist "%~dp0..\builds\debug" rmdir /s /q "%~dp0..\builds\debug"
if exist "%~dp0..\builds\release" rmdir /s /q "%~dp0..\builds\release"

echo.
echo [OK] Build artifacts and caches cleaned successfully.
echo.
exit /b 0
