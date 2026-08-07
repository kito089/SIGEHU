import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

/**
 * Plataformas de ejecución soportadas por SIGEHU.
 * - browser  : Angular ejecutándose en un navegador (ng serve / build web).
 * - electron : Angular empaquetado con Electron (aplicación de escritorio).
 * - capacitor: Ionic + Capacitor sobre dispositivo nativo (Android).
 */
export type Runtime = 'browser' | 'electron' | 'capacitor';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentDetector {
  readonly runtime: Runtime;
  readonly isElectron: boolean;
  readonly isCapacitor: boolean;
  readonly isWeb: boolean;

  constructor() {
    this.isElectron = this.detectElectron();
    // Capacitor.isNativePlatform() es la API oficial: devuelve true únicamente
    // sobre dispositivo nativo (Android/iOS) y false en navegador/Electron.
    this.isCapacitor = Capacitor.isNativePlatform();
    this.isWeb = !this.isElectron && !this.isCapacitor;

    this.runtime = this.isElectron
      ? 'electron'
      : this.isCapacitor
        ? 'capacitor'
        : 'browser';
  }

  /**
   * Detección de Electron independiente de contextIsolation/nodeIntegration:
   * el userAgent del renderer siempre incluye "Electron/x.y.z" y, cuando el
   * proceso principal expone Node, también está disponible process.versions.electron.
   */
  private detectElectron(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    const ua = window.navigator?.userAgent ?? '';
    if (ua.includes('Electron')) {
      return true;
    }
    const proc = (window as any).process;
    return !!(proc && proc.versions && proc.versions.electron);
  }

  isDesktop(): boolean {
    return this.isElectron;
  }

  isMobile(): boolean {
    return this.isCapacitor;
  }

  isBrowser(): boolean {
    return this.isWeb;
  }
}
