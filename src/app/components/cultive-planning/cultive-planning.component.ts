import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CultivoService } from '../../services/Cultivo.service';
import { Cultive } from '../../types/Cultive';
import { GenderTypes } from '../../types/GenderTypes';
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
import {
  CreateCultivePlanningDto,
  UpdateCultivePlanningDto,
} from '../../types/CultivePlanningTypes';
import { GenderService } from '../../services/Gender.service';

// Define el DTO aquí ya que no está exportado desde el servicio
interface CultivePlanningDTO {
  nombre: string;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  idGenero: number | null;
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
  selectedCultivosIds: number[] = []; // ids de cultivos seleccionados
  // ids temporales (modal)
  tempSelectedCultivosIds: number[] = [];
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
  // al principio de la clase
  genderList: GenderTypes[] = [];
  idGnero: number | undefined = 0;
  generoPrueba: GenderTypes[] = [];

  selectedGeneroId: number | undefined = undefined;

  // 1) Metemos en la clase esta propiedad para guardar el listado completo:
  produccionesList: CultiveProductionDto[] = [];

  //private produccionesMap = new Map<number, CultiveProductionDto>();
  // antes: Map<number, CultiveProductionDto>
  private produccionesMap = new Map<string, CultiveProductionDto>();

  constructor(
    private cultivoService: CultivoService,
    private cultivoPlanningService: CultivePlanningService,
    private cultivePlanningDetailsService: CultivePlanningDetailsService,
    private productionService: CultiveProductionService,
    private genderService: GenderService
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

    // cargamos géneros
    this.genderService.getWithId().subscribe(
      (data) => {
        this.genderList = data;
        console.log('Generos get:', this.genderList);
      },
      (error) => {
        console.error('Error cargando géneros', error);
      }
    );
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
    console.log(this.generos);
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
    // 1) Mostrar el ID seleccionado
    console.log('ID de género seleccionado:', this.selectedGeneroId);

    // 2) Obtener el objeto completo a partir del ID
    const generoObj = this.genderList.find(
      (g) => g.idGenero === this.selectedGeneroId
    );
    this.idGnero = generoObj?.id;

    // 3) Actualizar el texto del género para uso en el filtro y la UI
    this.selectedGenre = generoObj?.nombreGenero ?? '';
    console.log('Nombre de género seleccionado:', this.selectedGenre);

    // 4) Filtrar cultivos según el género (por nombreGenero)
    if (this.selectedGenre && this.cultivosPorGenero[this.selectedGenre]) {
      this.filteredCultivos = this.cultivosPorGenero[this.selectedGenre];
      console.log(
        `Filtrados ${this.filteredCultivos.length} cultivos para el género ${this.selectedGenre}`
      );
    } else {
      // Si no hay género o no existe en el mapa, mostramos todos
      this.filteredCultivos = [...this.cultivo];
      console.log(
        `Mostrando todos los cultivos (${this.filteredCultivos.length})`
      );
    }

    // 5) Recalcular los displayName para el ng-select de cultivos
    this.prepareDisplayNames();

    // 6) Limpiar la selección temporal del modal
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
        value: 0.1, // Valor por defecto para los kilos
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

  // 2) Ajustamos loadProductionsForDetails:
  private loadProductionsForDetails(details: CultivePlanningDetails[]) {
    this.productionService.getAllCultiveProductions().subscribe((allProds) => {
      // filtra solo los de estos details
      const detailIds = new Set(details.map((d) => d.id));
      allProds
        .filter((p) => detailIds.has(p.cultivePlanningDetailsId))
        .forEach((p) => {
          const key = `${p.cultivePlanningDetailsId}_${p.cultiveId}`;
          this.produccionesMap.set(key, p);
        });
    });
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
    // 1) Limpio la selección temporal
    this.tempSelectedCultivos = [];

    // 2) Si hay un género elegido, filtrar por él; si no, cargar todos
    if (this.selectedGeneroId != null) {
      // Busco el nombre del género a partir de su ID
      const generoObj = this.genderList.find(
        (g) => g.idGenero === this.selectedGeneroId
      );
      if (generoObj) {
        // Aplico filtro
        this.filteredCultivos =
          this.cultivosPorGenero[generoObj.nombreGenero.trim()] || [];
      } else {
        // Si por algún motivo no lo encuentro, dejo vacío
        this.filteredCultivos = [];
      }
    } else {
      // Sin género, muestro todos
      this.filteredCultivos = [...this.cultivo];
    }

    // 3) Recalculo los displayName para el ng-select de cultivos
    this.prepareDisplayNames();

    // 4) Mantengo los IDs previamente seleccionados (si quieres)
    this.tempSelectedCultivosIds = [...this.selectedCultivosIds];

    // 5) Abro el modal
    this.showCultivoModal = true;
  }

  closeCultivoModal(): void {
    this.showCultivoModal = false;
  }

  // Método modificado para añadir cultivos seleccionados con NgSelect
  addSelectedCultivos(): void {
    // 1) IDs antes y IDs nuevas (modal)
    const anteriores = [...this.selectedCultivosIds];
    const nuevas = this.tempSelectedCultivos.map((idStr) => Number(idStr));

    // 2) Calcular añadidos y eliminados
    const añadidos = nuevas.filter((id) => !anteriores.includes(id));
    const eliminados = anteriores.filter((id) => !nuevas.includes(id));

    // 3) Actualizar UI: ids y nombres
    this.selectedCultivosIds = nuevas;
    this.selectedCultivos = nuevas.map((id) => {
      const c = this.filteredCultivos.find((x) => x.id === id)!;
      return `${c.nombreAgricultor} - ${c.nombreGenero} - ${c.nombreVariedad}`;
    });
    this.closeCultivoModal();

    // 4) Para cada detalle y cada cultivo, crear o actualizar
    this.details.forEach((detail) => {
      const card = this.cards[detail.tramo - 1];
      const kilosStr = String(card.value ?? 0);

      nuevas.forEach((cultiveId) => {
        const key = `${detail.id}_${cultiveId}`;
        const existing = this.produccionesMap.get(key);

        const dto: CreateCultiveProductionDto = {
          cultivePlanningDetailsId: detail.id,
          cultiveId: cultiveId,
          kilos: kilosStr,
          fechaInicio: card.startDate!,
          fechaFin: card.endDate!,
        };

        if (existing) {
          // **UPDATE** si ya existía
          this.productionService
            .updateCultiveProduction(
              existing.id,
              dto as UpdateCultiveProductionDto
            )
            .subscribe((updated) => {
              console.log(
                `Producción actualizada detail ${detail.id}`,
                updated
              );
              this.produccionesMap.set(key, updated);
            });
        } else {
          // **CREATE** si no existía
          this.productionService
            .createCultiveProduction(dto)
            .subscribe((created) => {
              console.log(`Producción creada detail ${detail.id}`, created);
              this.produccionesMap.set(key, created);
            });
        }
      });
    });

    // 5) Borrar producciones de cultivos eliminados
    eliminados.forEach((cultiveId) => {
      this.details.forEach((detail) => {
        const key = `${detail.id}_${cultiveId}`;
        const prod = this.produccionesMap.get(key);
        if (prod) {
          this.productionService
            .deleteCultiveProduction(prod.id)
            .subscribe(() => {
              console.log(`Producción ${prod.id} eliminada`);
              this.produccionesMap.delete(key);
            });
        }
      });
    });
  }

  removeCultivo(index: number): void {
    // 1) Obtener el ID del cultivo que vamos a quitar
    const cultiveId = this.selectedCultivosIds[index];
  
    // 2) Quitar de la UI: nombre y ID
    this.selectedCultivos.splice(index, 1);
    this.selectedCultivosIds.splice(index, 1);
  
    // 3) Para cada detalle (tramo) borrar la producción correspondiente a este cultivo
    this.details.forEach(detail => {
      const key = `${detail.id}_${cultiveId}`;
      const prod = this.produccionesMap.get(key);
      if (prod) {
        this.productionService.deleteCultiveProduction(prod.id)
          .subscribe(() => {
            console.log(`Producción borrada detail ${detail.id}, cultive ${cultiveId}`);
            this.produccionesMap.delete(key);
          }, err => {
            console.error(`Error borrando producción detail ${detail.id}`, err);
          });
      }
    });
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
    // 1) Validar nombre
    if (!this.nuevaPlanificacionNombre) {
      alert('Debe ingresar un nombre para la planificación');
      return;
    }

    // 2) Calcular fechas globales
    let fechaInicioGlobal: Date | null = null;
    let fechaFinGlobal: Date | null = null;
    this.cards.forEach((card) => {
      if (card.startDate) {
        const d = new Date(card.startDate);
        if (!fechaInicioGlobal || d < fechaInicioGlobal) fechaInicioGlobal = d;
      }
      if (card.endDate) {
        const d = new Date(card.endDate);
        if (!fechaFinGlobal || d > fechaFinGlobal) fechaFinGlobal = d;
      }
    });
    if (!fechaInicioGlobal || !fechaFinGlobal) {
      alert('No se pudieron determinar las fechas de inicio y fin');
      return;
    }

    // 3) Preparar DTO
    const baseDto: CreateCultivePlanningDto = {
      nombre: this.nuevaPlanificacionNombre,
      fechaInicio: fechaInicioGlobal,
      fechaFin: fechaFinGlobal,
      idGenero: this.idGnero ?? undefined,
    };
    console.log('Gra gra' + baseDto.idGenero);
    // 4) Crear o actualizar
    if (this.selectedPlanificacion === 'nueva') {
      this.cultivoPlanningService.createCultivePlanning(baseDto).subscribe(
        (response) => {
          console.log('Planificación creada:', response);
          // Actualizar lista local y re-cargar UI
          this.selectedPlanificacion = response.id!.toString();
          this.prepararOpcionesPlanificacion();
          this.guardarDetallesTramos(this.selectedPlanificacion);
          this.mostrarMensajeExito('Planificación creada correctamente');
        },
        (err) => {
          console.error('Error al crear planificación', err);
          alert('Error al crear la planificación.');
        }
      );
    } else {
      this.cultivoPlanningService
        .updateCultivePlanning(this.selectedPlanificacion, baseDto)
        .subscribe(
          (response) => {
            console.log('Planificación actualizada:', response);
            this.prepararOpcionesPlanificacion();
            this.guardarDetallesTramos(this.selectedPlanificacion);
            this.mostrarMensajeExito('Planificación actualizada correctamente');
          },
          (err) => {
            console.error('Error al actualizar planificación', err);
            alert('Error al actualizar la planificación.');
          }
        );
    }
  }

  // Método actualizado para guardarDetallesTramos
  guardarDetallesTramos(planningId: string): void {
    console.log('Guardando detalles para planificación ID:', planningId);
  
    // 1) Eliminar detalles existentes
    this.cultivePlanningDetailsService
      .deleteDetailsByPlanningId(planningId)
      .subscribe(
        () => {
          console.log('Detalles anteriores eliminados correctamente');
          this.createAndSyncDetails(planningId);
        },
        (error: Error) => {
          console.error('Error al eliminar detalles anteriores:', error);
          // Aun así, seguimos con la creación
          this.createAndSyncDetails(planningId);
        }
      );
  }
  
  // Método auxiliar que crea los detalles y sincroniza producciones
  private createAndSyncDetails(planningId: string): void {
    // 2) Construir array de detalles desde los cards
    const tramosDetails = this.cards.map((card, index) => ({
      fechaInicio: card.startDate ? new Date(card.startDate) : new Date(),
      fechaFin:    card.endDate   ? new Date(card.endDate)   : new Date(),
      kilos:       card.value     || 0,
      tramo:       index + 1
    }));
  
    console.log('Creando detalles de tramos para ID:', planningId, tramosDetails);
  
    // 3) Crear detalles en la API
    this.cultivePlanningDetailsService
      .createMultiplePlanningDetails(planningId, tramosDetails)
      .subscribe(
        (details: CultivePlanningDetails[]) => {
          console.log('Detalles de tramos guardados correctamente:', details);
          // 4) Actualizar array local de detalles
          this.details = details;
          // 5) Sincronizar todas las producciones de los cultivos seleccionados
          this.syncAllProductions();
          this.mostrarMensajeExito('Planificación completa guardada correctamente');
        },
        (error: Error) => {
          console.error('Error al crear detalles de tramos:', error);
          alert(`Error al guardar los detalles de los tramos: ${error.message}`);
        }
      );
  }
  
  /**  
   * Recorre todos los detalles y cultivos seleccionados,
   * y crea o actualiza cada producción según exista en el mapa.  
   */
  private syncAllProductions(): void {
    this.details.forEach(detail => {
      const card = this.cards[detail.tramo - 1];
      const kilosStr = String(card.value ?? 0);
  
      this.selectedCultivosIds.forEach(cultiveId => {
        const key = `${detail.id}_${cultiveId}`;
        const existing = this.produccionesMap.get(key);
  
        const dto = {
          cultivePlanningDetailsId: detail.id,
          cultiveId:                cultiveId,
          kilos:                    kilosStr,
          fechaInicio:              card.startDate!,
          fechaFin:                 card.endDate!
        };
  
        if (existing) {
          // Actualizar producción existente
          this.productionService
            .updateCultiveProduction(existing.id, dto as UpdateCultiveProductionDto)
            .subscribe(updated => {
              console.log(`Producción actualizada detail ${detail.id}`, updated);
              this.produccionesMap.set(key, updated);
            });
        } else {
          // Crear nueva producción
          this.productionService
            .createCultiveProduction(dto)
            .subscribe(created => {
              console.log(`Producción creada detail ${detail.id}`, created);
              this.produccionesMap.set(key, created);
            });
        }
      });
    });
  }
  
}
