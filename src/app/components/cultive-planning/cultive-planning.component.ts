import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CultivoService } from '../../services/Cultivo.service';
import { Cultive } from '../../types/Cultive';
import {
  CultivePlanningService,
  CultivePlanning,
} from '../../services/CultivePlanning.service';
import { CultivePlanningDetailsService } from '../../services/CultivePlanningDetails.service';
import { CultivePlanningDetails } from '../../types/CultivePlanningDetails';
import { CultiveProductionService } from '../../services/CultiveProduction.service';
import {
  CultiveProductionDto,
  CreateCultiveProductionDto,
  UpdateCultiveProductionDto,
} from '../../types/CultiveProductionTypes';

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

// Nueva interfaz para las opciones del selector de planificación
interface PlanificacionOption {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-cultive-planning',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule], // Añadimos NgSelectModule
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
  selectedPlanificacion: string = ''; // Por defecto, este vacia
  planificacionesOptions: PlanificacionOption[] = []; // Para ngSelect

  // Detección de modo oscuro
  isDarkMode: boolean = false;

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

  /** Detalles de los tramos recibidos de la API */
  details: CultivePlanningDetails[] = [];
  // Mapa de producciones cargadas: key = cultivePlanningDetailsId, value = DTO

  private produccionesMap = new Map<number, CultiveProductionDto>();

  constructor(
    private cultivoService: CultivoService,
    private cultivoPlanningService: CultivePlanningService,
    private cultivePlanningDetailsService: CultivePlanningDetailsService,
    private productionService: CultiveProductionService
  ) {}

  ngOnInit(): void {
    // Comprobar tema oscuro
    this.checkDarkMode();

    // Inicializar los 12 tramos
    //this.initializeTramos();

    // Cargar planificaciones desde la API
    this.cargarPlanificaciones();

    // Cargar los cultivos de la API
    this.cargarCultivos();
  }

  // Método para comprobar si está activo el tema oscuro
  checkDarkMode(): void {
    this.isDarkMode =
      document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Opcional: crear un observer para detectar cambios en el tema
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          this.isDarkMode = document.documentElement.classList.contains('dark');
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
  }

