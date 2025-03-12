import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [NavbarComponent, SidebarComponent, FooterComponent, RouterOutlet],
  template: `
    <app-navbar></app-navbar>
    <div class="flex">
      <app-sidebar></app-sidebar>
      <div class="flex-1 p-4">
        <router-outlet></router-outlet>
      </div>
    </div>
    <app-footer></app-footer>
  `
})
export class LayoutComponent {}
