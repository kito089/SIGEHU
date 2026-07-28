import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'home', loadComponent: () => import('./home/home.page').then(m => m.HomePage) },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
