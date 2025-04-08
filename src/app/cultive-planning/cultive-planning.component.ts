import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CultivoService } from '../services/Cultivo.service';
import { Cultive } from '../types/Cultive';
import {
  CultivePlanningService,
  CultivePlanning,
} from '../services/CultivePlanning.service';
import { CultivePlanningDetailsService } from '../services/CultivePlanningDetails.service';
import { CultivePlanningDetails } from '../types/CultivePlanningDetails';

// Define el DTO aquí ya que no está exportado desde el servicio
interface CultivePlanningDTO {
  nombre: string;
  fechaInicio: Date | null;
  fechaFin: Date | null;
}

interface TramoCard {
  value: number | null;
  startDate: string | null;
  endDate: string | null;
}

interface Planificacion {
  id: string;
  nombre: string;
  tramos: TramoCard[];
  cultivos: string[];
}

@Component({
  selector: 'app-cultive-planning',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cultive-planning.component.html',
  providers: [
    CultivoService,
    CultivePlanningService,
    CultivePlanningDetailsService,
  ],
})
export class CultivePlanningComponent implements OnInit {
  // Planificaciones disponibles
  planificaciones: Planificacion[] = [];
  selectedPlanificacion: string = 'nueva'; // Por defecto, crear una nueva

  // Fijo a 12 tramos
  readonly numTramos: number = 12;
  cards: TramoCard[] = [];

  // Cultivos disponibles y seleccionados
  cultivos: string[] = []; // Será llenado con géneros de la base de datos
  selectedCultivos: string[] = [];
  tempSelectedCultivos: string[] = []; // Para almacenar selección temporal en el modal
  cultivo: Cultive[] = []; // Array de cultivos desde API

  // Modal control
  showCultivoModal: boolean = false;

  // Nombre de la nueva planificación
  nuevaPlanificacionNombre: string = '';

  // Estado de carga
  isLoadingCultivos: boolean = false;
  isLoadingPlanificaciones: boolean = false;
  loadError: string | null = null;

  // Mensaje de éxito al guardar
  successMessage: string | null = null;
  successTimeout: any = null;

// Propiedades de la clase
selectedGenre: string = ''; // Para almacenar el género seleccionado
generos: string[] = []; // Lista de géneros únicos
cultivosPorGenero: { [genero: string]: Cultive[] } = {}; // Mapa de cultivos agrupados por género
filteredCultivos: Cultive[] = []; // Cultivos filtrados según el género seleccionado


  constructor(
    private cultivoService: CultivoService,
    private cultivoPlanningService: CultivePlanningService,
    private cultivePlanningDetailsService: CultivePlanningDetailsService
  ) {}

  ngOnInit(): void {
    // Inicializar los 12 tramos
    this.initializeTramos();

    // Cargar planificaciones desde la API
    this.cargarPlanificaciones();

    // Cargar los cultivos de la API
    this.cargarCultivos();
  }

  // Método cargarCultivos modificado para trabajar directamente con datos de la API
// Método para cargar cultivos desde la API con mejor manejo de errores
cargarCultivos(): void {
  this.isLoadingCultivos = true;
  this.loadError = null;

  this.cultivoService.getAll().subscribe(
    (data: any) => {
      console.log('Respuesta del servicio de cultivos:', data);

      // Verificar si la respuesta existe
      if (data) {
        // Asegurarnos de que siempre trabajamos con un array
        if (!Array.isArray(data)) {
          console.warn('La API no devolvió un array. Intentando convertir...');
          
          // Intentar convertir a array si es un objeto
          if (typeof data === 'object') {
            this.cultivo = Object.values(data);
          } else {
            this.cultivo = [];
            this.loadError = 'Formato de datos inesperado desde la API.';
          }
        } else {
          // Guardar los datos directamente si ya es un array
          this.cultivo = data;
        }
        
        console.log('Datos de cultivos procesados:', this.cultivo);
        
        // Si tenemos cultivos, extraer géneros
        if (this.cultivo && this.cultivo.length > 0) {
          this.extractGenresAndOrganizeCultivos();
        } else {
          console.warn('No se recibieron cultivos de la API');
          this.loadError = 'La API no devolvió cultivos.';
        }
      } else {
        console.warn('La API devolvió una respuesta vacía o nula');
        this.loadError = 'La API no devolvió datos de cultivos.';
        this.cultivo = [];
      }

      this.isLoadingCultivos = false;
    },
    (error: Error) => {
      console.error('Error al obtener cultivos desde la API:', error);
      this.loadError = 'Error al cargar cultivos desde el servidor: ' + error.message;
      this.cultivo = [];
      this.isLoadingCultivos = false;
    }
  );
}

