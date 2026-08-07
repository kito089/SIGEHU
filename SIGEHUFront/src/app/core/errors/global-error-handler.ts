import { ErrorHandler, Injectable, inject } from '@angular/core';
import { LogService } from '../services/log.service';

/**
 * ErrorHandler global: captura errores Angular no controlados en tiempo de
 * ejecución (excepciones de componentes, servicios, etc.) y los registra en el
 * sistema de logs sin exponer datos sensibles.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private log = inject(LogService);

  handleError(error: Error): void {
    this.log.error('Error Angular no controlado', {
      message: error.message,
      stack: error.stack,
      nombre: error.name,
    });
  }
}