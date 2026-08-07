import { Injectable, NgZone, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { EnvService } from './env.service';
import { LogService } from '../core/services/log.service';

interface QueuedRequest {
  id: string;
  method: string;
  path: string;
  body?: unknown;
  files?: { name: string; data: string }[];
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService {
  private api = inject(ApiService);
  private env = inject(EnvService);
  private ngZone = inject(NgZone);
  private log = inject(LogService);

  private queue: QueuedRequest[] = [];
  private isOnline = navigator.onLine;
  private syncing = false;

  constructor() {
    this.loadQueue();
    window.addEventListener('online', () => this.onlineHandler());
    window.addEventListener('offline', () => this.offlineHandler());
  }

  get online(): boolean {
    return this.isOnline;
  }

  async enqueue(method: string, path: string, body?: unknown): Promise<void> {
    const request: QueuedRequest = {
      id: crypto.randomUUID(),
      method,
      path,
      body,
      createdAt: new Date().toISOString()
    };

    this.queue.push(request);
    await this.saveQueue();
  }

  async enqueueFile(path: string, file: File): Promise<void> {
    const request: QueuedRequest = {
      id: crypto.randomUUID(),
      method: 'POST',
      path,
      files: [{ name: file.name, data: await this.fileToBase64(file) }],
      createdAt: new Date().toISOString()
    };

    this.queue.push(request);
    await this.saveQueue();
  }

  syncAfterReturn(): void {
    this.syncQueue();
  }

  private async onlineHandler(): Promise<void> {
    this.isOnline = true;
    this.log.backend('Reconexión detectada', { pendientes: this.queue.length });
    if (this.queue.length > 0) {
      await this.syncQueue();
    }
  }

  private offlineHandler(): void {
    this.isOnline = false;
    this.log.backend('Conexión perdida', undefined, 'WARN');
  }

  private async syncQueue(): Promise<void> {
    if (this.syncing || this.queue.length === 0) return;
    this.syncing = true;
    this.log.backend('Iniciando sincronización de la cola offline', { pendientes: this.queue.length });

    const items = [...this.queue];
    const failed: QueuedRequest[] = [];

    for (const item of items) {
      try {
        if (item.method === 'POST' && item.files) {
          const formData = new FormData();
          for (const f of item.files) {
            const blob = this.base64ToBlob(f.data);
            formData.append('foto', blob, f.name);
          }
          await firstValueFrom(this.api.uploadFile(item.path, formData));
        } else if (item.method === 'POST') {
          await firstValueFrom(this.api.post(item.path, item.body));
        } else if (item.method === 'PUT') {
          await firstValueFrom(this.api.put(item.path, item.body));
        } else if (item.method === 'PATCH') {
          await firstValueFrom(this.api.patch(item.path, item.body));
        } else if (item.method === 'DELETE') {
          await firstValueFrom(this.api.delete(item.path));
        }
      } catch {
        failed.push(item);
      }
    }

    this.queue = failed;
    await this.saveQueue();
    this.syncing = false;
    this.log.backend('Sincronización finalizada', { sincronizados: items.length - failed.length, fallidos: failed.length });
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private base64ToBlob(b64: string): Blob {
    const arr = b64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const bstr = atob(arr[1]);
    const u8arr = new Uint8Array(bstr.split('').map(c => c.charCodeAt(0)));
    return new Blob([u8arr], { type: mime });
  }

  private saveQueue(): void {
    try {
      localStorage.setItem('offline_queue', JSON.stringify(this.queue));
    } catch {}
  }

  private loadQueue(): void {
    try {
      const raw = localStorage.getItem('offline_queue');
      if (raw) this.queue = JSON.parse(raw);
    } catch {}
  }
}