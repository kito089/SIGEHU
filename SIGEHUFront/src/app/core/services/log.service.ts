import { Injectable, inject } from '@angular/core';
import { EnvService } from '../../services/env.service';
import { SigehuLog } from './sigehu-log.plugin';

/**
 * Niveles de severidad soportados por el sistema de logs.
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Categorías de trazabilidad. Permiten agrupar los registros (HTTP, autenticación,
 * navegación, backend, errores de entorno o de sistema).
 */
export type LogCategory = 'SYS' | 'HTTP' | 'AUTH' | 'NAV' | 'BACKEND' | 'ERROR';

export interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  detail?: unknown;
}

/**
 * Puente que expone el proceso main de Electron (via preload contextBridge) para
 * poder persistir los logs en un archivo. No está presente en web ni en móvil.
 */
interface ElectronLogBridge {
  write: (entry: { level: string; category: string; message: string; preformatted?: boolean }) => void;
}

/* istanbul ignore next */
declare global {
  interface Window {
    sigehuLog?: ElectronLogBridge;
  }
}

/**
 * Claves que jamás deben volcarse a los logs (contraseñas, tokens, secrets...).
 */
const SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  'password',
  'contraseña',
  'contrasena',
  'contra',
  'pass',
  'pwd',
  'token',
  'refreshtoken',
  'refresh_token',
  'authorization',
  'secret',
  'apikey',
  'api_key',
]);

const SENSITIVE_VALUE_PREFIXES = [
  'Bearer ',
];

const MAX_DETAIL_CHARS = 8000;

/**
 * Sistemas de logs centralizado y multiplataforma.
 *
 * Siempre emite a la consola (visible en Logcat en Android y en DevTools en web).
 * En Electron, además, envía cada entrada al proceso de main vía preload para
 * persistirla en un archivo de log.
 */
@Injectable({ providedIn: 'root' })
export class LogService {
  private env = inject(EnvService);

  private get hasElectronBridge(): boolean {
    return !!(typeof window !== 'undefined' && window.sigehuLog);
  }

  debug(msg: string, detail?: unknown, category: LogCategory = 'SYS'): void {
    this.emit({ level: 'DEBUG', category, message: msg, detail });
  }

  info(msg: string, detail?: unknown, category: LogCategory = 'SYS'): void {
    this.emit({ level: 'INFO', category, message: msg, detail });
  }

  warn(msg: string, detail?: unknown, category: LogCategory = 'SYS'): void {
    this.emit({ level: 'WARN', category, message: msg, detail });
  }

  error(msg: string, detail?: unknown, category: LogCategory = 'ERROR'): void {
    this.emit({ level: 'ERROR', category, message: msg, detail });
  }

  /**
   * Registra una petición HTTP saliente. Nunca se escriben credenciales ni tokens.
   */
  httpRequest(method: string, url: string, body?: unknown, query?: Record<string, unknown>): void {
    this.emit({
      level: 'INFO',
      category: 'HTTP',
      message: 'REQUEST',
      detail: {
        method: method.toUpperCase(),
        endpoint: this.extractPath(url),
        query: query && Object.keys(query).length > 0 ? this.sanitize(query) : undefined,
        body: this.sanitize(body),
      },
    });
  }

  /**
   * Registra la respuesta recibida con su código de estado y tiempo de respuesta.
   */
  httpResponse(method: string, url: string, statusCode: number, elapsedMs: number, result?: unknown): void {
    this.emit({
      level: statusCode >= 400 ? 'WARN' : 'INFO',
      category: 'HTTP',
      message: 'RESPONSE',
      detail: {
        method: method.toUpperCase(),
        endpoint: this.extractPath(url),
        status: statusCode,
        tiempo: `${elapsedMs} ms`,
        result: statusCode >= 400 ? undefined : this.sanitize(result),
      },
    });
  }

  /**
   * Registra un error HTTP con toda la información útil para depuración.
   */
  httpError(
    url: string,
    body: unknown,
    exception: unknown,
    httpCode: number,
    elapsedMs: number,
    response?: unknown
  ): void {
    this.emit({
      level: 'ERROR',
      category: 'HTTP',
      message: 'HTTP_ERROR',
      detail: {
        endpoint: this.extractPath(url),
        body: this.sanitize(body),
        excepcion: this.extractMessage(exception),
        stack: this.extractStack(exception),
        codigoHTTP: httpCode,
        tiempo: `${elapsedMs} ms`,
        response: this.sanitize(response),
      },
    });
  }

