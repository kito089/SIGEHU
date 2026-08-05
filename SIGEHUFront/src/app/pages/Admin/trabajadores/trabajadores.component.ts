import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { EnvService } from '../../../services/env.service';
import { TrabajadoresRefreshService } from '../../../services/trabajadores-refresh.service';

export interface Trabajador {
  id: number;
  usuario: string;
  nombre: string;
  telefono: string;
  correo: string;
  observaciones: string;
  totalObras: number;
  obrasAsignadas: string[];
  documentoImssUrl?: string;
}

@Component({
  selector: 'app-trabajadores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trabajadores.component.html',
  styleUrl: './trabajadores.component.css',
  encapsulation: ViewEncapsulation.None
})
export class TrabajadoresComponent implements OnInit, OnDestroy {

  trabajadores: Trabajador[] = [];
  searchTerm = '';
  selectedTrabajador: Trabajador | null = null;
  private refreshSub: Subscription | null = null;

  constructor(
    private router: Router,
    private api: ApiService,
    private env: EnvService,
    private refreshService: TrabajadoresRefreshService
  ) {}

  ngOnInit(): void {
    this.cargarTrabajadores();

    // Recarga cuando `trabajadornew` confirma un guardado.
    this.refreshSub = this.refreshService.cambios$.subscribe(() => {
      this.cargarTrabajadores();
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  cargarTrabajadores(): void {
    this.fetchTrabajadores().then(trabajadores => {
      this.trabajadores = trabajadores;
    });
  }

  private mapTrabajador(raw: any): Trabajador {
    return {
      id: raw.IDTRABAJADOR ?? raw.idTrabajador,
      usuario: raw.NOMBREUSUARIO ?? raw.nombreUsuario ?? '',
      nombre: raw.NOMBRECOMPLETO ?? raw.nombreCompleto ?? '',
      telefono: raw.TELEFONO ?? raw.telefono ?? '',
      correo: raw.CORREO ?? raw.correo ?? '',
      observaciones: raw.OBSERVACIONES ?? raw.observaciones ?? '',
      totalObras: Number(raw.TOTALOBRAS ?? raw.totalObras ?? 0),
      obrasAsignadas: [],
      documentoImssUrl: raw.RUTADOCUMENTOIMSS ?? raw.rutaDocumentoImss ?? '',
    };
  }

  private async fetchTrabajadores(): Promise<Trabajador[]> {
    const rows: unknown[] = await firstValueFrom(this.api.get<any[]>('/Trabajadores'));
    return (rows || []).map(row => this.mapTrabajador(row));
  }

  private async fetchObrasAsignadas(id: number): Promise<string[]> {
    const rows: any[] = await firstValueFrom(this.api.get<any[]>('/Trabajadores/' + id + '/obras'));
    return (rows || []).map(row => row.NOMBREOBRA ?? row.nombreObra ?? 'Obra sin nombre');
  }

  get trabajadoresFiltrados(): Trabajador[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.trabajadores;

    return this.trabajadores.filter(t =>
      t.nombre.toLowerCase().includes(term) ||
      t.usuario.toLowerCase().includes(term) ||
      t.telefono.includes(term)
    );
  }

  obrasLabel(totalObras: number): string {
    if (!totalObras || totalObras === 0) return 'Sin obras asignadas';
    return `${totalObras} ${totalObras === 1 ? 'obra asignada' : 'obras asignadas'}`;
  }

  async verTrabajador(trabajador: Trabajador): Promise<void> {
    this.selectedTrabajador = trabajador;
    try {
      trabajador.obrasAsignadas = await this.fetchObrasAsignadas(trabajador.id);
    } catch {
      trabajador.obrasAsignadas = [];
    }
  }

  cerrarDetalle(): void {
    this.selectedTrabajador = null;
  }

  abrirDocumentoImss(url?: string): void {
    if (!url) return;

    // Si ya es URL absoluta o blob, se abre tal cual.
    if (/^(blob:|https?:|data:)/i.test(url)) {
      window.open(url, '_blank');
      return;
    }

    const base = (this.env.getBaseUrl() || '').replace(/\/+$/, '');
    window.open(base + '/' + url.replace(/^\/+/, ''), '_blank');
  }

  async eliminarTrabajador(trabajador: Trabajador): Promise<void> {
    const confirmado = confirm(`¿Eliminar a "${trabajador.nombre}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    try {
      await firstValueFrom(this.api.delete('/Trabajadores/' + trabajador.id));
      this.trabajadores = this.trabajadores.filter(t => t.id !== trabajador.id);
      if (this.selectedTrabajador?.id === trabajador.id) {
        this.selectedTrabajador = null;
      }
    } catch {
      // El interceptor de errores ya notifica el fallo vía toast.
    }
  }

  actualizarDatos(trabajador: Trabajador): void {
    this.router.navigate(['/admin/trabajadores/nuevo'], {
      queryParams: { id: trabajador.id }
    });
  }

  nuevoTrabajador(): void {
    this.router.navigate(['/admin/trabajadores/nuevo']);
  }
}