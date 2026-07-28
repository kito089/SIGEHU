import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'trabajadores', loadComponent: () => import('./pages/trabajadores/trabajadores.component').then(m => m.TrabajadoresComponent) },
  { path: 'clientes', loadComponent: () => import('./pages/clientes/clientes.component').then(m => m.ClientesComponent) },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
