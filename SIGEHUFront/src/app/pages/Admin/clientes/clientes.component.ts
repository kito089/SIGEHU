import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { FilterBarComponent } from '../../../shared/components/filter-bar/filter-bar.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import type { ClienteTipo } from '../../../core/models/cliente.model';

/* =========================================================================
   SIGEHU — Gestión de Clientes (listado)
   Datos reales vía GET /Clientes. Acciones: Ver Detalle (navega a la página
   /admin/clientes/:id), Editar (formulario con queryParam id) y Eliminar
   (soft-delete con modal de confirmación reutilizable). El listado muestra
   el Tipo de cliente (Persona | Empresa) y permite filtrar por él (RF-03,
   RF-05). El detalle es una página completa, no un modal.
   ========================================================================= */

type FiltroClientes = 'todos' | 'persona' | 'empresa' | 'con_obras' | 'con_sat' | 'sin_sat';

interface Cliente {
  id: number;
  tipo: ClienteTipo;
  nombre: string;
  telefono: string;
  correo: string;
  rfc: string;
  obrasActivas: number;
  datosSat: boolean;
  direccion: string;
  activo: boolean;
  razonSocial?: string;
  regimenFiscal?: string;
  usoCFDI?: string;
  codigoPostal?: string;
  observaciones?: string;
  contactos?: ContactoDetalle[];
}

interface ContactoDetalle {
  nombreCompleto?: string;
  telefono?: string;
  correo?: string;
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FilterBarComponent, DataTableComponent, ConfirmModalComponent],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss',
})
export class ClientesComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  clientes: Cliente[] = [];
  searchTerm = '';
  filtro: FiltroClientes = 'todos';
  cargando = false;
  private detallePendienteId: number | null = null;

  clienteAEliminar: Cliente | null = null;
  confirmarEliminacion = false;
  eliminando = false;

  columns: DataTableColumn[] = [
    { key: 'tipo', label: 'Tipo' },
    { key: 'nombre', label: 'Nombre / Razón social' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'correo', label: 'Correo' },
    { key: 'rfc', label: 'RFC' },
    { key: 'obrasActivas', label: 'Obras activas' },
    { key: 'datosSat', label: 'Datos SAT' },
  ];

  filterOptions = [
    { value: 'todos', label: 'Todos los clientes' },
    { value: 'persona', label: 'Personas' },
    { value: 'empresa', label: 'Empresas' },
    { value: 'con_obras', label: 'Con obras activas' },
    { value: 'con_sat', label: 'Con datos SAT' },
    { value: 'sin_sat', label: 'Sin datos SAT' },
  ];

  ngOnInit(): void {
    this.cargarClientes();

    // Apertura directa del detalle desde el buscador global (?ver=<id>).
    this.route.queryParamMap.subscribe(params => {
      const ver = params.get('ver');
      this.detallePendienteId = ver ? Number(ver) || null : null;
      this.abrirDetallePendiente();
    });
  }

  async cargarClientes(): Promise<void> {
    this.cargando = true;
    try {
      this.clientes = await this.fetchClientes();
      this.abrirDetallePendiente();
    } catch {
      this.clientes = [];
    } finally {
      this.cargando = false;
    }
  }

  private abrirDetallePendiente(): void {
    const id = this.detallePendienteId;
    if (id == null) return;
    const cliente = this.clientes.find(c => c.id === id);
    if (!cliente) return;
    this.detallePendienteId = null;
    this.verCliente(cliente);
  }

  private mapCliente(raw: any): Cliente {
    return {
      id: raw.IDCLIENTE ?? raw.idCliente,
      tipo: (String(raw.TIPO ?? raw.Tipo ?? raw.tipo ?? 'empresa').toLowerCase() === 'persona') ? 'persona' : 'empresa',
      nombre: raw.NOMBRE ?? raw.Nombre ?? raw.nombre ?? '',
      telefono: raw.TELEFONO ?? raw.Telefono ?? raw.telefono ?? '',
      correo: raw.CORREO ?? raw.Correo ?? raw.correo ?? '',
      rfc: raw.RFC ?? raw.rfc ?? '',
      obrasActivas: Number(raw.TOTALOBRASACTIVAS ?? raw.TotalObrasActivas ?? raw.totalObrasActivas ?? 0),
      datosSat: Boolean(raw.TIENEDATOSFISCALES ?? raw.TieneDatosFiscales ?? raw.tieneDatosFiscales ?? false),
      direccion: raw.DIRECCION ?? raw.Direccion ?? raw.direccion ?? '',
      activo: raw.ACTIVO ?? raw.Activo ?? raw.activo ?? true,
    };
  }

  private async fetchClientes(): Promise<Cliente[]> {
    const rows: unknown[] = await firstValueFrom(this.api.get<any[]>('/Clientes'));
    return (rows || []).map(row => this.mapCliente(row));
  }

  get clientesFiltrados(): Cliente[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.clientes.filter(c => {
      if (c.activo === false) return false;

      const matchesSearch = !term
        || c.nombre.toLowerCase().includes(term)
        || c.telefono.includes(term)
        || c.correo.toLowerCase().includes(term)
        || c.rfc.toLowerCase().includes(term);

      const matchesFiltro =
        this.filtro === 'todos' ? true :
        this.filtro === 'persona' ? c.tipo === 'persona' :
        this.filtro === 'empresa' ? c.tipo === 'empresa' :
        this.filtro === 'con_obras' ? c.obrasActivas > 0 :
        this.filtro === 'con_sat' ? c.datosSat :
        !c.datosSat;

      return matchesSearch && matchesFiltro;
    });
  }

  tipoLabel(tipo: ClienteTipo): string {
    return tipo === 'persona' ? 'Persona' : 'Empresa';
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
  }

  onFilterChange(value: string): void {
    this.filtro = value as FiltroClientes;
  }

  obrasLabel(cantidad: number): string {
    if (cantidad === 0) return 'Sin obras';
    return `${cantidad} ${cantidad === 1 ? 'Activa' : 'Activas'}`;
  }

  metaContacto(c?: ContactoDetalle): string {
    const partes = [c?.telefono, c?.correo].filter(Boolean);
    return partes.join(' · ');
  }

  verCliente(cliente: Cliente): void {
    this.router.navigate(['/admin/clientes', cliente.id]);
  }

  editarCliente(cliente: Cliente): void {
    this.router.navigate(['/admin/clientes/form'], {
      queryParams: { id: cliente.id }
    });
  }

  eliminarCliente(cliente: Cliente): void {
    this.clienteAEliminar = cliente;
    this.confirmarEliminacion = true;
  }

  cancelarEliminacion(): void {
    this.confirmarEliminacion = false;
    this.clienteAEliminar = null;
  }

  async confirmarEliminar(): Promise<void> {
    if (!this.clienteAEliminar) return;
    this.eliminando = true;
    try {
      await firstValueFrom(this.api.delete('/Clientes/' + this.clienteAEliminar.id));
      this.clientes = this.clientes.filter(c => c.id !== this.clienteAEliminar!.id);
      this.toast.success('Cliente eliminado correctamente');
      this.confirmarEliminacion = false;
      this.clienteAEliminar = null;
    } catch {
      // El interceptor de errores ya notifica el fallo vía toast.
    } finally {
      this.eliminando = false;
    }
  }

  nuevoCliente(): void {
    this.router.navigate(['/admin/clientes/form']);
  }
}
