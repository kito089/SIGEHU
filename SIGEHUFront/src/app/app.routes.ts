import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { AdminGuard } from './guards/admin.guard';
import { WorkerGuard } from './guards/worker.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'admin',
    canActivate: [AdminGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/Admin/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'trabajadores', loadComponent: () => import('./pages/Admin/trabajadores/trabajadores.component').then(m => m.TrabajadoresComponent) },
      { path: 'clientes', loadComponent: () => import('./pages/Admin/clientes/clientes.component').then(m => m.ClientesComponent) },
      { path: 'clientes/form', loadComponent: () => import('./pages/Admin/clientes/ClientesFrom/clientesfrom.component').then(m => m.ClienteFormComponent) },
      { path: 'trabajadores/nuevo', loadComponent: () => import('./pages/Admin/trabajadores/trabajadornew/trabajadornew.component').then(m => m.TrabajadorNewComponent) },
      { path: 'proveedores', loadComponent: () => import('./pages/Admin/provedores/provedores.component').then(m => m.ProveedoresComponent) },
      { path: 'proveedores/nuevo', loadComponent: () => import('./pages/Admin/provedores/provedornew/provedornew.component').then(m => m.ProvedorNewComponent) },
      { path: 'calendario', loadComponent: () => import('./pages/Admin/calendario/calendario.component').then(m => m.CalendarioOperativoComponent) },
      { path: 'calendario/agendar', loadComponent: () => import('./pages/Admin/calendario/Agendar/agendar.component').then(m => m.AgendarComponent) },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
