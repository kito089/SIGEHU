import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', loadComponent: () => import('./pages/Admin/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'trabajadores', loadComponent: () => import('./pages/Admin/trabajadores/trabajadores.component').then(m => m.TrabajadoresComponent) },
  { path: 'clientes', loadComponent: () => import('./pages/Admin/clientes/clientes.component').then(m => m.ClientesComponent) },
  { path: 'clientes/form', loadComponent: () => import('./pages/Admin/clientes/ClientesFrom/clientesfrom.component').then(m => m.ClienteFormComponent) },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
