import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';

/* =========================================================================
   SIGEHU — Reportes / Consultas generales (componente Angular standalone)
   RF-30 (Ver reportes y consultas generales) y RF-31 (Búsqueda global).
   Sustituye los datos simulados por tus llamadas reales al backend cuando
   esté disponible.
   ========================================================================= */

interface ActividadItem {
  id: number;
  tipo: 'obra' | 'instalacion' | 'cliente';
  texto: string;
  detalle: string;
  fecha: string;
  estado: 'ok' | 'pendiente' | 'info';
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, KpiCardComponent],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss',
})
export class ReportesComponent implements OnInit {

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

  actividades: ActividadItem[] = [
    { id: 1, tipo: 'obra', texto: 'Obra "Puerta de acceso principal" terminada', detalle: 'Fachada Norte · Cliente ACME', fecha: 'Hace 2 h', estado: 'ok' },
    { id: 2, tipo: 'instalacion', texto: 'Instalación programada en "Bodega Central"', detalle: 'Sucursal Sur · Viernes 10:00', fecha: 'Hoy', estado: 'info' },
    { id: 3, tipo: 'obra', texto: 'Obra "Protecciones ventanas" pendiente de validación', detalle: 'Edificio 3 · Dueño por validar', fecha: 'Hace 1 día', estado: 'pendiente' },
    { id: 4, tipo: 'cliente', texto: 'Nuevo cliente registrado: Laura Méndez', detalle: 'Particular', fecha: 'Hace 3 días', estado: 'ok' },
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {}

  estadoClass(estado: ActividadItem['estado']): string {
    return `act-item__dot--${estado}`;
  }

  tipoLabel(tipo: ActividadItem['tipo']): string {
    switch (tipo) {
      case 'obra': return 'Obra';
      case 'instalacion': return 'Instalación';
      case 'cliente': return 'Cliente';
    }
  }

  nuevaBusqueda(): void {
    alert('Aquí se abriría el buscador global (RF-31) sobre obras, clientes y trabajadores.');
  }

  irAConsultas(): void {
    this.router.navigate(['/admin/analitico']);
  }
}
