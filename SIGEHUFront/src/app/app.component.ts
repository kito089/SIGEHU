import { Component, OnInit, inject } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastContainerComponent } from './shared/components/toast/toast-container.component';
import { EnvService } from './services/env.service';
import { Runtime } from './services/environment-detector.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [RouterOutlet, ToastContainerComponent],
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private env = inject(EnvService);


  ngOnInit(): void {
    // Imprime el entorno detectado y la URL base del backend una única vez al arrancar.
    // La URL proviene de EnvService, la misma fuente usada por ApiService para las peticiones HTTP.
    console.log(`[SIGEHU] Runtime: ${this.runtimeLabel(this.env.runtime)}`);
    console.log(`[SIGEHU] Backend URL: ${this.env.getBaseUrl()}`);

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
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
}