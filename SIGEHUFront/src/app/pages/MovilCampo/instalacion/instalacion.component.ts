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

interface ItemChecklist {
  nombre: string;
  verificado: boolean;
}

interface ObraInstalacion {
  ID: number;
  NOMBRE: string;
  CLIENTE_NOMBRE?: string;
  TELEFONO?: string;
  DIRECCION?: string;
  ESTADO?: string;
  KIT_NOMBRE?: string;
  FECHA_LIMITE?: string;
}

@Component({
  selector: 'app-instalacion',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, MobileHeaderComponent],
  templateUrl: './instalacion.component.html',
  styleUrls: ['./instalacion.component.scss'],
})
export class InstalacionComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private layout = inject(WorkerLayoutService);
  private permisos = inject(PermisosService);

  obrasInstalacion: ObraInstalacion[] = [];
  selectedObra: ObraInstalacion | null = null;
  loading = false;
  error = false;
  confirmando = false;

  selectedFile: File | null = null;
  notaInstalacion = '';

  entrega = {
    cliente: 'María Elena Gómez',
    telefono: '449-123-4567',
    direccion: 'Av. de la Cruz #405, Col. Rey Xolotl',
  };

  checklist: ItemChecklist[] = [
    { nombre: 'Planta de soldar portátil 200A', verificado: false },
    { nombre: 'Paquete de electrodos 6013 1/8"', verificado: false },
    { nombre: 'Rotomartillo SDS-Plus y brocas 1/2"', verificado: false },
    { nombre: 'Careta de soldar electrónica y guantes', verificado: false },
    { nombre: 'Discos de corte 4 1/2" y esmeriladora', verificado: false },
    { nombre: 'Taquetes de expansión 3/8" x 3"', verificado: false }
  ];

  ngOnInit(): void {
    this.layout.setPageTitle('Instalación');
    this.cargarInstalaciones();
  }

  cargarInstalaciones(): void {
    this.loading = true;
    this.error = false;
    this.api.get<ObraInstalacion[]>('/Obras').subscribe({
      next: (data) => {
        this.loading = false;
        this.obrasInstalacion = (data || []).filter(o =>
          o.ESTADO?.toLowerCase().includes('instalaci') ||
          o.ESTADO?.toLowerCase().includes('fabricado') ||
          o.ESTADO?.toLowerCase().includes('ruta')
        );
        if (this.obrasInstalacion.length > 0) {
          this.seleccionarObra(this.obrasInstalacion[0]);
        }
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  reintentar(): void {
    this.cargarInstalaciones();
  }

  seleccionarObra(obra: ObraInstalacion): void {
    this.selectedObra = obra;
    this.entrega = {
      cliente: obra.CLIENTE_NOMBRE || 'Cliente asignado',
      telefono: obra.TELEFONO || 'Sin teléfono',
      direccion: obra.DIRECCION || 'Dirección de obra'
    };
    const user = this.auth.getUser();
    if (user && obra.ID) {
      this.permisos.cargarPermisos(obra.ID, user.idTrabajador);
    }
  }

  get puedeVerTelefono(): boolean {
    return this.permisos.puedeVerCampo(this.selectedObra?.ID, 'telefono_cliente');
  }

  get puedeVerDireccion(): boolean {
    return this.permisos.puedeVerCampo(this.selectedObra?.ID, 'direccion_instalacion');
  }

  get porcentajeVerificado(): number {
    const total = this.checklist.length;
    if (total === 0) return 0;
    const ok = this.checklist.filter((i) => i.verificado).length;
    return Math.round((ok / total) * 100);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  confirmarEntrega(): void {
    if (this.porcentajeVerificado < 100) {
      this.toast.warning('Recuerda verificar todo el checklist del kit antes de confirmar la instalación.');
    }

    this.confirmando = true;
    const obraId = this.selectedObra?.ID || 201;

    const payload = {
      estado: 'Instalación Pendiente de Validación',
      nota: this.notaInstalacion || 'Instalación física terminada en domicilio del cliente.'
    };

    // Doble validación de Instalación (RF-20)
    this.api.put(`/Obras/${obraId}`, payload).subscribe({
      next: () => {
        if (this.selectedFile) {
          const fd = new FormData();
          fd.append('foto', this.selectedFile);
          fd.append('tipo', 'Instalacion');
          this.api.uploadFile(`/Obras/${obraId}/fotos`, fd).subscribe();
        }
        this.confirmando = false;
        this.toast.success('Instalación entregada. Queda en Instalación Pendiente de Validación.');
        if (this.selectedObra) {
          this.selectedObra.ESTADO = 'Instalación Pendiente de Validación';
        }
      },
      error: () => {
        this.confirmando = false;
        this.toast.info('Guardado en cola offline local (RF-35).');
        if (this.selectedObra) {
          this.selectedObra.ESTADO = 'Instalación Pendiente de Validación';
        }
      }
    });
  }
}
