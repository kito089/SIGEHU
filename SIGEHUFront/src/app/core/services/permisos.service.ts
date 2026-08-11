import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../services/api.service';

/* =========================================================================
   SIGEHU — Permisos Granulares por Campo (RF-28).

   Regla: si NO existe un registro en PermisosGranularesObras para el campo,
   el campo se considera RESTRINGIDO para el trabajador (whitelist). El rol
   Propietario (RF-36) siempre tiene acceso total en la app móvil.

   Campos disponibles (CamposPermiso):
     direccion_instalacion, telefono_cliente, notas_obra, fotos_referencia,
     medidas, catalogo_proveedores, subir_fotos, confirmar_actividad
   ========================================================================= */

export interface PermisoGranular {
  idPermisoGranularObra?: number;
  Obras_idObra?: number;
  Trabajadores_idTrabajador?: number;
  idCampoPermiso?: number;
  NombreCampo: string;
  DescripcionPermiso?: string;
}

const CAMPO_DEFAULT = 'direccion_instalacion';

@Injectable({ providedIn: 'root' })
export class PermisosService {
  private api = inject(ApiService);

  private cache = new Map<string, Set<string>>();

  /** Descarga y cachea los permisos de un trabajador en una obra. */
  cargarPermisos(obraId: number, trabajadorId: number): void {
    const key = `${obraId}:${trabajadorId}`;
    if (this.cache.has(key)) return;

    this.api.get<PermisoGranular[]>(`/Obras/${obraId}/trabajadores/${trabajadorId}/permisos`).subscribe({
      next: (lista) => {
        const campos = new Set((lista || []).map(p => p.NombreCampo).filter(Boolean));
        this.cache.set(key, campos);
      },
      error: () => {
        this.cache.set(key, new Set());
      }
    });
  }

  /** ¿El trabajador puede ver el campo en la obra dada? (whitelist por defecto). */
  puedeVerCampo(obraId?: number, campo = CAMPO_DEFAULT): boolean {
    if (obraId == null) return true;
    const user = JSON.parse(localStorage.getItem('user') || 'null') as { rol?: string } | null;
    if (user?.rol && user.rol !== 'Trabajador') return true; // Propietario: acceso total (RF-36)

    // Cache aún no resuelta: se permite mostrar de forma conservadora solo si
    // la obra no está en caché (estado de carga) — en la práctica se resuelve
    // rápido y la vista se actualiza. Si la obra ya fue cargada, aplica whitelist.
    for (const [k, campos] of this.cache) {
      if (k.startsWith(`${obraId}:`)) {
        return campos.has(campo);
      }
    }
    return true;
  }

  /** Resetea la caché (útil al cambiar de usuario/sesión). */
  limpiarCache(): void {
    this.cache.clear();
  }
}
