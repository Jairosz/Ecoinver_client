import { Component, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { DatePipe } from '@angular/common';
import { WeatherIconsService } from '../../services/WeatherIcons.service';
import { trigger, transition, style, query, group, animate } from '@angular/animations';

import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment/environment';

import { ChartModule } from 'primeng/chart';
import { CultivoService } from '../../services/Cultivo.service';
import { CultiveProductionService } from '../../services/CultiveProduction.service';
import { CultiveProductionDto } from '../../types/CultiveProductionTypes';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  weatherCode: number;
}

// Actualizar la interfaz para tener ambas producciones
interface ProductionData {
  label: string; // Typically a time period like "T1", "T2", etc.
  realProduction: number; // Real production in kilos (will be filled in the future)
  estimatedProduction: number; // Estimated production in kilos (from kilosAjustados)
}

@Component({
  selector: 'app-cultive-details',
  standalone: true,
  imports: [CommonModule, DatePipe, ChartModule, FormsModule],
  templateUrl: './cultive-details.component.html',
})
export class CultiveDetailsComponent
  implements AfterViewInit, OnDestroy, OnInit {
  activeTab: 'Datos de cultivo' | 'Mapping' | 'Insights' | 'nerfs' = 'Datos de cultivo';
  private map: L.Map | null = null;
  private shape: L.Layer | null = null; // Puede ser un círculo, rectángulo o polígono

  // Datos del cultivo
  cultivo: Cultivo | null = null;
  loading: boolean = true;
  error: string | null = null;

  // Datos de producción
  productions: CultiveProductionDto[] = [];
  productionsLoaded: boolean = false;
  productionError: string | null = null;

  // Indicador para mostrar el estado de carga de las coordenadas
  showCoordinatesLoading: boolean = false;

  // Añadir estas nuevas propiedades para el gráfico
  data: any;
  options: any;

  // Nueva propiedad para el tramo seleccionado
  selectedTramoIndex: number = 0;
  
  // Propiedad para alternar entre vistas de estadísticas
  statsView: 'tramos' | 'resumen' = 'tramos';

  //barra progresiva
  progressPercentage: number = 0;
  private progressInterval: any;

  actualizarProgreso(): void {
    this.progressPercentage = this.getProgressPercentage();
  }

  //mapping y tiempo
  weatherForecast: WeatherForecast[] = [];
  constructor(
    public weatherIcons: WeatherIconsService,
    private route: ActivatedRoute,
    private http: HttpClient,
    private cultive: CultivoService,
    private productionService: CultiveProductionService
  ) { }

  setActiveTab(tab: 'Datos de cultivo' | 'Mapping' | 'Insights' | 'nerfs'): void {
    this.activeTab = tab;
    if (tab === 'Mapping') {
      setTimeout(() => this.initMap(), 0); // Pequeño delay
    }
  }
  
  // Método para cambiar la vista de estadísticas
  setStatsView(view: 'tramos' | 'resumen'): void {
    this.statsView = view;
  }
  
  // Método para calcular la producción total estimada
  getTotalProduccionEstimada(): number {
    if (!this.productions || this.productions.length === 0) {
      return 0;
    }
    
    return this.productions.reduce((total, prod) => {
      return total + this.parseNumericValue(prod.kilosAjustados);
    }, 0);
  }
  
  // Método para formatear números con separadores de miles (puntos)
  formatNumber(value: number): string {
    return value.toLocaleString('es-ES'); // Formato español que usa punto como separador de miles
  }
  
  // Método para calcular la duración total en días
  getTotalDuracion(): number {
    if (!this.productions || this.productions.length === 0) {
      return 0;
    }
    
    // Podríamos simplemente sumar las duraciones de cada tramo
    // Pero es más preciso calcular la diferencia entre la fecha de inicio del primer tramo
    // y la fecha de fin del último tramo
    const sortedProductions = [...this.productions].sort((a, b) => 
      new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
    );
    
    const firstDate = new Date(sortedProductions[0].fechaInicio);
    const lastDate = new Date(sortedProductions[sortedProductions.length - 1].fechaFin);
    
    const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  ngAfterViewInit(): void {
    if (this.activeTab === 'Mapping') {
      this.initMap();
    }
  }

  weatherData: { temp: number; wind: number; condition: string } | null = null;

  // Método para obtener la latitud del cultivo o usar el valor por defecto
  getLatitud(): number {
    if (this.cultivo && this.cultivo.latitud) {
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

  // Función auxiliar para analizar valores numéricos de manera más robusta
  private parseNumericValue(value: string | number): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    // Convertir a string y eliminar espacios
    let str = String(value).trim();
    
    // Reemplazar coma con punto (para formato decimal español)
    str = str.replace(',', '.');
    
    // Eliminar cualquier carácter no numérico excepto el punto decimal
    str = str.replace(/[^\d.]/g, '');
    
    const result = parseFloat(str);
    return isNaN(result) ? 0 : result;
  }

  // se cargan los datos necesarios, id, latitud altitud
  async ngOnInit() {
    console.log('Iniciando CultiveDetailsComponent');
    // Obtener ID del cultivo de la URL
    const id = this.route.snapshot.paramMap.get('id');
    console.log('ID del cultivo obtenido de la URL:', id);
    
    this.actualizarProgreso(); // Calcular el valor inicial
    
    // actualizar el progreso cada minuto:
    this.progressInterval = setInterval(() => {
      this.actualizarProgreso();
    }, 1000); // 60000 milisegundos = 1 minuto
    
    if (id) {
      try {
        console.log('Cargando datos del cultivo...');
        await this.loadCultivo(id);
        console.log('Datos del cultivo cargados:', this.cultivo);
        
        console.log('Cargando datos de producción...');
        await this.loadProductions(id);
        console.log('Datos de producción cargados, total:', this.productions.length);
        
        // Inicializar gráfico después de cargar todos los datos
        this.initializeChart();
        
        // Obtener datos meteorológicos usando las coordenadas del cultivo
        this.weatherData = await this.getWeather(
          this.getLatitud(),
          this.getLongitud()
        );
      } catch (error) {
        console.error('Error en la inicialización del componente:', error);
        this.error = 'Error al cargar los datos necesarios';
        this.loading = false;
      }
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
            fechaSiembra: response.fechaSiembra
              ? new Date(response.fechaSiembra)
              : null,
            fechaFin: response.fechaFin ? new Date(response.fechaFin) : null,
          };
          this.loading = false;
          resolve();
        },
        error: (error) => {
          console.error('Error cargando cultivo:', error);
          this.error = 'Error al cargar los datos del cultivo';
          this.loading = false;
          reject(error);
        },
      });
    });
  }

  private loadProductions(cultivoId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Obtener producciones por cultivo ID
      this.productionService.getAllCultiveProductions().subscribe({
        next: (allProductions) => {
          // Filtrar solo las producciones de este cultivo
          this.productions = allProductions.filter(
            prod => prod.cultiveId === parseInt(cultivoId)
          );
          
          // Ordenar las producciones por fecha
          this.productions = this.productions.sort((a, b) => 
            new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
          );
          
          console.log('Producciones sin procesar:', this.productions);
          
          // NO MODIFICAR LOS DATOS - usar tal como vienen de la API
          // Solo registrar para depuración
          if (this.productions.length > 1) {
            const uniqueValues = new Set(this.productions.map(p => p.kilosAjustados));
            console.log(`Valores únicos de kilosAjustados: ${[...uniqueValues].join(', ')}`);
            if (uniqueValues.size === 1) {
              console.warn('Todas las producciones tienen el mismo valor de kilosAjustados');
            }
          }
          
          this.productionsLoaded = true;
          
          // Actualizar estadísticas del tramo inicial
          if (this.productions.length > 0) {
            // Intentar seleccionar un tramo actual si existe
            const tramoActualIndex = this.productions.findIndex(prod => {
              const fechaInicio = new Date(prod.fechaInicio);
              const fechaFin = new Date(prod.fechaFin);
              const now = new Date();
              return fechaInicio <= now && now <= fechaFin;
            });
            
            // Si hay un tramo actual, seleccionarlo; de lo contrario usar el primero (0)
            this.selectedTramoIndex = tramoActualIndex >= 0 ? tramoActualIndex : 0;
            this.updateSelectedTramoStats();
          }
          
          resolve();
        },
        error: (error) => {
          console.error('Error cargando producciones:', error);
          this.productionError = 'Error al cargar los datos de producción';
          this.productionsLoaded = false;
          reject(error);
        }
      });
    });
  }

  // Método para manejar el cambio de tramo seleccionado
  onTramoChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedTramoIndex = parseInt(selectElement.value);
    this.updateSelectedTramoStats();
  }
  
  // Método para actualizar las estadísticas del tramo seleccionado
  updateSelectedTramoStats(): void {
    if (this.productions.length === 0 || this.selectedTramoIndex < 0 || 
        this.selectedTramoIndex >= this.productions.length) {
      return;
    }
    
    // Aquí puedes actualizar las estadísticas basadas en el tramo seleccionado
    const selectedTramo = this.productions[this.selectedTramoIndex];
    console.log('Tramo seleccionado:', selectedTramo);
    
    // Las estadísticas se actualizarán automáticamente en la vista mediante los métodos de acceso
  }
  
  // Método para obtener la duración de un tramo en días
  getDuracionTramo(tramoIndex: number): number {
    if (this.productions.length === 0 || tramoIndex < 0 || 
        tramoIndex >= this.productions.length) {
      return 0;
    }
    
    const tramo = this.productions[tramoIndex];
    const fechaInicio = new Date(tramo.fechaInicio);
    const fechaFin = new Date(tramo.fechaFin);
    
    // Calcular la diferencia en días
    const diffTime = Math.abs(fechaFin.getTime() - fechaInicio.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
  
  // Método para obtener el valor de kilosAjustados del tramo seleccionado
  getValorKilosAjustados(tramoIndex: number): number {
    if (this.productions.length === 0 || tramoIndex < 0 || 
        tramoIndex >= this.productions.length) {
      return 0;
    }
    
    const tramo = this.productions[tramoIndex];
    return this.parseNumericValue(tramo.kilosAjustados);
  }
  
  // Método para determinar si un tramo está pendiente (fecha inicio en el futuro)
  isPendingTramo(tramoIndex: number): boolean {
    if (this.productions.length === 0 || tramoIndex < 0 || 
        tramoIndex >= this.productions.length) {
      return false;
    }
    
    const tramo = this.productions[tramoIndex];
    const fechaInicio = new Date(tramo.fechaInicio);
    const now = new Date();
    
    return fechaInicio > now;
  }
  
  // Método para determinar si un tramo está en curso
  isCurrentTramo(tramoIndex: number): boolean {
    if (this.productions.length === 0 || tramoIndex < 0 || 
        tramoIndex >= this.productions.length) {
      return false;
    }
    
    const tramo = this.productions[tramoIndex];
    const fechaInicio = new Date(tramo.fechaInicio);
    const fechaFin = new Date(tramo.fechaFin);
    const now = new Date();
    
    return fechaInicio <= now && now <= fechaFin;
  }
  
  // Método para determinar si un tramo está completado
  isCompletedTramo(tramoIndex: number): boolean {
    if (this.productions.length === 0 || tramoIndex < 0 || 
        tramoIndex >= this.productions.length) {
      return false;
    }
    
    const tramo = this.productions[tramoIndex];
    const fechaFin = new Date(tramo.fechaFin);
    const now = new Date();
    
    return fechaFin < now;
  }
  
  // Método para obtener el estado del tramo como texto
  getEstadoTramo(tramoIndex: number): string {
    if (this.isPendingTramo(tramoIndex)) {
      return 'Pendiente';
    } else if (this.isCurrentTramo(tramoIndex)) {
      return 'En progreso';
    } else if (this.isCompletedTramo(tramoIndex)) {
      return 'Completado';
    } else {
      return 'Desconocido';
    }
  }

  // Procesar datos de producción para el gráfico
  private processProductionData(): ProductionData[] {
    if (!this.productions || this.productions.length === 0) {
      console.log('No hay datos de producción disponibles para el gráfico');
      return [];
    }

    // Ordenar producciones por fecha
    const sortedProductions = [...this.productions].sort((a, b) => 
      new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
    );

    console.log('Producciones ordenadas por fecha:', sortedProductions);

    // Convertir a formato de gráfico
    const chartData = sortedProductions.map((prod, index) => {
      // Usar el método robusto para parsear kilosAjustados para la producción estimada
      const kilosAjustados = this.parseNumericValue(prod.kilosAjustados);
      console.log(`Producción ${index+1}: kilosAjustados=${prod.kilosAjustados}, parseado=${kilosAjustados}`);
      
      // Para la producción real, de momento ponemos 0 (se rellenará en el futuro)
      const realProduction = 0;
      
      return {
        label: `T ${index + 1}`, // T1, T2, etc.
        realProduction: realProduction, // Producción real (a rellenar en el futuro)
        estimatedProduction: kilosAjustados // Usar kilosAjustados como la producción estimada
      };
    });
    
    console.log('Datos procesados para el gráfico:', chartData);
    return chartData;
  }

  // Método para traducir los días de la semana a español
  getDiaEnEspanol(fecha: Date): string {
    const diasSemana: { [key: string]: string } = {
      'Sun': 'Dom',
      'Mon': 'Lun',
      'Tue': 'Mar',
      'Wed': 'Mié',
      'Thu': 'Jue',
      'Fri': 'Vie',
      'Sat': 'Sáb'
    };

    // Obtener la abreviatura del día en inglés
    const diaIngles = new Date(fecha).toLocaleDateString('en-US', { weekday: 'short' });
    const key = diaIngles.substring(0, 3);

    // Devolver el día traducido o el original si no se encuentra
    return diasSemana[key] || diaIngles;
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
      99: 'Tormenta con granizo intenso',
    };

    return weatherCodes[code] || 'Condición desconocida';
  }

  getWeatherIcon(weatherCode: number): string {
    const iconMappings: { [key: number]: string } = {
      0: 'sunny',
      1: 'partially_cloudy',
      2: 'partially_cloudy',
      3: 'cloudy',
      45: 'fog',
      48: 'fog',
      51: 'rainy',
      53: 'rain',
      55: 'heavy-rain',
      56: 'light-freezing-rain',
      57: 'heavy-freezing-rain',
      61: 'rainy',
      63: 'rain',
      65: 'heavy_rain',
      66: 'rain',
      67: 'rain',
      71: 'light_snow',
      73: 'snow',
      75: 'heavy-snow',
      77: 'hail',
      80: 'rainy',
      81: 'rainy',
      82: 'heavy-rainy',
      85: 'light-snow',
      86: 'heavy-snow',
      95: 'storm',
      96: 'storm',
      99: 'storm',
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
      attribution: '© OpenStreetMap',
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

    if (
      this.cultivo &&
      this.cultivo.superficie &&
      this.cultivo.superficie > 0
    ) {
      // Calcular el radio a partir del área (radio en metros)
      const radius = Math.sqrt(this.cultivo.superficie / Math.PI);

      this.shape = L.circle([lat, lng], {
        radius: radius,
        color: '#437d3f',
        weight: 1,
        fillColor: '#437d3f',
        fillOpacity: 0.3,
      })
        .addTo(this.map)
        .bindPopup(
          `Cultivo: <br><strong>${this.cultivo.nombreGenero} ${this.cultivo.nombreVariedad
          }</strong><br>Ubicación: <strong>${lat.toFixed(6)}, ${lng.toFixed(
            6
          )}</strong>`
        )
        .openPopup();

      if ((this.shape as any).getBounds) {
        this.map.fitBounds((this.shape as any).getBounds());
      }
    } else {
      // Si no se dispone de datos de superficie, se utiliza un radio por defecto (por ejemplo, 500 m)
      const defaultRadius = 500;
      this.shape = L.circle([lat, lng], {
        radius: defaultRadius,
        color: '#437d3f',
        weight: 1,
        fillColor: '#437d3f',
        fillOpacity: 0.3,
      })
        .addTo(this.map)
        .bindPopup(
          `Cultivo: <br><strong>${this.cultivo?.nombreGenero || 'Desconocido'
          } ${this.cultivo?.nombreVariedad || ''
          }</strong><br>Ubicación: <strong>${lat.toFixed(6)}, ${lng.toFixed(
            6
          )}</strong>`
        )
        .openPopup();

      if ((this.shape as any).getBounds) {
        this.map.fitBounds((this.shape as any).getBounds());
      }
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
      [lat, lng], // Punto 1
      [lat + 0.01, lng + 0.01], // Punto 2
      [lat - 0.01, lng + 0.01], // Punto 3
      [lat, lng], // Punto 4 (cerrando el polígono)
    ];

    // Crear el polígono
    this.shape = L.polygon(polygonPoints, {
      color: '#437d3f',
      weight: 1,
      fillColor: '#437d3f',
      fillOpacity: 0.3,
    })
      .addTo(this.map)
      .bindPopup(
        `Cultivo: <br><strong>${this.cultivo?.nombreGenero} ${this.cultivo?.nombreVariedad
        }</strong><br>Ubicación: <strong>${lat.toFixed(6)}, ${lng.toFixed(
          6
        )}</strong>`
      )
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
      this.weatherForecast = data.daily.time.map(
        (dateString: string, index: number) => {
          const date = new Date(dateString);
          return {
            date: date,
            temp: Math.round(
              (data.daily.temperature_2m_max[index] +
                data.daily.temperature_2m_min[index]) /
              2
            ),
            condition: this.getWeatherCondition(data.daily.weathercode[index]),
            precipitation: data.daily.precipitation_sum[index],
            weatherCode: data.daily.weathercode[index], // Añade el código meteorológico
          };
        }
      );

      return {
        temp: data.current_weather.temperature,
        wind: data.current_weather.windspeed,
        condition: this.getWeatherCondition(data.current_weather.weathercode),
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
    const progress =
      ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) *
      100;
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

  //grafico:
  private initializeChart(): void {
    console.log('Inicializando gráfico...');
    
    // Procesar datos de producción para el gráfico
    const chartData = this.processProductionData();
    
    console.log('Datos para el gráfico después de procesar:', chartData);
    
    // Si no hay datos, usar valores por defecto
    if (chartData.length === 0) {
      console.log('No hay datos para el gráfico, usando valores por defecto');
      this.data = {
        labels: ['T 1', 'T 2', 'T 3', 'T 4', 'T 5', 'T 6'],
        datasets: [
          {
            label: 'Producción Real',
            data: [0, 0, 0, 0, 0, 0],
            borderColor: '#437d3f',
            tension: 0.4,
            fill: false
          },
          {
            label: 'Producción Estimada',
            data: [0, 0, 0, 0, 0, 0],
            borderColor: '#65b15f',
            tension: 0.4,
            fill: false
          }
        ]
      };
    } else {
      // Usar datos reales sin modificación
      console.log('Usando datos reales para el gráfico');
      
      this.data = {
        labels: chartData.map(item => item.label),
        datasets: [
          {
            label: 'Producción Real',
            data: chartData.map(item => item.realProduction), // Siempre será 0 por ahora, para rellenar en el futuro
            borderColor: '#437d3f',
            tension: 0.4,
            fill: false
          },
          {
            label: 'Producción Estimada',
            data: chartData.map(item => item.estimatedProduction),
            borderColor: '#65b15f',
            tension: 0.4,
            fill: false
          }
        ]
      };
    }

    this.options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#6b7280'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: '#e5e7eb'
          },
          ticks: {
            color: '#6b7280'
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#6b7280'
          }
        }
      }
    };
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
  }

  // Método para exportar los datos a PDF
  exportToPdf(): void {
    try {
      // Crear documento PDF con orientación horizontal para mejor presentación
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      // Variable para seguir la página actual
      let currentPage = 1;

      // Referencia al contexto this para usar dentro de funciones
      const self = this;

      // Diseño de cabecera personalizada
      const drawHeader = () => {
        // Fondo verde
        const docWidth = doc.internal.pageSize.getWidth();
        const headerHeight = 30; // Altura del header en mm
        doc.setFillColor(67, 160, 34); // Color principal verde
        doc.rect(0, 0, docWidth, headerHeight, 'F');
        
        // Texto - Título del informe
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('Detalles del Cultivo', margin + 30, 15); 

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(
          `Informe generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`,
          margin + 30, 
          22
        );
      };

      // Diseño de pie de página
      const drawFooter = (pageNum: number, totalPages: number) => {
        // Línea decorativa
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

        // Texto de pie de página
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);

        // Numeración de página
        doc.text(
          `Página ${pageNum} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 7,
          { align: 'center' }
        );

        // Información de la empresa
        doc.text('© 2025 · Ecoinver', margin, pageHeight - 7);

        // Timestamp en la esquina derecha
        doc.text(
          `Generado: ${new Date().toLocaleTimeString()}`,
          pageWidth - margin,
          pageHeight - 7,
          { align: 'right' }
        );
      };

      // Dibujar encabezado en primera página
      drawHeader();

      // Posición inicial para el contenido después de la cabecera
      let yPos = 40;

      // SECCIÓN 1: DATOS DEL CULTIVO
      // Título de la sección
      doc.setFillColor(67, 125, 63); // Color verde más oscuro
      doc.rect(margin, yPos, 40, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('DATOS DEL CULTIVO', margin + 5, yPos + 5.5);

      // Subtítulo
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(67, 125, 63);
      doc.text(`${this.cultivo?.nombreGenero || ''} - ${this.cultivo?.nombreVariedad || ''}`, margin + 45, yPos + 5.5);

      yPos += 12;

      // Crear cuadro para datos generales
      doc.setFillColor(245, 247, 250);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(margin, yPos, contentWidth, 65, 3, 3, 'FD');

      // Datos del cultivo en forma de tabla (2 columnas x 4 filas)
      const colWidth = contentWidth / 2;
      const rowHeight = 15;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);

      // Fila 1
      doc.text('Agricultor:', margin + 5, yPos + 8);
      doc.text('Finca:', margin + colWidth + 5, yPos + 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(this.cultivo?.nombreAgricultor || 'No especificado', margin + 5, yPos + 14);
      doc.text(this.cultivo?.nombreFinca || 'No especificada', margin + colWidth + 5, yPos + 14);

      // Fila 2
      yPos += rowHeight;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Género:', margin + 5, yPos + 8);
      doc.text('Variedad:', margin + colWidth + 5, yPos + 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(this.cultivo?.nombreGenero || 'No especificado', margin + 5, yPos + 14);
      doc.text(this.cultivo?.nombreVariedad || 'No especificada', margin + colWidth + 5, yPos + 14);

      // Fila 3
      yPos += rowHeight;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Nave:', margin + 5, yPos + 8);
      doc.text('Superficie:', margin + colWidth + 5, yPos + 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(this.cultivo?.nombreNave || 'No especificada', margin + 5, yPos + 14);
      doc.text(`${this.cultivo?.superficie || 0} ha`, margin + colWidth + 5, yPos + 14);

      // Fila 4
      yPos += rowHeight;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Fecha siembra:', margin + 5, yPos + 8);
      doc.text('Fecha fin:', margin + colWidth + 5, yPos + 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);

      // Formatear fechas
      const formatDate = (date: Date | null | undefined): string => {
        if (!date) return 'No especificada';
        return new Date(date).toLocaleDateString();
      };

      doc.text(formatDate(this.cultivo?.fechaSiembra), margin + 5, yPos + 14);
      doc.text(formatDate(this.cultivo?.fechaFin), margin + colWidth + 5, yPos + 14);

      // Estado del cultivo y barra de progreso
      yPos += rowHeight + 5;

      // Agregar cuadro de estado
      doc.setFillColor(238, 247, 237); // Color verde claro
      doc.roundedRect(margin, yPos, contentWidth, 30, 3, 3, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Estado del cultivo:', margin + 5, yPos + 8);

      // Estado actual
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const estadoCultivo = this.getCultivoState();
      if (estadoCultivo === 'Activo') {
        doc.setTextColor(67, 160, 71); // Verde
      } else {
        doc.setTextColor(120, 120, 120); // Gris
      }
      doc.text(estadoCultivo, margin + 40, yPos + 8);

      // Barra de progreso
      const progressWidth = contentWidth - 10;
      doc.setDrawColor(230, 230, 230);
      doc.setFillColor(230, 230, 230);
      doc.roundedRect(margin + 5, yPos + 15, progressWidth, 5, 2, 2, 'F');

      // Progreso actual
      const progressValue = this.getProgressPercentage();
      const filledWidth = (progressValue / 100) * progressWidth;
      doc.setFillColor(67, 125, 63); // Verde más oscuro
      doc.roundedRect(margin + 5, yPos + 15, filledWidth, 5, 2, 2, 'F');

      // Etiquetas de progreso
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text('Trasplante', margin + 5, yPos + 25);
      doc.text(`${Math.round(progressValue)}%`, margin + (progressWidth / 2), yPos + 25, { align: 'center' });
      doc.text('Fin de cultivo', margin + progressWidth, yPos + 25, { align: 'right' });
      
      // SECCIÓN 2: INSIGHTS (ESTADÍSTICAS)
      yPos += 45;
      
      // Título de la sección
      doc.setFillColor(67, 125, 63); // Color verde más oscuro
      doc.rect(margin, yPos, 40, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('INSIGHTS', margin + 5, yPos + 5.5);

      // Subtítulo
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(67, 125, 63);
      doc.text('Estadísticas de Producción', margin + 45, yPos + 5.5);

      yPos += 12;

      // Verificar si tenemos datos de producción
      if (this.productions && this.productions.length > 0) {
        // Capturar la gráfica si existe
        this.captureChartForPdf(doc, yPos, margin, contentWidth).then(() => {
          // Este código se ejecutará después de capturar la gráfica
          yPos += 80; // Espacio para la gráfica
          
          // Tabla de estadísticas de tramos
          this.addProductionTable(doc, yPos, margin, contentWidth);
          
          // Finalizar el PDF
          this.finalizePdf(doc, drawFooter);
        }).catch(error => {
          console.error('Error al capturar la gráfica:', error);
          // Si hay error, continuar sin la gráfica
          yPos += 10;
          doc.text('No se pudo capturar la gráfica de estadísticas.', margin + 5, yPos);
          yPos += 10;
          
          // Tabla de estadísticas de tramos
          this.addProductionTable(doc, yPos, margin, contentWidth);
          
          // Finalizar el PDF
          this.finalizePdf(doc, drawFooter);
        });
      } else {
        // No hay datos de producción
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text('No hay datos de producción disponibles para este cultivo.', margin + 5, yPos + 10);
        
        // Finalizar el PDF
        this.finalizePdf(doc, drawFooter);
      }
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      alert('No se pudo generar el PDF. Por favor, inténtelo de nuevo.');
    }
  }

  // Método para capturar la gráfica y agregarla al PDF
  private captureChartForPdf(doc: jsPDF, yPos: number, margin: number, contentWidth: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const chartContainer = document.querySelector('.insights-chart') as HTMLElement;
        
        if (!chartContainer) {
          reject(new Error('No se encontró el elemento de la gráfica'));
          return;
        }
        
        // Usamos html2canvas con opciones adicionales para captura completa
        html2canvas(chartContainer, {
          scale: 2, // Mayor escala para mejor calidad
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          height: chartContainer.scrollHeight, // Asegurar captura de altura completa
          windowHeight: chartContainer.scrollHeight, // Altura de ventana suficiente
          logging: true, // Ayuda a depurar problemas de captura
          onclone: (documentClone) => {
            // Modificar el clon para mejorar la captura
            const clonedChart = documentClone.querySelector('.insights-chart');
            if (clonedChart) {
              // Asegurar que el contenedor es visible y tiene altura suficiente
              (clonedChart as HTMLElement).style.height = 'auto';
              (clonedChart as HTMLElement).style.overflow = 'visible';
            }
            return documentClone;
          }
        }).then(canvas => {
          // Verificar las dimensiones de la captura
          console.log(`Canvas capturado: ${canvas.width}x${canvas.height}`);
          
          const imgData = canvas.toDataURL('image/png');
          // Mantener la relación de aspecto
          const canvasRatio = canvas.height / canvas.width;
          const height = contentWidth * canvasRatio;
          
          // Reducir un poco la altura en el PDF para evitar truncamiento
          const pdfHeight = Math.min(height, 100); // Limitar altura máxima a 100mm
          
          doc.addImage(imgData, 'PNG', margin, yPos, contentWidth, pdfHeight);
          resolve();
        }).catch(error => {
          console.error('Error al capturar con html2canvas:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Error general en captura:', error);
        reject(error);
      }
    });
  }

  // Método para agregar la tabla de producción al PDF
  private addProductionTable(doc: jsPDF, yPos: number, margin: number, contentWidth: number): void {
    // Crear una tabla para mostrar los datos de producción por tramos
    const headers = ["Tramo", "Fecha Inicio", "Fecha Fin", "Duración (días)", "Prod. Estimada (kg)", "Estado"];
    
    // Determinar si necesitamos una nueva página
    if (yPos > doc.internal.pageSize.getHeight() - 70) {
      doc.addPage();
      // Dibujar cabecera en la nueva página
      const drawHeader = () => {
        const docWidth = doc.internal.pageSize.getWidth();
        const headerHeight = 30;
        doc.setFillColor(67, 160, 34);
        doc.rect(0, 0, docWidth, headerHeight, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('Detalles del Cultivo', margin + 30, 15);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(`Informe generado el ${new Date().toLocaleDateString()}`, margin + 30, 22);
      };
      drawHeader();
      yPos = 40;
    }
    
    // Título de la tabla
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('Detalles de Producción por Tramos', margin, yPos);
    
    yPos += 6;
    
    // Calcular anchos de columna
    const colWidths = [
      contentWidth * 0.1,  // Tramo
      contentWidth * 0.2,  // Fecha Inicio
      contentWidth * 0.2,  // Fecha Fin
      contentWidth * 0.15, // Duración
      contentWidth * 0.2,  // Producción Estimada
      contentWidth * 0.15  // Estado
    ];
    
    const rowHeight = 8;
    
    // Dibujar encabezados
    doc.setFillColor(67, 125, 63);
    doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    
    let xPos = margin;
    headers.forEach((header, i) => {
      doc.text(header, xPos + 2, yPos + 5.5);
      xPos += colWidths[i];
    });
    
    yPos += rowHeight;
    
    // Dibujar filas de datos
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    // Formatear fechas
    const formatDate = (dateStr: string): string => {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    };
    
    // Procesar y mostrar cada tramo de producción
    this.productions.forEach((prod, index) => {
      // Alternar colores de fondo
      if (index % 2 === 0) {
        doc.setFillColor(245, 247, 250);
        doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
      }
      
      // Color del texto según estado
      let estadoColor;
      const estado = this.getEstadoTramo(index);
      
      if (estado === 'Pendiente') {
        estadoColor = [204, 132, 0]; // Ámbar
      } else if (estado === 'En progreso') {
        estadoColor = [41, 98, 255]; // Azul
      } else if (estado === 'Completado') {
        estadoColor = [76, 175, 80]; // Verde
      } else {
        estadoColor = [100, 100, 100]; // Gris
      }
      
      // Textos de la fila
      doc.setTextColor(60, 60, 60);
      
      xPos = margin;
      
      // Columna: Tramo
      doc.text(`T ${index + 1}`, xPos + 2, yPos + 5.5);
      xPos += colWidths[0];
      
      // Columna: Fecha Inicio
      doc.text(formatDate(prod.fechaInicio), xPos + 2, yPos + 5.5);
      xPos += colWidths[1];
      
      // Columna: Fecha Fin
      doc.text(formatDate(prod.fechaFin), xPos + 2, yPos + 5.5);
      xPos += colWidths[2];
      
      // Columna: Duración
      doc.text(`${this.getDuracionTramo(index)}`, xPos + 2, yPos + 5.5);
      xPos += colWidths[3];
      
      // Columna: Producción Estimada
      doc.text(`${this.formatNumber(this.getValorKilosAjustados(index))}`, xPos + 2, yPos + 5.5);
      xPos += colWidths[4];
      
      // Columna: Estado
      doc.setTextColor(estadoColor[0], estadoColor[1], estadoColor[2]);
      doc.text(estado, xPos + 2, yPos + 5.5);
      
      yPos += rowHeight;
      
      // Comprobar si necesitamos una nueva página
      if (yPos > doc.internal.pageSize.getHeight() - 25 && index < this.productions.length - 1) {
        doc.addPage();
        // Dibujar cabecera
        const drawHeader = () => {
          const docWidth = doc.internal.pageSize.getWidth();
          const headerHeight = 30;
          doc.setFillColor(67, 160, 34);
          doc.rect(0, 0, docWidth, headerHeight, 'F');
          
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(22);
          doc.text('Detalles del Cultivo', margin + 30, 15);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.text(`Informe generado el ${new Date().toLocaleDateString()}`, margin + 30, 22);
        };
        drawHeader();
        
        // Reiniciar posición Y
        yPos = 40;
        
        // Repetir encabezados en la nueva página
        doc.setFillColor(67, 125, 63);
        doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        
        xPos = margin;
        headers.forEach((header, i) => {
          doc.text(header, xPos + 2, yPos + 5.5);
          xPos += colWidths[i];
        });
        
        yPos += rowHeight;
        doc.setFont('helvetica', 'normal');
      }
    });
    
    // Agregar resumen estadístico después de la tabla
    yPos += 5;
    
    // Añadir un cuadro resumen
    doc.setFillColor(238, 247, 237);
    doc.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'F');
    
    doc.setTextColor(67, 125, 63);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('RESUMEN DE PRODUCCIÓN', margin + 5, yPos + 7);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    
    // Mostrar estadísticas generales
    const resumenY = yPos + 15;
    doc.text(`Total Tramos: ${this.productions.length}`, margin + 10, resumenY);
    doc.text(`Producción Total Estimada: ${this.formatNumber(this.getTotalProduccionEstimada())} kg`, margin + 10, resumenY + 8);
    doc.text(`Duración Total: ${this.getTotalDuracion()} días`, margin + contentWidth/2, resumenY);
    doc.text(`Estado General: ${this.getCultivoState()}`, margin + contentWidth/2, resumenY + 8);
  }

  // Método para finalizar y mostrar el PDF
  private finalizePdf(doc: jsPDF, drawFooter: (pageNum: number, totalPages: number) => void): void {
    const totalPages = doc.internal.pages.length - 1;
    
    // Añadir pie de página a todas las páginas
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawFooter(i, totalPages);
    }
    
    // Mostrar vista previa del PDF
    this.showPdfPreview(doc);
  }

  // Método para mostrar la vista previa del PDF
  private showPdfPreview(pdfDoc: jsPDF): void {
    // Generar blob y URL de datos para el PDF
    const pdfBlob = pdfDoc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Crear modal para la vista previa
    const modalOverlay = document.createElement('div');
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.right = '0';
    modalOverlay.style.bottom = '0';
    modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modalOverlay.style.zIndex = '10000';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.flexDirection = 'column';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.justifyContent = 'center';

    // Header del modal con título y botón de cerrar
    const modalHeader = document.createElement('div');
    modalHeader.style.width = '80%';
    modalHeader.style.backgroundColor = '#437d3f';
    modalHeader.style.color = 'white';
    modalHeader.style.padding = '10px 20px';
    modalHeader.style.display = 'flex';
    modalHeader.style.justifyContent = 'space-between';
    modalHeader.style.alignItems = 'center';
    modalHeader.style.borderTopLeftRadius = '8px';
    modalHeader.style.borderTopRightRadius = '8px';

    const modalTitle = document.createElement('h3');
    modalTitle.textContent = 'Vista previa del PDF';
    modalTitle.style.margin = '0';

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '0 5px';
    closeButton.onclick = () => {
      document.body.removeChild(modalOverlay);
      // Liberar la URL del objeto para evitar fugas de memoria
      URL.revokeObjectURL(pdfUrl);
    };

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    // Contenido del modal - iframe para mostrar el PDF
    const modalContent = document.createElement('div');
    modalContent.style.width = '80%';
    modalContent.style.height = '80vh';
    modalContent.style.backgroundColor = 'white';

    const pdfIframe = document.createElement('iframe');
    pdfIframe.style.width = '100%';
    pdfIframe.style.height = '100%';
    pdfIframe.style.border = 'none';
    pdfIframe.src = pdfUrl;

    modalContent.appendChild(pdfIframe);

    // Footer del modal con botones
    const modalFooter = document.createElement('div');
    modalFooter.style.width = '80%';
    modalFooter.style.backgroundColor = 'white';
    modalFooter.style.padding = '15px 20px';
    modalFooter.style.display = 'flex';
    modalFooter.style.justifyContent = 'flex-end';
    modalFooter.style.gap = '10px';
    modalFooter.style.borderBottomLeftRadius = '8px';
    modalFooter.style.borderBottomRightRadius = '8px';
    modalFooter.style.borderTop = '1px solid #e2e8f0';

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancelar';
    cancelButton.style.padding = '8px 16px';
    cancelButton.style.backgroundColor = '#e2e8f0';
    cancelButton.style.color = '#1e293b';
    cancelButton.style.border = 'none';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.onclick = () => {
      document.body.removeChild(modalOverlay);
      URL.revokeObjectURL(pdfUrl);
    };

    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Descargar PDF';
    downloadButton.style.padding = '8px 16px';
    downloadButton.style.backgroundColor = '#437d3f';
    downloadButton.style.color = 'white';
    downloadButton.style.border = 'none';
    downloadButton.style.borderRadius = '4px';
    downloadButton.style.cursor = 'pointer';
    downloadButton.onclick = () => {
      // Descargar el PDF
      pdfDoc.save(`cultivo-${this.cultivo?.id || 'detalle'}.pdf`);
      document.body.removeChild(modalOverlay);
      URL.revokeObjectURL(pdfUrl);
    };

    modalFooter.appendChild(cancelButton);
    modalFooter.appendChild(downloadButton);

    // Ensamblar el modal completo
    modalOverlay.appendChild(modalHeader);
    modalOverlay.appendChild(modalContent);
    modalOverlay.appendChild(modalFooter);

    // Añadir el modal al body
    document.body.appendChild(modalOverlay);
  }
}