import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { DetailModalComponent } from '../../../shared/components/detail-modal/detail-modal.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AuditoriaService, AuditoriaRegistro, AuditoriaDetalle } from '../../../services/auditoria.service';

/* =========================================================================
   SIGEHU — Reportes / Consultas generales (RF-30 / RF-33).

   La "Actividad reciente" del sistema vive únicamente aquí y se alimenta
   exclusivamente de Auditorias / AuditoriasDetalles vía el backend
   (GET /Auditoria/actividad y /:id/detalles). Máximo 20 registros en el
   feed; el historial completo vive en /admin/reportes/historial.
   ========================================================================= */

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule,
    KpiCardComponent,
    DetailModalComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss',
})
export class ReportesComponent implements OnInit {
  private router = inject(Router);
  private auditoria = inject(AuditoriaService);

  kpis = [
    {
      value: 12,
      label: 'Presupuestos en obra',
      iconSvg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h6"/><path d="M12 9v6"/><rect x="3" y="4" width="18" height="16" rx="2"/></svg>',
      iconBgColor: '#12233f',
      iconColor: '#3b82f6',
    },
    {
      value: '78%',
      label: 'Avance promedio general',
      iconSvg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 15l4-6 3 4 4-7"/></svg>',
      iconBgColor: '#12291f',
      iconColor: '#22c55e',
    },
    {
      value: 8,
      label: 'Obras en curso',
      iconSvg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></svg>',
      iconBgColor: '#3a2a0f',
      iconColor: '#eab308',
    },
    {
      value: '$486,500',
      label: 'Monto facturado del mes',
      iconSvg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      iconBgColor: '#3a0f1a',
      iconColor: '#ef4444',
    },
  ];

  // ── Actividad reciente (máx. 20 registros) ────────────────────────────────
  actividad: AuditoriaRegistro[] = [];
  cargandoActividad = false;

  // ── Modal de detalles de una actualización ────────────────────────────────
  detalleRegistro: AuditoriaRegistro | null = null;
  detalleCampos: AuditoriaDetalle[] = [];
  detalleCargando = false;

  ngOnInit(): void {
    this.cargarActividad();
  }

  // ── Actividad reciente ────────────────────────────────────────────────────
  async cargarActividad(): Promise<void> {
    this.cargandoActividad = true;
    try {
      this.actividad = await firstValueFrom(this.auditoria.listarActividad(20));
    } catch {
      this.actividad = [];
    } finally {
      this.cargandoActividad = false;
    }
  }

  irAlHistorial(): void {
    this.router.navigate(['/admin/reportes/historial']);
  }

  // ── Detalles de una actualización ─────────────────────────────────────────
  async verDetalles(registro: AuditoriaRegistro): Promise<void> {
    this.detalleRegistro = registro;
    this.detalleCampos = [];
    this.detalleCargando = true;
    try {
      this.detalleCampos = await firstValueFrom(this.auditoria.detalles(registro.id));
    } catch {
      this.detalleCampos = [];
    } finally {
      this.detalleCargando = false;
    }
  }

  cerrarDetalles(): void {
    this.detalleRegistro = null;
    this.detalleCampos = [];
  }

  // ── Helpers de presentación ───────────────────────────────────────────────
  etiquetaAccion(accion: string): string {
    switch (accion) {
      case 'INSERT': return 'Creación';
      case 'UPDATE': return 'Actualización';
      case 'DELETE': return 'Eliminación';
      default: return accion;
    }
  }

  dotColor(accion: string): string {
    switch (accion) {
      case 'INSERT': return 'ok';
      case 'UPDATE': return 'info';
      case 'DELETE': return 'danger';
      default: return 'info';
    }
  }

  fechaHora(fecha: Date): string {
    const dd = String(fecha.getDate()).padStart(2, '0');
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const hh = String(fecha.getHours()).padStart(2, '0');
    const min = String(fecha.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${fecha.getFullYear()} · ${hh}:${min}`;
  }

  nuevaBusqueda(): void {
    alert('Aquí se abriría el buscador global (RF-31) sobre obras, clientes y trabajadores.');
  }

  irAConsultas(): void {
    this.router.navigate(['/admin/analitico']);
  }
}