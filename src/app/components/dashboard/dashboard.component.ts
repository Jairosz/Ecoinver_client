import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h2 class="text-2xl font-bold mb-4">Dashboard</h2>
      <!-- Contenido del Dashboard -->
      <p>Bienvenido al Dashboard.</p>
    </div>
  `
})
export class DashboardComponent {}
