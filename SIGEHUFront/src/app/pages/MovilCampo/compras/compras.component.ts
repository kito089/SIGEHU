import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { WorkerLayoutService } from '../../../core/services/worker-layout.service';
import { WorkerHeaderComponent } from '../../../shared/components/worker-header/worker-header.component';

interface MaterialCompra {
  MATERIAL_NOMBRE: string;
  CANTIDAD: number;
  UNIDAD: string;
  COMPRADOR?: string;
  COMPLETADO?: boolean;
}

interface OrdenCompraChofer {
  ID: number;
  PROVEEDOR_NOMBRE: string;
  PROVEEDOR_DIRECCION?: string;
  PROVEEDOR_TELEFONO?: string;
  FECHA_ORDEN?: string;
  ESTADO: string;
  MATERIALES: MaterialCompra[];
}

@Component({
  selector: 'app-compras-campo',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, WorkerHeaderComponent],
  templateUrl: './compras.component.html',
  styleUrls: ['./compras.component.scss']
})
export class ComprasComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private layout = inject(WorkerLayoutService);

  compras: OrdenCompraChofer[] = [];
  loading = false;
  error = false;

  ngOnInit(): void {
    this.layout.setPageTitle('Compras');
    this.cargarOrdenesCompra();
  }

  cargarOrdenesCompra(): void {
    this.loading = true;
    this.error = false;
    this.api.get<OrdenCompraChofer[]>('/Compras').subscribe({
      next: (data) => {
        this.loading = false;
        // Mapear ordenes sin información financiera (RF-18). Firebird devuelve
        // claves en mayúsculas (ID, PROVEEDOR_NOMBRE...).
        this.compras = (data || []).map(c => ({
          ID: Number(c.ID),
          PROVEEDOR_NOMBRE: c.PROVEEDOR_NOMBRE || 'Proveedor',
          PROVEEDOR_DIRECCION: c.PROVEEDOR_DIRECCION || 'Dirección registrada en catálogo',
          PROVEEDOR_TELEFONO: c.PROVEEDOR_TELEFONO || 'Sin teléfono',
          FECHA_ORDEN: c.FECHA_ORDEN,
          ESTADO: c.ESTADO || 'Pendiente de Surtir',
          MATERIALES: c.MATERIALES || []
        }));
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  reintentar(): void {
    this.cargarOrdenesCompra();
  }

  toggleMaterialItem(material: MaterialCompra): void {
    material.COMPLETADO = !material.COMPLETADO;
    this.toast.info(`Material ${material.COMPLETADO ? 'marcado como comprado' : 'desmarcado'}`);
  }

  marcarCompraCompletada(compra: OrdenCompraChofer): void {
    compra.ESTADO = 'Surtida en Proveedor';
    this.toast.success(`Orden de compra #${compra.ID} surtida correctamente.`);
    this.api.put(`/Compras/${compra.ID}`, { estado: 'Surtida' }).subscribe({
      next: () => {},
      error: () => {}
    });
  }
}
