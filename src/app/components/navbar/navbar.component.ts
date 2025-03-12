import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="bg-gray-800 text-white p-4">
      <!-- Contenido del Navbar -->
      <h1 class="text-lg font-bold">Mi Aplicación</h1>
    </nav>
  `
})
export class NavbarComponent {}
