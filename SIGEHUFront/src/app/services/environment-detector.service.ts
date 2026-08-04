import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentDetector {
  readonly isElectron: boolean;
  readonly isCapacitor: boolean;
  readonly isWeb: boolean;

  constructor() {
    this.isElectron = !!(window as any).require;
    this.isCapacitor = !!((window as any).Capacitor);
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
