import { Injectable, inject } from '@angular/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { EnvService } from '../../services/env.service';
import { LogService } from './log.service';

export interface OpenResult {
  opened: boolean;
  fallback: 'system' | 'browser' | 'none';
  message?: string;
}

/**
 * plataforma para abrir un Blob fuera del WebView:
 *
 *  - Web:    descarga el archivo (única opción del navegador; no puede forzar
 *            una aplicación nativa externa).
 *  - Electron: escribe el Blob en un archivo temporal bajo `app.getPath('temp')`
 *            y delega la apertura al SO por IPC `sigehu:open-path` (que usa
 *            `shell.openPath`). No abre ventanas externas — el handler de main
 *            usa la aplicación predeterminada del sistema.
 *  - Android (Capacitor): persiste el Blob en el fs del app y lo entrega al
 *            selector/aplicación predeterminada del sistema mediante
 *            `@capacitor/share`.
 *
 * Seguridad:
 *  - No acepta rutas proporcionadas por el usuario: el nombre siempre se
 *    sanitiza y el archivo se escribe dentro del directorio temporal del
 *    sistema o dentro del sandbox de la aplicación.
 *  - No desactiva webSecurity ni nodeIntegration.
 */
@Injectable({ providedIn: 'root' })
export class PlatformOpenerService {
  private env = inject(EnvService);
  private log = inject(LogService);

  async openExternally(blob: Blob, filename: string, mimeType: string): Promise<OpenResult> {
    const safeName = sanitizeFilename(filename);

    if (this.env.isElectron) {
      return this.openViaElectron(blob, safeName);
    }

    if (this.env.isCapacitor) {
      return this.openViaCapacitor(blob, safeName, mimeType);
    }

    return this.openViaBrowser(blob, safeName, mimeType);
  }

  private async openViaElectron(blob: Blob, filename: string): Promise<OpenResult> {
    const desktop = (window as any).sigehuDesktop as
      | { openPath?: (name: string, base64: string, mime: string) => Promise<{ ok: boolean; error?: string }> }
      | undefined;

    if (!desktop || typeof desktop.openPath !== 'function') {
      this.log.error('Electron IPC sigehu:open-path no expuesto por preload');
      return { opened: false, fallback: 'browser', message: 'Puente de escritorio no disponible' };
    }

    try {
      const base64 = await blobToBase64(blob);
      const res = await desktop.openPath(filename, base64.split(',')[1] ?? '', blob.type);
      if (!res?.ok) {
        return { opened: false, fallback: 'none', message: res?.error || 'No se pudo abrir el archivo' };
      }
      return { opened: true, fallback: 'system' };
    } catch (err) {
      this.log.error('Fallo al abrir vía Electron:', err);
      return { opened: false, fallback: 'none', message: (err as Error)?.message || 'Error inesperado' };
    }
  }

  private async openViaCapacitor(blob: Blob, filename: string, mimeType: string): Promise<OpenResult> {
    try {
      const base64 = (await blobToBase64(blob)).split(',')[1] ?? '';
      // Sin `encoding`, Capacitor interpreta `data` como base64 y la decodifica
      // correctamente antes de escribir a disco. `Encoding.Base64` no existe
      // en @capacitor/filesystem v8 (el enum expone solo UTF8/ASCII/UTF16).
      const writeRes = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
      });

      let uri = writeRes.uri;
      try {
        const conv = await Filesystem.getUri({ directory: Directory.Cache, path: filename });
        if (conv?.uri) uri = conv.uri;
      } catch {
        /* getUri puede fallar en plataformas viejas; usamos el de writeFile */
      }

      const canShare = await Share.canShare();
      if (!canShare.value) {
        return { opened: false, fallback: 'none', message: 'El dispositivo no permite abrir el archivo' };
      }

      await Share.share({
        url: uri,
        title: 'Abrir documento',
        dialogTitle: 'Abrir documento con…',
      });

      return { opened: true, fallback: 'system' };
    } catch (err) {
      this.log.error('Fallo al abrir vía Capacitor:', err);
      return { opened: false, fallback: 'none', message: (err as Error)?.message || 'Error inesperado' };
    }
  }

  private openViaBrowser(blob: Blob, filename: string, mimeType: string): OpenResult {
    // El navegador no puede forzar la apertura con una app externa: el único
    // comportamiento permitido es descargar el archivo (o mostrarlo en una
    // pestaña nueva si el MIME es navegable). Para respetar "no abrir el
    // navegador como mecanismo de apertura", aquí disparamos la descarga.
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    void mimeType;
    return { opened: true, fallback: 'browser' };
  }
}

function sanitizeFilename(name: string): string {
  const base = (name || 'documento').split(/[\\/]/).pop() || 'documento';
  return base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'documento';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('FileReader falló'));
    reader.readAsDataURL(blob);
  });
}
