import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { DatePipe } from '@angular/common';
import { WeatherIconsService } from '../../services/WeatherIcons.service';

interface WeatherForecast {
  date: Date;
  temp: number;
  condition: string;
  precipitation: number;
  weatherCode: number; // Añade esta propiedad
}


@Component({
  selector: 'app-cultive-details',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './cultive-details.component.html',
})
export class CultiveDetailsComponent implements AfterViewInit, OnDestroy {
  activeTab: 'Datos de cultivo' | 'Mapping' | 'Insights' = 'Datos de cultivo';
  private map: L.Map | null = null;
  private shape: L.Layer | null = null; // Puede ser un círculo, rectángulo o polígono

  private latitud=36.786911;
  private alt=-2.651989;
  

  weatherForecast: WeatherForecast[] = [];
  constructor(public weatherIcons: WeatherIconsService) {}

  setActiveTab(tab: 'Datos de cultivo' | 'Mapping' | 'Insights'): void {
    this.activeTab = tab;
    if (tab === 'Mapping') {
      setTimeout(() => this.initMap(), 0); // Pequeño delay para asegurar la renderización
    }
  }

  ngAfterViewInit(): void {
    if (this.activeTab === 'Mapping') {
      this.initMap();
    }
  }

  weatherData: { temp: number, wind: number, condition: string } | null = null;

// Modifica tu ngOnInit
async ngOnInit() {
  this.weatherData = await this.getWeather(this.latitud, this.alt);
}

// Añade este método para traducir códigos del clima
private getWeatherCondition(code: number): string {
  const weatherCodes: { [key: number]: string } = {
    0: 'Cielo despejado',
    1: 'Principalmente despejado',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Niebla',
    48: 'Niebla helada',
    51: 'Llovizna ligera',
    53: 'Llovizna moderada',
    55: 'Llovizna intensa',
    56: 'Llovizna helada ligera',
    57: 'Llovizna helada intensa',
    61: 'Lluvia ligera',
    63: 'Lluvia moderada',
    65: 'Lluvia intensa',
    66: 'Lluvia helada ligera',
    67: 'Lluvia helada intensa',
    71: 'Nieve ligera',
    73: 'Nieve moderada',
    75: 'Nieve intensa',
    77: 'Granizo',
    80: 'Lluvias ligeras',
    81: 'Lluvias moderadas',
    82: 'Lluvias violentas',
    85: 'Nevadas ligeras',
    86: 'Nevadas intensas',
    95: 'Tormenta eléctrica',
    96: 'Tormenta con granizo ligero',
    99: 'Tormenta con granizo intenso'
  };

  

  return weatherCodes[code] || 'Condición desconocida';
}


getWeatherIcon(weatherCode: number): string {
  const iconMappings: {[key: number]: string} = {
    0: 'sunny',
    1: 'cloudy',
    2: 'cloudy',
    3: 'cloudy',
    45: 'fog',
    48: 'fog',
    51: 'light-rain',
    53: 'rain',
    55: 'heavy-rain',
    80: 'rainy',
    // ... completa el mapeo con las claves de los SVG
    95: 'storm',
    96: 'storm',
    99: 'storm'
  };
  
  return iconMappings[weatherCode] || 'cloudy';
}


  private initMap(): void {
    if (this.map) return; // Evitar múltiples inicializaciones

    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    this.map = L.map(mapElement, {
      center: [this.latitud, this.alt],  // Coordenadas iniciales
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    // Crear un rectángulo o un polígono que represente una zona alrededor de las coordenadas
    this.addRectangleMarker(36.786911, -2.651989, 0.01, 0.02);  // Ejemplo de rectángulo
    // this.addPolygonMarker(36.749633, -2.767880);  // Ejemplo de polígono

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 100);
  }

  // 📌 Método para agregar un rectángulo que marca una zona
  addRectangleMarker(lat: number, lng: number, width: number, height: number): void {
    if (!this.map) return;
  
    // Eliminar la forma previa si existe
    if (this.shape) {
      this.shape.remove();
    }
  
    // Coordenadas del rectángulo (esquina superior izquierda e inferior derecha)
    const bounds: [L.LatLngTuple, L.LatLngTuple] = [
      [lat - height / 2, lng - width / 2],  // Esquina superior izquierda
      [lat + height / 2, lng + width / 2],  // Esquina inferior derecha
    ];
  
    // Crear un rectángulo
    this.shape = L.rectangle(bounds, {
      color: 'green',
      weight: 1,
      fillColor: 'green',
      fillOpacity: 0.3,
    }).addTo(this.map)
      .bindPopup(`Zona rectangular alrededor de: <br><strong>${lat}, ${lng}</strong>`)
      .openPopup();
  
    // Centrar el mapa en la zona del rectángulo
    this.map.fitBounds(bounds);
  }
  

  // 📌 Método para agregar un polígono que marca una zona
  addPolygonMarker(lat: number, lng: number): void {
    if (!this.map) return;
  
    // Eliminar la forma previa si existe
    if (this.shape) {
      this.shape.remove();
    }
  
    // Definir los puntos del polígono (cada punto debe ser una tupla [lat, lng])
    const polygonPoints: L.LatLngTuple[] = [
      [lat, lng],  // Punto 1
      [lat + 0.01, lng + 0.01],  // Punto 2
      [lat - 0.01, lng + 0.01],  // Punto 3
      [lat, lng]  // Punto 4 (cerrando el polígono)
    ];
  
    // Crear el polígono
    this.shape = L.polygon(polygonPoints, {
      color: 'blue',
      weight: 1,
      fillColor: 'blue',
      fillOpacity: 0.3,
    }).addTo(this.map)
      .bindPopup(`Zona de polígono alrededor de: <br><strong>${lat}, ${lng}</strong>`)
      .openPopup();
  
    // Centrar el mapa en el polígono
    this.map.fitBounds(polygonPoints);
  }
  
  async getWeather(lat: number, lng: number) {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
      );
      const data = await response.json();
      
      // Procesar pronóstico de 7 días
      this.weatherForecast = data.daily.time.map((dateString: string, index: number) => {
  const date = new Date(dateString);
  return {
    date: date,
    temp: Math.round((data.daily.temperature_2m_max[index] + data.daily.temperature_2m_min[index]) / 2),
    condition: this.getWeatherCondition(data.daily.weathercode[index]),
    precipitation: data.daily.precipitation_sum[index],
    weatherCode: data.daily.weathercode[index] // Añade el código meteorológico
  };
});

      return {
        temp: data.current_weather.temperature,
        wind: data.current_weather.windspeed,
        condition: this.getWeatherCondition(data.current_weather.weathercode)
      };
    } catch (error) {
      console.error('Error obteniendo el clima:', error);
      return { temp: 0, wind: 0, condition: 'Desconocido' };
    }
  }

  
  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
