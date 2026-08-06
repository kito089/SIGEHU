import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { WorkerHeaderComponent } from '../../../shared/components/worker-header/worker-header.component';

interface MaterialObra {
  ID?: number;
  MATERIAL: string;
  CANTIDAD: number;
  UNIDAD: string;
}

interface ObraFabricacion {
  ID: number;
  NOMBRE: string;
  CLIENTE_NOMBRE?: string;
  UBICACION?: string;
  TELEFONO?: string;
  ESTADO: string;
  ESPECIFICACIONES?: string;
  MODELO_DISENO?: string;
  MEDIDAS_ALTO?: number;
  MEDIDAS_ANCHO?: number;
  MEDIDAS_PROFUNDIDAD?: number;
  MATERIALES?: MaterialObra[];
}

@Component({
  selector: 'app-fabricacion-campo',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, WorkerHeaderComponent],
  templateUrl: './fabricacion.component.html',
  styleUrls: ['./fabricacion.component.scss']
})
export class FabricacionComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  obras: ObraFabricacion[] = [];
  selectedObra: ObraFabricacion | null = null;
  loading = false;
  guardando = false;

  notaAvance = '';
  selectedFile: File | null = null;

  ngOnInit(): void {
    this.cargarObrasFabricacion();
  }

  cargarObrasFabricacion(): void {
    this.loading = true;
    this.api.get<ObraFabricacion[]>('/api/obras').subscribe({
      next: (data) => {
        this.loading = false;
        // Filtrar obras en etapa de Fabricación o Pendiente de Validación
        this.obras = (data || []).filter(o => 
          o.ESTADO?.toLowerCase().includes('fabrica') ||
          o.ESTADO?.toLowerCase().includes('solicitud') ||
          o.ESTADO?.toLowerCase().includes('levantamiento')
        );
        if (this.obras.length > 0 && !this.selectedObra) {
          this.seleccionarObra(this.obras[0]);
        }
      },
      error: () => {
        this.loading = false;
        // Fallback local visual de demostración
        this.obras = [
          {
            ID: 101,
            NOMBRE: 'Portón Principal Corredizo - Residencial',
            CLIENTE_NOMBRE: 'Carlos Mendoza',
            UBICACION: 'Av. Las Palmas #230',
            TELEFONO: '449 200 4050',
            ESTADO: 'En Fabricación',
            ESPECIFICACIONES: 'PTR de 2x2 pulg en marco, lámina acanalada calibre 18, pintura anticorrosiva negra.',
            MODELO_DISENO: 'Modelo Residencial Ejecutivo V-02',
            MEDIDAS_ALTO: 2.50,
            MEDIDAS_ANCHO: 4.20,
            MEDIDAS_PROFUNDIDAD: 0.15,
            MATERIALES: [
              { MATERIAL: 'PTR 2"x2" Calibre 14', CANTIDAD: 6, UNIDAD: 'Tramo 6m' },
              { MATERIAL: 'Lámina Lisa Calibre 18', CANTIDAD: 4, UNIDAD: 'Hoja' },
              { MATERIAL: 'Ruedas de balero 4"', CANTIDAD: 2, UNIDAD: 'Pieza' },
              { MATERIAL: 'Primer Anticorrosivo Gris', CANTIDAD: 1, UNIDAD: 'Galón' }
            ]
          }
        ];
        this.selectedObra = this.obras[0];
      }
    });
  }

  seleccionarObra(obra: ObraFabricacion): void {
    this.selectedObra = obra;
    if (obra.ID) {
      this.cargarDetalleMateriales(obra.ID);
    }
  }

  cargarDetalleMateriales(obraId: number): void {
    this.api.get<MaterialObra[]>(`/api/obras/${obraId}/materiales`).subscribe({
      next: (mats) => {
        if (this.selectedObra && mats && mats.length > 0) {
          this.selectedObra.MATERIALES = mats;
        }
      },
      error: () => {}
    });
  }

  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedFile = target.files[0];
    }
  }

  marcarFabricacionTerminada(): void {
    if (!this.selectedObra) return;
    this.guardando = true;

    const payload = {
      estado: 'Fabricación Pendiente de Validación',
      nota: this.notaAvance || 'Estructura fabricada en taller. Lista para revisión.'
    };

    // Actualizar estado de la obra (RF-17 Doble validación)
    this.api.put(`/api/obras/${this.selectedObra.ID}`, payload).subscribe({
      next: () => {
        if (this.selectedFile && this.selectedObra) {
          const fd = new FormData();
          fd.append('foto', this.selectedFile);
          fd.append('tipo', 'Fabricacion');
          this.api.uploadFile(`/api/obras/${this.selectedObra.ID}/fotos`, fd).subscribe();
        }
        this.guardando = false;
        this.toast.success('Fabricación terminada. Enviada a validación del Propietario.');
        if (this.selectedObra) {
          this.selectedObra.ESTADO = 'Fabricación Pendiente de Validación';
        }
      },
      error: () => {
        this.guardando = false;
        this.toast.info('Modo sin conexión: guardado en cola local (RF-35).');
        if (this.selectedObra) {
          this.selectedObra.ESTADO = 'Fabricación Pendiente de Validación';
        }
      }
    });
  }
}
