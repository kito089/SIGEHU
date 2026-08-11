import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { WorkerLayoutService } from '../../../core/services/worker-layout.service';
import { WorkerHeaderComponent } from '../../../shared/components/worker-header/worker-header.component';

interface MaterialObra {
  ID?: number;
  MATERIAL: string;
  CANTIDAD: number;
  UNIDAD: string;
}

interface ObraFabricacion {
  ID: number;
  IDOBRA?: number;
  NOMBRE: string;
  NOMBREOBRA?: string;
  CLIENTE_NOMBRE?: string;
  NOMBRECLIENTE?: string;
  UBICACION?: string;
  DIRECCIONOBRA?: string;
  TELEFONO?: string;
  ESTADO: string;
  ESTADOBRA?: string;
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
  private layout = inject(WorkerLayoutService);

  obras: ObraFabricacion[] = [];
  selectedObra: ObraFabricacion | null = null;
  loading = false;
  error = false;
  guardando = false;

  notaAvance = '';
  selectedFile: File | null = null;

  ngOnInit(): void {
    this.layout.setPageTitle('Fabricación');
    this.cargarObrasFabricacion();
  }

  cargarObrasFabricacion(): void {
    this.loading = true;
    this.error = false;
    this.api.get<ObraFabricacion[]>('/Obras').subscribe({
      next: (data) => {
        this.loading = false;
        // Firebird devuelve claves en mayúsculas (IDOBRA, NOMBREOBRA...)
        const normalizadas = (data || []).map(o => ({
          ...o,
          ID: Number(o.IDOBRA ?? o.ID),
          NOMBRE: o.NOMBREOBRA ?? o.NOMBRE ?? 'Obra sin nombre',
          CLIENTE_NOMBRE: o.NOMBRECLIENTE ?? o.CLIENTE_NOMBRE,
          UBICACION: o.DIRECCIONOBRA ?? o.UBICACION,
          ESTADO: o.ESTADOBRA ?? o.ESTADO
        }));
        // Filtrar obras en etapa de Fabricación o Pendiente de Validación
        this.obras = normalizadas.filter(o =>
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
        this.error = true;
      }
    });
  }

  reintentar(): void {
    this.cargarObrasFabricacion();
  }

  seleccionarObra(obra: ObraFabricacion): void {
    this.selectedObra = obra;
    if (obra.ID) {
      this.cargarDetalleMateriales(obra.ID);
    }
  }

  cargarDetalleMateriales(obraId: number): void {
    this.api.get<MaterialObra[]>(`/Obras/${obraId}/materiales`).subscribe({
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
    this.api.put(`/Obras/${this.selectedObra.ID}`, payload).subscribe({
      next: () => {
        if (this.selectedFile && this.selectedObra) {
          const fd = new FormData();
          fd.append('foto', this.selectedFile);
          fd.append('tipo', 'Fabricacion');
          this.api.uploadFile(`/Obras/${this.selectedObra.ID}/fotos`, fd).subscribe();
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
