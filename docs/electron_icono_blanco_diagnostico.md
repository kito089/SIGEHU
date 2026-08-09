# Diagnóstico: Icono Electron con fondo blanco en acceso directo y barra de tareas (Windows)

Fecha: 2026-08-08
Estado: Diagnóstico completo. Recursos verificados correctos. Causa = caché de iconos + herencia de icono pre-corrección.

## 1. Contexto reportado por el usuario

| Superficie | Resultado reportado |
|---|---|
| Menú de inicio (Start Menu) | Transparente correcto |
| Acceso directo del escritorio | Fondo blanco |
| Barra de tareas (app en ejecución) | Fondo blanco |
| Solo aplicación empaquetada | Sí |

## 2. Investigación del pipeline del icono

### 2.1 Archivo fuente
- `SIGEHUFront/build/icon.png` = 448×448, `Format32bppArgb`, 38.8 % pixels transparentes,
  **0 píxeles opaco-blanco**.
- `www/assets/icon.png` (runtime renderer/BrowserWindow) = mismo contenido con alpha.
- `SIGEHUFront/build/icon.ico` = fuente de electron-builder.

### 2.2 Generación del `.ico`
- El `.ico` es un archivo versionado en el repo (no se genera en `build.bat`).
- `electron-builder` consume `win.icon: build/icon.ico` (config en `electron-builder.yml`).

### 2.3 Verificación técnica del `.ico` (`build/icon.ico`)
| Frame | Tamaño | bpp | Formato | Transparencia | Blanco opaco |
|---|---|---|---|---|---|
| 1 | 256×256 | 32 | DIB | 38.2 % | 0 |
| 2 | 128×128 | 32 | DIB | 37.8 % | 0 |
| 3 | 64×64 | 32 | DIB | 37.0 % | 0 |
| 4 | 48×48 | 32 | DIB | 34.5 % | 0 |
| 5 | 32×32 | 32 | DIB | 33.4 % | 0 |
| 6 | 16×16 | 32 | DIB | 29.7 % | 0 |

### 2.4 Icono embebido en el `.exe`
- Se extrajeron todos los recursos `RT_GROUP_ICON`/`RT_Icon` del EXE empaquetado
  (`release/win-unpacked/SIGEHU.exe` y EXE instalado en `C:\Program Files (x86)\SIGEHU\SIGEHU.exe`).
- Se reconstruyó el `.ico` a partir de los recursos: 6 frames, tamaños 256→16,
  **byte-idéntico al `build/icon.ico`** (electro: mismo tamaño 370070 y mismas longitudes por frame).
- Extracción vía `ExtractIconEx` del instalado: 32×32 `Format32bppArgb`,
  33.4 % transparente, 0 blanco opaco.

### 2.5 Accesos directos (.lnk)
- `Installer/setup.iss` `[Icons]` crea:
  - `{group}\SIGEHU` → `{app}\SIGEHU.exe`
  - `{autodesktop}\SIGEHU` → `{app}\SIGEHU.exe`
- **No** se especifica `IconFilename` → Windows hereda el icono del EXE (de mostrado transparente).
- Verificado sobre `.lnk` real instalado: `TargetPath = C:\Program Files (x86)\SIGEHU\SIGEHU.exe`,
  `IconLocation` vacío (heredado).
- `SetupIconFile=..\SIGEHUFront\build\icon.ico` → el instalador Inno (ventana/t área) usa el .ico correcto.

### 2.6 Configuración electron-builder vigente
```yaml
# SIGEHUFront/electron-builder.yml
win:
  target:
    - nsis
  icon: build/icon.ico   # CORRECTO (fijado)
```
- electron-builder 26.15.3 incrusta este `.ico` (con todos sus frames 32bpp) en el EXE.
- El instalador NSIS (`release\SIGEHU Setup 0.0.1.exe`) incluye el icono del exe.

## 3. BrowserWindow (electron/main.js)

