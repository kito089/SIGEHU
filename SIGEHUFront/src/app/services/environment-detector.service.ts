import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentDetector {
  readonly isElectron: boolean;
  readonly isCapacitor: boolean;
  readonly isWeb: boolean;

  constructor() {
    this.isElectron = !!(window as any).require;
    this.isCapacitor = Capacitor.isNativePlatform() || !!(window as any).Capacitor;
    this.isWeb = !this.isElectron && !this.isCapacitor;
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
