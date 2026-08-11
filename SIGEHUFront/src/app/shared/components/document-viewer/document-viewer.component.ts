import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FocusTrapDirective } from '../../directives/focus-trap.directive';
import { DocumentFetchService, DocFetchError, FetchedDocument, DocKind } from '../../../core/services/document-fetch.service';
import { PlatformOpenerService } from '../../../core/services/platform-opener.service';
import { ToastService } from '../../../core/services/toast.service';
import { EnvService } from '../../../services/env.service';

type Phase = 'loading' | 'image' | 'pdf' | 'error';

@Component({
  selector: 'app-document-viewer',
  standalone: true,
  imports: [CommonModule, FocusTrapDirective],
  templateUrl: './document-viewer.component.html',
  styleUrls: ['./document-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentViewerComponent implements OnInit, OnDestroy {
  private fetcher = inject(DocumentFetchService);
  private opener = inject(PlatformOpenerService);
  private toast = inject(ToastService);
  private env = inject(EnvService);
  private cdr = inject(ChangeDetectorRef);

  /** Fuente del documento: ruta relativa/URL absoluta, o `Blob` ya cargado. */
  @Input() source: string | Blob | null = null;
  /** Nombre legible sugerido (para descargas/abrir). */
  @Input() filename = 'documento';
  /** Título opcional del modal. */
  @Input() title = 'Visor de documento';
  /** Etiqueta del botón "Abrir" (cambia según el documento). */
  @Input() openLabel = 'Abrir documento';
  @Output() closed = new EventEmitter<void>();

  phase: Phase = 'loading';
  error: string | null = null;
  errorReason: DocFetchError['reason'] | null = null;
  kind: DocKind = 'unknown';
  mimeType = '';
  blobUrl: string | null = null;
  filenameResolved = 'documento';
  opening = false;

  // ── Zoom de imagen (robusto, sin lib externa) ────────────────────────────
  scale = 1;
  minScale = 1;
  maxScale = 5;
  translateX = 0;
  translateY = 0;
  private pinchStartDistance = 0;
  private pinchStartScale = 1;
  private panStartX = 0;
  private panStartY = 0;
  private baseTranslateX = 0;
  private baseTranslateY = 0;
  private pointerActive: PointerEvent | null = null;

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.revokeBlobUrl();
  }

  async load(): Promise<void> {
    this.phase = 'loading';
    this.error = null;
    this.errorReason = null;
    this.cdr.markForCheck();

    const src = this.source;
    if (src == null || (typeof src === 'string' && src.trim() === '')) {
      this.setError('El trabajador no tiene documento IMSS vinculado.', 'empty');
      return;
    }

    try {
      const doc: FetchedDocument = await this.fetcher.fetch(src, this.filename);
      this.kind = doc.kind;
      this.mimeType = doc.mimeType;
      this.filenameResolved = doc.filename || this.filename;
      this.revokeBlobUrl();
      this.blobUrl = URL.createObjectURL(doc.blob);

      if (doc.kind === 'image') {
        this.phase = 'image';
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
      } else if (doc.kind === 'pdf') {
        this.phase = 'pdf';
      } else {
        // Tipo no soportado: igual permitimos abrir externamente.
        this.phase = 'error';
        this.setError('El formato del documento no se puede previsualizar. Puedes intentar abrirlo externamente.', 'unknown');
      }
      this.cdr.markForCheck();
    } catch (err) {
      const e = err as DocFetchError;
      this.setError(e?.message || 'No se pudo cargar el documento', e?.reason || 'unknown');
    }
  }

  cerrar(): void {
    this.revokeBlobUrl();
    this.closed.emit();
  }

  async abrirExternamente(): Promise<void> {
    if (this.opening) return;
    if (this.phase !== 'image' && this.phase !== 'pdf' && this.phase !== 'error') return;

    this.opening = true;
    this.cdr.markForCheck();

    try {
      let blob: Blob;
      try {
        const doc = await this.fetcher.fetch(this.source as string | Blob, this.filenameResolved);
        blob = doc.blob;
      } catch (e) {
        // Si ya teníamos un blobUrl, reconstruir el Blob a partir de él.
        if (this.blobUrl) {
          const resp = await fetch(this.blobUrl);
          blob = await resp.blob();
        } else {
          throw e;
        }
      }
      const res = await this.opener.openExternally(blob, this.filenameResolved, this.mimeType || blob.type);
      if (!res.opened) {
        if (res.fallback === 'browser') {
          this.toast.info('Se descargó el documento. Ábrelo desde tu carpeta de descargas.');
        } else {
          this.toast.error(res.message || 'No se pudo abrir el documento con una aplicación externa.');
        }
      } else if (res.fallback === 'browser') {
        this.toast.info('Se descargó el documento. Ábrelo desde tu carpeta de descargas.');
      }
    } catch (e) {
      this.toast.error((e as Error)?.message || 'No se pudo abrir el documento externamente.');
    } finally {
      this.opening = false;
      this.cdr.markForCheck();
    }
  }

  // ── Zoom con botones ─────────────────────────────────────────────────────
  zoomIn(): void {
    this.setScale(Math.min(this.scale + 0.25, this.maxScale));
  }
  zoomOut(): void {
    this.setScale(Math.max(this.scale - 0.25, this.minScale));
  }
  resetZoom(): void {
    this.setScale(1);
    this.translateX = 0;
    this.translateY = 0;
  }
  private setScale(next: number): void {
    this.scale = next;
    if (next === 1) {
      this.translateX = 0;
      this.translateY = 0;
    }
    this.cdr.markForCheck();
  }

  // ── Arrastre de imagen ampliada (mouse/touch unificado) ─────────────────
  onPointerDown(event: PointerEvent): void {
    if (this.scale <= 1) return;
    this.pointerActive = event;
    this.baseTranslateX = this.translateX;
    this.baseTranslateY = this.translateY;
    this.panStartX = event.clientX;
    this.panStartY = event.clientY;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }
  onPointerMove(event: PointerEvent): void {
    if (!this.pointerActive) return;
    this.translateX = this.baseTranslateX + (event.clientX - this.panStartX);
    this.translateY = this.baseTranslateY + (event.clientY - this.panStartY);
    this.cdr.markForCheck();
  }
  onPointerUp(event: PointerEvent): void {
    this.pointerActive = null;
    (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

  // ── Pinch (dos dedos) ────────────────────────────────────────────────────
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 2) return;
    this.pinchStartDistance = distance(event.touches[0], event.touches[1]);
    this.pinchStartScale = this.scale;
  }
  onTouchMove(event: TouchEvent): void {
    if (event.touches.length !== 2) return;
    if (!this.pinchStartDistance) return;
    event.preventDefault();
    const current = distance(event.touches[0], event.touches[1]);
    const factor = current / this.pinchStartDistance;
    const next = Math.min(Math.max(this.pinchStartScale * factor, this.minScale), this.maxScale);
    this.scale = next;
    this.cdr.markForCheck();
  }
  onTouchEnd(): void {
    this.pinchStartDistance = 0;
  }

  // ── Wheel zoom (desktop) ─────────────────────────────────────────────────
  onWheel(event: WheelEvent): void {
    if (this.phase !== 'image') return;
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.2 : -0.2;
    this.setScale(Math.min(Math.max(this.scale + delta, this.minScale), this.maxScale));
  }

  // ── Teclado: Escape cierra, +/- zoom ────────────────────────────────────
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrar();
  }

  get mostrarAbrirExternamente(): boolean {
    return this.env.isElectron || this.env.isCapacitor || this.phase === 'pdf' || this.phase === 'error';
  }

  get abrirLabelResolved(): string {
    return this.openLabel || 'Abrir documento';
  }

  get transformStyle(): string {
    return `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }

  get zoomPct(): string {
    return Math.round(this.scale * 100) + '%';
  }

  private setError(message: string, reason: DocFetchError['reason']): void {
    this.phase = 'error';
    this.error = message;
    this.errorReason = reason;
    this.cdr.markForCheck();
  }

  private revokeBlobUrl(): void {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
  }
}

function distance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.hypot(dx, dy);
}
