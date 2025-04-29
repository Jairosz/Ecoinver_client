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
}