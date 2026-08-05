import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * SIGEHU — Sincronización entre formulario de trabajador y su tabla.
 *
 * `trabajadornew` incrementa el contador tras un guardado exitoso (POST/PUT +
 * documento IMSS). `trabajadores` se suscribe y recarga la lista al detectar
 * un contador nuevo, garantizando la reactividad incluso si el componente de
 * la tabla se mantiene vivo en el router outlet.
 */
@Injectable({ providedIn: 'root' })
export class TrabajadoresRefreshService {
  private contadorSubject = new BehaviorSubject<number>(0);

  cambios$: Observable<number> = this.contadorSubject.asObservable();

  notificarCambio(): void {
    this.contadorSubject.next(this.contadorSubject.value + 1);
  }
}
