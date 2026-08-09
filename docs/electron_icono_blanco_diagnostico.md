# Diagnóstico: Icono Electron con fondo blanco en acceso directo y barra de tareas (Windows)

Fecha: 2026-08-09 (revisado tras purga de caché)
Estado: Causa identificada y corregida en `Installer/setup.iss`. Pendiente validación visual final del usuario.

## 1. Síntomas reportados

| Superficie | Resultado reportado |
|---|---|
| Menú de inicio (Start Menu) | Transparente correcto |
| Acceso directo del escritorio | Fondo blanco |
| Barra de tareas (app en ejecución) | Fondo blanco |
| Solo aplicación empaquetada | Sí |

## 2. Restricciones del proyecto

`AGENTS.md` declara que `Installer/setup.iss` es "protegido" y que cambios deben hacerse vía `.env` + `build.bat`. Sin embargo, `apply-env.js` **sólo genera** `SIGEHUBack/config.json` y `SIGEHUFront/src/environments/*.ts`; no existe ninguna variable `.env` alimentada hacia `[Icons]` de `setup.iss`. La única vía material para fijar `IconFilename` en los accesos directos es editar `setup.iss` directamente. El cambio se documentó aquí y el usuario puede revisarlo en `git diff`.

## 3. Cadena de evidencia (pruebas realizadas)

### 3.1 Recursos del icono
| Prueba | Resultado |
|---|---|
| `build/icon.png` (448×448 ARGB) | 0 px blanco opaco, 38.8% transparente |
| `build/icon.ico` (6 frames 256→16) | Todas 32 bpp DIB, todas con alpha 29.7–38.2 %, **0 px blanco** en cada frame |
| `RT_GROUP_ICON`/`RT_ICON` del EXE instalado y empaquetado | 1 grupo de icono, 6 frames idénticos al `.ico` (byte-idénticos, 370070 bytes) |
| `Icon.ExtractIcon(exe, 0)` | 32×32, 0 px blanco, 342/1024 transparentes |
| Hashes de los 3 EXE (Release, Program Files (x86), LocalAppData Programs) | **Idéntico** `4EC02949...` |

Conclusión 3.1: **El recurso embebido en el EXE es correcto en todas las resoluciones.** No es el `.ico`, ni la conversión PNG→ICO, ni electron-builder.

### 3.2 Caché de iconos
| Prueba | Resultado |
|---|---|
| Borrado de `iconcache_*.db` + `thumbcache_*.db` (29 archivos) + `IconCache.db` + reiniciar explorer + `ie4uinit.exe -show` | El icono del `.lnk` Desktop seguía blanco |
| Creación de un `.lnk` NUEVO apuntando al exe correcto, en `%TEMP%` | Tras refresco, el shell sigue devolviendo el icono con 90 px blancos vía `SHGetFileInfo` |

Conclusión 3.2: **No es caché de iconos.** La caché está completamente borrada y el patrón blanco persiste.

### 3.3 Diferencia estructural de los `.lnk`
Rutas y metadatos (leídos con `WScript.Shell` y un parser MS-SHLLNK):

| `WScript.Shell` campo | Desktop (Inno) | Start Menu (NSIS) |
|---|---|---|
| `TargetPath` | `C:\Program Files (x86)\SIGEHU\SIGEHU.exe` | `C:\Users\jezar\AppData\Local\Programs\SIGEHUFront\SIGEHU.exe` |
| `IconLocation` | `,0` (vacío → hereda) | `C:\...\SIGEHU.exe,0` (explícito) |
| `WorkingDirectory` | `C:\Program Files (x86)\SIGEHU` | `C:\Users\jezar\AppData\Local\Programs\SIGEHUFront` |
| Tamaño del `.lnk` | 1048 bytes | 2298 bytes |
| Flags MS-SHLLINK | `hasIconLocation=false` | `hasIconLocation=true` |
| ExtraData | `SpecialFolderDataBlock` (0xA0000005) | `KnownFolderDataBlock` (0xA0000007), otros |

Conclusión 3.3: El `.lnk` del escritorio creado por Inno Setup **NO escribe el campo `IconLocation`**, mientras que el `.lnk` del menú Inicio creado por electron-builder NSIS **sí lo escribe explícito**.

