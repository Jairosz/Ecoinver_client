import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="bg-gray-800 text-white p-4 text-center">
      <!-- Contenido del Footer -->
      <p>&copy; 2025 Mi Aplicación</p>
    </footer>
  `
})
export class FooterComponent {}
