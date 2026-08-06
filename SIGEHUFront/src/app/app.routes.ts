import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MainLayoutComponent } from './shared/components/layout/main-layout/main-layout.component';
import { AdminGuard } from './guards/admin.guard';
import { WorkerGuard } from './guards/worker.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'admin',
    component: MainLayoutComponent,
    canActivate: [AdminGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/Admin/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'obras', loadComponent: () => import('./pages/Admin/obras/obras.component').then(m => m.ObrasComponent) },
      { path: 'obras/nueva', loadComponent: () => import('./pages/Admin/obras/obra-form/obra-form.component').then(m => m.ObraFormComponent) },
      { path: 'obras/editar/:id', loadComponent: () => import('./pages/Admin/obras/obra-form/obra-form.component').then(m => m.ObraFormComponent) },
      { path: 'trabajadores', loadComponent: () => import('./pages/Admin/trabajadores/trabajadores.component').then(m => m.TrabajadoresComponent) },
      { path: 'clientes', loadComponent: () => import('./pages/Admin/clientes/clientes.component').then(m => m.ClientesComponent) },
      { path: 'clientes/form', loadComponent: () => import('./pages/Admin/clientes/clientes-form/cliente-form.component').then(m => m.ClienteFormComponent) },
      { path: 'trabajadores/nuevo', loadComponent: () => import('./pages/Admin/trabajadores/trabajador-new/trabajador-new.component').then(m => m.TrabajadorNewComponent) },
      { path: 'proveedores', loadComponent: () => import('./pages/Admin/proveedores/proveedores.component').then(m => m.ProveedoresComponent) },
      { path: 'proveedores/nuevo', loadComponent: () => import('./pages/Admin/proveedores/proveedor-new/proveedor-new.component').then(m => m.ProveedorNewComponent) },
      { path: 'calendario', loadComponent: () => import('./pages/Admin/calendario/calendario.component').then(m => m.CalendarioOperativoComponent) },
      { path: 'calendario/agendar', loadComponent: () => import('./pages/Admin/calendario/Agendar/agendar.component').then(m => m.AgendarComponent) },
      { path: 'materiales', loadComponent: () => import('./pages/Admin/materiales/materiales.component').then(m => m.MaterialesComponent) },
      { path: 'materiales/nuevo', loadComponent: () => import('./pages/Admin/materiales/material-form/material-form.component').then(m => m.MaterialFormComponent) },
      { path: 'kits', loadComponent: () => import('./pages/Admin/kits/kits.component').then(m => m.KitsComponent) },
      { path: 'kits/nuevo', loadComponent: () => import('./pages/Admin/kits/kit-form/kit-form.component').then(m => m.KitFormComponent) },
      { path: 'reportes', loadComponent: () => import('./pages/Admin/reportes/reportes.component').then(m => m.ReportesComponent) },
      { path: 'reportes/historial', loadComponent: () => import('./pages/Admin/reportes/historial/historial.component').then(m => m.HistorialComponent) },
      { path: 'catalogo', loadComponent: () => import('./pages/Admin/materiales/materiales.component').then(m => m.MaterialesComponent) },
      { path: 'fabricacion', loadComponent: () => import('./pages/Admin/fabricacion/control-fabricacion.component').then(m => m.ControlFabricacionComponent) },
      { path: 'ruta', loadComponent: () => import('./pages/Admin/ruta/hoja-ruta.component').then(m => m.HojaRutaComponent) },
      { path: 'garantias', loadComponent: () => import('./pages/Admin/garantias/garantias.component').then(m => m.GarantiasComponent) },
      { path: 'orden', loadComponent: () => import('./pages/Admin/orden/ordenes-compra.component').then(m => m.OrdenesCompraComponent) },
      { path: 'orden/nueva', loadComponent: () => import('./pages/Admin/orden/compra-form/compra-form.component').then(m => m.CompraFormComponent) },
      { path: 'analitico', loadComponent: () => import('./pages/Admin/analitico/panel-analitico.component').then(m => m.PanelAnaliticoComponent) },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'movil',
    canActivate: [WorkerGuard],
    children: [
      { path: 'levantamientos', loadComponent: () => import('./pages/MovilCampo/levantamientos/levantamientos.component').then(m => m.LevantamientosComponent) },
      { path: 'fabricacion', loadComponent: () => import('./pages/MovilCampo/fabricacion/fabricacion.component').then(m => m.FabricacionComponent) },
      { path: 'compras', loadComponent: () => import('./pages/MovilCampo/compras/compras.component').then(m => m.ComprasComponent) },
      { path: 'ruta', loadComponent: () => import('./pages/MovilCampo/ruta/ruta.component').then(m => m.RutaComponent) },
      { path: 'garantias', loadComponent: () => import('./pages/MovilCampo/garantias/garantias.component').then(m => m.GarantiasCampoComponent) },
      { path: '', redirectTo: 'levantamientos', pathMatch: 'full' }
    ]
  },
  { path: 'worker', redirectTo: 'movil/levantamientos', pathMatch: 'full' },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];