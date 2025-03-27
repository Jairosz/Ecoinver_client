import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // para routerLink

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  // Variable que controla si el dropdown "Administración" está abierto
  administracionOpen = false;

  toggleAdministracion(): void {
    this.administracionOpen = !this.administracionOpen;
  }
}
