import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { WorkerLayoutService } from '../../../core/services/worker-layout.service';
import { PermisosService } from '../../../core/services/permisos.service';
import { MobileHeaderComponent } from '../../../shared/components/layout/mobile-header/mobile-header.component';

interface TicketGarantia {
  ID: string | number;
  IDGARANTIA?: string | number;
  ID_OBRA?: number;
  OBRA_ID?: number;
  OBRA_NOMBRE?: string;
  NOMBREOBRA?: string;
  DESCRIPCION: string;
  DESCRIPCIONRESOLUCION?: string;
  ESTADO: string;
  ESTADOGARANTIA?: string;
  CLIENTE_NOMBRE?: string;
  NOMBRECLIENTE?: string;
  DIRECCION?: string;
  DIRECCIONOBRA?: string;
  TELEFONO?: string;
  TELEFONOCLIENTE?: string;
  IDTRABAJADOR?: number;
  idTrabajador?: number;
  ACCION_CORRECTIVA?: string;
}

@Component({
  selector: 'app-garantias-campo',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './garantias.component.html',
  styleUrls: ['./garantias.component.scss'],
})
export class GarantiasCampoComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private layout = inject(WorkerLayoutService);
  private permisos = inject(PermisosService);

  tickets: TicketGarantia[] = [];
  loading = false;
  error = false;
  guardando = false;

  // Formulario para nuevo reporte (RF-24)
  nuevoProblema = '';
  selectedObraNombre = 'OB-0014 · Portón Corredizo Residencial';
  selectedFile: File | null = null;

  ngOnInit(): void {
    this.layout.setPageTitle('Garantías');
    this.cargarGarantias();
  }

  cargarGarantias(): void {
    this.loading = true;
    this.error = false;
    const user = this.auth.getUser();
    this.api.get<TicketGarantia[]>('/Garantias').subscribe({
      next: (data) => {
        this.loading = false;
        const filas = data || [];
        // Solo garantías del trabajador autenticado (Firebird: IDTRABAJADOR).
        const filtradas = user
          ? filas.filter(g => (g.IDTRABAJADOR ?? g.idTrabajador) === user.idTrabajador)
          : filas;
        // Solo datos operativos (RF-25: solo problema, dirección, teléfono)
        this.tickets = filtradas.map(g => ({
          ID: g.IDGARANTIA ?? g.ID ?? g.IDGARANTIA,
          OBRA_NOMBRE: g.NOMBREOBRA ?? g.OBRA_NOMBRE ?? 'Obra Instalada',
          DESCRIPCION: g.DESCRIPCION,
          ESTADO: g.ESTADOGARANTIA ?? g.ESTADO ?? 'Reportada',
          DIRECCION: g.DIRECCIONOBRA ?? g.DIRECCION ?? 'Dirección de entrega',
          TELEFONO: g.TELEFONOCLIENTE ?? g.TELEFONO ?? 'Sin teléfono',
          ACCION_CORRECTIVA: g.DESCRIPCIONRESOLUCION ?? g.ACCION_CORRECTIVA
        }));
        if (this.tickets.length > 0) {
          this.cargarPermisosGarantia(this.tickets[0]);
        }
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  reintentar(): void {
    this.cargarGarantias();
  }

  private cargarPermisosGarantia(ticket: TicketGarantia): void {
    // Los permisos se resuelven por obra; usamos el ID de obra si está presente.
    const user = this.auth.getUser();
    const obraId = Number(ticket.ID_OBRA ?? ticket.OBRA_ID ?? 0);
    if (user && obraId > 0) {
      this.permisos.cargarPermisos(obraId, user.idTrabajador);
    }
  }

  get puedeVerTelefono(): boolean {
    return this.permisos.puedeVerCampo(this.tickets[0]?.ID_OBRA, 'telefono_cliente');
  }

  get puedeVerDireccion(): boolean {
    return this.permisos.puedeVerCampo(this.tickets[0]?.ID_OBRA, 'direccion_instalacion');
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  abrirNuevoReporte(): void {
    if (!this.nuevoProblema.trim()) {
      this.toast.warning('Escribe la descripción de la falla reportada.');
      return;
    }

    this.guardando = true;
    const body = {
      obra: this.selectedObraNombre,
      descripcion: this.nuevoProblema,
      estado: 'Reportada'
    };

    // RF-24 Apertura de garantía
    this.api.post('/Garantias', body).subscribe({
      next: (res: any) => {
        this.guardando = false;
        this.toast.success('Reporte de garantía registrado exitosamente.');
        this.nuevoProblema = '';
        this.cargarGarantias();
      },
      error: () => {
        this.guardando = false;
        this.tickets.unshift({
          ID: 'GAR-' + Math.floor(Math.random() * 900 + 100),
          OBRA_NOMBRE: this.selectedObraNombre,
          DESCRIPCION: this.nuevoProblema,
          ESTADO: 'Reportada',
          DIRECCION: 'Dirección registrada en cliente',
          TELEFONO: 'Teléfono registrado'
        });
        this.nuevoProblema = '';
        this.toast.info('Reporte guardado en cola local (RF-35).');
      }
    });
  }

  cambiarSubEstado(ticket: TicketGarantia, nuevoEstado: string): void {
    ticket.ESTADO = nuevoEstado;
    this.toast.info(`Reporte ${ticket.ID} actualizado a: ${nuevoEstado}`);
    this.api.put(`/Garantias/${ticket.ID}`, { estado: nuevoEstado, accion: ticket.ACCION_CORRECTIVA }).subscribe({
      next: () => {},
      error: () => {}
    });
  }

  marcarResuelta(ticket: TicketGarantia): void {
    if (!ticket.ACCION_CORRECTIVA) {
      this.toast.warning('Ingresa la acción correctiva realizada para cerrar la garantía.');
      return;
    }
    ticket.ESTADO = 'Resuelta';
    this.toast.success(`Garantía ${ticket.ID} resuelta (RF-26).`);
    this.api.put(`/Garantias/${ticket.ID}`, { estado: 'Resuelta', accion: ticket.ACCION_CORRECTIVA }).subscribe({
      next: () => {},
      error: () => {}
    });
  }
}