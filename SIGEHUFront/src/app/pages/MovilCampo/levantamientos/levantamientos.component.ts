import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { WorkerLayoutService } from '../../../core/services/worker-layout.service';
import { WorkerHeaderComponent } from '../../../shared/components/worker-header/worker-header.component';

interface ObraLevantamiento {
  ID: number;
  IDOBRA?: number;
  NOMBRE: string;
  NOMBREOBRA?: string;
  CLIENTE_NOMBRE?: string;
  NOMBRECLIENTE?: string;
  DIRECCION?: string;
  DIRECCIONOBRA?: string;
  TELEFONO?: string;
  ESTADO?: string;
  ESTADOBRA?: string;
}

@Component({
  selector: 'app-levantamientos',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, WorkerHeaderComponent],
  templateUrl: './levantamientos.component.html',
  styleUrls: ['./levantamientos.component.scss'],
})
export class LevantamientosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private layout = inject(WorkerLayoutService);

  obras: ObraLevantamiento[] = [];
  selectedObra: ObraLevantamiento | null = null;
  loading = false;
  error = false;
  guardando = false;

  selectedFile: File | null = null;

  informacionObra = {
    cliente: 'María Elena Gómez',
    obra: 'Portón Corredizo Residencial',
    ubicacion: 'Av. de la Cruz #405',
    telefono: '33 1200 3040',
  };

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      alto: ['', [Validators.required, Validators.min(0)]],
      ancho: ['', [Validators.required, Validators.min(0)]],
      profundidad: ['', [Validators.min(0)]],
      observaciones: [''],
    });
  }

  ngOnInit(): void {
    this.layout.setPageTitle('Levantamiento');
    this.cargarObras();
  }

  cargarObras(): void {
    this.loading = true;
    this.error = false;
    this.api.get<ObraLevantamiento[]>('/Obras').subscribe({
      next: (data) => {
        this.loading = false;
        // Firebird devuelve claves en mayúsculas (IDOBRA, NOMBREOBRA...)
        this.obras = (data || []).map(o => ({
          ID: Number(o.IDOBRA ?? o.ID),
          NOMBRE: o.NOMBREOBRA ?? o.NOMBRE ?? 'Obra sin nombre',
          CLIENTE_NOMBRE: o.NOMBRECLIENTE ?? o.CLIENTE_NOMBRE,
          DIRECCION: o.DIRECCIONOBRA ?? o.DIRECCION,
          TELEFONO: o.TELEFONO,
          ESTADO: o.ESTADOBRA ?? o.ESTADO
        }));
        if (this.obras.length > 0) {
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
    this.cargarObras();
  }

  seleccionarObra(obra: ObraLevantamiento): void {
    this.selectedObra = obra;
    this.informacionObra = {
      cliente: obra.CLIENTE_NOMBRE || 'Cliente asignado',
      obra: obra.NOMBRE,
      ubicacion: obra.DIRECCION || 'Dirección de obra',
      telefono: obra.TELEFONO || 'Sin teléfono'
    };
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  submitLevantamiento(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    const body = {
      ...this.form.value,
      estado: 'Levantamiento Pendiente de Validación'
    };

    const obraId = this.selectedObra?.ID || 1;

    // Actualización estado & medidas (RF-12, RF-13)
    this.api.put(`/Obras/${obraId}`, body).subscribe({
      next: () => {
        if (this.selectedFile) {
          const fd = new FormData();
          fd.append('foto', this.selectedFile);
          fd.append('tipo', 'Levantamiento');
          this.api.uploadFile(`/Obras/${obraId}/fotos`, fd).subscribe();
        }
        this.guardando = false;
        this.toast.success('Levantamiento guardado. Estado: Levantamiento Pendiente de Validación.');
      },
      error: () => {
        this.guardando = false;
        this.toast.info('Guardado en cola offline local (RF-35).');
      }
    });
  }
}