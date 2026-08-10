import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../../services/api.service';

/* =========================================================================
   SIGEHU — Agrupar obras (modal desde la pestaña Trabajos/Obras)

   Recibe las obras independientes seleccionadas con checkbox y permite:
     - Agruparlas en un TRABAJO NUEVO (nombre, descripción y dirección).
     - Anexarlas a un TRABAJO EXISTENTE (combobox con los trabajos del cliente).
   Ambas opciones llaman a POST /Obras/trabajos/:id/obras con
   `actualizarDireccionTrabajo` como dirección unificada (opcional).
   ========================================================================= */

interface ObraSeleccion {
  idObra: number;
  nombre: string;
  direccion?: string;
  estadoObra?: string;
}

interface OpcionTrabajo {
  idTrabajo: number;
  nombre: string;
}

@Component({
  selector: 'app-agrupar-obras-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './agrupar-obras-modal.component.html',
  styleUrls: ['./agrupar-obras-modal.component.scss'],
})
export class AgruparObrasModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);

  @Input() idCliente: number | null = null;
  @Input() obras: ObraSeleccion[] = [];

  @Output() agrupadas = new EventEmitter<{ idTrabajo: number; nombre: string }>();
  @Output() cancelar = new EventEmitter<void>();

  form: FormGroup;
  cargando = false;
  guardando = false;

  tipoDestino: 'nuevo' | 'existente' = 'nuevo';
  trabajos: OpcionTrabajo[] = [];
  usarDireccionUnificada = false;

  esDireccionUnica(): boolean {
    const dirs = this.obras
      .map((o) => o.direccion?.trim())
      .filter((d): d is string => !!d);
    return dirs.length > 0 && new Set(dirs).size === 1;
  }

  constructor() {
    this.form = this.fb.group({
      idTrabajo: [null, [Validators.required]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      direccion: [''],
    });
  }

  async ngOnInit(): Promise<void> {
    if (this.tipoDestino === 'existente' && this.idCliente != null) {
      await this.cargarTrabajos();
    }
  }

  private async cargarTrabajos(): Promise<void> {
    if (this.idCliente == null) return;
    this.cargando = true;
    try {
      const raw: any = await firstValueFrom(this.api.get<any>('/Clientes/' + this.idCliente + '/trabajos'));
      this.trabajos = (Array.isArray(raw?.trabajos) ? raw.trabajos : []).map((t: any) => ({
        idTrabajo: Number(t.IDTRABAJO ?? t.idTrabajo),
        nombre: String(t.NOMBRE ?? t.Nombre ?? t.nombre ?? ''),
      }));
    } catch {
      this.trabajos = [];
    } finally {
      this.cargando = false;
    }
  }

  setDestino(tipo: 'nuevo' | 'existente'): void {
    this.tipoDestino = tipo;
    if (tipo === 'existente') {
      this.cargarTrabajos();
    }
  }

  async onAgrupar(): Promise<void> {
    if (this.tipoDestino === 'nuevo') {
      if (this.form.get('nombre')?.invalid) {
        this.form.get('nombre')?.markAsTouched();
        return;
      }
    } else {
      if (this.form.get('idTrabajo')?.invalid) {
        this.form.get('idTrabajo')?.markAsTouched();
        return;
      }
    }

    this.guardando = true;
    const raw = this.form.getRawValue();
    const idsObras = this.obras.map((o) => o.idObra);

    try {
      let idTrabajo: number;
      let nombreTrabajo: string;

      if (this.tipoDestino === 'nuevo') {
        const res: any = await firstValueFrom(this.api.post<any>('/Obras/trabajos', {
          idCliente: this.idCliente,
          Nombre: raw.nombre.trim(),
          Descripcion: raw.descripcion?.trim() || null,
          Direccion: raw.direccion?.trim() || null,
        }));
        idTrabajo = Number(res?.idTrabajo ?? 0);
        if (!idTrabajo) throw new Error('No se pudo crear el trabajo');
        nombreTrabajo = raw.nombre.trim();
      } else {
        idTrabajo = Number(raw.idTrabajo);
        const t = this.trabajos.find((x) => x.idTrabajo === idTrabajo);
        nombreTrabajo = t?.nombre ?? String(idTrabajo);
      }

      const actualizarDireccionTrabajo = this.usarDireccionUnificada && !!raw.direccion?.trim()
        ? String(raw.direccion).trim()
        : null;

      await firstValueFrom(this.api.post<any>(`/Obras/trabajos/${idTrabajo}/obras`, {
        idsObras,
        actualizarDireccionTrabajo,
      }));

      this.agrupadas.emit({ idTrabajo, nombre: nombreTrabajo });
    } catch {
      // El interceptor de errores ya notifica el fallo via toast.
    } finally {
      this.guardando = false;
    }
  }

  onCancelar(): void {
    this.cancelar.emit();
  }
}