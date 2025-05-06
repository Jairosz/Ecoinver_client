import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { FormsModule } from '@angular/forms';
import { ComercialServiceService, Comercial } from '../../services/Comercial.service';
import { GenderService } from '../../services/Gender.service';
import { ComercialPlanningService } from '../../services/ComercialPlanning.service';
import { ComercialPlanning } from '../../types/ComercialPlanning';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ComercialPlanningDetailsService } from '../../services/ComercialPlanningDetails.service';
import { CultiveProductionDto } from '../../types/CultiveProductionTypes';
import { CultiveProductionService } from '../../services/CultiveProduction.service';
import { Cultive } from '../../types/Cultive';
import { CultivoService } from '../../services/Cultivo.service';
import { ComercialPlanningDetailsWithId } from '../../types/ComercialPlanningDetailsWithId';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ChartModule, FormsModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  // Chart type selector addition for commercial/production view
  chartType: string = 'combined';

  constructor(
    private comercialServicio: ComercialServiceService,
    private generoServicio: GenderService,
    private planingComercial: ComercialPlanningService,
    private plannigSemanas: ComercialPlanningDetailsService,
    private cultiveServiceProduction: CultiveProductionService,
    private cultivoServicio: CultivoService
  ) { }

  // Propiedades para los gráficos
  data: any;
  options: any;
  teoricaData: any;
  realData: any;
  teoricaOptions: any;
  realOptions: any;
  showCombined = false;
  combinedData: any;
  combinedOptions: any;
  commercialData: any; // For commercial chart view
  productionData: any; // For production chart view

  // Objeto comercial
  comercial: Comercial = {
    id: 0,
    clientCode: 0,
    clientName: "",
    startDate: new Date(),
    endDate: new Date(),
    idGenero: 0,
    nombreGenero: "",
    kgs: 0
  }
  isExporting: boolean = false;
  nombreComerciales: string = '';
  // Array de objetos comercial
  comNeeds: Comercial[] = [];
  planning: ComercialPlanning[] = [];
  planingDetails: ComercialPlanningDetailsWithId[] = [];
  cultive: Cultive[] = [];
  // Propiedades adicionales para el nuevo diseño
  // Arrays para manejar los filtros de géneros y necesidades
  genders: any[] = [];
  cultiveProductions: CultiveProductionDto[] = [];
  selectedProductions: CultiveProductionDto[] = [];
  selectedGenderIds: string = '';
  selectedComNeedIds: number[] = [];
  filteredComNeeds: Comercial[] = [];
  family: { familia: string, nombreGenero: string[] }[] = [];
  texto: string = '';
  familiaSeleccionada: string = '';
  // Métricas del dashboard
  dashboardMetrics = {
    totalRegistros: 0,
    variacionMensual: '+12%', // Valor de ejemplo
    plazoMedio: '28 días',    // Valor de ejemplo
    ultimaActualizacion: '24/06/2024'
  };
  seleccionados: number = 0;
  vistaSeleccionada: string = 'mes';

  ngOnInit(): void {
    // Obtenemos los registros de los datos de la base de datos
    this.comercialServicio.getComercial().subscribe(
      (data) => {
        this.comNeeds = data;
        this.filteredComNeeds = [...this.comNeeds]; // Inicialmente mostramos todos
        this.dashboardMetrics.totalRegistros = this.comNeeds.length;
      },
      (error) => {
        console.error('Error al cargar datos: ' + error);
      }
    );

    this.generoServicio.get().subscribe(
      (data) => {
        this.genders = data;
        this.extractGenders();
      },
      (error) => {
        console.log(error);
      }
    );

    this.planingComercial.get().subscribe(
      (data) => {
        this.planning = data;
      },
      (error) => {
        console.log(error);
      }
    );

    this.plannigSemanas.get().subscribe(
      (data) => {
        this.planingDetails = data;
      },
      (error) => {
        console.log(error);
      }
    );

    //Nos traemos las producciones de los cultivos
    this.cultiveServiceProduction.getAllCultiveProductions().subscribe(
      (data) => {
        this.cultiveProductions = data;

      },
      (error) => {
        console.log('Error: ' + error);
      }
    );

    //Nos traemos los cultivos
    this.cultivoServicio.getAll().subscribe(
      (data) => {
        this.cultive = data;
      },
      (error) => {
        console.log('Error ' + error);
      }
    );

    this.actualizarGrafica(this.vistaSeleccionada);
  }

  // Método para cambiar el tipo de gráfica (comercial/producción/combinada)
  setChartType(type: string): void {
    this.chartType = type;
    // Actualizar las gráficas según el tipo seleccionado
    this.initializeCharts();

  }

  // Método para extraer géneros únicos de los datos comerciales
  extractGenders() {
    for (let i = 0; i < this.genders.length; i++) {
      // Buscamos el objeto correspondiente al idGenero actual
      const generoEncontrado = this.genders[i];

      // Buscamos si ya existe un objeto en "this.family" para la familia encontrada
      const familiaExistente = this.family.find(f =>
        f.familia === generoEncontrado.nombreFamilia
      );

      if (familiaExistente) {
        // Si ya existe la familia, verificamos que el nombre de género no se haya agregado previamente.
        if (!familiaExistente.nombreGenero.includes(generoEncontrado.nombreGenero)) {
          familiaExistente.nombreGenero.push(generoEncontrado.nombreGenero);
        }
      } else {
        // Si no existe, creamos un nuevo objeto para esta familia con el nombre de género en un arreglo.
        this.family.push({
          familia: generoEncontrado.nombreFamilia,
          nombreGenero: [generoEncontrado.nombreGenero]
        });
      }
    }
  }

  // Inicializar las configuraciones de los gráficos
  initializeCharts() {
    this.vistaSeleccionada = 'mes';
    this.selectedProductions = [];
    this.nombreComerciales = '';
    const d = new Date();//Para saber el mes en el que estamos
    let genero: string;
    const checkboxes = document.querySelectorAll('input[type="radio"]');
    for (let i = 0; i < checkboxes.length; i++) {
      const checkbox = checkboxes[i] as HTMLInputElement;

      if (checkbox.checked) {
        genero = checkbox.value;
      }
    }
    let cultivo: Cultive[];
    const generosSeleccionados = this.comNeeds.filter(item => item.nombreGenero == genero);//Obtenemos las necesidades con el nombre de género especificado

    if (generosSeleccionados[0]) {

      cultivo = this.cultive.filter(item => item.idGenero == generosSeleccionados[0].idGenero);

      for (let i = 0; i < cultivo.length; i++) {
        if (this.cultiveProductions.filter(item => item.cultiveId == cultivo[i].id && !this.selectedProductions.some(p => p.cultiveId === item.cultiveId))
        ) {

          this.selectedProductions = this.selectedProductions.concat(
            this.cultiveProductions.filter(item => item.cultiveId == cultivo[i].id)
          );
        }
      }
    }


    generosSeleccionados.forEach((genero, indice) => {
      if (indice == generosSeleccionados.length - 1) {
        this.nombreComerciales += '[' + genero.clientName + ']';
      }
      else {
        this.nombreComerciales += '[' + genero.clientName + ']-';
      }
    });

    let planning: ComercialPlanning[] = [];
    let planningDetails: ComercialPlanningDetailsWithId[] = [];
    for (let i = 0; i < generosSeleccionados.length; i++) {
      const encontrado = this.planning.find(item => item.idCommercialNeed == generosSeleccionados[i].id);
      if (encontrado) {
        planning.push(encontrado);
      }
    }

    for (let i = 0; i < planning.length; i++) {
      if (this.planingDetails.find(item => item.idCommercialNeedsPlanning == planning[i].id)) {
        const encontrado = this.planingDetails.filter(item => item.idCommercialNeedsPlanning == planning[i].id);
        for (let j = 0; j < encontrado.length; j++) {
          planningDetails.push(encontrado[j]);
        }
      }
    }

    let mesActual = d.getMonth();

    let meses: number[] = [];
    for (let i = mesActual - 2; i < (mesActual + 4); i++) {//Rellenamos el label
      meses.push(i + 1);
    }

    let kgs: number[] = new Array(meses.length).fill(0);
    let kgsProduction = new Array(meses.length).fill(0);
    let clientes: string[] = new Array(meses.length);
    let repetidos: { mes: number, cliente: string }[] = [];

    for (let i = 0; i < this.selectedProductions.length; i++) {//para ir sumando los kg de cada semana de la producción
      //Necesitamos saber en que mes entra la planificación de la necesidad
      const mes = new Date(this.selectedProductions[i].fechaInicio);

      for (let j = 0; j < meses.length; j++) {
        if (mes.getMonth() + 1 == meses[j]) {
          //Saber los clientes que estan en la semana de la necesidad
          kgsProduction[j] = (kgsProduction[j] || 0) + parseFloat(this.selectedProductions[i].kilosAjustados);//Si los kilos estan vacios lo ponemos a 0.
        }
      }
    }

    console.log(kgsProduction);

    for (let i = 0; i < planningDetails.length; i++) {//para ir sumando los kg de cada semana del comercial
      //Necesitamos saber en que mes entra la planificación de la necesidad
      const mes = new Date(planningDetails[i].fechaDesde);

      for (let j = 0; j < meses.length; j++) {
        if (mes.getMonth() + 1 == meses[j]) {
          //Saber los clientes que estan en la semana de la necesidad
          const id = this.planning.find(item => item.id == planningDetails[i].idCommercialNeedsPlanning);
          const client = this.comNeeds.find(item => item.id == id?.idCommercialNeed);
          if (!repetidos.find(item => item.mes == j && item.cliente == client?.clientName)) {
            clientes[j] = (clientes[j] || '') + client?.clientName + '-';
            repetidos.push({ mes: j, cliente: client?.clientName ?? '' });
          }
          kgs[j] = (kgs[j] || 0) + (planningDetails[i].kilos ?? 0);//Si los kilos estan vacios lo ponemos a 0.
        }
      }
    }

    let label: string[] = [];
    for (let i = 0; i < meses.length; i++) {
      switch (meses[i]) {
        case 1:
          label.push('Enero');
          break;
        case 2:
          label.push('Febrero');
          break;
        case 3:
          label.push('Marzo');
          break;
        case 4:
          label.push('Abril');
          break;
        case 5:
          label.push('Mayo');
          break;
        case 6:
          label.push('Junio');
          break;
        case 7:
          label.push('Julio');
          break;
        case 8:
          label.push('Agosto');
          break;
        case 9:
          label.push('Septiembre');
          break;
        case 10:
          label.push('Octubre');
          break;
        case 11:
          label.push('Noviembre');
          break;
        case 12:
          label.push('Diciembre');
      }
    }

    // Configuraciones para gráficos de barra     
    const barOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#64748b'
          },
          grid: {
            color: '#e2e8f0'
          }
        },
        x: {
          type: 'category',
          grid: {
            display: false
          },
          ticks: {
            color: '#64748b',
            autoSkip: false   // Para mostrar todas las etiquetas       
          },
          offset: true,
          distribution: 'series'  // Distribuir uniformemente
        }
      },
      plugins: {
        legend: {
          labels: {
            color: '#334155',
            font: {
              weight: '500'
            }
          }
        }
      }
    };

    //Para saber los nombres de fincas de las producciones
    let production: string[] = [];
    for (let i = 0; i < this.cultive.length; i++) {
      production[i] = this.cultive[i].nombreFinca;
    }

    // Gráfico principal (combinado)    
    this.data = {
      labels: label,
      datasets: [
        {
          label: 'Necesidad comercial',
          data: label.map((_, i) => kgs[i] ?? null),
          borderColor: '#4f46e5', // Color indigo para Tailwind           
          tension: 0.4,
          spanGaps: true,
          yAxisID: 'y'
        },
        {
          label: 'Producción cultivo',
          data: kgsProduction,
          borderColor: '#10b981', // Color emerald para Tailwind           
          tension: 0.4,
          spanGaps: true,
          yAxisID: 'y'
        }
      ]
    };

    // Gráfico comercial
    this.commercialData = {
      labels: label,
      datasets: [
        {
          label: 'Necesidad comercial',
          data: label.map((_, i) => kgs[i] ?? null),
          borderColor: '#4f46e5', // Color indigo para Tailwind           
          tension: 0.4,
          spanGaps: true,
          yAxisID: 'y'
        }
      ]
    };

    // Gráfico producción
    this.productionData = {
      labels: label,
      datasets: [
        {
          label: 'Producción cultivo',
          data: kgsProduction,
          borderColor: '#10b981', // Color emerald para Tailwind           
          tension: 0.4,
          spanGaps: true,
          yAxisID: 'y'
        }
      ]
    };

    this.options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          ticks: {
            color: '#64748b'
          },
          grid: {
            drawOnChartArea: true,
            color: '#e2e8f0'
          },
          beginAtZero: true,  // Asegura que el eje Y comience en 0
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          ticks: {
            color: '#64748b'
          },
          grid: {
            drawOnChartArea: false
          },
          beginAtZero: true,  // Asegura que el eje Y secundario también comience en 0
        },
        x: {
          type: 'category',
          grid: {
            display: false
          },
          ticks: {
            color: '#64748b',
            autoSkip: false,          // Asegurar que se muestren todas las etiquetas
            maxRotation: 0            // Evitar rotación de etiquetas
          },
          offset: true,               // Mejor distribución de puntos
          distribution: 'series',     // Distribución uniforme de etiquetas
          bounds: 'ticks'             // Asegurar que el rango completo se muestre
        }
      },
      plugins: {
        legend: {
          labels: {
            color: '#334155'         // Color de las etiquetas en la leyenda
          }
        },
        tooltip: {
          enabled: true,  // Habilitar tooltips
          mode: 'nearest', // Mostrar tooltip sobre el punto más cercano
          intersect: false, // Para mostrar tooltips cuando el cursor esté sobre cualquier punto
          callbacks: {
            // Personalización de las etiquetas del tooltip
            label: function (tooltipItem: any) {
              const dataValue = tooltipItem.raw;
              const index = tooltipItem.dataIndex;
              const datasetIndex = tooltipItem.datasetIndex;

              let tipoDato = datasetIndex === 0 ? 'Necesidades Comerciales' : 'Producción';
              let cliente = datasetIndex === 0 ? clientes[index] : production;

              if (dataValue === 0) {
                return `${tipoDato} : Sin datos`;
              }

              return `${tipoDato} - ${cliente}: ${dataValue} kg`;
            }
          }
        },
        layout: {
          padding: {
            left: 10,
            right: 10
          }
        }
      }
    };

    // Gráficos teórica y real
    this.teoricaData = {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        {
          label: 'Teórica',
          data: [65, 59, 80, 81],
          backgroundColor: '#4f46e5',
          borderColor: '#4f46e5',
          tension: 0.4,
          fill: false
        }
      ]
    };

    this.realData = {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        {
          label: 'Real',
          data: [28, 48, 40, 19],
          backgroundColor: '#10b981',
          borderColor: '#10b981',
          tension: 0.4,
          fill: false
        }
      ]
    };

    this.teoricaOptions = { ...barOptions };
    this.realOptions = { ...barOptions };

    // Configuración gráfica combinada
    this.combinedData = {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        {
          label: 'Teórica',
          data: [65, 59, 80, 81],
          borderColor: '#4f46e5',
          tension: 0.4,
          fill: false,
          borderWidth: 2
        },
        {
          label: 'Real',
          data: [28, 48, 40, 19],
          borderColor: '#10b981',
          tension: 0.4,
          fill: false,
          borderWidth: 2,
          borderDash: [5, 5]
        }
      ]
    };

    this.combinedOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#64748b',
            font: {
              size: window.innerWidth < 768 ? 10 : 12
            }
          },
          grid: {
            color: '#e2e8f0',
            drawOnChartArea: true
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#64748b',
            font: {
              size: window.innerWidth < 768 ? 10 : 12
            }
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#64748b',
            font: {
              size: window.innerWidth < 768 ? 12 : 14
            }
          }
        }
      }
    };

    // Forzar actualizaciones iniciales
    this.updateChartOptions();
  }

  // Método para actualizar gráficos con los datos filtrados
  updateChartWithFilteredData() {
    // Simular valores diferentes para gráficos basados en el producto seleccionado
    const multiplier = (Math.random() * 0.5) + 0.75; // Factor entre 0.75 y 1.25

    const updatedTeoricaData = this.teoricaData.datasets[0].data.map((val: number) =>
      Math.round(val * multiplier)
    );

    const updatedRealData = this.realData.datasets[0].data.map((val: number) =>
      Math.round(val * (multiplier * 0.8))
    );

    // Actualizar datasets
    this.teoricaData.datasets[0].data = updatedTeoricaData;
    this.realData.datasets[0].data = updatedRealData;
    this.combinedData.datasets[0].data = updatedTeoricaData;
    this.combinedData.datasets[1].data = updatedRealData;

    // Forzar actualización de los gráficos
    this.teoricaData = { ...this.teoricaData };
    this.realData = { ...this.realData };
    this.combinedData = { ...this.combinedData };
  }

  // Alternar vista de gráficos
  toggleView() {
    this.showCombined = !this.showCombined;
  }

  toggleAllComNeeds(event: any) {
    if (event.target.checked) {
      this.selectedComNeedIds = this.comNeeds.map(n => n.id);
    } else {
      this.selectedComNeedIds = [];
    }
  }

  toggleComNeedSelection(needId: number) {
    const index = this.selectedComNeedIds.indexOf(needId);
    if (index > -1) {
      this.selectedComNeedIds.splice(index, 1);
    } else {
      this.selectedComNeedIds.push(needId);
    }
  }

  // Calcular total de KGs (para el panel de información)
  getTotalKgs(): number {
    let genero = '';
    const checkboxes = document.querySelectorAll('input[type="radio"]');
    for (let i = 0; i < checkboxes.length; i++) {
      const checkbox = checkboxes[i] as HTMLInputElement;

      if (checkbox.checked) {
        genero = checkbox.value;
      }
    }

    const generosSeleccionados = this.comNeeds.filter(item => item.nombreGenero == genero);
    let suma = 0;
    for (let i = 0; i < generosSeleccionados.length; i++) {
      suma += generosSeleccionados[i].kgs;
    }

    return suma;
  }

  // Actualizar opciones de gráficos para responsive
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.updateChartOptions();
  }

  updateChartOptions() {
    const isMobile = window.innerWidth < 768;
    const baseSize = isMobile ? 10 : 12;

    this.combinedOptions = {
      ...this.combinedOptions,
      plugins: {
        legend: {
          labels: {
            font: {
              size: isMobile ? 12 : 14
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            font: {
              size: baseSize
            }
          }
        },
        x: {
          ticks: {
            font: {
              size: baseSize
            }
          }
        }
      }
    };

    // Forzar actualización de las gráficas
    this.data = { ...this.data };
    this.combinedData = { ...this.combinedData };
    this.teoricaData = { ...this.teoricaData };
    this.realData = { ...this.realData };
  }

  get busquedaFamilia() {
    const familia = this.familiaSeleccionada?.toLowerCase().trim() || '';
    if (!this.texto && familia === 'todas') {
      return this.family;
    }
    else if (!this.texto && familia != 'todas') {
      return this.family.filter(item =>
        item.familia.toLowerCase().includes(familia)
      );
    }
    else {
      const termino = this.texto.toLowerCase().trim();
      return this.family.filter(item =>
        item.nombreGenero.find(i => i.toLowerCase().includes(termino))
      );
    }
  }

  borrarFiltros() {
    this.texto = '';
    this.familiaSeleccionada = '';
    this.nombreComerciales = '';
    this.selectedGenderIds = '';
    const checkboxes = document.querySelectorAll('input[type="radio"]');
    for (let i = 0; i < checkboxes.length; i++) {
      let checkbox = checkboxes[i] as HTMLInputElement;
      checkbox.checked = false;
    }
    this.seleccionados = 0;
    // Gráfico principal 
    switch (this.vistaSeleccionada) {
      case 'mes':
        this.data = {
          labels: ['Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio'],
          datasets: [
            {
              label: 'Necesidad comercial',
              data: [0, 0, 0, 0, 0, 0, 0],
              borderColor: '#4f46e5', // Color indigo para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            },
            {
              label: 'Producción cultivo',
              data: [0, 0, 0, 0],
              borderColor: '#10b981', // Color emerald para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y1'
            }
          ]
        };
        break;
      case 'semana':
        this.data = {
          labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5'],
          datasets: [
            {
              label: 'Necesidad comercial',
              data: [0, 0, 0, 0, 0],
              borderColor: '#4f46e5', // Color indigo para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            },
            {
              label: 'Producción cultivo',
              data: [0, 0, 0, 0, 0],
              borderColor: '#10b981', // Color emerald para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y1'
            }
          ]
        };
        break;
      case 'año':
        this.data = {
          labels: ['Septiembre', 'Octubre', 'Noviembre', 'Diciembre', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto'],
          datasets: [
            {
              label: 'Necesidad comercial',
              data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              borderColor: '#4f46e5', // Color indigo para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            },
            {
              label: 'Producción cultivo',
              data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              borderColor: '#10b981', // Color emerald para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y1'
            }
          ]
        };
    }
  }

  contarSeleccionados() {//Para contar los géneros seleccionados
    this.selectedGenderIds = '';
    this.seleccionados = 0;
    const checkboxes = document.querySelectorAll('input[type="radio"]');
    for (let i = 0; i < checkboxes.length; i++) {
      const checkbox = checkboxes[i] as HTMLInputElement;

      if (checkbox.checked) {
        this.seleccionados++;
        this.selectedGenderIds = checkbox.value;
      }
    }

    // Configuración inicial de gráficos
    this.initializeCharts();
  }

  actualizarGrafica(vista: string) {

    let genero: string;
    this.selectedProductions = [];
    const checkboxes = document.querySelectorAll('input[type="radio"]');
    for (let i = 0; i < checkboxes.length; i++) {
      const checkbox = checkboxes[i] as HTMLInputElement;

      if (checkbox.checked) {
        genero = checkbox.value;
      }
    }

    const generosSeleccionados = this.comNeeds.filter(item => item.nombreGenero == genero);//Obtenemos las necesidades con el nombre de género especificado

    if (generosSeleccionados[0]) {
      this.cultive = this.cultive.filter(item => item.idGenero == generosSeleccionados[0].idGenero);

      for (let i = 0; i < this.cultive.length; i++) {
        if (this.cultiveProductions.filter(item => item.cultiveId == this.cultive[i].id && !this.selectedProductions.some(p => p.cultiveId === item.cultiveId))) {
          this.selectedProductions = this.selectedProductions.concat(
            this.cultiveProductions.filter(item => item.cultiveId == this.cultive[i].id)
          );
        }
      }
    }

    let planning: ComercialPlanning[] = [];
    let planningDetails: ComercialPlanningDetailsWithId[] = [];
    for (let i = 0; i < generosSeleccionados.length; i++) {
      const encontrado = this.planning.find(item => item.idCommercialNeed == generosSeleccionados[i].id);
      if (encontrado) {
        planning.push(encontrado);
      }
    }

    for (let i = 0; i < planning.length; i++) {
      if (this.planingDetails.find(item => item.idCommercialNeedsPlanning == planning[i].id)) {
        const encontrado = this.planingDetails.filter(item => item.idCommercialNeedsPlanning == planning[i].id);
        for (let j = 0; j < encontrado.length; j++) {
          planningDetails.push(encontrado[j]);
        }
      }
    }

    //Para saber los nombres de fincas de las producciones
    let production: string[] = [];
    for (let i = 0; i < this.cultive.length; i++) {
      production[i] = this.cultive[i].nombreFinca;
    }

    switch (vista) {
      case 'mes':
        this.vistaSeleccionada = 'mes';
        const d = new Date();//Para saber el mes en el que estamos

        let mesActual = d.getMonth();

        let meses: number[] = [];
        for (let i = mesActual - 2; i < (mesActual + 4); i++) {//Rellenamos el label
          meses.push(i + 1);
        }

        let kgsProduction: number[] = new Array(meses.length).fill(0);
        for (let i = 0; i < this.selectedProductions.length; i++) {//para ir sumando los kg de cada semana de la producción
          //Necesitamos saber en que mes entra la planificación de la necesidad
          const mes = new Date(this.selectedProductions[i].fechaInicio);

          for (let j = 0; j < meses.length; j++) {
            if (mes.getMonth() + 1 == meses[j]) {
              //Saber los clientes que estan en la semana de la necesidad
              kgsProduction[j] = (kgsProduction[j] || 0) + parseFloat(this.selectedProductions[i].kilosAjustados);//Si los kilos estan vacios lo ponemos a 0.
            }
          }
        }

        let kgs: number[] = new Array(meses.length).fill(0);
        let clientes: string[] = new Array(meses.length);
        let repetidos: { mes: number, cliente: string }[] = [];
        for (let i = 0; i < planningDetails.length; i++) {//para ir sumando los kg de cada semana
          //Necesitamos saber en que mes entra la planificación de la necesidad
          const mes = new Date(planningDetails[i].fechaDesde);

          for (let j = 0; j < meses.length; j++) {
            if (mes.getMonth() + 1 == meses[j]) {
              //Saber los clientes que estan en la semana de la necesidad
              const id = this.planning.find(item => item.id == planningDetails[i].idCommercialNeedsPlanning);
              const client = this.comNeeds.find(item => item.id == id?.idCommercialNeed);
              if (!repetidos.find(item => item.mes == j && item.cliente == client?.clientName)) {
                clientes[j] = (clientes[j] || '') + client?.clientName + '-';
                repetidos.push({ mes: j, cliente: client?.clientName ?? '' });
              }
              kgs[j] = (kgs[j] || 0) + (planningDetails[i].kilos ?? 0);//Si los kilos estan vacios lo ponemos a 0.
            }
          }
        }

        let label: string[] = [];
        for (let i = 0; i < meses.length; i++) {
          switch (meses[i]) {
            case 1:
              label.push('Enero');
              break;
            case 2:
              label.push('Febrero');
              break;
            case 3:
              label.push('Marzo');
              break;
            case 4:
              label.push('Abril');
              break;
            case 5:
              label.push('Mayo');
              break;
            case 6:
              label.push('Junio');
              break;
            case 7:
              label.push('Julio');
              break;
            case 8:
              label.push('Agosto');
              break;
            case 9:
              label.push('Septiembre');
              break;
            case 10:
              label.push('Octubre');
              break;
            case 11:
              label.push('Noviembre');
              break;
            case 12:
              label.push('Diciembre');
          }
        }

        // Gráfico principal     
        this.data = {
          labels: label,
          datasets: [
            {
              label: 'Necesidad comercial',
              data: label.map((_, i) => kgs[i] ?? null),
              borderColor: '#4f46e5', // Color indigo para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            },
            {
              label: 'Producción cultivo',
              data: kgsProduction,
              borderColor: '#10b981', // Color emerald para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            }
          ]
        };

        // Actualizar los datos para los gráficos individuales
        this.commercialData = {
          labels: label,
          datasets: [
            {
              label: 'Necesidad comercial',
              data: label.map((_, i) => kgs[i] ?? null),
              borderColor: '#4f46e5',
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            }
          ]
        };

        this.productionData = {
          labels: label,
          datasets: [
            {
              label: 'Producción cultivo',
              data: kgsProduction,
              borderColor: '#10b981',
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            }
          ]
        };

        this.options = {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              ticks: {
                color: '#64748b'
              },
              grid: {
                drawOnChartArea: true,
                color: '#e2e8f0'
              },
              beginAtZero: true,  // Asegura que el eje Y comience en 0
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              ticks: {
                color: '#64748b'
              },
              grid: {
                drawOnChartArea: false
              },
              beginAtZero: true,  // Asegura que el eje Y secundario también comience en 0
            },
            x: {
              type: 'category',
              grid: {
                display: false
              },
              ticks: {
                color: '#64748b',
                autoSkip: false,          // Asegurar que se muestren todas las etiquetas
                maxRotation: 0            // Evitar rotación de etiquetas
              },
              offset: true,               // Mejor distribución de puntos
              distribution: 'series',     // Distribución uniforme de etiquetas
              bounds: 'ticks'             // Asegurar que el rango completo se muestre
            }
          },
          plugins: {
            legend: {
              labels: {
                color: '#334155'         // Color de las etiquetas en la leyenda
              }
            },
            tooltip: {
              enabled: true,  // Habilitar tooltips
              mode: 'nearest', // Mostrar tooltip sobre el punto más cercano
              intersect: false, // Para mostrar tooltips cuando el cursor esté sobre cualquier punto
              callbacks: {
                // Personalización de las etiquetas del tooltip
                label: function (tooltipItem: any) {
                  const dataValue = tooltipItem.raw;
                  const index = tooltipItem.dataIndex;
                  const datasetIndex = tooltipItem.datasetIndex;

                  let tipoDato = datasetIndex === 0 ? 'Necesidades Comerciales' : 'Producción';
                  let cliente = datasetIndex === 0 ? clientes[index] : production[index];

                  if (dataValue === 0) {
                    return `${tipoDato} : Sin datos`;
                  }

                  return `${tipoDato} - ${cliente}: ${dataValue} kg`;
                }
              }
            },
            layout: {
              padding: {
                left: 10,
                right: 10
              }
            }
          }
        };
        break;
      case 'semana':
        this.vistaSeleccionada = 'semana';
        const s = new Date();

        // Para el primer día (dos semanas antes del primer día del mes)
        let primerDia = new Date(s.getFullYear(), s.getMonth(), s.getDate());
        primerDia.setDate(primerDia.getDate() - 14); // Resta 14 días (2 semanas)
        primerDia = new Date(primerDia);

        // Para el último día (dos semanas después del último día del mes)
        let ultimoDia = new Date(s.getFullYear(), s.getMonth(), s.getDate());
        ultimoDia.setDate(ultimoDia.getDate() + 21); // Suma 21 días (3 semanas)
        ultimoDia = new Date(ultimoDia);

        let label2: number[] = [];
        let semanas: string[] = []//Para guardar las semanas

        for (let i = new Date(primerDia); i < ultimoDia; i.setDate(i.getDate() + 1)) {
          if (i.getDay() == 0) {
            const primerDiaAno = new Date(i.getFullYear(), 0, 1);
            const diaSemana1EneroGrande = primerDiaAno.getDay();
            let semana = Math.floor((i.getTime() - primerDiaAno.getTime()) / (1000 * 60 * 60 * 24));
            semana = Math.ceil((semana + diaSemana1EneroGrande) / 7);
            label2.push(semana);
          }
          else if (i.getDate() == ultimoDia.getDate() && i.getMonth() == ultimoDia.getMonth() && i.getFullYear() == ultimoDia.getFullYear() && i.getDay() != 0) {
            const primerDiaAno = new Date(i.getFullYear(), 0, 1);
            const diaSemana1EneroGrande = primerDiaAno.getDay();
            let semana = Math.ceil((i.getTime() - primerDiaAno.getTime()) / (1000 * 60 * 60 * 24));
            semana = Math.ceil((semana + diaSemana1EneroGrande) / 7);
            label2.push(semana);
          }
        }



        let kgs2: number[] = new Array(label2.length).fill(0);
        let kgsProduction3: number[] = new Array(label2.length).fill(0);
        let clientes2: string[] = new Array(label2.length);
        let repetidos2: { mes: number, cliente: string }[] = [];

        for (let i = 0; i < this.selectedProductions.length; i++) {
          let dia2 = new Date(this.selectedProductions[i].fechaInicio);
          //Necesitamos saber en que semana entra la planificación de la necesidad
          const primerDiaAno = new Date(dia2.getFullYear(), 0, 1);
          const diaSemana1EneroGrande = primerDiaAno.getDay(); // 0 = domingo, 1 = lunes, etc.
          let semana = Math.floor((dia2.getTime() - primerDiaAno.getTime()) / (1000 * 60 * 60 * 24));

          semana = Math.ceil((semana + diaSemana1EneroGrande) / 7);

          for (let j = 0; j < label2.length; j++) {
            if (semana == label2[j]) {
              kgsProduction3[j] = (kgsProduction3[j] || 0) + parseFloat(this.selectedProductions[i].kilosAjustados);//Si los kilos estan vacios lo ponemos a 0.
            }
          }
        }

        for (let i = 0; i < planningDetails.length; i++) {//para ir sumando los kg de cada semana
          let dia = new Date(planningDetails[i].fechaDesde);

          //Necesitamos saber en que semana entra la planificación de la necesidad
          const primerDiaAno = new Date(dia.getFullYear(), 0, 1);
          const diaSemana1EneroGrande = primerDiaAno.getDay(); // 0 = domingo, 1 = lunes, etc.
          let semana = Math.floor((dia.getTime() - primerDiaAno.getTime()) / (1000 * 60 * 60 * 24));

          semana = Math.ceil((semana + diaSemana1EneroGrande) / 7);

          for (let j = 0; j < label2.length; j++) {
            if (semana == label2[j]) {
              //Saber los clientes que estan en la semana de la necesidad
              const id = this.planning.find(item => item.id == planningDetails[i].idCommercialNeedsPlanning);

              const client = this.comNeeds.find(item => item.id == id?.idCommercialNeed);
              if (!repetidos2.find(item => item.mes == j && item.cliente == client?.clientName)) {
                clientes2[j] = (clientes2[j] || '') + client?.clientName + '-';
                repetidos2.push({ mes: j, cliente: client?.clientName ?? '' });
              }
              kgs2[j] = (kgs2[j] || 0) + (planningDetails[i].kilos ?? 0);//Si los kilos estan vacios lo ponemos a 0.
              console.log(planningDetails[i].id);
            }
          }
        }

        for (let i = 0; i < label2.length; i++) {
          semanas.push('Semana ' + (i + 1));
        }

        console.log(kgsProduction3);

        // Gráfico principal     
        this.data = {
          labels: semanas,
          datasets: [
            {
              label: 'Necesidad comercial',
              data: semanas.map((_, i) => kgs2[i] ?? null),
              borderColor: '#4f46e5', // Color indigo para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            },
            {
              label: 'Producción cultivo',
              data: kgsProduction3,
              borderColor: '#10b981', // Color emerald para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            }
          ]
        };

        // Actualizar los datos para los gráficos individuales
        this.commercialData = {
          labels: semanas,
          datasets: [
            {
              label: 'Necesidad comercial',
              data: semanas.map((_, i) => kgs2[i] ?? null),
              borderColor: '#4f46e5',
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            }
          ]
        };

        this.productionData = {
          labels: semanas,
          datasets: [
            {
              label: 'Producción cultivo',
              data: kgsProduction3,
              borderColor: '#10b981',
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            }
          ]
        };

        this.options = {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              ticks: {
                color: '#64748b'
              },
              grid: {
                drawOnChartArea: true,
                color: '#e2e8f0'
              },
              beginAtZero: true,  // Asegura que el eje Y comience en 0
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              ticks: {
                color: '#64748b'
              },
              grid: {
                drawOnChartArea: false
              },
              beginAtZero: true,  // Asegura que el eje Y secundario también comience en 0
            },
            x: {
              type: 'category',
              grid: {
                display: false
              },
              ticks: {
                color: '#64748b',
                autoSkip: false,          // Asegurar que se muestren todas las etiquetas
                maxRotation: 0            // Evitar rotación de etiquetas
              },
              offset: true,               // Mejor distribución de puntos
              distribution: 'series',     // Distribución uniforme de etiquetas
              bounds: 'ticks'             // Asegurar que el rango completo se muestre
            }
          },
          plugins: {
            legend: {
              labels: {
                color: '#334155'         // Color de las etiquetas en la leyenda
              }
            },
            tooltip: {
              enabled: true,  // Habilitar tooltips
              mode: 'nearest', // Mostrar tooltip sobre el punto más cercano
              intersect: false, // Para mostrar tooltips cuando el cursor esté sobre cualquier punto
              callbacks: {
                // Personalización de las etiquetas del tooltip
                label: function (tooltipItem: any) {
                  const dataValue = tooltipItem.raw;
                  const index = tooltipItem.dataIndex;
                  const datasetIndex = tooltipItem.datasetIndex;

                  let tipoDato = datasetIndex === 0 ? 'Necesidades Comerciales' : 'Producción';
                  let cliente = datasetIndex === 0 ? clientes2[index] : production[0];

                  if (dataValue === 0) {
                    return `${tipoDato} : Sin datos`;
                  }

                  return `${tipoDato} - ${cliente}: ${dataValue} kg`;
                }
              }
            },
            layout: {
              padding: {
                left: 10,
                right: 10
              }
            }
          }
        };
        break;
      case 'año':
        this.vistaSeleccionada = 'año';
        let meses2: number[] = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];
        let kgsProduction2: number[] = new Array(meses2.length).fill(0);

        let kgs3: number[] = new Array(meses2.length).fill(0);
        let clientes3: string[] = new Array(meses2.length);
        let repetidos3: { mes: number, cliente: string }[] = [];

        for (let i = 0; i < this.selectedProductions.length; i++) {
          const mes = new Date(this.selectedProductions[i].fechaInicio);

          for (let j = 0; j < meses2.length; j++) {
            if (mes.getMonth() + 1 == meses2[j]) {
              //Saber los clientes que estan en la semana de la necesidad
              kgsProduction2[j] = (kgsProduction2[j] || 0) + parseFloat(this.selectedProductions[i].kilosAjustados);//Si los kilos estan vacios lo ponemos a 0.
            }
          }
        }

        for (let i = 0; i < planningDetails.length; i++) {//para ir sumando los kg de cada semana
          //Necesitamos saber en que mes entra la planificación de la necesidad
          const mes = new Date(planningDetails[i].fechaDesde);

          for (let j = 0; j < meses2.length; j++) {
            if (mes.getMonth() + 1 == meses2[j]) {
              //Saber los clientes que estan en la semana de la necesidad
              const id = this.planning.find(item => item.id == planningDetails[i].idCommercialNeedsPlanning);
              const client = this.comNeeds.find(item => item.id == id?.idCommercialNeed);
              if (!repetidos3.find(item => item.mes == j && item.cliente == client?.clientName)) {
                clientes3[j] = (clientes3[j] || '') + client?.clientName + '-';
                repetidos3.push({ mes: j, cliente: client?.clientName ?? '' });
              }
              kgs3[j] = (kgs3[j] || 0) + (planningDetails[i].kilos ?? 0);//Si los kilos estan vacios lo ponemos a 0.
            }
          }
        }

        let label3: string[] = [];
        for (let i = 0; i < meses2.length; i++) {
          switch (meses2[i]) {
            case 1:
              label3.push('Enero');
              break;
            case 2:
              label3.push('Febrero');
              break;
            case 3:
              label3.push('Marzo');
              break;
            case 4:
              label3.push('Abril');
              break;
            case 5:
              label3.push('Mayo');
              break;
            case 6:
              label3.push('Junio');
              break;
            case 7:
              label3.push('Julio');
              break;
            case 8:
              label3.push('Agosto');
              break;
            case 9:
              label3.push('Septiembre');
              break;
            case 10:
              label3.push('Octubre');
              break;
            case 11:
              label3.push('Noviembre');
              break;
            case 12:
              label3.push('Diciembre');
          }
        }

        // Gráfico principal     
        this.data = {
          labels: label3,
          datasets: [
            {
              label: 'Necesidad comercial',
              data: meses2.map((_, i) => kgs3[i] ?? null),
              borderColor: '#4f46e5', // Color indigo para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            },
            {
              label: 'Producción cultivo',
              data: kgsProduction2,
              borderColor: '#10b981', // Color emerald para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            }
          ]
        };

        // Actualizar los datos para los gráficos individuales
        this.commercialData = {
          labels: label3,
          datasets: [
            {
              label: 'Necesidad comercial',
              data: meses2.map((_, i) => kgs3[i] ?? null),
              borderColor: '#4f46e5',
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            }
          ]
        };

        this.productionData = {
          labels: label3,
          datasets: [
            {
              label: 'Producción cultivo',
              data: kgsProduction2,
              borderColor: '#10b981',
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            }
          ]
        };

        this.options = {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              ticks: {
                color: '#64748b'
              },
              grid: {
                drawOnChartArea: true,
                color: '#e2e8f0'
              },
              beginAtZero: true,  // Asegura que el eje Y comience en 0
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              ticks: {
                color: '#64748b'
              },
              grid: {
                drawOnChartArea: false
              },
              beginAtZero: true,  // Asegura que el eje Y secundario también comience en 0
            },
            x: {
              type: 'category',
              grid: {
                display: false
              },
              ticks: {
                color: '#64748b',
                autoSkip: false,          // Asegurar que se muestren todas las etiquetas
                maxRotation: 0            // Evitar rotación de etiquetas
              },
              offset: true,               // Mejor distribución de puntos
              distribution: 'series',     // Distribución uniforme de etiquetas
              bounds: 'ticks'             // Asegurar que el rango completo se muestre
            }
          },
          plugins: {
            legend: {
              labels: {
                color: '#334155'         // Color de las etiquetas en la leyenda
              }
            },
            tooltip: {
              enabled: true,  // Habilitar tooltips
              mode: 'nearest', // Mostrar tooltip sobre el punto más cercano
              intersect: false, // Para mostrar tooltips cuando el cursor esté sobre cualquier punto
              callbacks: {
                // Personalización de las etiquetas del tooltip
                label: function (tooltipItem: any) {
                  const dataValue = tooltipItem.raw;
                  const index = tooltipItem.dataIndex;
                  const datasetIndex = tooltipItem.datasetIndex;

                  let tipoDato = datasetIndex === 0 ? 'Necesidades Comerciales' : 'Producción';
                  let cliente = datasetIndex === 0 ? clientes3[index] : production[0];

                  if (dataValue === 0) {
                    return `${tipoDato} : Sin datos`;
                  }

                  return `${tipoDato} - ${cliente}: ${dataValue} kg`;
                }
              }
            },
            layout: {
              padding: {
                left: 10,
                right: 10
              }
            }
          }
        };
    }
  }

  getInfoPanelData() {
    let infoData = {
      title: '',
      item1: { label: '', value: '' },
      item2: { label: '', value: '' },
      item3: { label: '', value: '' },
      item4: { label: '', value: '' }
    };
    let genero: string;
    const checkboxes = document.querySelectorAll('input[type="radio"]');
    for (let i = 0; i < checkboxes.length; i++) {
      const checkbox = checkboxes[i] as HTMLInputElement;

      if (checkbox.checked) {
        genero = checkbox.value;
      }
    }
    let cultivo: Cultive[] = [];
    const generosSeleccionados = this.comNeeds.filter(item => item.nombreGenero == genero);//Obtenemos las necesidades con el nombre de género especificado

    if (generosSeleccionados[0]) {

      cultivo = this.cultive.filter(item => item.idGenero == generosSeleccionados[0].idGenero);


    }

    // Según el tipo de gráfica seleccionada, mostramos información relevante
    switch (this.chartType) {
      case 'commercial':
        infoData.title = 'Información de Necesidades Comerciales';
        infoData.item1 = {
          label: 'Géneros seleccionados',
          value: this.selectedGenderIds || 'Sin género'
        };
        infoData.item2 = {
          label: 'Necesidades seleccionadas',
          value: this.nombreComerciales || 'No existen necesidades comerciales para el género seleccionado'
        };
        infoData.item3 = {
          label: 'Total KGs (Comercial)',
          value: this.getTotalKgs().toLocaleString()
        };
        infoData.item4 = {
          label: 'Total registros',
          value: this.filteredComNeeds ? this.filteredComNeeds.length.toString() : '0'
        };
        break;

      case 'production':
        // Calcular la suma total de kilos ajustados de la producción
        let totalKgsProduccion = 0;
        if (this.selectedProductions && this.selectedProductions.length > 0) {
          totalKgsProduccion = this.selectedProductions.reduce((sum, item) => {
            return sum + (parseFloat(item.kilosAjustados) || 0);
          }, 0);
        }

        infoData.title = 'Información de Producción';
        infoData.item1 = {
          label: 'Géneros seleccionados',
          value: this.selectedGenderIds || 'Sin género'
        };
        // Obtener nombres de fincas únicas de los cultivos seleccionados
        let fincasUnicas = new Set<string>();
        cultivo.forEach(c => {
          if (c.nombreFinca) fincasUnicas.add(c.nombreFinca);
        });
        infoData.item2 = {
          label: 'Fincas de producción',
          value: fincasUnicas.size > 0 ? Array.from(fincasUnicas).join(', ') : 'Sin datos de fincas'
        };
        infoData.item3 = {
          label: 'Total KGs (Producción)',
          value: totalKgsProduccion.toLocaleString()
        };
        infoData.item4 = {
          label: 'Total producciones',
          value: this.selectedProductions ? this.selectedProductions.length.toString() : '0'
        };
        break;

      case 'combined':
      default:
        // Calcular la suma total de kilos ajustados de la producción
        let totalKgsProduccionCombined = 0;
        if (this.selectedProductions && this.selectedProductions.length > 0) {
          totalKgsProduccionCombined = this.selectedProductions.reduce((sum, item) => {
            return sum + (parseFloat(item.kilosAjustados) || 0);
          }, 0);
        }

        // Calcular el balance entre producción y necesidades
        const balance = totalKgsProduccionCombined - this.getTotalKgs();
        const balanceFormatted = balance >= 0
          ? `+${balance.toLocaleString()}`
          : balance.toLocaleString();

        infoData.title = 'Información de Filtros';
        infoData.item1 = {
          label: 'Géneros seleccionados',
          value: this.selectedGenderIds || 'Sin género'
        };
        infoData.item2 = {
          label: 'Necesidades seleccionadas',
          value: this.nombreComerciales || 'No existen necesidades comerciales para el género seleccionado'
        };
        infoData.item3 = {
          label: 'Total KGs',
          value: this.getTotalKgs().toLocaleString()
        };
        infoData.item4 = {
          label: 'Balance (Prod. - Nec.)',
          value: balanceFormatted
        };
        break;
    }

    return infoData;
  }
  exportToPdf(): void {
    if (this.isExporting) {
      console.log('Ya se está exportando un PDF, por favor espere...');
      return;
    }
  
    this.isExporting = true;
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
  
      // --- Diseño de cabecera personalizada ---
      const drawHeader = () => {
        // Fondo verde
        var docWidth = doc.internal.pageSize.getWidth();
        var headerHeight = 30; // Altura del header en mm
        doc.setFillColor(67, 160, 34);
        doc.rect(0, 0, docWidth, headerHeight, 'F');
        var logoWidth = 20;
        var logoHeight = 20;
  
        var logoX = margin;
        var logoY = 4;
  
        // Placeholder para el logo (simplificado)
        const logoData = 'PLACEHOLDER_LOGO';
  
        // Primero dibujamos un círculo/rectángulo blanco como fondo del logo
        var padding = 3; // Tamaño del borde blanco alrededor del logo
        doc.setFillColor(255, 255, 255); // Color blanco
        doc.roundedRect(logoX - padding, logoY - padding,
          logoWidth + (padding * 2), logoHeight + (padding * 2),
          2, 2, 'F');
  
        // Ahora agregamos el logo como texto (placeholder)
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(67, 160, 34);
        doc.setFontSize(10);
        doc.text("LOGO", logoX + 5, logoY + 12);
  
        // Texto - Nota que hemos aumentado la posición X para dejar espacio después del logo
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('Analytics Dashboard', margin + logoWidth + 15, 15); // Ajustado el espacio
  
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(
          `Informe generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`,
          margin + logoWidth + 15, // Mismo ajuste que el título
          22
        );
      };
  
      // --- Diseño de pie de página ---
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
        doc.text('© 2025 · Ecoinver Dashboard', margin, pageHeight - 7);
  
        // Timestamp en la esquina derecha
        doc.text(
          `Generado: ${new Date().toLocaleTimeString()}`,
          pageWidth - margin,
          pageHeight - 7,
          { align: 'right' }
        );
      };
  
      // Dibujar la cabecera en la primera página
      drawHeader();
  
      // Posición inicial para el contenido después de la cabecera
      let yPos = 40;
  
      // --- SECCIÓN 1: RESUMEN DE DATOS ---
      // Cuadro resumen con los principales indicadores
      doc.setFillColor(245, 247, 250);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(margin, yPos, contentWidth, 40, 3, 3, 'FD'); // Aumentado la altura para incluir datos de producción
  
      // Título de la sección
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(79, 70, 229);
      doc.text('RESUMEN DE DATOS', margin + 5, yPos + 7);
  
      // Dividir el espacio para los indicadores
      const boxWidth = contentWidth / 4;
  
      // Corregir familia seleccionada para asegurar que muestre un valor
      const familiaSeleccionadaText = this.familiaSeleccionada ? this.familiaSeleccionada : 'Todas';
  
      // Indicador 1: Familia seleccionada
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Familia seleccionada:', margin + 5, yPos + 15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text(familiaSeleccionadaText, margin + 5, yPos + 22);
  
      // Determinar el género seleccionado basado en el ID o usar "Todos" si no hay selección
      const generoSeleccionado = this.selectedGenderIds ?
        (this.genders.find(g => g.nombreGenero === this.selectedGenderIds)?.nombreGenero || this.selectedGenderIds) :
        'Todos';
  
      // Indicador 2: Géneros seleccionados
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Géneros seleccionados:', margin + boxWidth, yPos + 15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text(generoSeleccionado, margin + boxWidth, yPos + 22);
  
      // Indicador 3: Total KGs Necesidades
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Total KGs (Necesidades):', margin + boxWidth * 2, yPos + 15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text(this.getTotalKgs().toLocaleString(), margin + boxWidth * 2, yPos + 22);
  
      // Indicador 4: Total registros
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Total registros:', margin + boxWidth * 3, yPos + 15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text((this.filteredComNeeds ? this.filteredComNeeds.length : 0).toString(), margin + boxWidth * 3, yPos + 22);
  
      // NUEVOS INDICADORES DE PRODUCCIÓN (segunda fila)
      // Indicador 5: Total Producciones
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Total Producciones:', margin + 5, yPos + 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text((this.selectedProductions ? this.selectedProductions.length : 0).toString(), margin + 5, yPos + 37);
  
      // Indicador 6: Total KGs Producción
      // Calcular la suma de kilos ajustados de producción
      let totalKgsProduccion = 0;
      if (this.selectedProductions && this.selectedProductions.length > 0) {
        totalKgsProduccion = this.selectedProductions.reduce((sum, item) => {
          return sum + (parseFloat(item.kilosAjustados) || 0);
        }, 0);
      }
  
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Total KGs (Producción):', margin + boxWidth, yPos + 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text(totalKgsProduccion.toLocaleString(), margin + boxWidth, yPos + 37);
  
      // Indicador 7: Vista seleccionada
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Vista seleccionada:', margin + boxWidth * 2, yPos + 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text(this.vistaSeleccionada.toUpperCase(), margin + boxWidth * 2, yPos + 37);
  
      // Indicador 8: Balance (Producción - Necesidades)
      const balance = totalKgsProduccion - this.getTotalKgs();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Balance (Prod. - Nec.):', margin + boxWidth * 3, yPos + 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
  
      // Color verde para balance positivo, rojo para negativo
      if (balance >= 0) {
        doc.setTextColor(16, 185, 129); // Verde
        doc.text("+" + balance.toLocaleString(), margin + boxWidth * 3, yPos + 37);
      } else {
        doc.setTextColor(239, 68, 68); // Rojo
        doc.text(balance.toLocaleString(), margin + boxWidth * 3, yPos + 37);
      }
  
      yPos += 50; // Aumentado para dar espacio al resumen ampliado
  
      // --- SECCIÓN 2: TABLAS DE DATOS ---
      // Definir el color principal para las tablas
      const colorPrincipal = [79, 70, 229]; // Color principal (indigo)
  
      // Mostrar tablas según el tipo de gráfica seleccionado
      if (this.chartType === 'commercial' || this.chartType === 'combined') {
        // --- TABLA 1: RANKING DE CLIENTES COMERCIALES ---
        // Comprobar si hay un género seleccionado
        if (self.selectedGenderIds) {
          // Título de la sección
          doc.setFillColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
          doc.rect(margin, yPos, contentWidth, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.text('RANKING DE CLIENTES COMERCIALES', margin + 5, yPos + 5.5);
          
          // Subtítulo con el género seleccionado
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
          doc.text(`Género: ${self.selectedGenderIds}`, margin + contentWidth - 100, yPos + 5.5);
          
          yPos += 12;
          
          // Filtrar solo los comerciales del género seleccionado
          const comercialesGeneroSeleccionado = self.filteredComNeeds.filter(
            item => item.nombreGenero === self.selectedGenderIds
          );
          
          if (comercialesGeneroSeleccionado.length > 0) {
            // Calcular el total de KGs para el género seleccionado
            const totalKgsGenero = comercialesGeneroSeleccionado.reduce(
              (sum, item) => sum + (item.kgs || 0), 0
            );
            
            // Diseño de la tabla de ranking
            const rankHeaders = ["Puesto", "Código Cliente", "KGs", "% del Género", "Nombre Comercial"];
            
            // Preparar datos con porcentajes y ordenar por demanda (descendente)
            const rankData = comercialesGeneroSeleccionado.map(item => {
              const porcentaje = totalKgsGenero > 0 
                ? ((item.kgs || 0) / totalKgsGenero * 100).toFixed(2) + '%' 
                : '0%';
                
              return [
                "", // Puesto (se rellena después de ordenar)
                item.clientCode?.toString() || '-',
                item.kgs?.toString() || '0',
                porcentaje,
                item.clientName || '-'
              ];
            });
            
            // Ordenar por KGs (descendente)
            rankData.sort((a, b) => {
              const kgsA = parseFloat(a[2]);
              const kgsB = parseFloat(b[2]);
              return kgsB - kgsA;
            });
            
            // Asignar puesto en el ranking
            rankData.forEach((row, index) => {
              row[0] = (index + 1).toString();
            });
            
            // Anchos de columna optimizados para ranking
            const rankColWidths = [
              Math.round(contentWidth * 0.10), // 10% para Puesto
              Math.round(contentWidth * 0.15), // 15% para Código Cliente
              Math.round(contentWidth * 0.15), // 15% para KGs
              Math.round(contentWidth * 0.15), // 15% para % del Género
              Math.round(contentWidth * 0.45)  // 45% para Nombre Comercial
            ];
            
            const rowHeight = 10;
            
            // Estilo para la fila de encabezados
            doc.setFillColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
            doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            
            // Dibujar encabezados
            let xPos = margin;
            rankHeaders.forEach((header, i) => {
              doc.text(header, xPos + 3, yPos + 6.5);
              xPos += rankColWidths[i];
            });
            
            // Dibujar filas de datos
            yPos += rowHeight;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            
            rankData.forEach((row, rowIndex) => {
              // Destacar visualmente los tres primeros puestos
              if (rowIndex < 3) {
                // Solo colorear el fondo de la primera columna (puesto)
                if (rowIndex === 0) {
                  doc.setFillColor(255, 215, 0); // Oro para el 1er puesto
                } else if (rowIndex === 1) {
                  doc.setFillColor(192, 192, 192); // Plata para el 2do puesto
                } else {
                  doc.setFillColor(205, 127, 50); // Bronce para el 3er puesto
                }
                doc.rect(margin, yPos, rankColWidths[0], rowHeight, 'F');
                
                // Fondo alternado para el resto de la fila
                doc.setFillColor(240, 242, 251);
                doc.rect(margin + rankColWidths[0], yPos, contentWidth - rankColWidths[0], rowHeight, 'F');
              } else if (rowIndex % 2 === 0) {
                // Alternar color de fondo para el resto de filas
                doc.setFillColor(240, 242, 251);
                doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
              }
              
              // Texto de la fila
              xPos = margin;
              
              row.forEach((cell, colIndex) => {
                const text = String(cell);
                
                // Dar más énfasis al puesto en el ranking
                if (colIndex === 0) {
                  doc.setFont('helvetica', 'bold');
                  if (rowIndex < 3) {
                    doc.setTextColor(50, 50, 50); // Color oscuro para los tres primeros puestos
                  } else {
                    doc.setTextColor(100, 100, 100); // Color gris para el resto
                  }
                } else if (colIndex === 3) {
                  // Destacar el porcentaje
                  const pct = parseFloat(text);
                  if (pct > 30) {
                    doc.setTextColor(16, 185, 129); // Verde para porcentajes altos
                  } else if (pct > 15) {
                    doc.setTextColor(79, 70, 229);  // Indigo para porcentajes medios
                  } else {
                    doc.setTextColor(100, 100, 100); // Gris para porcentajes bajos
                  }
                  doc.setFont('helvetica', 'normal');
                } else {
                  doc.setFont('helvetica', 'normal');
                  doc.setTextColor(70, 70, 70);
                }
                
                doc.text(text, xPos + 3, yPos + 6.5);
                xPos += rankColWidths[colIndex];
              });
              
              yPos += rowHeight;
              
              // Comprobar si necesitamos una nueva página
              if (yPos > pageHeight - 25) {
                doc.addPage();
                currentPage++;
                drawHeader();
                yPos = 40;
                
                // Repetir encabezados en la nueva página
                doc.setFillColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
                doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                
                xPos = margin;
                rankHeaders.forEach((header, i) => {
                  doc.text(header, xPos + 3, yPos + 6.5);
                  xPos += rankColWidths[i];
                });
                
                yPos += rowHeight;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
              }
            });
            
            // Añadir espacio después de la tabla de ranking
            yPos += 15;
          } else {
            // Mensaje si no hay datos para el género seleccionado
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'italic');
            doc.text(`No hay datos de clientes comerciales para el género ${self.selectedGenderIds}.`, margin + 5, yPos + 10);
            yPos += 20;
          }
        } else {
          // Mensaje si no hay género seleccionado
          doc.setTextColor(100, 100, 100);
          doc.setFont('helvetica', 'italic');
          doc.text('No hay un género seleccionado. Seleccione un género para ver el ranking de clientes.', margin + 5, yPos + 10);
          yPos += 20;
        }
      }
  
      // Tabla de producción de cultivos (mostrar solo si la vista es producción o combinada)
      if (this.chartType === 'production' || this.chartType === 'combined') {
        // Comprobar si necesitamos una nueva página para la tabla de producción
        if (yPos > pageHeight - 70) {
          doc.addPage();
          currentPage++;
          drawHeader();
          yPos = 40;
        }
  
        // Título de la sección de producción
        doc.setFillColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
        doc.rect(margin, yPos, 70, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('PRODUCCIÓN DE CULTIVOS', margin + 5, yPos + 5.5);
  
        // Subtítulo con el género si está disponible
        if (self.selectedGenderIds) {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
          doc.text(`Género: ${self.selectedGenderIds}`, margin + contentWidth - 100, yPos + 5.5);
        }
  
        yPos += 12;
  
        if (self.selectedProductions && self.selectedProductions.length > 0) {
          // Diseño de la tabla
          const produccionHeaders = ["ID Cultivo", "Finca", "Fecha Inicio", "Fecha Fin", "KGs Ajustados"];
  
          // Procesar datos de producción
          const produccionData = self.selectedProductions.map(item => {
            // Buscar el nombre de la finca asociada al cultivo
            const cultivoInfo = self.cultive.find(c => c.id === item.cultiveId);
            const nombreFinca = cultivoInfo ? cultivoInfo.nombreFinca : '-';
  
            // Formatear fechas
            const fechaInicio = item.fechaInicio ? new Date(item.fechaInicio).toLocaleDateString() : '-';
            const fechaFin = item.fechaFin ? new Date(item.fechaFin).toLocaleDateString() : '-';
  
            return [
              item.cultiveId?.toString() || '-',
              nombreFinca,
              fechaInicio,
              fechaFin,
              item.kilosAjustados?.toString() || '0'
            ];
          });
  
          // Anchos de columna para tabla de producción
          const produccionColWidths = [
            Math.round(contentWidth * 0.15), // 15% para ID Cultivo
            Math.round(contentWidth * 0.30), // 30% para Finca
            Math.round(contentWidth * 0.20), // 20% para Fecha Inicio
            Math.round(contentWidth * 0.20), // 20% para Fecha Fin
            Math.round(contentWidth * 0.15)  // 15% para KGs Ajustados
          ];
  
          const rowHeight = 10; // Altura de fila
  
          // Estilo para la fila de encabezados
          doc.setFillColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
          doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
  
          // Dibujar encabezados de producción
          let xPos = margin;
          produccionHeaders.forEach((header, i) => {
            doc.text(header, xPos + 3, yPos + 6.5);
            xPos += produccionColWidths[i];
          });
  
          // Dibujar filas de datos de producción
          yPos += rowHeight;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
  
          produccionData.forEach((row, rowIndex) => {
            // Alternar color de fondo para las filas
            if (rowIndex % 2 === 0) {
              doc.setFillColor(240, 242, 251);
              doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
            }
  
            // Texto de la fila
            doc.setTextColor(70, 70, 70);
            xPos = margin;
  
            // Procesar todas las columnas
            row.forEach((cell, colIndex) => {
              const text = String(cell);
              doc.text(text, xPos + 3, yPos + 6.5);
              xPos += produccionColWidths[colIndex];
            });
  
            yPos += rowHeight;
  
            // Comprobar si necesitamos una nueva página
            if (yPos > pageHeight - 25) {
              doc.addPage();
              currentPage++;
              drawHeader();
              yPos = 40;
  
              // Repetir encabezados en la nueva página
              doc.setFillColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
              doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
              doc.setTextColor(255, 255, 255);
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(9);
  
              xPos = margin;
              produccionHeaders.forEach((header, i) => {
                doc.text(header, xPos + 3, yPos + 6.5);
                xPos += produccionColWidths[i];
              });
  
              yPos += rowHeight;
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(8);
            }
          });
        } else {
          // Mensaje si no hay datos de producción
          doc.setTextColor(100, 100, 100);
          doc.setFont('helvetica', 'italic');
          doc.text('No hay datos disponibles de producción de cultivos con los filtros actuales.', margin + 5, yPos + 10);
          yPos += 20;
        }
      }
  
      // --- SECCIÓN 3: GRÁFICA (AL FINAL DEL PDF) ---
      // Agregar nueva página dedicada a la gráfica para aprovechar todo el espacio
      doc.addPage();
      currentPage++;
      drawHeader();
      yPos = 40;
  
      // Título de sección para la gráfica
      doc.setFillColor(colorPrincipal[0], colorPrincipal[1], colorPrincipal[2]);
      doc.rect(margin, yPos, contentWidth, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      
      // Ajustar el título según el tipo de gráfica seleccionado
      let tipoGrafica = '';
      switch(this.chartType) {
        case 'commercial':
          tipoGrafica = 'COMERCIAL';
          break;
        case 'production':
          tipoGrafica = 'PRODUCCIÓN';
          break;
        case 'combined':
          tipoGrafica = 'COMBINADA';
          break;
        default:
          tipoGrafica = '';
      }
      
      doc.text(`VISUALIZACIÓN GRÁFICA ${tipoGrafica} - ${this.vistaSeleccionada.toUpperCase()}`, pageWidth / 2, yPos + 6.5, { align: 'center' });
  
      yPos += 15;
  
      // Crear un contenedor más amplio para la gráfica que aproveche todo el ancho
      const graphHeight = 120; // Altura aumentada para mejor visualización
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPos, contentWidth, graphHeight, 'S');
  
      // Determinar qué canvas capturar según el tipo de gráfica
      let chartSelector = '';
      switch(this.chartType) {
        case 'commercial':
          chartSelector = '.commercial-chart canvas';
          break;
        case 'production':
          chartSelector = '.production-chart canvas';
          break;
        case 'combined':
        default:
          chartSelector = '.w-full.h-60.sm\\:h-72.md\\:h-80 > canvas';
      }
  
      // Capturar e insertar la gráfica apropiada
      const chartCanvas = document.querySelector(chartSelector) as HTMLCanvasElement;
      const chartContainer = document.querySelector('.w-full.h-60.sm\\:h-72.md\\:h-80') as HTMLElement;
  
      if (chartCanvas || chartContainer) {
        // Si tenemos acceso al canvas directamente
        if (chartCanvas) {
          try {
            const imgData = chartCanvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', margin + 2, yPos + 2, contentWidth - 4, graphHeight - 4);
  
            finalizarPDF();
          } catch (e) {
            console.error('Error al capturar el canvas de la gráfica:', e);
            // Usar html2canvas como alternativa
            capturarGraficaConHtml2Canvas();
          }
        } else if (chartContainer) {
          // Usar html2canvas si solo tenemos el contenedor
          capturarGraficaConHtml2Canvas();
        }
      } else {
        // No se encontró ninguna gráfica
        doc.text('No se pudo encontrar la gráfica para incluir en el informe.', margin + 5, yPos + graphHeight / 2);
        finalizarPDF();
      }
  
      // Función para capturar la gráfica con html2canvas
      function capturarGraficaConHtml2Canvas() {
        // Mensaje de estado mientras se procesa
        doc.text('Procesando gráfica...', margin + 5, yPos + graphHeight / 2);
  
        // Intentar capturar la gráfica
        html2canvas(chartContainer, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          onclone: (documentClone) => {
            // Reemplazar cualquier color oklch que cause problemas
            const elements = documentClone.querySelectorAll('*');
            elements.forEach(el => {
              try {
                const htmlEl = el as HTMLElement;
                const style = window.getComputedStyle(htmlEl);
  
                // Propiedades que podrían usar
                  // Propiedades que podrían usar oklch
              ['color', 'backgroundColor', 'borderColor'].forEach(prop => {
                const value = style[prop as keyof CSSStyleDeclaration];
                if (typeof value === 'string' && value.includes('oklch')) {
                  if (prop === 'color') htmlEl.style.color = '#333333';
                  if (prop === 'backgroundColor') htmlEl.style.backgroundColor = '#ffffff';
                  if (prop === 'borderColor') htmlEl.style.borderColor = '#cccccc';
                }
              });
            } catch (e) {
              console.log('Error: ' + e);
            }
          });
          return documentClone;
        }
      }).then(canvas => {
        // Añadir la imagen capturada al PDF
        const imgData = canvas.toDataURL('image/png');

        // Limpiar el mensaje de "Procesando..."
        doc.setFillColor(255, 255, 255);
        doc.rect(margin + 5, yPos + graphHeight / 2 - 5, 100, 10, 'F');

        // Añadir la imagen aprovechando todo el espacio disponible
        doc.addImage(imgData, 'PNG', margin + 2, yPos + 2, contentWidth - 4, graphHeight - 4);

        finalizarPDF();
      }).catch(e => {
        console.error('Error al capturar la gráfica con html2canvas:', e);
        doc.text('No se pudo incluir la gráfica debido a un error técnico.', margin + 5, yPos + graphHeight / 2);
        finalizarPDF();
      });
    }

    // Función para finalizar el PDF
    function finalizarPDF() {
      // --- Finalizar PDF con pies de página ---
      const totalPages = doc.internal.pages.length - 1;

      // Añadir pie de página a todas las páginas
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(i, totalPages);
      }

      // Mostrar la vista previa
      self.showPdfPreview(doc);
    }
  } catch (error) {
    console.error('Error al generar el PDF:', error);
    alert('No se pudo generar el PDF. Por favor, inténtelo de nuevo.');
  }
  finally {
    this.isExporting = false;
  }
}

// Método para mostrar la vista previa del PDF
showPdfPreview(pdfDoc: jsPDF): void {
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
    pdfDoc.save('analytics-dashboard.pdf');
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