  // Método para preparar las opciones del selector de planificación
  prepararOpcionesPlanificacion(): void {
    // Incluir la opción "Nueva planificación"
    this.planificacionesOptions = [
      //{ id: '', nombre: 'Selecciona una planificación' },
      { id: 'nueva', nombre: 'Crear nueva planificación' },
    ];

    // Añadir las planificaciones existentes
    this.planificaciones.forEach((plan) => {
      this.planificacionesOptions.push({
        id: plan.id,
        nombre: plan.nombre,
      });
    });
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
            console.warn(
              'La API no devolvió un array. Intentando convertir...'
            );

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
            this.prepareDisplayNames(); // Preparar displayNames para NgSelect
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
        this.loadError =
          'Error al cargar cultivos desde el servidor: ' + error.message;
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
    this.cultivo.forEach((item) => {
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
  // Método para extraer nombres de cultivos en el formato solicitado
  extractCultivoNames(): void {
    const cultivoNames: string[] = [];

    // Recorrer los cultivos y extraer nombres en el formato solicitado
    if (Array.isArray(this.cultivo)) {
      this.cultivo.forEach((cultivo) => {
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

  // Añadir propiedad displayName a los cultivos para NgSelect
  prepareDisplayNames(): void {
    this.filteredCultivos.forEach((cultivo) => {
      (
        cultivo as any
      ).displayName = `${cultivo.nombreGenero} - ${cultivo.nombreVariedad} (${cultivo.nombreAgricultor})`;
    });
  }

  // Método para manejar el cambio de género seleccionado
  onGenreChange(): void {
    console.log('Género seleccionado:', this.selectedGenre);

    // Filtrar cultivos según el género seleccionado
    if (this.selectedGenre && this.cultivosPorGenero[this.selectedGenre]) {
      this.filteredCultivos = this.cultivosPorGenero[this.selectedGenre];
      console.log(
        `Filtrados ${this.filteredCultivos.length} cultivos para el género ${this.selectedGenre}`
      );
    } else {
      // Si no hay género seleccionado o es "Todos", mostrar todos los cultivos
      this.filteredCultivos = [...this.cultivo];
      console.log(
        `Mostrando todos los cultivos (${this.filteredCultivos.length})`
      );
    }

    // Preparar displayNames para NgSelect
    this.prepareDisplayNames();

    // Reset de selección temporal de cultivos en el modal
    this.tempSelectedCultivos = [];
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

  // Método modificado para cargar las planificaciones y preparar opciones
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

        // Preparar opciones para el selector NgSelect
        this.prepararOpcionesPlanificacion();

        this.isLoadingPlanificaciones = false;
      },
      (error: Error) => {
        console.error('Error al cargar planificaciones:', error);
        // En caso de error, cargar planificaciones de ejemplo
        this.cargarPlanificacionesEjemplo();

        // Preparar opciones para el selector NgSelect
        this.prepararOpcionesPlanificacion();

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
  /**
   * Carga la planificación seleccionada, sus detalles de tramos
   * y las producciones existentes para cada tramo.
   */
  cargarPlanificacion(): void {
    console.log('Planificación seleccionada:', this.selectedPlanificacion);

    // 1) Si no hay nada seleccionado, reiniciar formularios y salir
    if (this.selectedPlanificacion === '') {
      this.nuevaPlanificacionNombre = '';
      this.selectedCultivos = [];
      this.cards = [];
      return;
    }

    // 2) Si es "nueva", inicializar tramos vacíos y salir
    if (this.selectedPlanificacion === 'nueva') {
      this.initializeTramos();
      this.selectedCultivos = [];
      this.nuevaPlanificacionNombre = '';
      return;
    }

    // 3) Buscar la planificación existente en memoria
    const plan = this.planificaciones.find(
      (p) => String(p.id) === String(this.selectedPlanificacion)
    );
    if (!plan) {
      console.error(
        'No se encontró la planificación con ID:',
        this.selectedPlanificacion
      );
      this.mostrarMensajeExito(
        'Error: planificación no encontrada, intentando cargar desde API...'
      );
      this.cargarPlanificacionDesdeAPI();
      return;
    }

    // 4) Poner nombre y cultivos básicos
    this.nuevaPlanificacionNombre = plan.nombre;
    this.selectedCultivos = plan.cultivos.filter((c) =>
      this.cultivos.includes(c)
    );

    // 5) Solicitar al servidor los detalles de tramo
    this.cultivePlanningDetailsService
      .getDetailsByPlanningId(this.selectedPlanificacion)
      .subscribe(
        (details) => {
          // Guardar detalles para uso posterior
          this.details = details;

          // Inicializar los 12 tramos de la UI
          this.initializeTramos();

          // Rellenar cada card con datos de kilos y fechas de la API
          details.forEach((detail) => {
            const idx = detail.tramo - 1;
            this.cards[idx] = {
              value: detail.kilos,
              startDate: this.formatDate(new Date(detail.fechaInicio)),
              endDate: this.formatDate(new Date(detail.fechaFin)),
            };
          });

          // 6) Cargar producciones existentes para estos detalles
          this.loadProductionsForDetails(details);

          this.mostrarMensajeExito(
            'Datos de planificación cargados correctamente'
          );
        },
        (error) => {
          console.error('Error al cargar detalles de planificación:', error);
          // En caso de fallo, dejamos los tramos de plan local
          if (plan.tramos && plan.tramos.length) {
            this.cards = [...plan.tramos];
          } else {
            this.initializeTramos();
          }
          this.mostrarMensajeExito(
            'Error cargando detalles. Usando datos locales.'
          );
        }
      );
  }

  private loadProductionsForDetails(details: CultivePlanningDetails[]) {
    this.productionService.getAllCultiveProductions().subscribe(
      (allProds) => {
        // Filtramos para quedarnos solo con las producciones de los detalles actuales
        const detailIds = new Set(details.map((d) => d.id));
        allProds
          .filter((p) => detailIds.has(p.cultivePlanningDetailsId))
          .forEach((p) =>
            this.produccionesMap.set(p.cultivePlanningDetailsId, p)
          );

        console.log(
          'Producciones cargadas para estos detalles:',
          this.produccionesMap
        );
      },
      (error) => {
        console.error('Error al cargar producciones:', error);
      }
    );
  }

  // Método para intentar cargar directamente desde la API
  cargarPlanificacionDesdeAPI(): void {
    if (!this.selectedPlanificacion || this.selectedPlanificacion === 'nueva') {
      return;
    }

    this.cultivoPlanningService
      .getCultivePlanningById(this.selectedPlanificacion)
      .subscribe(
        (planificacion: CultivePlanning) => {
          if (planificacion) {
            // Crear objeto de planificación con el formato local
            const nuevaPlanificacion: Planificacion = {
              id: planificacion.id || '',
              nombre: planificacion.nombre,
              tramos: [], // Inicializar vacío
              cultivos: [], // Inicializar vacío
            };

            // Añadir a la lista local si no existe ya
            const existeEnLista = this.planificaciones.some(
              (p) => p.id === nuevaPlanificacion.id
            );
            if (!existeEnLista) {
              this.planificaciones.push(nuevaPlanificacion);
            }

            // Actualizar las opciones del selector
            this.prepararOpcionesPlanificacion();

            // Volver a llamar a cargarPlanificacion()
            this.cargarPlanificacion();
          } else {
            this.mostrarMensajeExito(
              'No se encontró la planificación en la API'
            );
          }
        },
        (error) => {
          console.error('Error al cargar planificación desde la API:', error);
          this.mostrarMensajeExito(
            'Error al cargar la planificación desde la API'
          );
        }
      );
  }

  // Formatea una fecha como YYYY-MM-DD para usar en input type="date"
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Método para abrir el modal con los cultivos filtrados
  openCultivoModal(): void {
    // Inicializar con la selección actual
    this.tempSelectedCultivos = [];

    // Si no hay cultivos filtrados, intentar cargar todos los cultivos
    if (this.filteredCultivos.length === 0 && this.cultivo.length > 0) {
      this.filteredCultivos = [...this.cultivo];
      this.prepareDisplayNames();
    }

    this.showCultivoModal = true;
  }

  closeCultivoModal(): void {
    this.showCultivoModal = false;
  }

  // Método modificado para añadir cultivos seleccionados con NgSelect
  addSelectedCultivos(): void {
    console.log(
      'Cultivos seleccionados temporalmente:',
      this.tempSelectedCultivos
    );

    // Si no hay selección, salir
    if (!this.tempSelectedCultivos || this.tempSelectedCultivos.length === 0) {
      return;
    }

    // 1) Actualizar la vista: construir this.selectedCultivos a partir de tempSelectedCultivos
    this.selectedCultivos = [];
    for (const selectedIdStr of this.tempSelectedCultivos) {
      const selectedId = Number(selectedIdStr);
      const cultivo = this.filteredCultivos.find((c) => c.id === selectedId);
      if (cultivo) {
        const displayName = `${cultivo.nombreAgricultor} - ${cultivo.nombreGenero} - ${cultivo.nombreVariedad}`;
        this.selectedCultivos.push(displayName);
      }
    }
    this.closeCultivoModal();

    // 2) Para cada tramo/detail, crear o actualizar su CultiveProduction
    this.details.forEach((detail) => {
      const idx = detail.tramo - 1;
      const card = this.cards[idx];

      const createDto: CreateCultiveProductionDto = {
        cultivePlanningDetailsId: detail.id,
        kilos: String(card.value),
        fechaInicio: card.startDate!,
        fechaFin: card.endDate!,
      };

      const existing = this.produccionesMap.get(detail.id);
      if (existing) {
        // Ya existe → actualizar
        const updateDto: UpdateCultiveProductionDto = { ...createDto };
        this.productionService
          .updateCultiveProduction(existing.id, updateDto)
          .subscribe((updated) => {
            this.produccionesMap.set(detail.id, updated);
            console.log(
              `Producción actualizada para detail ${detail.id}`,
              updated
            );
          });
      } else {
        // No existe → crear
        this.productionService
          .createCultiveProduction(createDto)
          .subscribe((created) => {
            this.produccionesMap.set(detail.id, created);
            console.log(`Producción creada para detail ${detail.id}`, created);
          });
      }
    });
  }

  removeCultivo(index: number): void {
    // 6.1 Quitar de la lista UI
    this.selectedCultivos.splice(index, 1);

    // 6.2 Determinar qué detail corresponde (adapta según tu lógica)
    const detail = this.details[index];
    if (!detail) return;

    const prod = this.produccionesMap.get(detail.id);
    if (prod) {
      this.productionService
        .deleteCultiveProduction(prod.id)
        .subscribe(() => this.produccionesMap.delete(detail.id));
    }
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

            // Actualizar las opciones del selector
            this.prepararOpcionesPlanificacion();

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

            // Actualizar las opciones del selector
            this.prepararOpcionesPlanificacion();

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
            const startDate = card.startDate
              ? new Date(card.startDate)
              : new Date();
            const endDate = card.endDate ? new Date(card.endDate) : new Date();

            // Crear objeto con el formato exacto que espera la API
            return {
              fechaInicio: startDate,
              fechaFin: endDate,
              kilos: card.value || 0,
              tramo: index + 1, // Usar el índice + 1 como número de tramo
              // No incluir cultivePlanningId aquí, el servicio lo añadirá
            };
          });

          console.log('Guardando detalles de tramos para ID:', planningId);

          // Intentar crear los detalles
          this.cultivePlanningDetailsService
            .createMultiplePlanningDetails(planningId, tramosDetails)
            .subscribe(
              (response: CultivePlanningDetails[]) => {
                console.log(
                  'Detalles de tramos guardados correctamente:',
                  response
                );
                this.mostrarMensajeExito(
                  'Planificación completa guardada correctamente'
                );
              },
              (error: Error) => {
                console.error('Error al guardar detalles de tramos:', error);
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
            const startDate = card.startDate
              ? new Date(card.startDate)
              : new Date();
            const endDate = card.endDate ? new Date(card.endDate) : new Date();

            return {
              fechaInicio: startDate,
              fechaFin: endDate,
              kilos: card.value || 0,
              tramo: index + 1, // Usar el índice + 1 como número de tramo
            };
          });

          this.cultivePlanningDetailsService
            .createMultiplePlanningDetails(planningId, tramosDetails)
            .subscribe(
              (response: CultivePlanningDetails[]) => {
                console.log(
                  'Detalles de tramos guardados correctamente (fallback):',
                  response
                );
                this.mostrarMensajeExito(
                  'Planificación completa guardada correctamente'
                );
              },
              (error: Error) => {
                console.error(
                  'Error al guardar detalles de tramos (fallback):',
                  error
                );
                alert(
                  `Error al guardar los detalles de los tramos: ${error.message}`
                );
              }
            );
        }
      );
  }
}
