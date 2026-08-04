import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
// import { TrabajadoresService } from '../../services/trabajadores.service';

/* =========================================================================
   SIGEHU — Gestión de Trabajadores (componente Angular standalone)

   Notas de negocio ya aplicadas según revisión:
   - Los trabajadores no manejan roles.
   - No se maneja "Estado Laboral".
   - El botón de acción es "Actualizar Datos" (no "Gestionar Permisos").
   - Se muestra "Obra(s) asignada(s)" en plural/singular según corresponda.

   Sustituye fetchTrabajadores() por tu llamada real (GET /api/trabajadores)
   cuando conectes el backend.
   ========================================================================= */

interface Trabajador {
  id: number;
  nombre: string;
  oficio: string;
  telefono: string;
  correo: string;
  obrasAsignadas: string[];
}

@Component({
  selector: 'app-trabajadores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trabajadores.component.html',
  styleUrls: ['./trabajadores.component.css'],
})
export class TrabajadoresComponent implements OnInit {

  trabajadores: Trabajador[] = [];
  searchTerm = '';
  selectedTrabajador: Trabajador | null = null;

  ngOnInit(): void {
    this.fetchTrabajadores().then(trabajadores => {
      this.trabajadores = trabajadores;
    });
  }

  // Ajusta esto a tu endpoint real cuando conectes el backend, p. ej.:
  // constructor(private trabajadoresService: TrabajadoresService) {}
  // private fetchTrabajadores(): Promise<Trabajador[]> {
  //   return firstValueFrom(this.trabajadoresService.listar());
  // }
  private async fetchTrabajadores(): Promise<Trabajador[]> {
    return [
      { id: 1, nombre: 'Ing. Beltrán', oficio: 'Levantamiento y medidas', telefono: '331-402-8871',
        correo: 'beltran@herreriautrilla.com',
        obrasAsignadas: ['Barandales Terraza Norte', 'Reja Enrollable Local'] },
      { id: 2, nombre: 'J. López', oficio: 'Especialista en Corte y Soldadura', telefono: '331-556-2290',
        correo: 'jlopez@herreriautrilla.com',
        obrasAsignadas: ['Protecciones Ventana Mod. P12', 'Fuga en Bisagra Portón'] },
      { id: 3, nombre: 'Medina S.', oficio: 'Especialista en Corte y Soldadura', telefono: '333-118-7742',
        correo: 'medina@herreriautrilla.com',
        obrasAsignadas: ['Estructura Domo Patio'] },
      { id: 4, nombre: 'N. Bárcenas', oficio: 'Ayudante General', telefono: '331-987-0034',
        correo: 'barcenas@herreriautrilla.com',
        obrasAsignadas: ['Portón Automatizado Principal', 'Reja Perimetral Sección A'] },
      { id: 5, nombre: 'R. Domínguez', oficio: 'Especialista en Pintura', telefono: '333-224-9915',
        correo: 'dominguez@herreriautrilla.com',
        obrasAsignadas: [] },
    ];
  }

  get trabajadoresFiltrados(): Trabajador[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.trabajadores;

    return this.trabajadores.filter(t =>
      t.nombre.toLowerCase().includes(term) ||
      t.oficio.toLowerCase().includes(term) ||
      t.telefono.includes(term)
    );
  }

  obrasLabel(obras: string[]): string {
    if (obras.length === 0) return 'Sin obra asignada';
    return `${obras.length} ${obras.length === 1 ? 'obra asignada' : 'obras asignadas'}`;
  }

  verTrabajador(trabajador: Trabajador): void {
    this.selectedTrabajador = trabajador;
  }

  cerrarDetalle(): void {
    this.selectedTrabajador = null;
  }

  actualizarDatos(trabajador: Trabajador): void {
    // Conectar con la ruta del formulario, en modo edición, p. ej.:
    // this.router.navigate(['/trabajadores/editar', trabajador.id]);
    alert(`Aquí se abriría el formulario para actualizar los datos de "${trabajador.nombre}".`);
  }

  eliminarTrabajador(trabajador: Trabajador): void {
    const confirmado = confirm(`¿Eliminar a "${trabajador.nombre}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    // Sustituir por la llamada real, p. ej.:
    // this.trabajadoresService.eliminar(trabajador.id).subscribe(() => { ... });
    this.trabajadores = this.trabajadores.filter(t => t.id !== trabajador.id);
    if (this.selectedTrabajador?.id === trabajador.id) {
      this.selectedTrabajador = null;
    }
  }

  nuevoTrabajador(): void {
    // this.router.navigate(['/trabajadores/nuevo']);
    alert('Aquí se abriría el formulario de "Nuevo Trabajador".');
  }
}