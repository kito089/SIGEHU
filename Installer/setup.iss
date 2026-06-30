[Setup]
AppName=SIGEHU
AppVersion=1.0.0
AppPublisher=SIGEHU

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

[Tasks]
Name: "desktopicon"; Description: "Crear acceso directo en el escritorio"; GroupDescription: "Accesos directos:"

[Files]

Source: "..\Release\*";
DestDir: "{app}";
Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]

Name: "{group}\SIGEHU"; Filename: "{app}\SIGEHU.exe"

Name: "{autodesktop}\SIGEHU"; Filename: "{app}\SIGEHU.exe"; Tasks: desktopicon