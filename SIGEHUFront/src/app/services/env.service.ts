import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { EnvironmentDetector, Runtime } from './environment-detector.service';

@Injectable({
  providedIn: 'root'
})
export class EnvService {
  private detector = inject(EnvironmentDetector);

  readonly runtime: Runtime;
  readonly isElectron: boolean;
  readonly isCapacitor: boolean;
  readonly isWeb: boolean;
  readonly apiUrl: string;

  constructor() {
    const detector = this.detector;

    this.runtime = detector.runtime;
    this.isElectron = detector.isElectron;
    this.isCapacitor = detector.isCapacitor;
    this.isWeb = detector.isWeb;

    // Única fuente de verdad de la URL del backend.
    // - Android (Ionic + Capacitor nativo) -> túnel zrok2 (HTTPS).
    // - Navegador (ng serve) y Electron -> backend local.
    this.apiUrl = this.isCapacitor
      ? environment.cloudflareDomain
      : 'http://localhost:3000';
  }

  getBaseUrl(): string {
    return this.apiUrl;
  }

  isDesktop(): boolean {
    return this.isElectron;
  }

  isMobile(): boolean {
    return this.isCapacitor;
  }
}
