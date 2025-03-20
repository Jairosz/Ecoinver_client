import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CultiveComponent } from './components/cultive/cultive.component';

export const routes: Routes = [
  // Redirige la raíz al login
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  
  // Ruta para el login (sin layout)
  { path: 'login', component: LoginComponent },
  
  // Rutas protegidas que usan un layout común
  { 
    path: '', 
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'cultive', component: CultiveComponent },
      // Otras rutas dentro del layout, si las hay
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Ruta comodín redirige a login
  { path: '**', redirectTo: 'login' }
];
