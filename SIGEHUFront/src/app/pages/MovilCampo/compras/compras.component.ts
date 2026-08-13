import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { EnvService } from '../../../services/env.service';
import { WorkerLayoutService } from '../../../core/services/worker-layout.service';
import { MobileHeaderComponent } from '../../../shared/components/layout/mobile-header/mobile-header.component';

interface MaterialCompra {
  idDetalleCompra?: number;
  MATERIAL_NOMBRE: string;
  CANTIDAD: number;
  UNIDAD?: string;
  COMPLETADO?: boolean;
}

interface OrdenCompraChofer {
  ID: number;
  IDPROVEEDOR?: number;
  PROVEEDOR_NOMBRE: string;
  PROVEEDOR_DIRECCION?: string;
  PROVEEDOR_TELEFONO?: string;
  FECHA_ORDEN?: string;
  ESTADO: string;
  RECIBIDA?: boolean;
  MATERIALES: MaterialCompra[];
}

@Component({
  selector: 'app-compras-campo',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, MobileHeaderComponent],
  templateUrl: './compras.component.html',
  styleUrls: ['./compras.component.scss']
})
export class ComprasComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private env = inject(EnvService);
  private layout = inject(WorkerLayoutService);
  private router = inject(Router);

  compras: OrdenCompraChofer[] = [];
  loading = false;
  error = false;
  confirmando = new Set<number>();
  mapasVisibles = new Set<string>();

  // Orden tocada desde "Actividades" (history.state.actividadId): al cargar se
  // desplaza hasta su tarjeta y la resalta brevemente.
  compraDestinoId: number | null = null;
  destacadoId = 0;

  ngOnInit(): void {
    this.layout.setPageTitle('Orden de Compra');
    this.compraDestinoId = this.leerDestino();
    this.cargarOrdenesCompra();
  }

  private leerDestino(): number | null {
    const id = (history.state as { actividadId?: number } | null)?.actividadId;
    return typeof id === 'number' && Number.isFinite(id) ? id : null;
  }

  volver(): void {
    this.router.navigateByUrl('/movil/actividades');
  }

  reintentar(): void {
    this.cargarOrdenesCompra();
  }

  cargarOrdenesCompra(): void {
    this.loading = true;
    this.error = false;
    this.api.get<OrdenCompraChofer[]>('/Compras').subscribe({
      next: (data) => {
        this.loading = false;
        // RF-18: el backend ya filtra por chofer autenticado (rol Trabajador) y
        // no envía datos financieros. Se inicializa el checklist local para que
        // el trabajador marque la recolección ítem por ítem (la validación final
        // ocurriá en backend al marcar la orden como Surtida).
        this.compras = (data || []).map(c => ({
          ...c,
          ID: Number(c.ID),
          MATERIALES: (c.MATERIALES || []).map(m => ({ ...m, COMPLETADO: false }))
        }));
        this.desplazarADestino();
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  private desplazarADestino(): void {
    if (this.compraDestinoId == null) return;
    this.destacadoId = this.compraDestinoId;
    // Espera al render de las tarjetas antes de hacer scroll (RF-18).
    setTimeout(() => {
      document.getElementById('compra-' + this.compraDestinoId)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
    setTimeout(() => { this.destacadoId = 0; }, 4000);
  }

  toggleItem(material: MaterialCompra, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    material.COMPLETADO = !material.COMPLETADO;
  }

  progreso(compra: OrdenCompraChofer): number {
    if (compra.MATERIALES.length === 0) return 0;
    const ok = compra.MATERIALES.filter(m => m.COMPLETADO).length;
    return Math.round((ok / compra.MATERIALES.length) * 100);
  }

  checklistCompleto(compra: OrdenCompraChofer): boolean {
    return compra.MATERIALES.length > 0 && this.progreso(compra) === 100;
  }

  // ── Mapa retráctil por proveedor/dirección ────────────────────────────────
  claveMapa(compra: OrdenCompraChofer): string {
    return `${compra.ID}|${compra.IDPROVEEDOR ?? 0}|${compra.PROVEEDOR_DIRECCION ?? ''}`;
  }

  mapasVisible(compra: OrdenCompraChofer): boolean {
    return this.mapasVisibles.has(this.claveMapa(compra));
  }

  toggleMaps(compra: OrdenCompraChofer): void {
    const clave = this.claveMapa(compra);
    if (this.mapasVisibles.has(clave)) {
      this.mapasVisibles.delete(clave);
    } else {
      this.mapasVisibles.add(clave);
    }
  }

  mapsEmbedUrl(compra: OrdenCompraChofer): string {
    const q = encodeURIComponent((compra.PROVEEDOR_DIRECCION || compra.PROVEEDOR_NOMBRE || '').trim());
    return `https://www.google.com/maps?q=${q}&output=embed`;
  }

  abrirGoogleMaps(compra: OrdenCompraChofer): void {
    const dir = (compra.PROVEEDOR_DIRECCION || '').trim();
    if (!dir) {
      this.toast.warning('No hay dirección registrada para abrir en el mapa.');
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}`;
    const target = this.env.isMobile() ? '_system' : '_blank';
    window.open(url, target);
  }

  async confirmarRecoleccion(compra: OrdenCompraChofer, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (this.confirmando.has(compra.ID)) return;
    if (compra.ESTADO === 'Surtida en Proveedor') return;

    if (!this.checklistCompleto(compra)) {
      this.toast.warning('Marca toda la lista de materiales antes de confirmar la recolección.');
      return;
    }

    this.confirmando.add(compra.ID);
    try {
      await firstValueFrom(this.api.put(`/Compras/${compra.ID}`, { estado: 'Surtida' }));
      compra.ESTADO = 'Surtida en Proveedor';
      compra.RECIBIDA = true;
      this.toast.success(`Orden #${compra.ID}: recolección confirmada.`);
    } catch (err: any) {
      const msg = err?.error?.error || err?.error?.message;
      if (msg) {
        this.toast.warning(msg);
      } else {
        this.toast.error('No se pudo confirmar la recolección. Intenta de nuevo.');
      }
    } finally {
      this.confirmando.delete(compra.ID);
    }
  }
}