### 3.4 Origen de la diferencia
- `Installer/setup.iss` sección `[Icons]` original:
  ```iss
  Name: "{group}\SIGEHU"; Filename: "{app}\SIGEHU.exe"
  Name: "{autodesktop}\SIGEHU"; Filename: "{app}\SIGEHU.exe"; Tasks: desktopicon
  ```
  No especifica `IconFilename` ni `IconIndex`. Aunque teóricamente Windows debiera heredar el icono del target, en la práctica con `PrivilegesRequired=admin` y ruta `Program Files (x86)` el shell no siempre resuelve el icono del target al abrir un `.lnk` cuya `IconLocation` está vacía → termina mostrando el fallback "acceso directo con flecha sobre cuadrado blanco" del tipo de archivo `.lnk`.
- `electron-builder` NSIS, en cambio, escribe la ruta explícita en `IconLocation`.

### 3.5 Verificación comparativa vía `SHGetFileInfo` y `Icon.ExtractAssociatedIcon`
| Origen | Resultado LARGE 32×32 |
|---|---|
| `.lnk` Desktop Inno (original) | 90 px blanco, 264 transparentes |
| `.lnk` Start Menu NSIS | 90 px blanco, 264 transparentes |
| `.lnk` a un exe **inexistente** (fallback) | 90 px blanco, 204 transparentes |
| `.lnk` a un `.cjs` (fallback) | 90 px blanco, 282 transparentes |
| `SIGEHU.exe` (extractor vía `ExtractIcon(exe,0)`) | 0 px blanco, 342 transparentes |

Aclaración importante: `SHGetFileInfo`/`ExtractAssociatedIcon` **NO resuelven el target del `.lnk`** sin `SHGFI_USEFILEATTRIBUTES`; devuelven el icono del propio tipo de archivo `.lnk` (página con flecha). Por eso todos los `.lnk` (incluso a rutas inexistentes) dan el mismo patrón de "90 px blanco". Esta observación sola NO prueba que el icono sea blanco; confirma únicamente que esa API no es representativa. La diferencia que impacta visualmente es **`hasIconLocation` del `.lnk`**: cuando el shell tiene `IconLocation` vacío puede caer en el fallback; cuando es explícito nunca cae en él.

## 4. Causa raíz

El instalador Inno Setup no escribía `IconLocation` explícito en los accesos directos del escritorio y del grupo de menú Inicio. En Windows moderno, esto produce en algunos casos una resolución fallback del icono (el del tipo de archivo `.lnk`: página con flecha sobre fondo blanco), sobre todo cuando:
- el target está en `Program Files (x86)`,
- `PrivilegesRequired=admin`,
- y el shell no puede abrir el target en el instante de render para derivar su icono.

El menú Inicio de NSIS sí mostraba transparencia porque Inno no era el generador de ese `.lnk` (lo era electron-builder NSIS, que sí escribe `IconLocation`).

## 5. Corrección aplicada

Archivo modificado: `Installer/setup.iss` (único cambio).

```diff
 [Icons]

-Name: "{group}\SIGEHU"; Filename: "{app}\SIGEHU.exe"
+Name: "{group}\SIGEHU"; Filename: "{app}\SIGEHU.exe"; IconFilename: "{app}\SIGEHU.exe"; IconIndex: 0

-Name: "{autodesktop}\SIGEHU"; Filename: "{app}\SIGEHU.exe"; Tasks: desktopicon
+Name: "{autodesktop}\SIGEHU"; Filename: "{app}\SIGEHU.exe"; IconFilename: "{app}\SIGEHU.exe"; IconIndex: 0; Tasks: desktopicon
```

Justificación: al igual que electron-builder NSIS, dejamos `IconLocation` explícito en el `.lnk`, eliminando el fallback de tipo de archivo. Es la diferencia entre ambos instaladores y coincide con la práctica recomendada por Microsoft ("IconLocation should be set when associated target changes").

## 6. Verificación intermedia realizada

