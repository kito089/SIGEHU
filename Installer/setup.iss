[Setup]
AppName = SIGEHU
AppVersion = 1.0.0
AppPublisher = SIGEHU

DefaultDirName={autopf}\SIGEHU
DefaultGroupName=SIGEHU

OutputDir=Output
OutputBaseFilename=SIGEHU_Setup

Compression=lzma
SolidCompression=yes

PrivilegesRequired=admin

WizardStyle=modern

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Files]

; Electron
Source: "..\SIGEHUFront\dist-electron\win-unpacked*"; 
DestDir: "{app}"; 
Flags: recursesubdirs createallsubdirs ignoreversion

; Backend
Source: "..\SIGEHUBack*"; 
DestDir: "{app}\SIGEHUBack"; 
Flags: recursesubdirs createallsubdirs ignoreversion

; Scripts
Source: "..\Scripts*.ps1"; 
DestDir: "{tmp}"; 
Flags: deleteafterinstall

[Icons]

Name: "{group}\SIGEHU"; Filename: "{app}\SIGEHU.exe"
Name: "{autodesktop}\SIGEHU"; Filename: "{app}\SIGEHU.exe"

[Run]

Filename: "powershell.exe"; 
Parameters: "-ExecutionPolicy Bypass -File ""{tmp}\01_validate_network.ps1"""; 
Flags: waituntilterminated runhidden

Filename: "powershell.exe"; 
Parameters: "-ExecutionPolicy Bypass -File ""{tmp}\02_setup_deps.ps1"" -InstallerDir ""{tmp}"""; 
Flags: waituntilterminated runhidden

[Code]

function InitializeSetup(): Boolean;
var
ResultCode: Integer;
begin
Result :=
Exec(
'powershell.exe',
'-ExecutionPolicy Bypass -File "' +
ExpandConstant('{tmp}\01_validate_network.ps1') + '"',
'',
SW_HIDE,
ewWaitUntilTerminated,
ResultCode);

if (not Result) or (ResultCode <> 0) then
begin
MsgBox(
'No se detectó conexión a Internet. La instalación no puede continuar.',
mbError,
MB_OK);

```
Result := False;
```

end
else
Result := True;
end;
[Tasks]
Name: "desktopicon"; Description: "Crear acceso directo en el escritorio"; GroupDescription: "Accesos directos:"
