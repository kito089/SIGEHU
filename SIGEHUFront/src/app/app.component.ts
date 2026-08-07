import { Component, OnInit, inject } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastContainerComponent } from './shared/components/toast/toast-container.component';
import { LogService } from './core/services/log.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [RouterOutlet, ToastContainerComponent],
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private log = inject(LogService);

  private lastRoute = '';

  ngOnInit(): void {
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