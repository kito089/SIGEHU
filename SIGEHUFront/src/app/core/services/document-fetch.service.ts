import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EnvService } from '../../services/env.service';
import { AuthService } from '../../services/auth.service';

export type DocKind = 'image' | 'pdf' | 'unknown';

export interface FetchedDocument {
  blob: Blob;
  mimeType: string;
  kind: DocKind;
  filename: string;
}

/**
 * Obtiene un documento (IMSS u otro) del backend como `Blob` autenticado,
 * determina su MIME/clipType real y lo clasifica en `image | pdf | unknown`.
 *
 * Acepta tres orígenes para `source`:
 *   - URL absoluta http(s)://... del backend
 *   - Ruta relativa `uploads/imss/...` (se concatena con EnvService.getBaseUrl())
 *   - URL `blob:` generada localmente (se devuelve sin descargar)
 *
 * La autenticación va en el header `Authorization: Bearer <token>` aunque el
 * mount de `/uploads` sea público — asegura consistencia si en el futuro el
 * endpoint se protege. El backend ignora el token en `/uploads`.
 */
@Injectable({ providedIn: 'root' })
export class DocumentFetchService {
  private http = inject(HttpClient);
  private env = inject(EnvService);
  private auth = inject(AuthService);

  async fetch(source: string | Blob, filename?: string): Promise<FetchedDocument> {
    if (source instanceof Blob) {
      const name = filename || 'documento';
      const mime = source.type || guessMimeFromName(name) || 'application/octet-stream';
      return { blob: source, mimeType: mime, kind: classify(mime, name), filename: name };
    }

    if (!source) {
      throw new DocFetchError('Sin ruta de documento', 'empty');
    }

    const raw = String(source).trim();

    // Blob URL (preview local antes de subir).
    if (/^blob:/i.test(raw)) {
      const resp = await fetch(raw);
      if (!resp.ok) throw new DocFetchError('No se pudo leer el archivo local', 'local');
      const blob = await resp.blob();
      const name = filename || 'documento';
      const mime = blob.type || guessMimeFromName(name) || 'application/octet-stream';
      return { blob, mimeType: mime, kind: classify(mime, name), filename: name };
    }

    // URL absoluta con esquema conocido.
    if (/^(https?:|data:|capacitor:|file:)/i.test(raw)) {
      return this.fetchByHttp(raw, filename || extractFilename(raw));
    }

    // Ruta relativa: concatenar con baseUrl del backend.
    const base = (this.env.getBaseUrl() || '').replace(/\/+$/, '');
    const slash = raw.replace(/^\/+/, '');
    const url = `${base}/${slash}`;
    return this.fetchByHttp(url, filename || extractFilename(raw));
  }

  private async fetchByHttp(url: string, filename: string): Promise<FetchedDocument> {
    const token = this.auth.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    headers['Accept'] = 'image/*, application/pdf, */*';

    try {
      const blob = await firstValueFrom(
        this.http.get(url, { headers, responseType: 'blob', observe: 'response' })
      );
      if (!blob.body) {
        throw new DocFetchError('El servidor no devolvió contenido', 'empty');
      }
      const mimeHeader = (blob.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
      const mime = mimeHeader && mimeHeader !== 'application/octet-stream'
        ? mimeHeader
        : (guessMimeFromName(filename) || blob.body.type || 'application/octet-stream');
      return {
        blob: blob.body,
        mimeType: mime,
        kind: classify(mime, filename),
        filename,
      };
    } catch (err) {
      throw mapHttpError(err);
    }
  }
}

export class DocFetchError extends Error {
  constructor(message: string, public readonly reason: 'http' | 'notfound' | 'auth' | 'network' | 'empty' | 'local' | 'unknown') {
    super(message);
    this.name = 'DocFetchError';
  }
}

function classify(mime: string, filename: string): DocKind {
  const m = mime.toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m === 'application/pdf' || /\.(pdf)$/i.test(filename)) return 'pdf';
  return 'unknown';
}

function guessMimeFromName(name: string): string | null {
  const ext = (name.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'pdf': return 'application/pdf';
    default: return null;
  }
}

function extractFilename(url: string): string {
  const clean = url.split('?')[0].split('#')[0];
  const parts = clean.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'documento';
}

function mapHttpError(err: unknown): DocFetchError {
  if (err instanceof DocFetchError) return err;
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return new DocFetchError('No se pudo conectar con el servidor', 'network');
    if (err.status === 401) return new DocFetchError('Sesión expirada: vuelve a iniciar sesión', 'auth');
    if (err.status === 403) return new DocFetchError('No tienes permiso para ver este documento', 'auth');
    if (err.status === 404) return new DocFetchError('El documento no existe en el servidor', 'notfound');
    if (err.status >= 500) return new DocFetchError('Error del servidor al obtener el documento', 'http');
    return new DocFetchError(`Error HTTP ${err.status} al descargar el documento`, 'http');
  }
  const msg = (err as Error)?.message || 'Error inesperado al descargar el documento';
  return new DocFetchError(msg, 'unknown');
}
