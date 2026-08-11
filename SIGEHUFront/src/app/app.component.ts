import { Component, OnInit, inject } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastContainerComponent } from './shared/components/toast/toast-container.component';
import { EnvService } from './services/env.service';
import { AuthService } from './services/auth.service';
import { EnvironmentDetector, Runtime } from './services/environment-detector.service';
import { LogService } from './core/services/log.service';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [RouterOutlet, ToastContainerComponent],
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private env = inject(EnvService);
  private envDetector = inject(EnvironmentDetector);
  private log = inject(LogService);
  private auth = inject(AuthService);
  private notifications = inject(NotificationService);

  private lastRoute = '';

  async ngOnInit(): Promise<void> {
    // Imprime el entorno detectado y la URL base del backend una única vez al arrancar.
    // La URL proviene de EnvService, la misma fuente usada por ApiService para las peticiones HTTP.
    console.log(`[SIGEHU] Runtime: ${this.runtimeLabel(this.env.runtime)}`);
    console.log(`[SIGEHU] Backend URL: ${this.env.getBaseUrl()}`);

    this.log.info('Aplicación Angular inicializada', { url: window.location.href });
    this.logElectronLogFile();
    this.wireNavigationLogging();
    this.wireGlobalErrorListeners();
    this.wireNotificationSync();
    await this.bootstrapNative();
  }

  /**
   * Sincronización de notificaciones por CUENTA (SSE multidispositivo).
   * - Al arrancar con sesión guardada: si el access token expiró, intenta
   *   renovarlo transparentemente (refresh token); si no hay sesión válida,
   *   se hace logout único (sin toasts múltiples).
   * - Navegación a /login (logout o sesión expirada) → detiene el SSE.
   * - Cualquier otra ruta autenticada → arranca (idempotente).
   * Cada sesión de usuario abre su propia conexión anclada a su JWT.
   */
  private wireNotificationSync(): void {
    // Al arrancar: restaura/renueva la sesión antes de abrir el SSE para no
    // disparar peticiones (y notificaciones) con un access token ya expirado.
    if (this.auth.isLoggedIn()) {
      this.auth.restoreSession().subscribe((ok) => {
        if (ok) this.notifications.start();
      });
    }

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        if (event.urlAfterRedirects.startsWith('/login')) {
          this.notifications.stop();
        } else if (this.auth.isLoggedIn()) {
          this.notifications.start();
        }
      });
  }

  /**
   * Configuración nativa (Capacitor/Android). En Android 15+ edge-to-edge es
   * forzado por el SO, por lo que NO se debe superponer la webview. En versiones
   * previas, setOverlaysWebView({overlay:false}) desplaza el webview debajo de
   * la status bar. El plugin es no-op si la plataforma no lo soporta.
   */
  private async bootstrapNative(): Promise<void> {
    if (!this.envDetector.isCapacitor) return;
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      // style DARK -> texto blanco (legible sobre fondo oscuro del layout)
      await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
      // Android <15: separa la webview de la status bar (no-op en 15+)
      await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined);
    } catch {
      // El plugin StatusBar no está disponible en runtime (web/electron): se ignora.
    }
  }

  /**
   * En Electron, consulta vía preload la ruta absoluta del archivo de log y la
   * registra (esa entrada queda persistida en electron.log).
   */
  private logElectronLogFile(): void {
    const bridge = (window as unknown as { sigehuLog?: { getLogFile?: () => Promise<string> } }).sigehuLog;
    if (bridge?.getLogFile) {
      bridge
        .getLogFile()
        .then((logFile) => this.log.info('Archivo de log Electron', { logFile }))
        .catch(() => undefined);
    }
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