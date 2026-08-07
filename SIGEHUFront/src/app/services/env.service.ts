import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { EnvironmentDetector } from './environment-detector.service';

@Injectable({
  providedIn: 'root'
})
export class EnvService {
  private detector = inject(EnvironmentDetector);

  readonly isElectron: boolean;
  readonly isCapacitor: boolean;
  readonly isWeb: boolean;
  readonly apiUrl: string;

  constructor() {
    const detector = this.detector;

    this.isElectron = detector.isElectron;
    this.isCapacitor = detector.isCapacitor;
    this.isWeb = detector.isWeb;
    this.apiUrl = this.isElectron
      ? 'http://localhost:3000'
      : this.isCapacitor
        ? environment.cloudflareDomain
        : this.isLocalDevBrowser()
          ? 'http://localhost:3000'
          : environment.cloudflareDomain;
  }

  private isLocalDevBrowser(): boolean {
    if (!this.isWeb || typeof window === 'undefined') {
      return false;
    }
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
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