import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { faDroplet, faWind, faBug, faThermometerHalf } from "@fortawesome/free-solid-svg-icons";

interface AgriculturalVariable {
  id: number;
  name: string;
  type: string;
  value: number;
  unit: string;
  reductionFactor: number;
}

interface VariableType {
  value: string;
  label: string;
  icon: any;
}

@Component({
  selector: 'app-variables',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './variables.component.html',
  styleUrls: ['./variables.component.css']
})
export class VariablesComponent {
  // Definición de iconos de FontAwesome
  faDroplet = faDroplet;
  faWind = faWind;
  faBug = faBug;
  faThermometerHalf = faThermometerHalf;

  variables: AgriculturalVariable[] = [
    { id: 1, name: "Lluvia", type: "rain", value: 25, unit: "mm", reductionFactor: 10 },
    { id: 2, name: "Viento", type: "wind", value: 15, unit: "km/h", reductionFactor: 15 },
    { id: 3, name: "Virus X", type: "virus", value: 3, unit: "nivel", reductionFactor: 30 },
    { id: 4, name: "Temperatura", type: "temperature", value: 28, unit: "°C", reductionFactor: 5 },
  ];

  newVariable: AgriculturalVariable = {
    id: 0,
    name: "",
    type: "",
    value: 0,
    unit: "",
    reductionFactor: 0,
  };

  totalProduction = 100;
  effectiveProduction = 0;
  activeTab = "dashboard";

  variableTypes: VariableType[] = [
    { value: "rain", label: "Lluvia", icon: this.faDroplet },
    { value: "wind", label: "Viento", icon: this.faWind },
    { value: "virus", label: "Virus", icon: this.faBug },
    { value: "temperature", label: "Temperatura", icon: this.faThermometerHalf },
    // Puedes definir iconos para humedad y luz solar si lo deseas
    { value: "humidity", label: "Humedad", icon: null },
    { value: "sunlight", label: "Luz Solar", icon: null },
  ];

  constructor() { }

  ngOnInit(): void {
    this.calculateEffectiveProduction();
  }

  calculateEffectiveProduction(): void {
    // Calcula la producción efectiva en base a los factores de reducción
    const totalReduction = this.variables.reduce((acc, variable) => {
      return acc + variable.reductionFactor * (variable.value / 100);
    }, 0);

    // Limita la reducción a un máximo del 100%
    const cappedReduction = Math.min(totalReduction, 100);
    const effective = this.totalProduction * (1 - cappedReduction / 100);
    this.effectiveProduction = Math.max(0, effective);
  }

  // Retorna el icono según el tipo de variable
  getIconForType(type: string): any {
    const found = this.variableTypes.find((vt) => vt.value === type);
    return found && found.icon ? found.icon : this.faDroplet;
  }

  getReductionSeverity(factor: number): { color: string; label: string } {
    if (factor < 10) return { color: "bg-green-500", label: "Bajo" };
    if (factor < 25) return { color: "bg-yellow-500", label: "Moderado" };
    if (factor < 50) return { color: "bg-orange-500", label: "Alto" };
    return { color: "bg-red-500", label: "Severo" };
  }

  addVariable(): void {
    if (this.newVariable.name && this.newVariable.type && this.newVariable.unit) {
      const newId = Math.max(...this.variables.map((v) => v.id), 0) + 1;
      this.variables.push({
        ...this.newVariable,
        id: newId,
      });
      // Reinicia el formulario
      this.newVariable = {
        id: 0,
        name: "",
        type: "",
        value: 0,
        unit: "",
        reductionFactor: 0,
      };
      this.calculateEffectiveProduction();
    }
  }

  deleteVariable(id: number): void {
    this.variables = this.variables.filter((variable) => variable.id !== id);
    this.calculateEffectiveProduction();
  }

  updateValue(id: number, newValue: number): void {
    const index = this.variables.findIndex((v) => v.id === id);
    if (index !== -1) {
      this.variables[index].value = newValue;
      this.calculateEffectiveProduction();
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }
}
