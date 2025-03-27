import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ChartModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  data: any;
  options: any;

  ngOnInit(): void {
    // Ejemplo de gráfico de líneas
    this.data = {
      labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
      datasets: [
        {
          label: 'Dataset 1',
          data: [65, 59, 80, 81, 56, 55, 40],
          fill: false,
          backgroundColor: '#42A5F5',
          borderColor: '#1E88E5'
        },
        {
          label: 'Dataset 2',
          data: [28, 48, 40, 19, 86, 27, 90],
          fill: false,
          backgroundColor: '#9CCC65',
          borderColor: '#7CB342'
        }
      ]
    };

    this.options = {
      plugins: {
        legend: {
          labels: {
            color: '#333', // modo claro
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#333', // modo claro
          },
          grid: {
            color: 'rgba(0,0,0,0.1)'
          }
        },
        y: {
          ticks: {
            color: '#333'
          },
          grid: {
            color: 'rgba(0,0,0,0.1)'
          }
        }
      }
    };

  }
}