import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { LogService } from '../services/log.service';

/**
 * Interceptor central de trazabilidad HTTP.
 *
 * Registra TODA petición que sale de la app (método, endpoint, query, body y
 * headers relevantes) y su resultado (código, tiempo de respuesta o error con
 * excepción/stack). Es el último interceptor de la cadena para medir el tiempo
 * real de la llamada al backend.
 */
export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const log = inject(LogService);
  const start = performance.now();
  const method = req.method;

  log.httpRequest(method, req.url, req.body, paramsToRecord(req.params));

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          const elapsed = Math.round(performance.now() - start);
          log.httpResponse(method, req.url, event.status, elapsed, event.body);
        }
      },
      error: (error: unknown) => {
        const elapsed = Math.round(performance.now() - start);
        if (error instanceof HttpErrorResponse) {
          log.httpError(req.url, req.body, error, error.status, elapsed, error.error);
        } else {
          log.error('Error HTTP no tipificado en la petición', {
            method,
            endpoint: req.url,
            excepcion: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
        }
      },
    })
  );
};

function paramsToRecord(params: HttpParams): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  params.keys().forEach((key) => {
    record[key] = params.getAll(key);
  });
  return record;
}
