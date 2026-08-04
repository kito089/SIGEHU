import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
// import { ClientesService } from '../../services/clientes.service';

/* =========================================================================
   SIGEHU — Gestión de Clientes (componente Angular standalone)
   Sustituye fetchClientes() por tu llamada real (GET /api/clientes) cuando
   conectes el backend.
   ========================================================================= */

type FiltroClientes = 'todos' | 'con_obras' | 'con_sat' | 'sin_sat';

interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  rfc: string;
  obrasActivas: number;
  datosSat: boolean;
  direccion: string;
  correo: string;
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css'],
})
export class ClientesComponent implements OnInit {
  constructor(private router: Router) {}
  clientes: Cliente[] = [];
  searchTerm = '';
  filtro: FiltroClientes = 'todos';
  selectedCliente: Cliente | null = null;

  ngOnInit(): void {
    this.fetchClientes().then(clientes => {
      this.clientes = clientes;
    });
  }

  // Ajusta esto a tu endpoint real cuando conectes el backend, p. ej.:
  // constructor(private clientesService: ClientesService) {}
  // private fetchClientes(): Promise<Cliente[]> {
  //   return firstValueFrom(this.clientesService.listar());
  // }
  private async fetchClientes(): Promise<Cliente[]> {
    return [
      { id: 1, nombre: 'Carlos Utrilla', telefono: '3312345678', rfc: 'UTCA850101AB1',
        obrasActivas: 3, datosSat: true, direccion: 'Colonia Rey Xolotl, Tonalá, Jal.', correo: 'carlos.utrilla@correo.com' },
      { id: 2, nombre: 'María Elena Gómez', telefono: '3398765432', rfc: '—',
        obrasActivas: 1, datosSat: false, direccion: 'Av. Vallarta 1500, Guadalajara, Jal.', correo: 'maria.gomez@correo.com' },
      { id: 3, nombre: 'Inmobiliaria Viste S.A. de C.V.', telefono: '3315556677', rfc: 'IVI160303CD2',
        obrasActivas: 2, datosSat: true, direccion: 'Periférico Norte 890, Zapopan, Jal.', correo: 'contacto@inmobiliariaviste.com' },
      { id: 4, nombre: 'Restaurante El Asador', telefono: '3311223344', rfc: '—',
        obrasActivas: 0, datosSat: false, direccion: 'Calle Hidalgo 45, Tonalá, Jal.', correo: 'admin@elasador.mx' },
    ];
  }

  get clientesFiltrados(): Cliente[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.clientes.filter(c => {
      const matchesSearch = !term
        || c.nombre.toLowerCase().includes(term)
        || c.telefono.includes(term)
        || c.rfc.toLowerCase().includes(term);

      const matchesFiltro =
        this.filtro === 'todos' ? true :
        this.filtro === 'con_obras' ? c.obrasActivas > 0 :
        this.filtro === 'con_sat' ? c.datosSat :
        !c.datosSat;

      return matchesSearch && matchesFiltro;
    });
  }

  obrasLabel(cantidad: number): string {
    if (cantidad === 0) return 'Sin obras';
    return `${cantidad} ${cantidad === 1 ? 'Activa' : 'Activas'}`;
  }

  verCliente(cliente: Cliente): void {
    this.selectedCliente = cliente;
   ;
  }

  editarCliente(cliente: Cliente): void {
    // Conectar con la ruta del formulario, en modo edición, p. ej.:
    // this.router.navigate(['/clientes/editar', cliente.id]);
    alert(`Aquí se abriría el formulario de edición para "${cliente.nombre}".`);
  }

  eliminarCliente(cliente: Cliente): void {
    const confirmado = confirm(`¿Eliminar a "${cliente.nombre}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    // Sustituir por la llamada real, p. ej.:
    // this.clientesService.eliminar(cliente.id).subscribe(() => { ... });
    this.clientes = this.clientes.filter(c => c.id !== cliente.id);
    if (this.selectedCliente?.id === cliente.id) {
      this.selectedCliente = null;
    }
  }

  cerrarDetalle(): void {
    this.selectedCliente = null;
  }

  nuevoCliente(): void {
    // Conectar con la ruta del formulario de alta de cliente.
    // this.router.navigate(['/clientes/nuevo']);
    this.router.navigate(['/clientes/form']);
  }
}