  // Método mejorado para extraer géneros y organizar cultivos
// Método adaptado a la interfaz exacta de Cultive
extractGenresAndOrganizeCultivos(): void {
  console.log('Analizando estructura de cultivos recibidos:', this.cultivo);
  
  // Crear un conjunto para almacenar géneros únicos
  const genresSet = new Set<string>();
  this.cultivosPorGenero = {};

  // Verificar que tengamos un array de cultivos para procesar
  if (!Array.isArray(this.cultivo) || this.cultivo.length === 0) {
    console.warn('No hay cultivos para procesar o no es un array');
    this.generos = [];
    this.filteredCultivos = [];
    this.loadError = 'No hay datos de cultivos para procesar.';
    return;
  }
  
  // Usar nombreGenero de la interfaz Cultive como fuente para la agrupación
  this.cultivo.forEach(item => {
    // Determinar el género a partir del nombreGenero
    const genero = item.nombreGenero || 'Otros Cultivos';
    
    // Añadir el género al conjunto
    genresSet.add(genero);
    
    // Inicializar el array para este género si no existe
    if (!this.cultivosPorGenero[genero]) {
      this.cultivosPorGenero[genero] = [];
    }
    
    // Añadir el cultivo a su categoría correspondiente
    this.cultivosPorGenero[genero].push(item);
  });
  
  // Convertir el conjunto a un array ordenado y asignarlo a géneros
  this.generos = Array.from(genresSet).sort();
  
  // Inicializar cultivos filtrados con todos los cultivos
  this.filteredCultivos = [...this.cultivo];
  
  console.log('Géneros detectados:', this.generos);
  console.log('Cultivos organizados por género:', this.cultivosPorGenero);
  
  // Si no hay géneros, mostrar un mensaje
  if (this.generos.length === 0) {
    console.warn('No se pudieron extraer géneros de los cultivos');
    this.loadError = 'No se pudieron categorizar los cultivos.';
  }
  
  // Extraer nombres de cultivos para el selector
  this.extractCultivoNames();
}
// Nuevo método para extraer nombres de cultivos
// Método mejorado para extraer nombres de cultivos
// Método para extraer nombres de cultivos en el formato solicitado
extractCultivoNames(): void {
  const cultivoNames: string[] = [];
  
  // Recorrer los cultivos y extraer nombres en el formato solicitado
  if (Array.isArray(this.cultivo)) {
    this.cultivo.forEach(cultivo => {
      // Crear nombre en formato: nombreAgricultor - nombreGenero - nombreVariedad
      let displayName = '';
      
      // Agricultor
      displayName += cultivo.nombreAgricultor || 'Agricultor Desconocido';
      displayName += ' - ';
      
      // Género
      displayName += cultivo.nombreGenero || 'Género Desconocido';
      displayName += ' - ';
      
      // Variedad
      displayName += cultivo.nombreVariedad || 'Variedad Desconocida';
      
      cultivoNames.push(displayName);
    });
  }
  
  // Asignar a la propiedad cultivos
  this.cultivos = [...new Set(cultivoNames)].sort(); // Eliminar duplicados y ordenar
  console.log('Nombres de cultivos formateados:', this.cultivos);
}

// Método para manejar el cambio de género seleccionado
onGenreChange(): void {
  console.log('Género seleccionado:', this.selectedGenre);
  
  // Filtrar cultivos según el género seleccionado
  if (this.selectedGenre && this.cultivosPorGenero[this.selectedGenre]) {
    this.filteredCultivos = this.cultivosPorGenero[this.selectedGenre];
    console.log(`Filtrados ${this.filteredCultivos.length} cultivos para el género ${this.selectedGenre}`);
  } else {
    // Si no hay género seleccionado o es "Todos", mostrar todos los cultivos
    this.filteredCultivos = [...this.cultivo];
    console.log(`Mostrando todos los cultivos (${this.filteredCultivos.length})`);
  }
  
  // Reset de selección temporal de cultivos en el modal
  this.tempSelectedCultivos = [...this.selectedCultivos];
}




  // Inicializa géneros predefinidos como respaldo
  initializeDefaultGenres(): void {
    this.cultivos = [
      'Pepino',
      'Pepino Mini',
      'Berenjena Larga',
      'Judia China',
      'Pepino Snack',
      'Calabacín',
      'Pimiento California Rojo',
      'Tomate Rosa Asurcado',
    ];
  }

