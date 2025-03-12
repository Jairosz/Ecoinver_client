import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

interface TokenPayload {
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
<aside class="bg-gray-100 p-4 w-64 h-full">
  <!-- Menú del Sidebar -->
  <ul>
    <li class="mb-2">
      <a routerLink="/dashboard" class="text-gray-700">Dashboard</a>
    </li>
    <!-- Botón solo para administradores (exclusivo) -->
    <li class="mb-2" *ngIf="role === 'Admin'">
      <a routerLink="/admin" class="text-gray-700">Administración</a>
    </li>
    <!-- Botón para usuarios con rol "editor" o Admin (Admin ve todo) -->
    <li class="mb-2" *ngIf="role === 'editor' || role === 'Admin'">
      <a routerLink="/editor" class="text-gray-700">Editor</a>
    </li>
  </ul>
</aside>
  `,
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  role: string | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    try {
      const decoded = jwtDecode<TokenPayload>(token);
      // Accedemos al claim usando la clave completa:
      this.role = decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
      console.log(this.role);
    } catch (error) {
      console.error('Error al decodificar el token', error);
      this.router.navigate(['/login']);
    }
  }
}
