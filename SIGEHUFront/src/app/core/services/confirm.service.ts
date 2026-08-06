import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ConfirmRequest {
  titulo: string;
  mensaje: string;
  confirmarText: string;
  cancelarText: string;
  danger: boolean;
}

/**
 * Servicio de confirmación moderna (reemplaza el nativo window.confirm).
 *
 * Uso:
 *   const ok = await this.confirm.confirmar(
 *     'Eliminar trabajador',
 *     'Esta acción no se puede deshacer.'
 *   );
 *   if (ok) { ... }
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private state = new BehaviorSubject<ConfirmRequest | null>(null);
  private pending: { resolve: (v: boolean) => void } | null = null;

  state$ = this.state.asObservable();

  confirmar(
    titulo: string,
    mensaje: string,
    opts: { confirmarText?: string; cancelarText?: string; danger?: boolean } = {}
  ): Promise<boolean> {
    this.state.next({
      titulo,
      mensaje,
      confirmarText: opts.confirmarText ?? 'Confirmar',
      cancelarText: opts.cancelarText ?? 'Cancelar',
      danger: opts.danger ?? false
    });

    return new Promise<boolean>((resolve) => {
      this.pending = { resolve };
    });
  }

  responder(resultado: boolean): void {
    this.pending?.resolve(resultado);
    this.pending = null;
    this.state.next(null);
  }
}
