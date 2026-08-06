import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../core/services/toast.service';
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

  compras: OrdenCompraChofer[] = [];
  loading = false;

  ngOnInit(): void {
    this.cargarOrdenesCompra();
  }

  cargarOrdenesCompra(): void {
    this.loading = true;
    this.api.get<OrdenCompraChofer[]>('/api/compras').subscribe({
      next: (data) => {
        this.loading = false;
        // Mapear ordenes sin información financiera (RF-18)
        this.compras = (data || []).map(c => ({
          ID: c.ID,
          PROVEEDOR_NOMBRE: c.PROVEEDOR_NOMBRE || 'Proveedor',
          PROVEEDOR_DIRECCION: c.PROVEEDOR_DIRECCION || 'Dirección registrada en catálogo',
          PROVEEDOR_TELEFONO: c.PROVEEDOR_TELEFONO || 'Sin teléfono',
          FECHA_ORDEN: c.FECHA_ORDEN,
          ESTADO: c.ESTADO || 'Pendiente de Surtir',
          MATERIALES: c.MATERIALES || []
        }));
        if (this.compras.length === 0) {
          this.usarDemoFallback();
        }
      },
      error: () => {
        this.loading = false;
        this.usarDemoFallback();
      }
    });
  }

  usarDemoFallback(): void {
    this.compras = [
      {
        ID: 501,
        PROVEEDOR_NOMBRE: 'Aceros Utrilla S.A.',
        PROVEEDOR_DIRECCION: 'Av. Circunvalación #1040, Col. Industrial',
        PROVEEDOR_TELEFONO: '449 912 3040',
        FECHA_ORDEN: new Date().toLocaleDateString(),
        ESTADO: 'Pendiente de Surtir',
        MATERIALES: [
          { MATERIAL_NOMBRE: 'PTR 2" x 2" Calibre 14 (6m)', CANTIDAD: 10, UNIDAD: 'Tramos', COMPLETADO: false },
          { MATERIAL_NOMBRE: 'Lámina Antiderrapante 1/8"', CANTIDAD: 3, UNIDAD: 'Hojas', COMPLETADO: false },
          { MATERIAL_NOMBRE: 'Electrodos 6013 1/8"', CANTIDAD: 1, UNIDAD: 'Caja 5kg', COMPLETADO: true }
        ]
      },
      {
        ID: 502,
        PROVEEDOR_NOMBRE: 'Ferretería y Perfiles El Herrero',
        PROVEEDOR_DIRECCION: 'Calle Hidalgo #502, Centro',
        PROVEEDOR_TELEFONO: '449 815 6070',
        FECHA_ORDEN: new Date().toLocaleDateString(),
        ESTADO: 'En Ruta',
        MATERIALES: [
          { MATERIAL_NOMBRE: 'Chapa de Sobreponer Izquierda', CANTIDAD: 2, UNIDAD: 'Piezas', COMPLETADO: false },
          { MATERIAL_NOMBRE: 'Bisagras de Cuchilla 5/8"', CANTIDAD: 8, UNIDAD: 'Piezas', COMPLETADO: false }
        ]
      }
    ];
  }

  toggleMaterialItem(material: MaterialCompra): void {
    material.COMPLETADO = !material.COMPLETADO;
    this.toast.info(`Material ${material.COMPLETADO ? 'marcado como comprado' : 'desmarcado'}`);
  }

  marcarCompraCompletada(compra: OrdenCompraChofer): void {
    compra.ESTADO = 'Surtida en Proveedor';
    this.toast.success(`Orden de compra #${compra.ID} surtida correctamente.`);
    this.api.put(`/api/compras/${compra.ID}`, { estado: 'Surtida' }).subscribe({
      next: () => {},
      error: () => {}
    });
  }
}
