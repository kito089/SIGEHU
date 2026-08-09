;Leer variables de entorno
#define CLOUDFLARE_TOKEN GetEnv("CLOUDFLARE_TOKEN")

[Setup]
AppName=SIGEHU
AppVersion=1.0.0
AppPublisher=SIGEHU

DefaultDirName={autopf}\SIGEHU
DefaultGroupName=SIGEHU

OutputDir=Output
OutputBaseFilename=SIGEHU_Setup

SetupIconFile=..\SIGEHUFront\build\icon.ico

Compression=lzma
SolidCompression=yes

PrivilegesRequired=admin

WizardStyle=modern

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear acceso directo en el escritorio"; GroupDescription: "Accesos directos:"

[Files]

Source: "..\Release\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]

Name: "{group}\SIGEHU"; Filename: "{app}\SIGEHU.exe"; IconFilename: "{app}\SIGEHU.exe"; IconIndex: 0

Name: "{autodesktop}\SIGEHU"; Filename: "{app}\SIGEHU.exe"; IconFilename: "{app}\SIGEHU.exe"; IconIndex: 0; Tasks: desktopicon

[Run]
Filename: "{cmd}"; Parameters: "/C winget install Cloudflare.cloudflared"; Flags: runhidden
Filename: "{cmd}"; Parameters: "/C cloudflared.exe service install {#CLOUDFLARE_TOKEN}"; Flags: runhidden