import { Component, OnInit, ViewEncapsulation } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

interface Zone {
  id: number;
  name: string;
  area: number;          // ahora en metros cuadrados
  availableArea: number; // en metros cuadrados
}

interface Technician {
  id: number;
  name: string;
  assignedArea: number;  // en metros cuadrados
  maxCapacity: number;   // capacidad en metros cuadrados
}

interface Square {
  id: number;
  zoneId: number | null;
  type: "current" | "needed";
}

@Component({
  selector: "app-crop-distribution-map",
  templateUrl: "./crop-distribution-map.component.html",
  styleUrls: ["./crop-distribution-map.component.css"],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class CropDistributionMapComponent implements OnInit {
  // Datos principales en m² (solo ejemplo)
  // Antes tenías 1000 hectáreas, ahora podrías usar 1,000 m² o la cantidad que necesites.
  // Ajusta estos valores a la realidad de tu caso.
  totalArea = 1000;       // metros cuadrados totales actuales
  commercialNeed = 1500;  // metros cuadrados necesarios para cubrir la demanda comercial

  zones: Zone[] = [
    // Ejemplo en metros cuadrados (antes eran hectáreas).
    { id: 1, name: "Zona Norte", area: 400, availableArea: 200 },
    { id: 2, name: "Zona Sur",   area: 350, availableArea: 150 },
    { id: 3, name: "Zona Este",  area: 250, availableArea: 100 },
  ];

  // Estado del componente
  selectedZone: number | null = null;
  selectedTechnician: number | null = null;
  areaToAssign = 0;
  squares: Square[] = [];
  squareSize = 24;
  zoneSquares: Record<number, number> = {};

  // Getters calculados
  get additionalAreaNeeded(): number {
    return this.commercialNeed - this.totalArea;
  }

  get percentComplete(): number {
    // Redondeamos el porcentaje actual con respecto a la necesidad comercial
    return Math.round((this.totalArea / this.commercialNeed) * 100);
  }

  get selectedZoneData(): Zone | null {
    return this.selectedZone
      ? this.zones.find((z) => z.id === this.selectedZone) || null
      : null;
  }

  constructor() {}

  ngOnInit(): void {
    this.calculateSquares();
  }

  // Métodos para el mapa
  calculateSquares(): void {
    // Cantidad total de "cuadritos" que queremos dibujar para reflejar la necesidad
    const totalSquares = this.commercialNeed;

    // Cuántos cuadritos representan el área actual
    const currentSquares = this.totalArea;

    // Cuántos cuadritos representarían el área adicional
    const additionalSquares = this.additionalAreaNeeded;

    // Calcula cuántos cuadritos por fila en la cuadrícula (usamos sqrt como ejemplo)
    const squaresPerRow = Math.ceil(Math.sqrt(totalSquares));

    // Ajusta el tamaño de los cuadritos de forma dinámica
    this.squareSize = Math.max(16, Math.min(32, Math.floor(800 / squaresPerRow)));

    // Creamos un mapa para saber cuántos cuadritos le corresponden a cada zona
    this.zoneSquares = {};
    this.zones.forEach((zone) => {
      // Porcentaje del total actual que representa la zona
      // Si "zone.area" es parte de "this.totalArea", calculamos el número de cuadraditos
      // que se asignan a la zona según su proporción.
      const zoneSquareCount = Math.floor((zone.area / this.totalArea) * currentSquares);
      this.zoneSquares[zone.id] = zoneSquareCount;
    });

    // Generamos el arreglo de cuadrados
    this.squares = [];
    let squareCount = 0;

    // Agregamos primero los cuadrados de área actual por zona
    for (const zone of this.zones) {
      const zoneSquareCount = this.zoneSquares[zone.id];
      for (let i = 0; i < zoneSquareCount; i++) {
        this.squares.push({
          id: squareCount++,
          zoneId: zone.id,
          type: "current",
        });
      }
    }

    // Luego agregamos los cuadrados de área adicional
    for (let i = 0; i < additionalSquares; i++) {
      this.squares.push({
        id: squareCount++,
        zoneId: null,
        type: "needed",
      });
    }
  }

  getSquareColor(square: Square): string {
    if (square.type === "needed") {
      return "bg-amber-300 dark:bg-amber-500";
    }
    // Asignamos un color distinto por zona (tú puedes cambiar estos valores de Tailwind)
    if (square.zoneId === 1) return "bg-green-600 dark:bg-green-500";
    if (square.zoneId === 2) return "bg-green-500 dark:bg-green-400";
    if (square.zoneId === 3) return "bg-green-400 dark:bg-green-300";
    return "bg-green-500 dark:bg-green-400";
  }

  // Ancho máximo para la cuadrícula
  getMaxWidth(): string {
    const squaresPerRow = Math.ceil(Math.sqrt(this.commercialNeed));
    return `${squaresPerRow * (this.squareSize + 4)}px`;
  }

  onSquareClick(square: Square): void {
    if (square.zoneId !== null) {
      this.selectedZone = square.zoneId;
    }
  }

  getZoneName(zoneId: number | null): string {
    if (zoneId === null) return "Área adicional necesaria";
    const zone = this.zones.find((z) => z.id === zoneId);
    return zone ? zone.name : "";
  }

  // Métodos para la selección de zonas
  onZoneClick(zoneId: number): void {
    this.selectedZone = zoneId;
  }

  // Métodos para la asignación de técnicos
  onTechnicianChange(event: any): void {
    this.selectedTechnician = Number.parseInt(event.target.value, 10);
  }

  onAreaChange(event: any): void {
    this.areaToAssign = Number.parseInt(event.target.value, 10) || 0;
  }

  handleAssign(): void {
    if (!this.selectedZone || !this.selectedTechnician || this.areaToAssign <= 0) return;

    // Actualizar la zona asignada
    this.zones = this.zones.map((zone) => {
      if (zone.id === this.selectedZone) {
        return {
          ...zone,
          area: zone.area + this.areaToAssign,
          availableArea: zone.availableArea - this.areaToAssign,
        };
      }
      return zone;
    });

    // Actualizar el total
    this.totalArea += this.areaToAssign;

    // Recalcular la cuadrícula
    this.calculateSquares();

    // Resetear el formulario
    this.areaToAssign = 0;
    this.selectedTechnician = null;
  }

  getCapacityPercentage(technician: Technician): number {
    return (technician.assignedArea / technician.maxCapacity) * 100;
  }
}
