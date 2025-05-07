import { Component, AfterViewInit, OnDestroy, OnInit,NgModule, LOCALE_ID } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
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
    const prod = this.productions?.[tramoIndex];
    if (!prod) {
      console.warn(`Tramo ${tramoIndex} no encontrado (productions.length=${this.productions?.length})`);
      return 0;
    }
  
    //console.log(`⏩ getValorKilosAjustados: tramo ${tramoIndex}, raw kilosAjustados =`, prod.kilosAjustados);
    const parsed = this.parseNumericValue(prod.kilosAjustados);
    //console.log(`⏩ getValorKilosAjustados: tramo ${tramoIndex}, parsed =`, parsed);
  
    return parsed;
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
  // Detectar si es móvil
  const isMobile = window.innerWidth < 600;
  // Elegir formato y orientación
  const orientation: 'p' | 'l' = isMobile ? 'p' : 'l';
  const format: 'a4' | 'a5' = isMobile ? 'a5' : 'a4';

  // Crear documento
  const doc = new jsPDF({ orientation, unit: 'mm', format });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = isMobile ? 5 : 15;
  const cw = pw - margin * 2;

  // Función de encabezado
  const drawHeader = () => {
    const headerH = isMobile ? 20 : 30;
    doc
      .setFillColor(67, 160, 34)
      .rect(0, 0, pw, headerH, 'F')
      .setFont('helvetica', 'bold')
      .setTextColor(255, 255, 255)
      .setFontSize(isMobile ? 14 : 22)
      .text('Detalles del Cultivo', margin, headerH / 2 + (isMobile ? 4 : 5))
      .setFont('helvetica', 'normal')
      .setFontSize(isMobile ? 7 : 11)
      .text(
        `Generado: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        margin,
        headerH - (isMobile ? 2 : 5)
      );
  };

  // Función de pie de página
  const drawFooter = (pg: number, total: number) => {
    const footerY = ph - (isMobile ? 8 : 10);
    doc
      .setDrawColor(200, 200, 200)
      .setLineWidth(0.5)
      .line(margin, footerY, pw - margin, footerY)
      .setFont('helvetica', 'normal')
      .setTextColor(150, 150, 150)
      .setFontSize(isMobile ? 6 : 8)
      .text(`Página ${pg}/${total}`, pw / 2, ph - (isMobile ? 4 : 7), { align: 'center' });
  };

  // Helper de fechas
  const fmt = (d: Date | null | undefined): string => (d ? d.toLocaleDateString() : 'No especificada');

  // === Página 1: DATOS DEL CULTIVO ===
  drawHeader();
  let y = isMobile ? 25 : 40;

  // Título de sección
  doc
    .setFillColor(67, 125, 63)
    .rect(margin, y, 60, isMobile ? 6 : 8, 'F')
    .setFont('helvetica', 'bold')
    .setTextColor(255, 255, 255)
    .setFontSize(isMobile ? 10 : 12)
    .text('DATOS DEL CULTIVO', margin + 2, y + (isMobile ? 4 : 6));

  // Bloque de datos
  y += isMobile ? 8 : 12;
  doc
    .setFillColor(245, 247, 250)
    .setDrawColor(220, 220, 220)
    .roundedRect(margin, y, cw, isMobile ? 45 : 65, 3, 3, 'FD');

  const colW = cw / 2;
  const rowH = isMobile ? 12 : 15;
  let cy = y;

  // Función para añadir filas de datos
  const addRow = (label1: string, value1: string, label2: string, value2: string) => {
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(isMobile ? 7 : 9)
      .setTextColor(100, 100, 100)
      .text(label1, margin + 2, cy + (isMobile ? 6 : 8))
      .text(label2, margin + colW + 2, cy + (isMobile ? 6 : 8))
      .setFont('helvetica', 'bold')
      .setFontSize(isMobile ? 8 : 10)
      .setTextColor(50, 50, 50)
      .text(value1, margin + 2, cy + (isMobile ? 10 : 14))
      .text(value2, margin + colW + 2, cy + (isMobile ? 10 : 14));
    cy += rowH;
  };

  addRow('Agricultor:', this.cultivo?.nombreAgricultor || '–', 'Finca:', this.cultivo?.nombreFinca || '–');
  addRow('Género:', this.cultivo?.nombreGenero || '–', 'Variedad:', this.cultivo?.nombreVariedad || '–');
  addRow('Nave:', this.cultivo?.nombreNave || '–', 'Superficie:', `${this.cultivo?.superficie || 0} ha`);
  addRow('Siembra:', fmt(this.cultivo?.fechaSiembra), 'Fin:', fmt(this.cultivo?.fechaFin));

  // Separación extra antes de la barra de estado
  cy += isMobile ? 10 : 15;
  doc
    .setFillColor(238, 247, 237)
    .roundedRect(margin, cy, cw, isMobile ? 18 : 30, 3, 3, 'F')
    .setFont('helvetica', 'normal')
    .setFontSize(isMobile ? 7 : 9)
    .setTextColor(100, 100, 100)
    .text('Estado del cultivo:', margin + 2, cy + (isMobile ? 6 : 8));

  const estado = this.getCultivoState();
  if (estado === 'Activo') {
    doc.setFont('helvetica', 'bold').setTextColor(67, 160, 71).setFontSize(isMobile ? 8 : 10);
  } else {
    doc.setFont('helvetica', 'bold').setTextColor(120, 120, 120).setFontSize(isMobile ? 8 : 10);
  }
  doc.text(estado, margin + (isMobile ? 50 : 45), cy + (isMobile ? 6 : 8));

  // Barra de progreso
  const prog = this.getProgressPercentage();
  const barW = cw - 10;
  const barY = cy + (isMobile ? 8 : 15);
  doc
    .setDrawColor(230, 230, 230)
    .setFillColor(230, 230, 230)
    .roundedRect(margin + 5, barY, barW, isMobile ? 3 : 5, 2, 2, 'F')
    .setFillColor(67, 125, 63)
    .roundedRect(margin + 5, barY, (prog / 100) * barW, isMobile ? 3 : 5, 2, 2, 'F');

  // === Página 2: Tabla de insights ===
  doc.addPage();
  drawHeader();
  this.addProductionTable(doc, isMobile ? 30 : 40, margin, cw);

  // === Página 3: Gráfica sola ===
  doc.addPage();
  drawHeader();
  const container = document.querySelector('.insights-chart');
  const canvas = container?.querySelector('canvas') as HTMLCanvasElement | null;
  if (canvas) {
    const img = canvas.toDataURL('image/png');
    const imgH = ph - (isMobile ? 50 : 80);
    doc.addImage(img, 'PNG', margin, isMobile ? 25 : 40, cw, imgH);
  } else {
    doc
      .setFont('helvetica', 'italic')
      .setFontSize(isMobile ? 8 : 12)
      .setTextColor(150, 150, 150)
      .text('Gráfico no disponible', margin, isMobile ? 40 : 60);
  }

  // Añadir pie a todas las páginas y mostrar PDF
  this.finalizePdf(doc, drawFooter);
}

  
  // Captura el <canvas> del gráfico y lo añade al PDF
  private captureChartForPdf(
    doc: jsPDF,
    yPos: number,
    margin: number,
    contentWidth: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const container = document.querySelector('.insights-chart');
      if (!container) return reject('No encontré .insights-chart');
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) return reject('No encontré el <canvas> del gráfico');
  
      const imgData = canvas.toDataURL('image/png');
      const imgHeight = 80; // mm
      doc.addImage(imgData, 'PNG', margin, yPos, contentWidth, imgHeight);
      resolve();
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