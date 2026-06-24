@echo off
echo ==============================
echo BUILD COMPLETO SIGEHU
echo ==============================

echo.
echo 1. Construyendo Backend...
cd SIGEHUBack || exit /b
call npm install || exit /b
call node --experimental-sea-config sea-config.json || exit /b
call cp "C:\Program Files\nodejs\node.exe" build\sigehu-back.exe || exit /b
call npx postject build\sigehu-back.exe NODE_SEA_BLOB build\sigehu-back.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 || exit /b

echo.
echo 2. Construyendo Angular...
cd ..\SIGEHUFront || exit /b
call npm install || exit /b
call ionic build --prod || exit /b

echo.
echo 3. Construyendo Electron...
call npm run dist || exit /b

echo.
echo 3. Generando instalador final...
cd ..\Installer || exit /b

REM Ruta de Inno Setup (ajusta si es necesario)
set INNO="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"

%INNO% setup.iss || exit /b

echo.
echo ==============================
echo BUILD COMPLETO TERMINADO
echo ==============================
pause