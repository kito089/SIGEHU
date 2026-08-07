import { Component, OnInit, inject } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastContainerComponent } from './shared/components/toast/toast-container.component';
import { EnvService } from './services/env.service';
import { Runtime } from './services/environment-detector.service';
import { LogService } from './core/services/log.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [RouterOutlet, ToastContainerComponent],
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private env = inject(EnvService);
  private log = inject(LogService);

  private lastRoute = '';

  ngOnInit(): void {
    // Imprime el entorno detectado y la URL base del backend una única vez al arrancar.
    // La URL proviene de EnvService, la misma fuente usada por ApiService para las peticiones HTTP.
    console.log(`[SIGEHU] Runtime: ${this.runtimeLabel(this.env.runtime)}`);
    console.log(`[SIGEHU] Backend URL: ${this.env.getBaseUrl()}`);

    this.log.info('Aplicación Angular inicializada', { url: window.location.href });
    this.wireNavigationLogging();
    this.wireGlobalErrorListeners();
  }

  private wireNavigationLogging(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        if (this.lastRoute !== event.urlAfterRedirects) {
          this.log.nav(this.lastRoute, event.urlAfterRedirects);
          this.lastRoute = event.urlAfterRedirects;
        }
        const active = document.activeElement;
        if (active instanceof HTMLElement && active !== document.body) {
          active.blur();
        }
      });
  }

  private runtimeLabel(runtime: Runtime): string {
    switch (runtime) {
      case 'electron':
        return 'Electron';
      case 'capacitor':
        return 'Android (Capacitor)';
      default:
        return 'Browser';
    }
  }
  
  private wireGlobalErrorListeners(): void {
    window.addEventListener('error', (event) => {
      const error = event.error ?? event.message;
      this.log.error('Error JavaScript no controlado', {
        mensaje: event.message,
        origen: event.filename,
        linea: event.lineno,
        columna: event.colno,
        stack: error instanceof Error ? error.stack : undefined,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      this.log.error('Promesa rechazada sin controlar', {
        mensaje: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    });
  }
}