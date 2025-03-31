import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  // Variables para controlar el estado de cada dropdown
  administracionOpen = false;
  comercialOpen = false;
  campoOpen = false;

  toggleAdministracion(): void {
    this.administracionOpen = !this.administracionOpen;
  }

  toggleComercial(): void {
    this.comercialOpen = !this.comercialOpen;
  }

  toggleCampo(): void {
    this.campoOpen = !this.campoOpen;
  }
}
