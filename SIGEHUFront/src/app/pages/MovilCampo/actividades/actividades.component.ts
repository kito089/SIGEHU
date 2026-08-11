import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { WorkerLayoutService } from '../../../core/services/worker-layout.service';
import { MobileHeaderComponent } from '../../../shared/components/layout/mobile-header/mobile-header.component';

/* =========================================================================
   SIGEHU — Actividades pendientes (punto de entrada móvil del trabajador).

   Consolida en una sola lista las tareas activas del trabajador, ordenadas
   por fecha límite (la más próxima primero):
     - Obras en etapa Levantamiento, Fabricación o Instalación (VW_OBRAS_TRABAJADOR)
     - Compras asignadas al chofer (VW/Compras por trabajador)
     - Garantías activas asignadas al trabajador (VW_GARANTIAS_CON_OBRA)

   Tocar una actividad navega a la sección correspondiente del campo.
   ========================================================================= */

type TipoActividad = 'levantamiento' | 'fabricacion' | 'instalacion' | 'compra' | 'garantia';

interface Actividad {
  tipo: TipoActividad;
  id: number;
  titulo: string;
  cliente?: string;
  direccion?: string;
  estado: string;
  fechaLimite: string;
  fechaTs: number;
  asignacionTs: number;
  ruta: string;
  numeroDirecciones?: number;
  numeroMateriales?: number;
}

interface ObraRow {
  IDOBRA: number;
  NOMBREOBRA?: string;
  DIRECCIONOBRA?: string;
  ESTADOBRA?: string;
  IDESTADOASIGNACION?: number;
  FECHAASIGNACION?: string | Date;
  NOMBRECLIENTE?: string;
  TRABAJADORES_IDTRABAJADOR?: number;
}

interface CompraRow {
  ID: number;
  PROVEEDOR_NOMBRE?: string;
  FECHA_ORDEN?: string | Date;
  ESTADO?: string;
  NUMERO_DIRECCIONES?: number;
  NUMERO_MATERIALES?: number;
  MATERIALES?: unknown[];
}

interface GarantiaRow {
  IDGARANTIA: number;
  NOMBREOBRA?: string;
  DIRECCIONOBRA?: string;
  ESTADOGARANTIA?: string;
  FECHACREACION?: string | Date;
  NOMBRECLIENTE?: string;
  IDTRABAJADOR?: number;
}

