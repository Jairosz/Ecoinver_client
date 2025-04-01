import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

@Component({
  selector: 'app-cultive-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cultive-details.component.html',
})
export class CultiveDetailsComponent implements AfterViewInit {
  activeTab: 'profile' | 'dashboard' | 'settings' | 'contacts' = 'profile';
  private map: L.Map | undefined;

  setActiveTab(tab: 'profile' | 'dashboard' | 'settings' | 'contacts'): void {
    this.activeTab = tab;
  }
  ngAfterViewInit(): void {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('No se encontró el elemento con id="map"');
      return;
    }
    this.map = L.map(mapElement, {
      center: [51.505, -0.09],
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);
  }
}
