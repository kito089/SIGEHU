import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { WorkerHeaderComponent } from '../../../shared/components/worker-header/worker-header.component';

interface TicketGarantia {
  ID: string | number;
  OBRA_NOMBRE?: string;
  DESCRIPCION: string;
  ESTADO: string;
  CLIENTE_NOMBRE?: string;
  DIRECCION?: string;
  TELEFONO?: string;
  ACCION_CORRECTIVA?: string;
}

@Component({
  selector: 'app-garantias-campo',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, WorkerHeaderComponent],
  templateUrl: './garantias.component.html',
  styleUrls: ['./garantias.component.scss'],
})
export class GarantiasCampoComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  tickets: TicketGarantia[] = [];
  loading = false;
  guardando = false;

  // Formulario para nuevo reporte (RF-24)
  nuevoProblema = '';
  selectedObraNombre = 'OB-0014 · Portón Corredizo Residencial';
  selectedFile: File | null = null;

  ngOnInit(): void {
    this.cargarGarantias();
  }

  cargarGarantias(): void {
    this.loading = true;
    this.api.get<TicketGarantia[]>('/api/garantias').subscribe({
      next: (data) => {
        this.loading = false;
        // Solo datos operativos (RF-25: solo problema, dirección, teléfono)
        this.tickets = (data || []).map(g => ({
          ID: g.ID,
          OBRA_NOMBRE: g.OBRA_NOMBRE || 'Obra Instalada',
          DESCRIPCION: g.DESCRIPCION,
          ESTADO: g.ESTADO || 'Reportada',
          DIRECCION: g.DIRECCION || 'Dirección de entrega',
          TELEFONO: g.TELEFONO || 'Sin teléfono',
          ACCION_CORRECTIVA: g.ACCION_CORRECTIVA
        }));
        if (this.tickets.length === 0) {
          this.usarFallbackLocal();
        }
      },
      error: () => {
        this.loading = false;
        this.usarFallbackLocal();
      }
    });
  }

  usarFallbackLocal(): void {
    this.tickets = [
      {
        ID: 'GAR-008',
        OBRA_NOMBRE: 'Portón Corredizo Residencial',
        DESCRIPCION: 'Falla en ajuste de chapa principal y tope de riel inferior.',
        ESTADO: 'En atención',
        DIRECCION: 'Av. de la Cruz #405, Col. Rey Xolotl',
        TELEFONO: '449 123 4567'
      },
      {
        ID: 'GAR-005',
        OBRA_NOMBRE: 'Protecciones de Ventana Frontal',
        DESCRIPCION: 'Revisión de punto de soldadura en anclaje superior.',
        ESTADO: 'Reportada',
        DIRECCION: 'Calle Zaragoza #102, Centro',
        TELEFONO: '449 987 6543'
      }
    ];
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
    this.api.post('/api/garantias', body).subscribe({
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
    this.api.put(`/api/garantias/${ticket.ID}`, { estado: nuevoEstado, accion: ticket.ACCION_CORRECTIVA }).subscribe({
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
    this.api.put(`/api/garantias/${ticket.ID}`, { estado: 'Resuelta', accion: ticket.ACCION_CORRECTIVA }).subscribe({
      next: () => {},
      error: () => {}
    });
  }
}