  // Inicializar los 12 tramos
  // Inicializar los 12 tramos con valores por defecto
initializeTramos(): void {
  const today = new Date();
  this.cards = [];

  for (let i = 0; i < this.numTramos; i++) {
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + i * 7); // Cada tramo comienza 7 días después

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // Cada tramo dura 7 días

    this.cards.push({
      value: 100, // Valor por defecto para los kilos
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate),
    });
  }
  
  console.log('Tramos inicializados con valores por defecto:', this.cards);
}

  // Extraer géneros únicos de los cultivos
  extractUniqueGenres(): void {
    // Crear un conjunto para almacenar géneros únicos
    const genresSet = new Set<string>();

    // Verificar que cultivo sea un array antes de usar forEach
    if (Array.isArray(this.cultivo)) {
      // Recorrer todos los cultivos y añadir sus géneros al conjunto
      this.cultivo.forEach((item) => {
        if (item.nombreGenero && item.nombreGenero.trim() !== '') {
          genresSet.add(item.nombreGenero);
        }
      });

      // Convertir el conjunto a un array y asignarlo a cultivos
      this.cultivos = Array.from(genresSet).sort();
    } else {
      console.error('Error: this.cultivo no es un array', this.cultivo);
      // Si no es un array, usar géneros predefinidos
      this.initializeDefaultGenres();
    }

    // Si no hay cultivos, mostrar un mensaje en la consola
    if (this.cultivos.length === 0) {
      console.warn('No se encontraron géneros en los datos de cultivos');
      this.initializeDefaultGenres();
    }
  }

  // Carga planificaciones desde el servicio API
  cargarPlanificaciones(): void {
    this.isLoadingPlanificaciones = true;

    this.cultivoPlanningService.getAllCultivePlannings().subscribe(
      (data: CultivePlanning[]) => {
        console.log('Planificaciones cargadas desde API:', data);

        // Convertir las planificaciones de la API al formato local
        this.planificaciones = this.convertirPlanificacionesDeAPI(data);

        // Si no hay planificaciones, cargar algunos ejemplos
        if (this.planificaciones.length === 0) {
          this.cargarPlanificacionesEjemplo();
        }

        this.isLoadingPlanificaciones = false;
      },
      (error: Error) => {
        console.error('Error al cargar planificaciones:', error);
        // En caso de error, cargar planificaciones de ejemplo
        this.cargarPlanificacionesEjemplo();
        this.isLoadingPlanificaciones = false;
      }
    );
  }

  // Convertir planificaciones del formato de API al formato local
  convertirPlanificacionesDeAPI(
    planificacionesAPI: CultivePlanning[]
  ): Planificacion[] {
    return planificacionesAPI.map((planAPI) => {
      // Calcular las fechas de inicio y fin de la planificación
      const fechaInicio = planAPI.fechaInicio
        ? new Date(planAPI.fechaInicio)
        : new Date();
      const fechaFin = planAPI.fechaFin
        ? new Date(planAPI.fechaFin)
        : new Date();

      // Calcular la duración total en días
      const duracionTotal = Math.ceil(
        (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calcular la duración de cada tramo en días
      const duracionTramo = Math.ceil(duracionTotal / this.numTramos);

      // Crear los tramos
      const tramos: TramoCard[] = [];
      for (let i = 0; i < this.numTramos; i++) {
        const tramoInicio = new Date(fechaInicio);
        tramoInicio.setDate(fechaInicio.getDate() + i * duracionTramo);

        const tramoFin = new Date(tramoInicio);
        tramoFin.setDate(tramoInicio.getDate() + duracionTramo - 1);

        // Asegurar que el último tramo no supere la fecha fin
        if (tramoFin > fechaFin) {
          tramoFin.setTime(fechaFin.getTime());
        }

        tramos.push({
          value: 100, // Valor por defecto, se puede adaptar según necesidades
          startDate: this.formatDate(tramoInicio),
          endDate: this.formatDate(tramoFin),
        });
      }

      // Asumimos que no tenemos información de cultivos en la API,
      // por lo que inicializamos con un array vacío
      return {
        id: planAPI.id || '',
        nombre: planAPI.nombre,
        tramos: tramos,
        cultivos: [], // Inicialmente vacío
      };
    });
  }

  // Cargar planificaciones de ejemplo (solo cuando no hay datos)
  cargarPlanificacionesEjemplo(): void {
    const planificacionesMuestra = [
      {
        id: 'plan1',
        nombre: 'Planificación Primavera',
        tramos: Array(this.numTramos)
          .fill(null)
          .map((_, i) => ({
            value: 100 + i * 10,
            startDate: this.formatDate(new Date(2025, 2, 1 + i * 7)),
            endDate: this.formatDate(new Date(2025, 2, 7 + i * 7)),
          })),
        cultivos: ['Pepino', 'Tomate Rosa Asurcado'],
      },
      {
        id: 'plan2',
        nombre: 'Planificación Verano',
        tramos: Array(this.numTramos)
          .fill(null)
          .map((_, i) => ({
            value: 150 + i * 15,
            startDate: this.formatDate(new Date(2025, 5, 1 + i * 7)),
            endDate: this.formatDate(new Date(2025, 5, 7 + i * 7)),
          })),
        cultivos: ['Calabacín', 'Pimiento California Rojo'],
      },
    ];

    // Inicializar con planificaciones de muestra
    this.planificaciones = [...planificacionesMuestra];
  }

  // Carga una planificación seleccionada
cargarPlanificacion(): void {
  console.log('Seleccionada planificación:', this.selectedPlanificacion);
  console.log('Tipo de selectedPlanificacion:', typeof this.selectedPlanificacion);
  console.log('Planificaciones disponibles:', this.planificaciones);
  
  // Verificar si la planificación seleccionada es "nueva"
  if (this.selectedPlanificacion === 'nueva') {
    console.log('Inicializando nueva planificación');
    this.initializeTramos();
    this.selectedCultivos = [];
    this.nuevaPlanificacionNombre = '';
    return;
  }

  // DEPURACIÓN: Mostrar todos los IDs de planificaciones disponibles
  const planificacionIds = this.planificaciones.map(p => {
    return { 
      id: p.id, 
      tipo: typeof p.id,
      nombre: p.nombre
    };
  });
  console.log('IDs de planificaciones disponibles:', planificacionIds);
  
  // Buscar la planificación seleccionada (considerando posibles diferencias de tipos)
  const planificacion = this.planificaciones.find(p => {
    // Comparar considerando posibles conversiones de tipo
    const idCoincide = 
      p.id === this.selectedPlanificacion || // Comparación directa
      String(p.id) === String(this.selectedPlanificacion); // Comparación como strings
    
    if (idCoincide) {
      console.log('Planificación encontrada:', p);
    }
    return idCoincide;
  });
  
  if (!planificacion) {
    console.error('No se encontró la planificación con ID:', this.selectedPlanificacion);
    console.error('Lista completa de planificaciones:', this.planificaciones);
    this.mostrarMensajeExito('Error: No se encontró la planificación seleccionada. Comprueba la consola para más detalles.');
    
    // FALLBACK: Intentar cargar directamente desde la API si no se encuentra en la lista local
    this.cargarPlanificacionDesdeAPI();
    return;
  }
  
  // Cargar datos básicos de la planificación
  this.nuevaPlanificacionNombre = planificacion.nombre;
  
  // Verificar que los cultivos seleccionados existan en los cultivos disponibles
  this.selectedCultivos = planificacion.cultivos.filter((cultivo) =>
    this.cultivos.includes(cultivo)
  );
  
  console.log('Obteniendo detalles de planificación con ID:', this.selectedPlanificacion);
  
  // Consultar a la API por los detalles específicos de esta planificación
  this.cultivePlanningDetailsService
    .getDetailsByPlanningId(this.selectedPlanificacion)
    .subscribe(
      (details) => {
        console.log('Detalles obtenidos de la API:', details);
        
        if (details && details.length > 0) {
          // Limpiar cualquier mensaje de éxito anterior
          this.successMessage = null;
          
          // Organizar los detalles por número de tramo
          // Ordenar los detalles por número de tramo (1-12)
          const sortedDetails = [...details].sort((a, b) => a.tramo - b.tramo);
          console.log('Detalles ordenados por tramo:', sortedDetails);

          // Crear un mapa de los detalles por número de tramo para acceso más rápido
          const detailsByTramo = new Map();
          sortedDetails.forEach(detail => {
            detailsByTramo.set(detail.tramo, detail);
          });
          
          // Inicializar las cards asegurándose de que tengamos 12
          this.initializeTramos();
          
          // Actualizar cada tramo con los datos específicos de la API
          for (let i = 0; i < this.numTramos; i++) {
            const tramoNum = i + 1; // Números de tramo son del 1 al 12
            const detail = detailsByTramo.get(tramoNum);
            
            if (detail) {
              console.log(`Actualizando tramo ${tramoNum} con datos:`, detail);
              
              // Actualizar la card correspondiente con los valores de la API
              this.cards[i] = {
                value: detail.kilos,
                startDate: this.formatDate(new Date(detail.fechaInicio)),
                endDate: this.formatDate(new Date(detail.fechaFin)),
              };
            } else {
              console.warn(`No se encontraron datos para el tramo ${tramoNum}`);
              // El tramo se mantiene con los valores inicializados por defecto
            }
          }
          
          console.log('Cards actualizadas con datos de la API:', this.cards);
          this.mostrarMensajeExito('Datos de planificación cargados correctamente');
        } else {
          console.warn('No se encontraron detalles de tramos en la API');
          // Si no hay detalles en la API pero tenemos la planificación local, usamos esos tramos
          if (planificacion.tramos && planificacion.tramos.length > 0) {
            console.log('Usando los tramos de la planificación local:', planificacion.tramos);
            this.cards = [...planificacion.tramos];
          } else {
            // Si ni siquiera tenemos tramos locales, inicializamos con valores por defecto
            console.log('Inicializando tramos por defecto al no encontrar datos');
            this.initializeTramos();
          }
        }
      },
      (error) => {
        console.error('Error al cargar detalles de tramos:', error);
        // En caso de error, intentar usar los tramos de la planificación local
        if (planificacion.tramos && planificacion.tramos.length > 0) {
          this.cards = [...planificacion.tramos];
        } else {
          this.initializeTramos();
        }
        this.mostrarMensajeExito('Error al cargar datos. Usando datos locales.');
      }
    );
}

// Método para intentar cargar directamente desde la API cuando no se encuentra en la lista local
cargarPlanificacionDesdeAPI(): void {
  // Esto asume que tienes un método en tu servicio para obtener una planificación específica
  if (!this.selectedPlanificacion || this.selectedPlanificacion === 'nueva') {
    return;
  }
  
  console.log('Intentando cargar planificación directamente de la API:', this.selectedPlanificacion);
  
  // Usar el servicio para obtener la planificación específica
  this.cultivoPlanningService.getCultivePlanningById(this.selectedPlanificacion)
    .subscribe(
      (planificacion: CultivePlanning) => {
        console.log('Planificación cargada directamente de la API:', planificacion);
        
        // Si se encontró la planificación, actualizar la lista local
        if (planificacion) {
          // Crear objeto de planificación con el formato local
          const nuevaPlanificacion: Planificacion = {
            id: planificacion.id || '',
            nombre: planificacion.nombre,
            tramos: [], // Inicializar vacío
            cultivos: [] // Inicializar vacío
          };
          
          // Añadir a la lista local si no existe ya
          const existeEnLista = this.planificaciones.some(p => p.id === nuevaPlanificacion.id);
          if (!existeEnLista) {
            this.planificaciones.push(nuevaPlanificacion);
          }
          
          // Volver a llamar a cargarPlanificacion() ahora que la planificación está en la lista
          this.cargarPlanificacion();
        } else {
          this.mostrarMensajeExito('No se encontró la planificación en la API');
        }
      },
      (error) => {
        console.error('Error al cargar planificación desde la API:', error);
        this.mostrarMensajeExito('Error al cargar la planificación desde la API');
      }
    );
}

  // Método para actualizar los tramos desde los detalles de la API
actualizarTramosDesdeAPI(details: any[]): void {
  console.log('Actualizando tramos desde API con', details.length, 'detalles');
  
  if (details.length === 0) {
    console.warn('No hay detalles para actualizar tramos');
    return;
  }
  
  // Ordenar los detalles por número de tramo para asegurarnos que están en el orden correcto
  const sortedDetails = [...details].sort((a, b) => a.tramo - b.tramo);
  console.log('Detalles ordenados por número de tramo:', sortedDetails.map(d => d.tramo));
  
  // Verificar si hay duplicados (puede haber múltiples tramos con el mismo número)
  const tramoSet = new Set();
  const duplicados = sortedDetails.filter(d => {
    if (tramoSet.has(d.tramo)) {
      return true;
    }
    tramoSet.add(d.tramo);
    return false;
  });
  
  if (duplicados.length > 0) {
    console.warn('Se encontraron tramos duplicados:', duplicados);
  }
  
  // Verificar si los tramos están secuenciales del 1 al 12
  const tramoNumbers = Array.from(tramoSet).sort();
  console.log('Números de tramo encontrados:', tramoNumbers);
  
  // Si los tramos están completos (del 1 al 12) y ordenados, usamos el array ordenado
  if (sortedDetails.length === this.numTramos) {
    console.log('Se encontraron todos los tramos esperados, actualizando las cards');
    
    // Reemplazar las cards completamente con los datos ordenados
    this.cards = sortedDetails.map((detail) => ({
      value: detail.kilos,
      startDate: this.formatDate(new Date(detail.fechaInicio)),
      endDate: this.formatDate(new Date(detail.fechaFin)),
    }));
    
    console.log('Cards actualizadas:', this.cards);
  } else {
    // Si no tenemos los 12 tramos completos, actualizamos solo los que tenemos
    console.warn(`Solo se encontraron ${sortedDetails.length} tramos, actualizando los disponibles`);
    
    // Inicializamos primero los tramos con fechas predeterminadas
    this.initializeTramos();
    
    // Actualizamos solo los tramos que tenemos
    sortedDetails.forEach(detail => {
      const tramoIndex = detail.tramo - 1; // Restar 1 porque los arrays son base 0
      
      if (tramoIndex >= 0 && tramoIndex < this.numTramos) {
        this.cards[tramoIndex] = {
          value: detail.kilos,
          startDate: this.formatDate(new Date(detail.fechaInicio)),
          endDate: this.formatDate(new Date(detail.fechaFin)),
        };
      } else {
        console.warn(`Tramo ${detail.tramo} fuera de rango (debe ser 1-${this.numTramos})`);
      }
    });
    
    console.log('Cards parcialmente actualizadas:', this.cards);
  }
}

  // Formatea una fecha como YYYY-MM-DD para usar en input type="date"
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Método modificado para abrir el modal con los cultivos filtrados desde la API
openCultivoModal(): void {
  // Inicializar con la selección actual
  this.tempSelectedCultivos = [...this.selectedCultivos];
  
  // Si no hay cultivos filtrados, intentar cargar todos los cultivos
  if (this.filteredCultivos.length === 0 && this.cultivo.length > 0) {
    this.filteredCultivos = [...this.cultivo];
  }
  
  this.showCultivoModal = true;
}

  closeCultivoModal(): void {
    this.showCultivoModal = false;
  }
  //aaaa<

  // Modificar el método de añadir cultivos seleccionados
// Método para añadir cultivos seleccionados con corrección de tipos
addSelectedCultivos(): void {
  console.log('Cultivos seleccionados temporalmente:', this.tempSelectedCultivos);
  
  // Si no hay selección, salir de la función
  if (!this.tempSelectedCultivos || this.tempSelectedCultivos.length === 0) {
    return;
  }
  
  // Limpiar cualquier selección anterior
  this.selectedCultivos = [];
  
  // Añadir cada cultivo seleccionado en el formato correcto
  for (const selectedIdStr of this.tempSelectedCultivos) {
    // Convertir el ID de string a number para la comparación
    const selectedId = Number(selectedIdStr);
    
    // Buscar el cultivo correspondiente por ID
    const selectedCultivo = this.filteredCultivos.find(cultivo => cultivo.id === selectedId);
    
    if (selectedCultivo) {
      // Crear el nombre formateado para mostrar
      const displayName = `${selectedCultivo.nombreAgricultor} - ${selectedCultivo.nombreGenero} - ${selectedCultivo.nombreVariedad}`;
      
      // Añadir a la lista de seleccionados
      this.selectedCultivos.push(displayName);
    }
  }
  
  console.log('Cultivos seleccionados finales:', this.selectedCultivos);
  this.closeCultivoModal();
}

  removeCultivo(index: number): void {
    this.selectedCultivos.splice(index, 1);
  }

  // Recolecta datos de los inputs y envía
  enviarDatos() {
    // Validar nombre de planificación
    if (!this.nuevaPlanificacionNombre) {
      alert('Debe ingresar un nombre para la planificación');
      return;
    }

    // Obtener fechas de inicio y fin a partir de los tramos
    let fechaInicioGlobal: Date | null = null;
    let fechaFinGlobal: Date | null = null;

    // Buscar la fecha de inicio más temprana y la fecha de fin más tardía
    this.cards.forEach((card) => {
      if (card.startDate) {
        const fechaInicio = new Date(card.startDate);
        if (fechaInicioGlobal === null || fechaInicio < fechaInicioGlobal) {
          fechaInicioGlobal = fechaInicio;
        }
      }

      if (card.endDate) {
        const fechaFin = new Date(card.endDate);
        if (fechaFinGlobal === null || fechaFin > fechaFinGlobal) {
          fechaFinGlobal = fechaFin;
        }
      }
    });

    // Verificar que tengamos fechas válidas
    if (!fechaInicioGlobal || !fechaFinGlobal) {
      alert('No se pudieron determinar las fechas de inicio y fin');
      return;
    }

    // Crear un objeto DTO para enviar a la API
    const planificacionDTO: CultivePlanningDTO = {
      nombre: this.nuevaPlanificacionNombre,
      fechaInicio: fechaInicioGlobal,
      fechaFin: fechaFinGlobal,
    };

    // Determinar si es una nueva planificación o edición de una existente
    if (this.selectedPlanificacion === 'nueva') {
      // Crear nueva planificación en la API
      this.cultivoPlanningService
        .createCultivePlanning(planificacionDTO)
        .subscribe(
          (response: CultivePlanning) => {
            console.log('Planificación creada en la API:', response);

            // Crear objeto de planificación local
            const nuevaPlanificacion: Planificacion = {
              id: response.id || '',
              nombre: response.nombre,
              tramos: [...this.cards],
              cultivos: [...this.selectedCultivos],
            };

            // Añadir a la lista local
            this.planificaciones.push(nuevaPlanificacion);

            // Guardar los detalles de cada tramo
            this.guardarDetallesTramos(response.id);

            // Mostrar mensaje de éxito
            this.mostrarMensajeExito('Planificación creada correctamente');

            // Seleccionar la planificación recién creada
            this.selectedPlanificacion = nuevaPlanificacion.id;
          },
          (error: Error) => {
            console.error('Error al crear planificación:', error);
            alert(
              'Error al crear la planificación. Por favor, inténtelo de nuevo.'
            );
          }
        );
    } else {
      // Depurar el ID de planificación antes de enviarlo
      console.log(
        'ID de planificación para actualizar:',
        this.selectedPlanificacion
      );
      console.log('Tipo de ID:', typeof this.selectedPlanificacion);

      // Verificar que el ID no esté vacío o sea 'undefined'
      if (
        !this.selectedPlanificacion ||
        this.selectedPlanificacion === 'undefined'
      ) {
        alert('Error: No se encontró un ID válido para la planificación');
        return;
      }

      // Actualizar planificación existente
      this.cultivoPlanningService
        .updateCultivePlanning(this.selectedPlanificacion, planificacionDTO)
        .subscribe(
          (response: CultivePlanning) => {
            console.log('Planificación actualizada en la API:', response);

            // Actualizar objeto de planificación local
            const index = this.planificaciones.findIndex(
              (p) => p.id === this.selectedPlanificacion
            );
            if (index >= 0) {
              this.planificaciones[index] = {
                id: this.selectedPlanificacion,
                nombre: this.nuevaPlanificacionNombre,
                tramos: [...this.cards],
                cultivos: [...this.selectedCultivos],
              };
            }

            // Guardar los detalles de cada tramo
            this.guardarDetallesTramos(this.selectedPlanificacion);

            // Mostrar mensaje de éxito
            this.mostrarMensajeExito('Planificación actualizada correctamente');
          },
          (error: Error) => {
            console.error('Error al actualizar planificación:', error);
            alert(
              'Error al actualizar la planificación. Por favor, inténtelo de nuevo.'
            );
          }
        );
    }
  }

  // Método para guardar los detalles de los tramos


// Método actualizado para guardarDetallesTramos
// Método actualizado para guardarDetallesTramos
guardarDetallesTramos(planningId: string): void {
  console.log('Guardando detalles para planificación ID:', planningId);
  
  // Primero eliminar los detalles existentes
  this.cultivePlanningDetailsService
    .deleteDetailsByPlanningId(planningId)
    .subscribe(
      () => {
        console.log('Detalles anteriores eliminados correctamente');

        // Luego crear los nuevos detalles para cada tramo
        const tramosDetails = this.cards.map((card, index) => {
          // Convertir las fechas de string a Date
          const startDate = card.startDate ? new Date(card.startDate) : new Date();
          const endDate = card.endDate ? new Date(card.endDate) : new Date();
          
          // Crear objeto con el formato exacto que espera la API
          return {
            fechaInicio: startDate,
            fechaFin: endDate,
            kilos: card.value || 0,
            tramo: index + 1, // Usar el índice + 1 como número de tramo - NOMBRE CORREGIDO
            // No incluir cultivePlanningId aquí, el servicio lo añadirá
          };
        });

        console.log('Guardando detalles de tramos para ID:', planningId);
        console.log('Detalles a guardar:', JSON.stringify(tramosDetails, null, 2));

        // Intentar crear los detalles
        this.cultivePlanningDetailsService
          .createMultiplePlanningDetails(planningId, tramosDetails)
          .subscribe(
            (response: CultivePlanningDetails[]) => {
              console.log('Detalles de tramos guardados correctamente:', response);
              this.mostrarMensajeExito('Planificación completa guardada correctamente');
            },
            (error: Error) => {
              console.error('Error al guardar detalles de tramos:', error);
              // Mostrar un mensaje más detallado
              alert(
                `Error al guardar los detalles de los tramos: ${error.message}`
              );
            }
          );
      },
      (error: Error) => {
        console.error('Error al eliminar detalles anteriores:', error);

        // Continuar con la creación aunque falle la eliminación
        const tramosDetails = this.cards.map((card, index) => {
          const startDate = card.startDate ? new Date(card.startDate) : new Date();
          const endDate = card.endDate ? new Date(card.endDate) : new Date();
          
          return {
            fechaInicio: startDate,
            fechaFin: endDate,
            kilos: card.value || 0,
            tramo: index + 1, // Usar el índice + 1 como número de tramo - NOMBRE CORREGIDO
          };
        });

        this.cultivePlanningDetailsService
          .createMultiplePlanningDetails(planningId, tramosDetails)
          .subscribe(
            (response: CultivePlanningDetails[]) => {
              console.log('Detalles de tramos guardados correctamente (fallback):', response);
              this.mostrarMensajeExito('Planificación completa guardada correctamente');
            },
            (error: Error) => {
              console.error('Error al guardar detalles de tramos (fallback):', error);
              alert(
                `Error al guardar los detalles de los tramos: ${error.message}`
              );
            }
          );
      }
    );
}

  // Muestra un mensaje de éxito temporal
  mostrarMensajeExito(mensaje: string): void {
    this.successMessage = mensaje;

    // Limpiar timeout anterior si existe
    if (this.successTimeout) {
      clearTimeout(this.successTimeout);
    }

    // Ocultar mensaje después de 3 segundos
    this.successTimeout = setTimeout(() => {
      this.successMessage = null;
    }, 3000);
  }

  // Valida las fechas de un tramo
  validateDates(index: number) {
    const card = this.cards[index];

    // Si tenemos ambas fechas, validar que la fecha de inicio no sea posterior a la de fin
    if (card.startDate && card.endDate) {
      const startDate = new Date(card.startDate);
      const endDate = new Date(card.endDate);

      if (startDate > endDate) {
        // Si la fecha de inicio es posterior a la de fin, ajustamos la fecha de fin
        card.endDate = card.startDate;
      }
    }
  }

  // Guarda la planificación completa
  guardar() {
    if (this.selectedCultivos.length === 0) {
      alert('Debe seleccionar al menos un cultivo');
      return;
    }

    if (!this.nuevaPlanificacionNombre) {
      alert('Debe ingresar un nombre para la planificación');
      return;
    }

    // Validar que todos los tramos tengan fechas válidas
    const tramosInvalidos = this.cards.filter(
      (card) => !card.startDate || !card.endDate || !card.value
    );

    if (tramosInvalidos.length > 0) {
      alert('Todos los tramos deben tener fechas de inicio, fin y valor de KG');
      return;
    }

    // Verificar fechas inválidas y valores negativos
    let fechasInvalidas = false;
    let valoresNegativos = false;

    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];

      // Verificar que la fecha de inicio no sea posterior a la fecha de fin
      if (card.startDate && card.endDate) {
        const startDate = new Date(card.startDate);
        const endDate = new Date(card.endDate);

        if (startDate > endDate) {
          fechasInvalidas = true;
          break;
        }
      }

      // Verificar que los kilogramos no sean negativos
      if (card.value !== null && card.value < 0) {
        valoresNegativos = true;
        break;
      }
    }

    if (fechasInvalidas) {
      alert(
        'La fecha de inicio no puede ser posterior a la fecha de fin en ningún tramo'
      );
      return;
    }

    if (valoresNegativos) {
      alert('Los kilogramos estimados no pueden ser negativos');
      return;
    }

    this.enviarDatos();
  }
}
