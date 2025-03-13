import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

interface TokenPayload {
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/formalizedname": string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./sidebar.component.css'],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent implements OnInit {
  role: string | null = null;
  name: string | null = null;
  sidenav: boolean = true;

  constructor(private router: Router) { }

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }
    try {
      const decoded = jwtDecode<TokenPayload>(token);
      this.role = decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
      this.name = decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/formalizedname"];
      console.log('Role:', this.role);
      console.log('Formalized Name:', this.name);
    } catch (error) {
      console.error('Error al decodificar el token', error);
      this.router.navigate(['/login']);
    }
  }
}
