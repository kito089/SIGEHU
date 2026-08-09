import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import type { CalendarEvent } from '../../../core/models/dashboard.model';

/* =========================================================================
   SIGEHU — Agendar Visita / Actividad (modal)

   Permite registrar una nueva actividad directamente desde la vista
   Calendario del Dashboard: Instalación, Revisión, Entrega u Otras.

   Emite `guardar` con un CalendarEvent preparado (en memoria, sin obra
   asociada) y `cancelar` al cerrar.
   ========================================================================= */

export type TipoActividad = 'Instalacion' | 'Revision' | 'Entrega' | 'Otra';

export const COLOR_POR_TIPO: Record<TipoActividad, string> = {
  Instalacion: '#A855F7',
  Revision: '#F59E0B',
  Entrega: '#10B981',
  Otra: '#3B82F6',
};

const pad = (n: number) => String(n).padStart(2, '0');

const toISODate = (f: Date) => `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}`;

@Component({
  selector: 'app-agendar-visita',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './agendar-visita.component.html',
  styleUrls: ['./agendar-visita.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgendarVisitaComponent implements OnInit {
  private fb = inject(FormBuilder);

  @Input() set fechaInicial(value: Date | string) {
    const d = new Date(value);
    this._fechaInicial.set(Number.isNaN(d.getTime()) ? new Date() : d);
  }
  get fechaInicial(): Date {
    return this._fechaInicial();
  }

  @Input() abierto = false;

  @Output() guardar = new EventEmitter<CalendarEvent>();
  @Output() cancelar = new EventEmitter<void>();

  private readonly _fechaInicial = signal<Date>(new Date());

  form: FormGroup;

  readonly tipos: { value: TipoActividad; label: string }[] = [
    { value: 'Instalacion', label: 'Instalación' },
    { value: 'Revision', label: 'Revisión' },
    { value: 'Entrega', label: 'Entrega' },
    { value: 'Otra', label: 'Otra actividad' },
  ];

  constructor() {
    this.form = this.fb.group({
      tipo: ['Instalacion', [Validators.required]],
      titulo: ['', [Validators.required]],
      fecha: ['', [Validators.required]],
      hora: ['09:00'],
      notas: [''],
    });
  }

  ngOnInit(): void {
    this.form.patchValue({ fecha: toISODate(this._fechaInicial()) });
  }

  onGuardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const tipo: TipoActividad = raw.tipo;
    const fecha = raw.fecha as string;
    const start = raw.hora ? `${fecha}T${raw.hora}` : fecha;

    const evento: CalendarEvent = {
      id: `actividad-${Date.now()}`,
      title: raw.titulo.trim(),
      start,
      color: COLOR_POR_TIPO[tipo],
      extendedProps: {
        type: tipo,
        obraId: null,
        obraNombre: raw.titulo.trim(),
        clienteNombre: '',
        esActividad: true,
        hora: raw.hora || undefined,
        notas: raw.notas?.trim() || undefined,
      },
    };

    this.guardar.emit(evento);
  }

  onCancelar(): void {
    this.cancelar.emit();
  }
}