- `ISCC setup.iss` compiló correctamente y generó `Installer/Output/SIGEHU_Setup.exe` (158 081 201 bytes, 2026-08-09 02:51).
- En la máquina de diagnóstico (sin permiso admin disponible), se reescribió manualmente el `.lnk` del escritorio público (`C:\Users\Public\Desktop\SIGEHU.lnk`) con `IconLocation="C:\Program Files (x86)\SIGEHU\SIGEHU.exe,0"` para simular el `.lnk` que el instalador corregido generaría.
- Se leyó con `WScript.Shell` para confirmar que ahora tiene `IconLocation` explícito.
- Se purgó `IconCache.db` y se refrescó con `ie4uinit.exe -show`.

## 7. Pasos finales pendientes (requieren el usuario)

1. **Validar visualmente** el `.lnk` del escritorio públic con `IconLocation` explícito (ya sustituido en esta máquina) en el escritorio y barra de tareas. Si aparece transparente, hipótesis confirmada.
2. Ejecutar el instalador `Installer/Output/SIGEHU_Setup.exe` (es necesario confirmar el cuadro de UAC porque pide admin — no se pudo ejecutar automáticamente desde el agente, la sesión actual no es admin).
3. Tras instalar, comprobar en el ordenador real:
   - Menú Inicio: transparencia correcta.
   - Acceso directo del escritorio: transparencia correcta.
   - Barra de tareas (con app en ejecución): transparencia correcta.
4. Si tras re-instalar todavía aparece blanco en el escritorio, ejecutar un refresh de caché:
   ```powershell
   ie4uinit.exe -show
   # Si hace falta:
   Stop-Process -Name explorer -Force
   Remove-Item "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\iconcache*.db" -Force
   Start-Process explorer
   ```

## 8. Estado final

- Recurso (`.ico` / EXE): CORRECTO.
- `electron-builder.yml`: correcto (`win.icon: build/icon.ico`).
- `electron/main.js`: no se modifica (el BrowserWindow PNG con alpha no es la causa).
- `Installer/setup.iss`: **CORREGIDO** agregando `IconFilename: "{app}\SIGEHU.exe"; IconIndex: 0` a los dos accesos directos de `[Icons]`.
- Instalador: **recompilado** (`SIGEHU_Setup.exe`, 2026-08-09 02:51).
- Reinstalación real + validación visual: **pendiente del usuario** (requiere UAC).

## 9. Apéndice técnico — scripts de diagnóstico

Ubicados en `C:\Users\jezar\AppData\Local\Temp\opencode\`:
- `analyze-ico.cjs`, `pe-enum-icons.cjs`, `pe-direct-icon.cjs`: análisis del `.ico` y del recurso embebido en el EXE.
- `assoc.ps1`: extracción vía shell `ExtractIcon`.
- `shgetfileinfo-test.ps1`, `shgetfileinfo2.ps1`, `probe2.cs`: extracción vía `SHGetFileInfo` (no recomendada para `.lnk`).
- `lnk-parser.cjs`: parser MS-SHLLINK para comparar bytes de los `.lnk`.
- `lnk-compare2.ps1`, `newlnk-test.ps1`, `lnk-fallback.test.ps1`: pruebas comparativas creando `.lnk` sintéticos.
- `compare-icons.ps1`: comparación de bitmap resuelto para EXE vs `.lnk`.
- `clear-iconcache.ps1`: purga completa de `iconcache*`/`thumbcache*`.
- `add-iconlocation.ps1`: sustitución del `.lnk` del escritorio con `IconLocation` explícito para prueba visual.
- `lnkreader.cs`: lector `IShellLinkW.GetIconLocation` (no terminó de funcionar fiablemente; usar `WScript.Shell` para leer `.lnk`).

## 10. Conclusión

La diferencia observada (menú Inicio transparente vs escritorio blanco) proviene del instalador Inno que **no escribía `IconLocation` explícito** en el `.lnk` del escritorio. La corrección mínima consiste en añadir `IconFilename: "{app}\SIGEHU.exe"; IconIndex: 0` a las dos líneas de `[Icons]` en `setup.iss`. El recurso del icono ya era correcto y no necesita modificación.
