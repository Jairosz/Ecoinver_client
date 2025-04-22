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


import { ComercialPlanningDetailsService, ComercialPlanningDetailsWithId } from '../../services/ComercialPlanningDetails.service';
import { LoadingService } from '../../services/Loading.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ChartModule, FormsModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {

  constructor(private comercialServicio: ComercialServiceService, private generoServicio: GenderService, private planingComercial: ComercialPlanningService, private plannigSemanas: ComercialPlanningDetailsService, private loadingService: LoadingService
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
  nombreComerciales: string = '';
  // Array de objetos comercial
  comNeeds: Comercial[] = [];
  planning: ComercialPlanning[] = [];
  planingDetails: ComercialPlanningDetailsWithId[] = [];
  // Propiedades adicionales para el nuevo diseño
  // Arrays para manejar los filtros de géneros y necesidades
  genders: any[] = [];
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

    this.actualizarGrafica(this.vistaSeleccionada);
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

    const generosSeleccionados = this.comNeeds.filter(item => item.nombreGenero == genero);//Obtenemos las necesidades con el nombre de género especificado

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
    let clientes: string[] = new Array(meses.length);
    let repetidos: { mes: number, cliente: string }[] = [];
    for (let i = 0; i < planningDetails.length; i++) {//para ir sumando los kg de cada semana

      //Necesitamos saber en que mes entra la planificación de la necesidad
      const mes = new Date(planningDetails[i].fechaDesde);


      for (let j = 0; j < meses.length; j++) {
        if (mes.getMonth() + 1 == meses[j]) {
          //Saber los clientes que estan en la semana de la necesidad
          const id = this.planning.find(item => item.id == planningDetails[i].idCommercialNeedsPlanning);
          const client = this.comNeeds.find(item => item.id == id?.idCommercialNeed)
          if (!repetidos.find(item => item.mes == j && item.cliente == client?.clientName)) {
            clientes[j] = (clientes[j] || '') + client?.clientName + '-';
            repetidos.push({ mes: j, cliente: client?.clientName ?? '' })
          }
          kgs[j] = (kgs[j] || 0) + planningDetails[i].kilos;//Si los kilos estan vacios lo ponemos a 0.

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

    // Gráfico principal     
    this.data = {
      labels: label,
      datasets: [
        {
          label: 'Dataset 1',
          data: label.map((_, i) => kgs[i] ?? null),
          borderColor: '#4f46e5', // Color indigo para Tailwind           
          tension: 0.4,
          spanGaps: true,
          yAxisID: 'y'
        },
        {
          label: 'Dataset 2',
          data: kgs,
          borderColor: '#10b981', // Color emerald para Tailwind           
          tension: 0.4,
          spanGaps: true,
          yAxisID: 'y1'
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
              // tooltipItem tiene acceso a todos los datos del punto seleccionado

              let dataValue = tooltipItem.raw;  // Valor del punto
              // Accede al índice del punto de datos seleccionado
              let index = tooltipItem.dataIndex;

              // Accede al cliente correspondiente usando el índice
              let cliente = clientes[index];  // Asumiendo que 'clientes' es un array con los nombres de los clientes

              if (dataValue == 0) {
                cliente = 'Sin datos';
                return `${cliente}`;
              }

              // Crear un mensaje personalizado con los datos
              return `${cliente} - Kilos: ${dataValue}`;
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

  // Actualizar datos filtrados basados en selecciones


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

    // Actualizar también opciones de otros gráficos
    //this.teoricaOptions.plugins.legend.labels.font = { size: isMobile ? 12 : 14 };
    //this.realOptions.plugins.legend.labels.font = { size: isMobile ? 12 : 14 };

    // Forzar actualización de las gráficas
    this.data = { ...this.data };
    this.combinedData = { ...this.combinedData };
    this.teoricaData = { ...this.teoricaData };
    this.realData = { ...this.realData };
  }
  get busquedaFamilia() {
    const familia = this.familiaSeleccionada.toLowerCase().trim();
    if (!this.texto && familia === 'todas') {
      return this.family;
    }
    if (!this.texto && familia != 'todas') {
      return this.family.filter(item =>
        item.familia.toLowerCase().includes(familia)
      );
    }
    const termino = this.texto.toLowerCase();

    return this.family.filter(item =>
      item.familia.toLowerCase().includes(termino) ||
      item.nombreGenero.some(nombre => nombre.toLowerCase().includes(termino))
    );

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
    const checkboxes = document.querySelectorAll('input[type="radio"]');
    for (let i = 0; i < checkboxes.length; i++) {
      const checkbox = checkboxes[i] as HTMLInputElement;

      if (checkbox.checked) {
        genero = checkbox.value;

      }
    }

    const generosSeleccionados = this.comNeeds.filter(item => item.nombreGenero == genero);//Obtenemos las necesidades con el nombre de género especificado


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
    switch (vista) {
      case 'mes':
        this.vistaSeleccionada = 'mes';
        const d = new Date();//Para saber el mes en el que estamos


        let mesActual = d.getMonth();


        let meses: number[] = [];
        for (let i = mesActual - 2; i < (mesActual + 4); i++) {//Rellenamos el label
          meses.push(i + 1);

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
              const client = this.comNeeds.find(item => item.id == id?.idCommercialNeed)
              if (!repetidos.find(item => item.mes == j && item.cliente == client?.clientName)) {
                clientes[j] = (clientes[j] || '') + client?.clientName + '-';
                repetidos.push({ mes: j, cliente: client?.clientName ?? '' })
              }
              kgs[j] = (kgs[j] || 0) + planningDetails[i].kilos;//Si los kilos estan vacios lo ponemos a 0.

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

        // Configuraciones para gráficos de barra optimizada
        const barOptions = {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                // Cambiar stepSize por maxTicksLimit para mejor rendimiento
                maxTicksLimit: 8,
                precision: 0,
                color: '#64748b',
                font: {
                  size: window.innerWidth < 768 ? 9 : 12
                }
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
                // Permitir saltar etiquetas en móviles
                autoSkip: window.innerWidth < 768,
                maxRotation: window.innerWidth < 768 ? 45 : 0,
                maxTicksLimit: window.innerWidth < 768 ? 6 : 12,
                font: {
                  size: window.innerWidth < 768 ? 9 : 12
                }
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
                  weight: '500',
                  size: window.innerWidth < 768 ? 10 : 12
                }
              }
            }
          }
        };

        // Gráfico principal     
        this.data = {
          labels: label,
          datasets: [
            {
              label: 'Dataset 1',
              data: label.map((_, i) => kgs[i] ?? null),
              borderColor: '#4f46e5', // Color indigo para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            },
            {
              label: 'Dataset 2',
              data: kgs,
              borderColor: '#10b981', // Color emerald para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y1'
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
                  // tooltipItem tiene acceso a todos los datos del punto seleccionado

                  let dataValue = tooltipItem.raw;  // Valor del punto
                  // Accede al índice del punto de datos seleccionado
                  let index = tooltipItem.dataIndex;

                  // Accede al cliente correspondiente usando el índice
                  let cliente = clientes[index];  // Asumiendo que 'clientes' es un array con los nombres de los clientes

                  if (cliente == undefined) {
                    return 'Sin datos';
                  }

                  // Crear un mensaje personalizado con los datos
                  return `Semana: ${cliente} - Kilos: ${dataValue}`;
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
        ultimoDia.setDate(ultimoDia.getDate() + 21); // Suma 14 días (2 semanas)
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
        console.log(label2);

        let kgs2: number[] = new Array(label2.length).fill(0);

        let clientes2: string[] = new Array(label2.length);
        let repetidos2: { mes: number, cliente: string }[] = [];
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

              const client = this.comNeeds.find(item => item.id == id?.idCommercialNeed)
              if (!repetidos2.find(item => item.mes == j && item.cliente == client?.clientName)) {
                clientes2[j] = (clientes2[j] || '') + client?.clientName + '-';
                repetidos2.push({ mes: j, cliente: client?.clientName ?? '' })
              }
              kgs2[j] = (kgs2[j] || 0) + planningDetails[i].kilos;//Si los kilos estan vacios lo ponemos a 0.
              console.log(planningDetails[i].id);
            }
          }
        }

        for (let i = 0; i < label2.length; i++) {
          semanas.push('Semana ' + (i + 1));

        }

        // Configuraciones para gráficos de barra     
        const barOptions2 = {
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

        // Gráfico principal     
        this.data = {
          labels: semanas,
          datasets: [
            {
              label: 'Dataset 1',
              data: semanas.map((_, i) => kgs2[i] ?? null),
              borderColor: '#4f46e5', // Color indigo para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            },
            {
              label: 'Dataset 2',
              data: kgs2,
              borderColor: '#10b981', // Color emerald para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y1'
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
                  // tooltipItem tiene acceso a todos los datos del punto seleccionado

                  let dataValue = tooltipItem.raw;  // Valor del punto
                  // Accede al índice del punto de datos seleccionado
                  let index = tooltipItem.dataIndex;

                  // Accede al cliente correspondiente usando el índice
                  let cliente = clientes2[index];  // Asumiendo que 'clientes' es un array con los nombres de los clientes

                  if (cliente == undefined) {
                    return 'Sin datos';
                  }

                  // Crear un mensaje personalizado con los datos
                  return `Semana: ${cliente} - Kilos: ${dataValue}`;
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


        let kgs3: number[] = new Array(meses2.length).fill(0);
        let clientes3: string[] = new Array(meses2.length);
        let repetidos3: { mes: number, cliente: string }[] = [];
        for (let i = 0; i < planningDetails.length; i++) {//para ir sumando los kg de cada semana

          //Necesitamos saber en que mes entra la planificación de la necesidad
          const mes = new Date(planningDetails[i].fechaDesde);


          for (let j = 0; j < meses2.length; j++) {
            if (mes.getMonth() + 1 == meses2[j]) {
              //Saber los clientes que estan en la semana de la necesidad
              const id = this.planning.find(item => item.id == planningDetails[i].idCommercialNeedsPlanning);
              const client = this.comNeeds.find(item => item.id == id?.idCommercialNeed)
              if (!repetidos3.find(item => item.mes == j && item.cliente == client?.clientName)) {
                clientes3[j] = (clientes3[j] || '') + client?.clientName + '-';
                repetidos3.push({ mes: j, cliente: client?.clientName ?? '' })
              }
              kgs3[j] = (kgs3[j] || 0) + planningDetails[i].kilos;//Si los kilos estan vacios lo ponemos a 0.

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
              label: 'Dataset 1',
              data: meses2.map((_, i) => kgs3[i] ?? null),
              borderColor: '#4f46e5', // Color indigo para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y'
            },
            {
              label: 'Dataset 2',
              data: kgs3,
              borderColor: '#10b981', // Color emerald para Tailwind           
              tension: 0.4,
              spanGaps: true,
              yAxisID: 'y1'
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
                  // tooltipItem tiene acceso a todos los datos del punto seleccionado

                  let dataValue = tooltipItem.raw;  // Valor del punto
                  // Accede al índice del punto de datos seleccionado
                  let index = tooltipItem.dataIndex;

                  // Accede al cliente correspondiente usando el índice
                  let cliente = clientes3[index];  // Asumiendo que 'clientes' es un array con los nombres de los clientes

                  if (cliente == undefined) {
                    return `Sin datos`;

                  }


                  // Crear un mensaje personalizado con los datos
                  return `Semana: ${cliente} - Kilos: ${dataValue}`;
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
  exportToPdf(): void {
    this.loadingService.show('Generando PDF profesional...');
  
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
        // Obtener dimensiones del documento
        var docWidth = doc.internal.pageSize.getWidth();
        var headerHeight = 30; // Altura del header en mm
        doc.setFillColor(67, 160, 34);
        doc.rect(0, 0, docWidth, headerHeight, 'F');
        var logoWidth = 20;
        var logoHeight = 20;
        var logoMargin = 5;
        var logoX = docWidth - logoWidth - logoMargin;
        var logoY = 4;
        // Línea decorativa blanca
      
        doc.line(margin, 28, pageWidth - margin, 28);
        const logoData='data:image/png;base64,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';
        // Extraer sólo el Base64 (sin prefijo)
        var docWidth = doc.internal.pageSize.getWidth();

        // Calculamos la posición X para colocar el logo a la derecha
        // Restamos el ancho del logo (20) y un pequeño margen derecho (por ejemplo, 10)
        var logoX = docWidth - 20 - 10;
        // Primero dibujamos un círculo/rectángulo blanco como fondo del logo
        var padding = 3; // Tamaño del borde blanco alrededor del logo
        doc.setFillColor(255, 255, 255); // Color blanco
        doc.roundedRect(logoX - padding, logoY - padding,
          logoWidth + (padding * 2), logoHeight + (padding * 2),
          2, 2, 'F');

        // Ahora agregamos el logo encima del fondo blanco
        doc.addImage(logoData, 'PNG', logoX, logoY, logoWidth, logoHeight);
        doc.addImage(logoData, 'PNG', logoX, 4, 20, 20);

        // Texto
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('Analytics Dashboard', margin + 25, 15);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(
          `Informe generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`,
          margin + 25,
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
  
      // --- Sección de Resumen ---
      // Cuadro resumen con los principales indicadores
      doc.setFillColor(245, 247, 250);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(margin, yPos, contentWidth, 28, 3, 3, 'FD');
  
      // Título de la sección
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(79, 70, 229);
      doc.text('RESUMEN DE DATOS', margin + 5, yPos + 7);
  
      // Dividir el espacio para los indicadores
      const boxWidth = contentWidth / 4;
  
      // Indicador 1: Familia seleccionada
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Familia seleccionada:', margin + 5, yPos + 15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text(this.familiaSeleccionada || 'Todas', margin + 5, yPos + 22);
  
      // Indicador 2: Géneros seleccionados
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Géneros seleccionados:', margin + boxWidth, yPos + 15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text(this.selectedGenderIds || 'Todos', margin + boxWidth, yPos + 22);
  
      // Indicador 3: Total KGs
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Total KGs:', margin + boxWidth * 2, yPos + 15);
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
  
      yPos += 40;
  
      // --- Sección de Gráfica ---
      // Intentar capturar la gráfica primero
      const chartContainer = document.querySelector('.w-full.h-60.sm\\:h-72.md\\:h-80') as HTMLElement;
      const chartCanvas = document.querySelector('.w-full.h-60.sm\\:h-72.md\\:h-80 > canvas') as HTMLCanvasElement;
  
      if (chartCanvas || chartContainer) {
        // Título de la sección
        doc.setFillColor(79, 70, 229);
        doc.rect(margin, yPos, 40, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('GRÁFICA', margin + 5, yPos + 5.5);
  
        // Subtítulo
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(79, 70, 229);
        doc.text('Evolución General', margin + 45, yPos + 5.5);
  
        yPos += 12;
  
        // Crear un contenedor para la gráfica
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.5);
        doc.rect(margin, yPos, contentWidth, 75, 'S');
  
        // Si tenemos acceso al canvas directamente
        if (chartCanvas) {
          try {
            const imgData = chartCanvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', margin + 2, yPos + 2, contentWidth - 4, 71);
            yPos += 80;
  
            // Continuar con la tabla de datos
            insertarTabla();
          } catch (e) {
            console.error('Error al capturar el canvas de la gráfica:', e);
            // Usar html2canvas como alternativa
            capturarGraficaConHtml2Canvas();
          }
        } else if (chartContainer) {
          // Usar html2canvas si solo tenemos el contenedor
          capturarGraficaConHtml2Canvas();
        } else {
          // No se encontró ninguna gráfica, continuar con la tabla
          yPos += 5;
          doc.text('No se pudo encontrar la gráfica para incluir en el informe.', margin + 5, yPos);
          yPos += 10;
          insertarTabla();
        }
      } else {
        // No hay gráfica, mostrar mensaje y pasar a los datos
        doc.text('No se encontró ninguna gráfica para incluir en el informe.', margin, yPos);
        yPos += 10;
        insertarTabla();
      }
  
      // Función para capturar la gráfica con html2canvas
      function capturarGraficaConHtml2Canvas() {
        // Mensaje de estado mientras se procesa
        doc.text('Procesando gráfica...', margin + 5, yPos + 35);
  
        // Intentar capturar la gráfica
        html2canvas(chartContainer, {
          scale: 2,
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
  
                // Propiedades que podrían usar oklch
                ['color', 'backgroundColor', 'borderColor'].forEach(prop => {
                  const value = style[prop as keyof CSSStyleDeclaration];
                  if (typeof value === 'string' && value.includes('oklch')) {
                    if (prop === 'color') htmlEl.style.color = '#333333';
                    if (prop === 'backgroundColor') htmlEl.style.backgroundColor = '#ffffff';
                    if (prop === 'borderColor') htmlEl.style.borderColor = '#cccccc';
                  }
                });
              } catch (e) { }
            });
            return documentClone;
          }
        }).then(canvas => {
          // Añadir la imagen capturada al PDF
          const imgData = canvas.toDataURL('image/png');
  
          // Volver a la página donde estábamos
          doc.setPage(currentPage);
  
          // Eliminar mensaje de "Procesando..."
          doc.setFillColor(255, 255, 255);
          doc.rect(margin + 5, yPos + 30, 100, 10, 'F');
  
          // Añadir la imagen
          doc.addImage(imgData, 'PNG', margin + 2, yPos + 2, contentWidth - 4, 71);
          yPos += 80;
  
          // Continuar con la tabla
          insertarTabla();
        }).catch(e => {
          console.error('Error al capturar la gráfica con html2canvas:', e);
  
          // En caso de error, dejar mensaje y continuar
          doc.text('No se pudo incluir la gráfica debido a un error técnico.', margin + 5, yPos + 35);
          yPos += 80;
          insertarTabla();
        });
      }
  
      // Función para insertar la tabla de datos
      function insertarTabla() {
        // Comprobar si necesitamos una nueva página para la tabla
        if (yPos > pageHeight - 70) {
          doc.addPage();
          currentPage++;
          drawHeader();
          yPos = 40;
        }
  
        // Título de la sección
        doc.setFillColor(79, 70, 229);
        doc.rect(margin, yPos, 40, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('DATOS', margin + 5, yPos + 5.5);
  
        // Subtítulo
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(79, 70, 229);
        doc.text('Registros Filtrados', margin + 45, yPos + 5.5);
  
        yPos += 12;
  
        if (self.filteredComNeeds && self.filteredComNeeds.length > 0) {
          // Diseño de la tabla
          const headers = ["Género", "Código Cliente", "KGs", "Nombre Comercial"];
          const data = self.filteredComNeeds.map(item => [
            item.nombreGenero || '-',
            item.clientCode || '-',
            item.kgs?.toString() || '0',
            item.clientName || '-'
          ]);
  
          // Ajustar anchos de columna según el contenido
          const colWidths = [40, 40, 30, contentWidth - 110];
          const rowHeight = 8;
  
          // Estilo para la fila de encabezados
          doc.setFillColor(79, 70, 229);
          doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
  
          // Dibujar encabezados
          let xPos = margin;
          headers.forEach((header, i) => {
            doc.text(header, xPos + 3, yPos + 5.5);
            xPos += colWidths[i];
          });
  
          // Dibujar filas de datos
          yPos += rowHeight;
          doc.setFont('helvetica', 'normal');
  
          data.forEach((row, rowIndex) => {
            // Alternar color de fondo para las filas
            if (rowIndex % 2 === 0) {
              doc.setFillColor(240, 242, 251);
              doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
            }
  
            // Texto de la fila
            doc.setTextColor(70, 70, 70);
            xPos = margin;
  
            row.forEach((cell, colIndex) => {
              // Truncar texto largo
              let text = String(cell);
              if (colIndex === 3 && text.length > 50) {
                text = text.substring(0, 47) + '...';
              }
  
              doc.text(text, xPos + 3, yPos + 5.5);
              xPos += colWidths[colIndex];
            });
  
            yPos += rowHeight;
  
            // Comprobar si necesitamos una nueva página
            if (yPos > pageHeight - 25) {
              doc.addPage();
              currentPage++;
              drawHeader();
              yPos = 40;
  
              // Repetir encabezados en la nueva página
              doc.setFillColor(79, 70, 229);
              doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
              doc.setTextColor(255, 255, 255);
              doc.setFont('helvetica', 'bold');
  
              xPos = margin;
              headers.forEach((header, i) => {
                doc.text(header, xPos + 3, yPos + 5.5);
                xPos += colWidths[i];
              });
  
              yPos += rowHeight;
              doc.setFont('helvetica', 'normal');
            }
          });
        } else {
          // Mensaje si no hay datos
          doc.setTextColor(100, 100, 100);
          doc.setFont('helvetica', 'italic');
          doc.text('No hay datos disponibles con los filtros actuales.', margin + 5, yPos + 10);
          yPos += 20;
        }
  
        // --- Finalizar PDF con pies de página ---
        const totalPages = doc.internal.pages.length - 1;
  
        // Añadir pie de página a todas las páginas
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          drawFooter(i, totalPages);
        }
  
        // En lugar de guardar directamente, mostrar la vista previa
        self.showPdfPreview(doc);
        self.loadingService.hide();
      }
  
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      alert('No se pudo generar el PDF. Por favor, inténtelo de nuevo.');
      this.loadingService.hide();
    }
  }
 
 
  // 1. Añadir este método a la clase DashboardComponent para mostrar la vista previa
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
  modalHeader.style.backgroundColor = 'rgb(67, 160, 34)';
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
  downloadButton.style.backgroundColor = 'rgb(67, 160, 34)';
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