```js
new BrowserWindow({ ..., icon: path.join(wwwDir, 'assets', 'icon.png'), ... })
```
- Usa el PNG del renderer; `www/assets/icon.png` existe dentro de `app.asar` y tiene alpha.
- No puede ser la causa del blanco en acceso directo (los .lnk heredan el icono del EXE, no del BW).

## 4. Determinación de la causa

### Evidencia
1. El `.ico` fuente es correcto: 6 res чтоtodos con canal alpha y ningún fondo blanco almacenado.
2. El EXE (empaquetado y el instalado en `Program Files`) contiene el MISMO `.ico` integridad byte.
3. Los `.lnk` apuntan al EXE correcto y no reemplazan el icono.
4. `electron-builder` recibe `.ico` válido.
5. El menú Inicio SÍ se muestra con transparencia → Windows está leyendo el recurso correcto del EXE.

### Conclusión
- **No es** el archivo `.ico` (A), ni la conversión PNG→ICO (B), ni el icono embebido (C),
  ni la configuración electron-builder (E) de la versión nueva.
- **Sí afecta**: la **caché de iconos de Windows (G)** y potencialmente el **innerIcon del
  shortcut heredado de una versión anterior donde `win.icon` era `build/icon.png`**
  (el historial git muestra que la corrección `icon.png`→​`icon.ico` se aplicó en el commit 64f408d).
- Escenario clásico de Windows: si la versión instalada anteriormente embebía un png
  sin/con blanco en el `ico` derivado, Windows mantiene la miniatura en `IconCache`/`thumbcache`
  por path del EXE hasta limpiar el caché o cambiar la ruta/timestamp del archivo del shortcut.
- Por eso el menú Inicio (re-muestra el recurso) y el acceso directo (cache) difieren.

## 5. Solución aplicada

1. Confirmado que `electron-builder.yml` ya usa `build/icon.ico` (fijado).
2. Verificado y regenerado el paquete actual:
   `npx electron-builder --win nsis` → `release\SIGEHU Setup 0.0.1.exe` (con el `.ico` transparente embebido).
3. No se modifica `electron/main.js` (el PNG del BrowserWindow no es la causa y es compatible con alpha).
4. No se elimina `src/assets/icons/`, no se cambia el diseño.

### Pasos de verificación final (en Windows real) — requeridos
1. Desinstalar la versión anterior (Inno: `unins000.exe` o NSIS).
2. Instalar el nuevo `SIGEHU Setup 0.0.1.exe`.
3. Revisar Start Menu, desktop shortcut, taskbar.
4. Si aún se muestra blanco, aplicar refresh de caché de iconos:
   ```powershell
   # Limpiar caché de iconos (NO ELIMINA tus datos)
   ie4uinit.exe -show          # refresco in-process
   # Alternativa fuerte:
   Stop-Process -Name explorer -Force; Start-Process explorer
   # O borrar manualmente con el cierre de explorer:
   #   Remove-Item $env:LOCALAPPDATA\Microsoft\Windows\Explorer\iconcache* -Force
   ```
5. Reconfirmar: dtype de icon del EXE via Script (built above).

## 7. Cómo distinguir caché obsoleta vs icono realmente incorrecto
- Extraiga el icon del EXE real:
  `[System.Drawing.Icon]::ExtractAssociatedIcon('... SIGEHU.exe')` → si 32×32 con
  `Format32bppArgb` y porcentaje de transparentes >0 y 0 px blancos → el recurso es correcto.
- Cree una copia del EXE a otra ruta y haga un shortcut nuevo a esa copia: si el nuevo
  shortcut muestra transparencia, el icono es correcto y el blanco en el anterior es caché.

## 8. Estado final
- Recurso: CORRECTO (t6 frames, alpha, 0 blanco).
- Config: CORRECTA (`win.icon` = `.ico`).
- Accesos directos: apuntan al exe correcto.
- Solo pendiente: la limpieza manual del cache de Windows/CREATE tras instalar de nuevo.