  /**
   * Registra eventos de autenticación sin exponer credenciales ni tokens.
   */
  auth(event: string, detail?: unknown, level: LogLevel = 'INFO'): void {
    this.emit({ level, category: 'AUTH', message: event, detail: this.sanitize(detail) });
  }

  /**
   * Registra una transición de pantalla relevante.
   */
  nav(from: string, to: string): void {
    this.emit({
      level: 'INFO',
      category: 'NAV',
      message: `${from || '(inicio)'} → ${to}`,
    });
  }

  /**
   * Registra eventos de conexión con el backend.
   */
  backend(event: string, detail?: unknown, level: LogLevel = 'INFO'): void {
    this.emit({ level, category: 'BACKEND', message: event, detail: this.sanitize(detail) });
  }

  private emit(entry: LogEntry): void {
    const text = this.format(entry);
    this.toConsole(entry.level, text);

    if (this.env.isCapacitor) {
      this.writeToNative(entry, text);
    } else if (this.hasElectronBridge) {
      this.writeToFile(entry, text);
    }
  }

  private writeToNative(entry: LogEntry, text: string): void {
    try {
      void SigehuLog.write({
        level: entry.level,
        category: entry.category,
        message: text,
      }).catch(() => undefined);
    } catch {
      // Nunca permitir que un fallo del puente nativo derribe la app.
    }
  }

  private writeToFile(entry: LogEntry, text: string): void {
    try {
      window.sigehuLog?.write({ level: entry.level, category: entry.category, message: text, preformatted: true });
    } catch {
      // Nunca permitir que un fallo de persistencia derribe la app.
    }
  }

  private toConsole(level: LogLevel, text: string): void {
    const prefixed = `[SIGEHU]${this.env.isCapacitor ? ' [Capacitor]' : ''}\n${text}`;
    switch (level) {
      case 'ERROR':
        console.error(prefixed);
        break;
      case 'WARN':
        console.warn(prefixed);
        break;
      case 'DEBUG':
        console.debug(prefixed);
        break;
      default:
        console.info(prefixed);
        break;
    }
  }

  private format(entry: LogEntry): string {
    const lines: string[] = [new Date().toISOString()];
    lines.push(`[${entry.level}]`);
    if (entry.category) lines.push(`[${entry.category}]`);
    if (entry.message) lines.push(entry.message);
    if (entry.detail !== undefined) {
      lines.push('Detalles:');
      lines.push(this.stringify(this.sanitize(entry.detail)));
    }
    return lines.join('\n');
  }

  private extractPath(url: string): string {
    if (!url) return url;
    try {
      if (/^[a-z]+:\/\//i.test(url)) {
        return new URL(url).pathname + new URL(url).search;
      }
      return url;
    } catch {
      return url;
    }
  }

  private extractMessage(error: unknown): string | undefined {
    if (error == null) return undefined;
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return (error as { message?: string })?.message;
  }

  private extractStack(error: unknown): string | undefined {
    if (error instanceof Error) return error.stack;
    return (error as { stack?: string })?.stack;
  }

  /**
   * Reemplaza en profundidad los valores de claves sensibles para no exponerlos.
   */
  private sanitize<T>(value: T): T {
    if (Array.isArray(value)) {
      return value.map(item => this.sanitize(item)) as unknown as T;
    }
    if (value && typeof value === 'object') {
      const src = value as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(src)) {
        out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTADO]' : this.sanitize(src[key]);
      }
      return out as T;
    }
    return value;
  }

  /**
   * Convierte cualquier valor en una cadena legible (JSON con indentación).
   * Nunca produce "[object Object]" y recorta los valores muy grandes.
   */
  private stringify(value: unknown): string {
    if (typeof value === 'string') return value.length > MAX_DETAIL_CHARS ? value.slice(0, MAX_DETAIL_CHARS) + '…' : value;
    let text: string;
    try {
      const json = JSON.stringify(value, null, 2);
      text = json === undefined ? String(value) : json;
    } catch {
      text = String(value);
    }
    return text.length > MAX_DETAIL_CHARS ? text.slice(0, MAX_DETAIL_CHARS) + '…' : text;
  }
}