import { Component, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { DatePipe } from '@angular/common';
import { WeatherIconsService } from '../../services/WeatherIcons.service';
//imports para el manejo de cultivo

import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment/environment';

interface Cultivo {
  id: number;
  idCultivo: number;
  idAgricultor: number;
  nombreAgricultor: string;
  idFinca: number;
  nombreFinca: string;
  idNave: number;
  nombreNave: string;
  idGenero: number;
  nombreGenero: string;
  nombreVariedad: string;
  superficie: number;
  produccionEstimada: number;
  fechaSiembra: Date | null;
  fechaFin: Date | null;
  latitud: string;
  longitud: string;
}

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
export class CultiveDetailsComponent implements AfterViewInit, OnDestroy, OnInit {
  activeTab: 'Datos de cultivo' | 'Mapping' | 'Insights' = 'Datos de cultivo';
  private map: L.Map | null = null;
  private shape: L.Layer | null = null; // Puede ser un círculo, rectángulo o polígono

  // Valores predeterminados por si no hay datos de cultivo disponibles
  //private defaultLatitud = 36.786911;
  //private defaultLongitud = -2.651989;
  
  // Datos del cultivo
  cultivo: Cultivo | null = null;
  loading: boolean = true;
  error: string | null = null;

  // Indicador para mostrar el estado de carga de las coordenadas
  showCoordinatesLoading: boolean = false;


  //mapping y tiempo
  weatherForecast: WeatherForecast[] = [];
  constructor(
    public weatherIcons: WeatherIconsService,
    private route: ActivatedRoute,
    private http: HttpClient  
  ) {}

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

  // Método para obtener la latitud del cultivo o usar el valor por defecto
   getLatitud(): number {
    if (this.cultivo && this.cultivo.latitud) {
      console.log(this.cultivo?.latitud);
      return parseFloat(this.cultivo.latitud);
    }
    
    return 0;
  }

  // Método para obtener la longitud del cultivo o usar el valor por defecto
   getLongitud(): number {
    if (this.cultivo && this.cultivo.longitud) {
      return parseFloat(this.cultivo.longitud);
    }
    return 0;
  }

  // se cargan los datos necesarios, id, latitud altitud
  async ngOnInit() {
    // Obtener ID del cultivo de la URL
    const id = this.route.snapshot.paramMap.get('id');
    console.log(this.route.snapshot.paramMap);
    if (id) {
      await this.loadCultivo(id);
      // Obtener datos meteorológicos usando las coordenadas del cultivo
      this.weatherData = await this.getWeather(this.getLatitud(), this.getLongitud());
    } else {
      this.error = 'ID de cultivo no especificado';
      this.loading = false;
    }
  }

  private loadCultivo(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${environment.baseUrl}/cultives/${id}`;
      this.http.get<Cultivo>(url).subscribe({
        next: (response) => {
          this.cultivo = {
            ...response,
            fechaSiembra: response.fechaSiembra ? new Date(response.fechaSiembra) : null,
            fechaFin: response.fechaFin ? new Date(response.fechaFin) : null
          };
          this.loading = false;
          resolve();
        },
        error: (error) => {
          console.error('Error cargando cultivo:', error);
          this.error = 'Error al cargar los datos del cultivo';
          this.loading = false;
          reject(error);
        }
      });
    });
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
  
    const lat = this.getLatitud();
    const lng = this.getLongitud();
  
    // Si las coordenadas no han sido especificadas (es decir, son 0)
    if (lat === 0 || lng === 0) {
      // Mostrar animación de carga
      this.showCoordinatesLoading = true;
      // Después de 2 segundos, ocultar el loading y establecer un mensaje de error
      setTimeout(() => {
        this.showCoordinatesLoading = false;
        this.error = 'Las coordenadas no han sido especificadas';
      }, 2000);
      return; // No se inicializa el mapa
    }
  
    // Si hay coordenadas válidas, se procede a inicializar el mapa
    const mapElement = document.getElementById('map');
    if (!mapElement) return;
  
    this.map = L.map(mapElement, {
      center: [lat, lng], // Coordenadas del cultivo
      zoom: 13,
    });
  
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);
  
    // Crear un rectángulo usando las coordenadas del cultivo
    this.addRectangleMarker(lat, lng);
  
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 100);
  }
  

  
  // 📌 Método para agregar un rectángulo que marca una zona en función de la superficie del cultivo
addRectangleMarker(lat: number, lng: number): void {
  if (!this.map) return;

  // Eliminar la forma previa si existe
  if (this.shape) {
    this.shape.remove();
  }

  // Si tenemos datos del cultivo y su superficie
  if (this.cultivo && this.cultivo.superficie && this.cultivo.superficie > 0) {
    // Calcular la longitud del lado en metros (suponiendo forma cuadrada)
    const sideInMeters = Math.sqrt(this.cultivo.superficie);

    // Conversión a grados:
    const latDelta = sideInMeters / 111111; // Aproximadamente 111.111 m por grado de latitud
    const lngDelta = sideInMeters / (111111 * Math.cos(lat * Math.PI / 180)); // Ajuste según la latitud

    // Definir los límites del rectángulo centrado en (lat, lng)
    const bounds: [L.LatLngTuple, L.LatLngTuple] = [
      [lat - latDelta / 2, lng - lngDelta / 2], // Esquina superior izquierda
      [lat + latDelta / 2, lng + lngDelta / 2]  // Esquina inferior derecha
    ];

    // Crear el rectángulo con los límites calculados
    this.shape = L.rectangle(bounds, {
      color: '#437d3f',
      weight: 1,
      fillColor: '#437d3f',
      fillOpacity: 0.3,
    }).addTo(this.map)
      .bindPopup(`Cultivo: <br><strong>${this.cultivo.nombreGenero} ${this.cultivo.nombreVariedad}</strong><br>Ubicación: <strong>${lat.toFixed(6)}, ${lng.toFixed(6)}</strong>`)
      .openPopup();

    // Centrar el mapa en la zona del rectángulo
    this.map.fitBounds(bounds);
  } else {
    // Si no hay datos de superficie, se usa un tamaño por defecto
    const defaultDelta = 0.01;
    const bounds: [L.LatLngTuple, L.LatLngTuple] = [
      [lat - defaultDelta / 2, lng - defaultDelta / 2],
      [lat + defaultDelta / 2, lng + defaultDelta / 2]
    ];
    this.shape = L.rectangle(bounds, {
      color: '#437d3f',
      weight: 1,
      fillColor: '#437d3f',
      fillOpacity: 0.3,
    }).addTo(this.map)
      .bindPopup(`Cultivo: <br><strong>${this.cultivo?.nombreGenero || 'Desconocido'} ${this.cultivo?.nombreVariedad || ''}</strong><br>Ubicación: <strong>${lat.toFixed(6)}, ${lng.toFixed(6)}</strong>`)
      .openPopup();
    this.map.fitBounds(bounds);
  }
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
      color: '#437d3f',
      weight: 1,
      fillColor: '#437d3f',
      fillOpacity: 0.3,
    }).addTo(this.map)
      .bindPopup(`Cultivo: <br><strong>${this.cultivo?.nombreGenero} ${this.cultivo?.nombreVariedad}</strong><br>Ubicación: <strong>${lat.toFixed(6)}, ${lng.toFixed(6)}</strong>`)
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
  


  //metodo para calcular la barra de progresion:
  getProgressPercentage(): number {
    if (!this.cultivo || !this.cultivo.fechaSiembra || !this.cultivo.fechaFin) {
      return 0; // Retorna 0 si no se tienen ambas fechas
    }
  
    const now = new Date();
    const start = new Date(this.cultivo.fechaSiembra);
    const end = new Date(this.cultivo.fechaFin);
  
    // Si aún no ha comenzado, el progreso es 0%
    if (now < start) {
      return 0;
    }
  
    // Si ya pasó la fecha fin, el progreso es 100%
    if (now > end) {
      return 100;
    }
  
    // Calcular el porcentaje transcurrido
    const progress = ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
    return progress;
  }

  // Retorna el estado del cultivo según las fechas
getCultivoState(): string {
  if (!this.cultivo || !this.cultivo.fechaSiembra || !this.cultivo.fechaFin) {
    return 'Activo'; // Por defecto
  }
  const now = new Date();
  const start = new Date(this.cultivo.fechaSiembra);
  const end = new Date(this.cultivo.fechaFin);

  // Si la fecha actual es posterior o igual a la fecha fin, el cultivo se considera finalizado
  return now >= end ? 'Finalizado' : 'Activo';
}





  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}