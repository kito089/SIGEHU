import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
// import { TrabajadoresService } from '../../services/trabajadores.service';

/* =========================================================================
   SIGEHU — Gestión de Trabajadores (componente Angular standalone)

   Notas de negocio actualizadas:
   - Se eliminó el campo 'oficio' (todos realizan funciones generales).
   - Se agregó el campo 'usuario' como identificador visual clave.
   - Manejo de documentos del IMSS (Ver y subir archivo mediante Drag & Drop).
   - Filtrado por nombre, usuario y teléfono.
   ========================================================================= */

export interface Trabajador {
  id: number;
  usuario: string;
  nombre: string;
  telefono: string;
  correo: string;
  obrasAsignadas: string[];
  documentoImssUrl?: string; // Ruta/URL del archivo subido (opcional)
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
  isDragging = false; // Controla el estado visual del Drag & Drop

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.fetchTrabajadores().then(trabajadores => {
      this.trabajadores = trabajadores;
    });
  }

  private async fetchTrabajadores(): Promise<Trabajador[]> {
    return [
      { 
        id: 1, 
        usuario: 'ing_beltran',
        nombre: 'Ing. Beltrán', 
        telefono: '331-402-8871',
        correo: 'beltran@herreriautrilla.com',
        obrasAsignadas: ['Barandales Terraza Norte', 'Reja Enrollable Local'],
        documentoImssUrl: 'assets/docs/imss_beltran.pdf' 
      },
      { 
        id: 2, 
        usuario: 'jlopez',
        nombre: 'J. López', 
        telefono: '331-556-2290',
        correo: 'jlopez@herreriautrilla.com',
        obrasAsignadas: ['Protecciones Ventana Mod. P12', 'Fuga en Bisagra Portón'],
        documentoImssUrl: 'assets/docs/imss_jlopez.pdf'
      },
      { 
        id: 3, 
        usuario: 'medina_s',
        nombre: 'Medina S.', 
        telefono: '333-118-7742',
        correo: 'medina@herreriautrilla.com',
        obrasAsignadas: ['Estructura Domo Patio'],
        documentoImssUrl: '' // Sin documento registrado
      },
      { 
        id: 4, 
        usuario: 'nbarcenas',
        nombre: 'N. Bárcenas', 
        telefono: '331-987-0034',
        correo: 'barcenas@herreriautrilla.com',
        obrasAsignadas: ['Portón Automatizado Principal', 'Reja Perimetral Sección A'],
        documentoImssUrl: '' // Sin documento registrado
      }
    ];
  }

  // Filtrado por usuario, nombre o teléfono
  get trabajadoresFiltrados(): Trabajador[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.trabajadores;

    return this.trabajadores.filter(t =>
      t.nombre.toLowerCase().includes(term) ||
      t.usuario.toLowerCase().includes(term) ||
      t.telefono.includes(term)
    );
  }

  obrasLabel(obras: string[]): string {
    if (!obras || obras.length === 0) return 'Sin obra asignada';
    return `${obras.length} ${obras.length === 1 ? 'obra asignada' : 'obras asignadas'}`;
  }

  verTrabajador(trabajador: Trabajador): void {
    this.selectedTrabajador = trabajador;
  }

  cerrarDetalle(): void {
    this.selectedTrabajador = null;
    this.isDragging = false;
  }

  abrirDocumentoImss(url?: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  // --- Lógica de Drag & Drop y Subida de Archivos ---
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.procesarArchivo(file);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.procesarArchivo(file);
    }
  }

  private procesarArchivo(file: File): void {
    if (this.selectedTrabajador) {
      // Simula la creación de una URL temporal de visualización
      const tempUrl = URL.createObjectURL(file);
      this.selectedTrabajador.documentoImssUrl = tempUrl;
      alert(`Documento "${file.name}" vinculado a ${this.selectedTrabajador.nombre}.`);
    }
  }

  // --- Acciones de Registro / Edición / Eliminación ---
  actualizarDatos(trabajador: Trabajador): void {
    // this.router.navigate(['/trabajadores/editar', trabajador.id]);
    alert(`Aquí se abriría el formulario para actualizar los datos de "${trabajador.nombre}".`);
  }

  eliminarTrabajador(trabajador: Trabajador): void {
    const confirmado = confirm(`¿Eliminar a "${trabajador.nombre}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

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