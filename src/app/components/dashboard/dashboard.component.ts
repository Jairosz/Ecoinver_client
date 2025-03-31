import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { NgModel } from '@angular/forms';
import { FormsModule } from '@angular/forms'; // <-- Importa FormsModule

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ChartModule, FormsModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  data: any;
  options: any;
  teoricaData: any;
realData: any;
  teoricaOptions: any;
realOptions: any;

//graficas superpuestas
showCombined = false;
combinedData: any;
combinedOptions: any;
//ejemplo de genero
selectedProduct: string = 'cereales';
  products = [
    { value: 'cereales', label: 'Cereales' },
    { value: 'hortalizas', label: 'Hortalizas' },
    { value: 'frutales', label: 'Frutales' },
    { value: 'leguminosas', label: 'Leguminosas' },
    { value: 'tuberculos', label: 'Tubérculos' }
  ];

onProductChange() {
  // Lógica para actualizar los datos según el producto seleccionado
  console.log('Producto seleccionado:', this.selectedProduct);
  // Aquí deberías implementar la actualización de los datos de los gráficos
}
  ngOnInit(): void {
    
    this.combinedOptions = {
      responsive: true,
      maintainAspectRatio: false,
      // Añadir estas configuraciones adicionales
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 20,
            font: {
              size: window.innerWidth < 768 ? 12 : 14
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            font: {
              size: window.innerWidth < 768 ? 10 : 12
            }
          }
        },
        x: {
          ticks: {
            font: {
              size: window.innerWidth < 768 ? 10 : 12
            }
          }
        }
      }
    };




    // Ejemplo de gráfico de líneas
    const barOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 20
          }
        }
      }
    };
    this.data = {
      labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
      datasets: [
        {
          label: 'Dataset 1',
          data: [65, 59, 80, 81, 56, 55, 40],
          borderColor: '#42A5F5',
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Dataset 2',
          data: [28, 48, 40, 19, 86, 27, 90],
          borderColor: '#FFA726',
          tension: 0.4,
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
            stepSize: 10
          },
          grid: {
            drawOnChartArea: true
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          ticks: {
            stepSize: 10
          },
          grid: {
            drawOnChartArea: false
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    };

    this.teoricaData = {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        {
          label: 'Teórica',
          data: [65, 59, 80, 81],
          backgroundColor: '#4F46E5'
        }
      ]
    };
  
    this.realData = {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        {
          label: 'Real',
          data: [28, 48, 40, 19],
          backgroundColor: '#10B981'
        }
      ]
    };
  
    this.teoricaOptions = { ...barOptions };
    this.realOptions = { ...barOptions };


    // Configuración de la gráfica combinada
    this.combinedData = {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        {
          label: 'Teórica',
          data: [65, 59, 80, 81],
          borderColor: '#4F46E5',
          tension: 0.4,
          fill: false,
          borderWidth: 2
        },
        {
          label: 'Real',
          data: [28, 48, 40, 19],
          borderColor: '#10B981',
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
            stepSize: 20
          },
          grid: {
            color: '#e5e7eb',
            drawOnChartArea: true
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#6b7280'
          }
        }
      }
    };
  }

  toggleView() {
    this.showCombined = !this.showCombined;
  }
  



  //graficas responsive:
  // Añadir en el componente
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
  this.data = {...this.data};
  this.combinedData = {...this.combinedData};
}
  
}