@Component({
  selector: 'app-actividades',
  standalone: true,
  imports: [CommonModule, IonicModule, MobileHeaderComponent],
  templateUrl: './actividades.component.html',
  styleUrls: ['./actividades.component.scss'],
})
export class ActividadesComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private auth = inject(AuthService);
  private layout = inject(WorkerLayoutService);

  actividades: Actividad[] = [];
  loading = false;
  error = false;

  ngOnInit(): void {
    this.layout.setPageTitle('Actividades pendientes');
    this.cargarActividades();
  }

  cargarActividades(): void {
    this.loading = true;
    this.error = false;
    this.actividades = [];

    const trabajadorId = this.auth.getUser()?.idTrabajador;

    this.api.get<ObraRow[]>('/Obras').subscribe({
      next: (obras) => this.combinarObras(obras || []),
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });

    this.api.get<GarantiaRow[]>('/Garantias').subscribe({
      next: (garantias) => this.combinarGarantias(garantias || [], trabajadorId),
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });

    this.api.get<CompraRow[]>('/Compras').subscribe({
      next: (compras) => this.combinarCompras(compras || []),
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  private combinarObras(obras: ObraRow[]): void {
    for (const o of obras) {
      const estado = (o.ESTADOBRA || '').toLowerCase();
      let tipo: TipoActividad | null = null;
      let ruta = '/movil/levantamientos';

      if (estado.includes('levantamiento')) {
        tipo = 'levantamiento';
        ruta = '/movil/levantamientos';
      } else if (estado.includes('fabrica')) {
        tipo = 'fabricacion';
        ruta = '/movil/fabricacion';
      } else if (estado.includes('instalaci')) {
        tipo = 'instalacion';
        ruta = '/movil/instalacion';
      }

      if (!tipo) continue;

      const fecha = this.toTs(o.FECHAASIGNACION);

      this.actividades.push({
        tipo,
        id: o.IDOBRA,
        titulo: o.NOMBREOBRA || 'Obra asignada',
        cliente: o.NOMBRECLIENTE,
        direccion: o.DIRECCIONOBRA,
        estado: o.ESTADOBRA || 'Asignada',
        fechaLimite: this.formatFecha(o.FECHAASIGNACION),
        fechaTs: fecha,
        asignacionTs: fecha,
        ruta
      });
    }
    this.finalizarCarga();
  }

  private combinarGarantias(garantias: GarantiaRow[], trabajadorId?: number): void {
    const activas = garantias.filter(g =>
      (g.ESTADOGARANTIA || '').toLowerCase() !== 'resuelta' &&
      (g.ESTADOGARANTIA || '').toLowerCase() !== 'cerrada' &&
      (!trabajadorId || g.IDTRABAJADOR === trabajadorId)
    );

    for (const g of activas) {
      const fecha = this.toTs(g.FECHACREACION);
      this.actividades.push({
        tipo: 'garantia',
        id: g.IDGARANTIA,
        titulo: g.NOMBREOBRA || 'Garantía de obra instalada',
        cliente: g.NOMBRECLIENTE,
        direccion: g.DIRECCIONOBRA,
        estado: g.ESTADOGARANTIA || 'Reportada',
        fechaLimite: this.formatFecha(g.FECHACREACION),
        fechaTs: fecha,
        asignacionTs: fecha,
        ruta: '/movil/garantias'
      });
    }
    this.finalizarCarga();
  }

  private combinarCompras(compras: CompraRow[]): void {
    for (const c of compras) {
      const fecha = this.toTs(c.FECHA_ORDEN);
      this.actividades.push({
        tipo: 'compra',
        id: c.ID,
        titulo: c.PROVEEDOR_NOMBRE || `Orden de compra ${c.ID}`,
        estado: c.ESTADO || 'Pendiente de Surtir',
        fechaLimite: this.formatFecha(c.FECHA_ORDEN),
        fechaTs: fecha,
        asignacionTs: fecha,
        ruta: '/movil/compras',
        numeroDirecciones: c.NUMERO_DIRECCIONES ?? (c.MATERIALES?.length ? 1 : 0),
        numeroMateriales: c.NUMERO_MATERIALES ?? c.MATERIALES?.length ?? 0
      });
    }
    this.finalizarCarga();
  }

  /** Concluye la carga una vez las tres fuentes resolvieron. */
  private pendientes = 3;
  private finalizarCarga(): void {
    this.pendientes -= 1;
    if (this.pendientes <= 0) {
      this.pendientes = 3;
      this.loading = false;
      this.ordenar();
    }
  }

  private ordenar(): void {
    const SIN_FECHA = Number.MAX_SAFE_INTEGER;
    this.actividades.sort((a, b) => {
      const aSinFecha = a.fechaTs >= SIN_FECHA;
      const bSinFecha = b.fechaTs >= SIN_FECHA;

      // 1. Con fecha de entrega primero, más próxima primero.
      if (aSinFecha !== bSinFecha) return aSinFecha ? 1 : -1;
      if (!aSinFecha) return a.fechaTs - b.fechaTs;

      // 2. Sin fecha de entrega: asignación más reciente primero.
      return b.asignacionTs - a.asignacionTs;
    });
  }

  private toTs(fecha?: string | Date): number {
    if (!fecha) return Number.MAX_SAFE_INTEGER;
    const d = new Date(fecha as string);
    return isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime();
  }

  private formatFecha(fecha?: string | Date): string {
    if (!fecha) return 'Sin fecha';
    const d = new Date(fecha as string);
    if (isNaN(d.getTime())) return 'Sin fecha';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  iconoTipo(tipo: TipoActividad): string {
    switch (tipo) {
      case 'levantamiento': return 'resize-outline';
      case 'fabricacion': return 'construct-outline';
      case 'instalacion': return 'navigate-outline';
      case 'compra': return 'cart-outline';
      case 'garantia': return 'shield-checkmark-outline';
    }
  }

  colorTipo(tipo: TipoActividad): string {
    switch (tipo) {
      case 'levantamiento': return 'warning';
      case 'fabricacion': return 'primary';
      case 'instalacion': return 'purple';
      case 'compra': return 'tertiary';
      case 'garantia': return 'danger';
    }
  }

  labelTipo(tipo: TipoActividad): string {
    switch (tipo) {
      case 'levantamiento': return 'Levantamiento';
      case 'fabricacion': return 'Fabricación';
      case 'instalacion': return 'Instalación';
      case 'compra': return 'Compra';
      case 'garantia': return 'Garantía';
    }
  }

  /** Clase de color del Tag de estado según DISEÑO_UI.md. */
  claseEstado(estado: string): string {
    const e = (estado || '').toLowerCase();
    if (e.includes('solicitud')) return 'estado-solicitud';
    if (e.includes('surtid')) return 'estado-finalizado';
    if (e.includes('levantamiento')) return 'estado-levantamiento';
    if (e.includes('fabrica')) return 'estado-fabricacion';
    if (e.includes('instalaci')) return 'estado-instalacion';
    if (e.includes('garantia')) return 'estado-garantia';
    if (e.includes('finaliza')) return 'estado-finalizado';
    return 'estado-otro';
  }

  abrir(actividad: Actividad): void {
    this.router.navigateByUrl(actividad.ruta);
  }

  reintentar(): void {
    this.cargarActividades();
  }
}
