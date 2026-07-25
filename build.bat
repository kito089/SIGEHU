@echo off
setlocal enabledelayedexpansion

echo ==============================
echo BUILD COMPLETO SIGEHU
echo ==============================

REM ==========================================
REM Limpiar carpeta Release
REM ==========================================

if exist Release (
    rmdir /S /Q Release
)

mkdir Release
mkdir Release\SIGEHUBack

echo.
echo ==============================
echo CARGA DE VARIABLES DE ENTORNO
echo ==============================
if not exist .env (
    echo ERROR: No se encontró el archivo .env
    exit /b 1
)
for /f "usebackq tokens=1,* delims==" %%A in (".env") do ( 
    set "%%A=%%B" 
    echo Variable de entorno cargada: %%A=%%B
)

echo.
echo ==============================
echo CARGA DE VARIABLES DE ENTORNO EN ARCHIVOS DE CONFIGURACION
echo ==============================
node apply-env.js || exit /b

echo.
echo 1. Copiando dependencias...
copy Dependences\zrok2.exe Release\SIGEHUBack\
echo.

echo.
echo 2. Construyendo Backend...
cd SIGEHUBack || exit /b
call npm install || exit /b
call node --experimental-sea-config sea-config.json || exit /b
call copy "C:\Program Files\nodejs\node.exe" build\sigehu-back.exe || exit /b
call npx postject build\sigehu-back.exe NODE_SEA_BLOB build\sigehu-back.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 || exit /b
echo.

echo Copiando Backend a Release...
cd ..
copy SIGEHUBack\build\sigehu-back.exe Release\SIGEHUBack\
xcopy SIGEHUBack\database Release\SIGEHUBack\database /E /I /Y
xcopy SIGEHUBack\firebird Release\SIGEHUBack\firebird /E /I /Y

echo.
echo 3. Construyendo Angular...
cd SIGEHUFront || exit /b
call npm install || exit /b
call ionic build --prod || exit /b
echo.

echo 4. Construyendo Electron...
call npm run dist || exit /b
echo.

echo Copiando Frontend a Release...
cd ..
xcopy SIGEHUFront\release\win-unpacked Release /E /I /Y
echo.

echo 5. Generando instalador...
cd Installer || exit /b
set INNO="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
%INNO% setup.iss || exit /b
cd ..

echo.
echo ==============================
echo BUILD COMPLETO TERMINADO
echo ==============================

pause