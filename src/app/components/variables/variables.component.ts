import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import Chart from "chart.js/auto";

// Se actualiza la interfaz Variable para incluir el tipo de duración y los detalles de la incidencia
interface Variable {
  id: string;
  name: string;
  impact: number; // Porcentaje de reducción en producción (0-100)
  duration: "lifetime" | "week" | "day"; // Tipo de duración
  incidentDate?: string; // Si es de tipo "day"
  incidentWeek?: number; // Si es de tipo "week"
}

interface Crop {
  id: number;
  name: string;
  baseProduction: number;
  variables: Variable[];
  currentProduction: number;
}

@Component({
  selector: "app-variables",
  templateUrl: "./variables.component.html",
  styleUrls: ["./variables.component.scss"],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class VariablesComponent implements OnInit, AfterViewInit {
  // Datos de cultivos
  crops: Crop[] = [
    {
      id: 1,
      name: "Maíz",
      baseProduction: 100,
      variables: [],
      currentProduction: 100,
    },
    {
      id: 2,
      name: "Trigo",
      baseProduction: 80,
      variables: [],
      currentProduction: 80,
    },
    {
      id: 3,
      name: "Soja",
      baseProduction: 60,
      variables: [],
      currentProduction: 60,
    },
    {
      id: 4,
      name: "Arroz",
      baseProduction: 90,
      variables: [],
      currentProduction: 90,
    },
  ];

  // Estado del componente
  selectedCrop: Crop | null = null;
  activeTab = "variables";
  variableName = "";
  impact = 10;
  // Nueva propiedad para seleccionar el tipo de duración
  duration: "lifetime" | "week" | "day" = "lifetime";
  // Propiedades para guardar el detalle de la incidencia
  selectedDate: string = "";
  selectedWeek: number | null = null;
  
  chart: Chart | null = null;

  @ViewChild("productionChart") chartCanvas!: ElementRef<HTMLCanvasElement>;

  constructor() {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (this.selectedCrop) {
      this.createChart();
    }
  }

  // Métodos para gestionar cultivos
  selectCrop(crop: Crop): void {
    this.selectedCrop = crop;
    if (this.chart) {
      this.chart.destroy();
    }
    setTimeout(() => {
      this.createChart();
    }, 0);
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    if (tab === "production" && this.selectedCrop) {
      setTimeout(() => {
        if (this.chart) {
          this.chart.destroy();
        }
        this.createChart();
      }, 0);
    }
  }

  // Métodos para gestionar variables
  addVariable(): void {
    if (!this.variableName.trim() || !this.selectedCrop) return;

    // Crear la nueva variable incluyendo la duración y su detalle (día o semana)
    const newVariable: Variable = {
      id: this.generateId(),
      name: this.variableName.trim(),
      impact: this.impact,
      duration: this.duration,
      incidentDate: this.duration === "day" ? this.selectedDate : undefined,
      incidentWeek: this.duration === "week" ? this.selectedWeek ?? undefined : undefined,
    };

    // Encontrar el cultivo seleccionado y actualizar sus variables
    const cropIndex = this.crops.findIndex((c) => c.id === this.selectedCrop!.id);
    if (cropIndex !== -1) {
      // Añadir la nueva variable
      const updatedVariables = [...this.crops[cropIndex].variables, newVariable];

      // Calcular la nueva producción basada en todas las variables
      const productionMultiplier = updatedVariables.reduce(
        (total, v) => total * (1 - v.impact / 100),
        1
      );
      const newProduction = Math.round(this.crops[cropIndex].baseProduction * productionMultiplier);

      // Actualizar el cultivo
      this.crops[cropIndex] = {
        ...this.crops[cropIndex],
        variables: updatedVariables,
        currentProduction: newProduction,
      };

      // Actualizar el cultivo seleccionado
      this.selectedCrop = this.crops[cropIndex];

      // Resetear el formulario
      this.resetForm();

      // Actualizar el gráfico si está visible
      if (this.activeTab === "production") {
        setTimeout(() => {
          if (this.chart) {
            this.chart.destroy();
          }
          this.createChart();
        }, 0);
      }
    }
  }

  removeVariable(variableId: string): void {
    if (!this.selectedCrop) return;

    const cropIndex = this.crops.findIndex((c) => c.id === this.selectedCrop!.id);
    if (cropIndex !== -1) {
      // Filtrar la variable a eliminar
      const updatedVariables = this.crops[cropIndex].variables.filter((v) => v.id !== variableId);

      // Recalcular la producción
      const productionMultiplier = updatedVariables.length
        ? updatedVariables.reduce((total, v) => total * (1 - v.impact / 100), 1)
        : 1;
      const newProduction = Math.round(this.crops[cropIndex].baseProduction * productionMultiplier);

      // Actualizar el cultivo
      this.crops[cropIndex] = {
        ...this.crops[cropIndex],
        variables: updatedVariables,
        currentProduction: newProduction,
      };

      // Actualizar el cultivo seleccionado
      this.selectedCrop = this.crops[cropIndex];

      // Actualizar el gráfico si está visible
      if (this.activeTab === "production") {
        setTimeout(() => {
          if (this.chart) {
            this.chart.destroy();
          }
          this.createChart();
        }, 0);
      }
    }
  }

  // Métodos para el gráfico
  createChart(): void {
    if (!this.selectedCrop || !this.chartCanvas) return;

    const ctx = this.chartCanvas.nativeElement.getContext("2d");
    if (!ctx) return;

    // Calcular impactos de variables
    const variableImpacts = this.selectedCrop.variables.map((variable) => {
      const impact = (variable.impact / 100) * this.selectedCrop!.baseProduction;
      return {
        name: variable.name,
        impact: Math.round(impact),
      };
    });

    // Crear etiquetas y datos para el gráfico
    const labels = ["Producción Base", ...variableImpacts.map((v) => v.name), "Producción Final"];
    const data = [
      this.selectedCrop.baseProduction,
      ...variableImpacts.map((v) => -v.impact),
      this.selectedCrop.currentProduction,
    ];

    // Crear colores de fondo
    const backgroundColor = [
      "rgba(59, 130, 246, 0.8)", // Azul para producción base
      ...variableImpacts.map(() => "rgba(239, 68, 68, 0.8)"), // Rojo para reducciones
      "rgba(16, 185, 129, 0.8)", // Verde para producción final
    ];

    this.chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Unidades de Producción",
            data: data,
            backgroundColor: backgroundColor,
            borderColor: backgroundColor.map((color) => color.replace("0.8", "1")),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: this.selectedCrop.baseProduction * 1.1,
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return value < 0 ? `${Math.abs(value)} unidades reducción` : `${value} unidades`;
              },
            },
          },
        },
      },
    });
  }

  // Métodos auxiliares
  private resetForm(): void {
    this.variableName = "";
    this.impact = 10;
    this.duration = "lifetime";
    this.selectedDate = "";
    this.selectedWeek = null;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  // Método para calcular el resumen de impactos
  getVariableImpacts(): { name: string; impact: number }[] {
    if (!this.selectedCrop) return [];

    return this.selectedCrop.variables.map((variable) => {
      const impact = (variable.impact / 100) * this.selectedCrop!.baseProduction;
      return {
        name: variable.name,
        impact: Math.round(impact),
      };
    });
  }
}
