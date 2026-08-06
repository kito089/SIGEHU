import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { SearchService, SearchResult, EntidadBusqueda } from '../../../core/services/search.service';

interface GroupedResults {
  tipo: EntidadBusqueda;
  icon: string;
  label: string;
  items: SearchResult[];
}

const ICONOS: Record<EntidadBusqueda, string> = {
  Cliente: 'people-outline',
  Obra: 'construct-outline',
  Trabajador: 'person-outline',
  Proveedor: 'cube-outline',
  Material: 'layers-outline',
  Kit: 'albums-outline',
  Garantia: 'shield-checkmark-outline',
  OrdenCompra: 'cart-outline'
};

const ETIQUETAS: Record<EntidadBusqueda, string> = {
  Cliente: 'Clientes',
  Obra: 'Obras',
  Trabajador: 'Trabajadores',
  Proveedor: 'Proveedores',
  Material: 'Materiales',
  Kit: 'Kits',
  Garantia: 'Garantías',
  OrdenCompra: 'Órdenes de Compra'
};

const ORDEN: EntidadBusqueda[] = [
  'Cliente',
  'Obra',
  'Trabajador',
  'Proveedor',
  'Material',
  'Kit',
  'Garantia',
  'OrdenCompra'
];

@Component({
  selector: 'app-omnibox',
  standalone: true,
  imports: [FormsModule, CommonModule, IonicModule, RouterModule],
  templateUrl: './omnibox.component.html',
  styleUrls: ['./omnibox.component.scss']
})
export class OmniboxComponent implements OnInit, OnDestroy {
  private search = inject(SearchService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  query = '';
  open = false;
  loading = false;
  groups: GroupedResults[] = [];
  private debounce: any = null;
  private focusSub?: Subscription;

  ngOnInit(): void {
    this.focusSub = this.router.events.subscribe(() => this.cerrar());
  }

  ngOnDestroy(): void {
    if (this.debounce) clearTimeout(this.debounce);
    this.focusSub?.unsubscribe();
  }

  onInput(): void {
    if (this.debounce) clearTimeout(this.debounce);
    const q = this.query.trim();

    if (q.length < 2) {
      this.open = false;
      this.groups = [];
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.open = true;
    this.cdr.markForCheck();

    this.debounce = setTimeout(() => {
      this.search.searchGlobal(q).subscribe({
        next: (results) => {
          this.groups = ORDEN
            .map(tipo => ({
              tipo,
              icon: ICONOS[tipo],
              label: ETIQUETAS[tipo],
              items: results.filter(r => r.tipo === tipo)
            }))
            .filter(g => g.items.length > 0);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.groups = [];
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
    }, 300);
  }

  totalResultados(): number {
    return this.groups.reduce((acc, g) => acc + g.items.length, 0);
  }

  seleccionar(r: SearchResult): void {
    this.query = '';
    this.open = false;
    this.groups = [];
    this.router.navigate([r.ruta]);
  }

  cerrar(): void {
    this.open = false;
  }

  onFocus(): void {
    if (this.query.trim().length >= 2) this.open = true;
  }
}
