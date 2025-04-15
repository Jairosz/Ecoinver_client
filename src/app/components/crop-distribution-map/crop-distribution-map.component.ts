import { Component, OnInit, ViewEncapsulation } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

interface Zone {
  id: number;
  name: string;
  area: number;          // Área en metros cuadrados
  availableArea: number; // Área disponible en metros cuadrados
}

interface Technician {
  id: number;
  name: string;
  assignedArea: number;  // Área asignada en metros cuadrados
  maxCapacity: number;   // Capacidad máxima en metros cuadrados
}

interface Square {
  id: number;
  zoneId: number | null;
  type: "current" | "needed";
}

interface Gender {
  value: string;
  label: string;
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
  // === Datos principales (en metros cuadrados) ===
  totalArea = 1000;       // Área total actual en m²
  commercialNeed = 1500;  // Área requerida para cubrir la demanda comercial

  zones: Zone[] = [
    { id: 1, name: "Zona Norte", area: 400, availableArea: 200 },
    { id: 2, name: "Zona Sur",   area: 350, availableArea: 150 },
    { id: 3, name: "Zona Este",  area: 250, availableArea: 100 },
  ];

  // === Estado del componente ===
  selectedZone: number | null = null;
  selectedTechnician: number | null = null;
  areaToAssign = 0;

  // === Cuadrícula de visualización ===
  squares: Square[] = [];
  squareSize = 24;
  zoneSquares: Record<number, number> = {};

  // === Datos y filtro para un único input (genders) ===
  searchTerm: string = "";

  genderList: Gender[] = [
    { value: "US", label: "United States" },
    { value: "CA", label: "Canada" },
    { value: "FR", label: "France" },
    { value: "DE", label: "Germany" },
    // ... Agrega más géneros si lo deseas
  ];

  filteredGenders: Gender[] = [];

  // === Getters Calculados ===
  get additionalAreaNeeded(): number {
    return this.commercialNeed - this.totalArea;
  }

  get percentComplete(): number {
    // Porcentaje redondeado de la meta comercial ya cubierta
    return Math.round((this.totalArea / this.commercialNeed) * 100);
  }

  get selectedZoneData(): Zone | null {
    return this.selectedZone
      ? this.zones.find((z) => z.id === this.selectedZone) || null
      : null;
  }

  constructor() {}

  ngOnInit(): void {
    // Inicializa la cuadrícula
    this.calculateSquares();

    // Inicializa la lista filtrada de géneros
    this.filteredGenders = [...this.genderList];
  }

  // === Métodos para filtrar géneros con un único input ===
  filterGenders(): void {
    this.filteredGenders = this.genderList.filter((gender) =>
      gender.label.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  // === Métodos para el Mapa (Cuadrícula) ===
  calculateSquares(): void {
    const totalSquares = this.commercialNeed;            // Cantidad total de cuadritos
    const currentSquares = this.totalArea;               // Cuadritos que representan el área actual
    const additionalSquares = this.additionalAreaNeeded; // Cuadritos adicionales necesarios

    // Número de cuadritos por fila aproximado
    const squaresPerRow = Math.ceil(Math.sqrt(totalSquares));

    // Ajuste dinámico del tamaño de cada cuadrito (mín. 16, máx. 32)
    this.squareSize = Math.max(16, Math.min(32, Math.floor(800 / squaresPerRow)));

    // Distribuir los cuadritos correspondientes a cada zona
    this.zoneSquares = {};
    this.zones.forEach((zone) => {
      const zoneSquareCount = Math.floor((zone.area / this.totalArea) * currentSquares);
      this.zoneSquares[zone.id] = zoneSquareCount;
    });

    // Crear arreglo de cuadritos
    this.squares = [];
    let squareCount = 0;

    // 1) Cuadritos de cada zona (área actual)
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

    // 2) Cuadritos que representan el área adicional necesaria
    for (let i = 0; i < additionalSquares; i++) {
      this.squares.push({
        id: squareCount++,
        zoneId: null,
        type: "needed",
      });
    }
  }

  // Determina la clase CSS para cada cuadrito según su tipo/zona
  getSquareColor(square: Square): string {
    if (square.type === "needed") {
      return "bg-amber-300 dark:bg-amber-500";
    }
    if (square.zoneId === 1) return "bg-green-600 dark:bg-green-500";
    if (square.zoneId === 2) return "bg-green-500 dark:bg-green-400";
    if (square.zoneId === 3) return "bg-green-400 dark:bg-green-300";
    // Por defecto
    return "bg-green-500 dark:bg-green-400";
  }

  // Retorna el ancho máximo en px de la cuadrícula en función de squaresPerRow
  getMaxWidth(): string {
    const squaresPerRow = Math.ceil(Math.sqrt(this.commercialNeed));
    return `${squaresPerRow * (this.squareSize + 4)}px`;
  }

  // Clic en un cuadrito: si existe zoneId, seleccionarlo
  onSquareClick(square: Square): void {
    if (square.zoneId !== null) {
      this.selectedZone = square.zoneId;
    }
  }

  // Nombre a mostrar para una zona dada; si es null, "Área adicional necesaria"
  getZoneName(zoneId: number | null): string {
    if (zoneId === null) return "Área adicional necesaria";
    const zone = this.zones.find((z) => z.id === zoneId);
    return zone ? zone.name : "";
  }

  // Clic en la lista de zonas
  onZoneClick(zoneId: number): void {
    this.selectedZone = zoneId;
  }

  // Métodos para asignar técnicos (opcional)
  onTechnicianChange(event: any): void {
    this.selectedTechnician = Number.parseInt(event.target.value, 10);
  }

  onAreaChange(event: any): void {
    this.areaToAssign = Number.parseInt(event.target.value, 10) || 0;
  }

  handleAssign(): void {
    if (!this.selectedZone || !this.selectedTechnician || this.areaToAssign <= 0) {
      return;
    }

    // 1) Actualiza la zona seleccionada
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

    // 2) Actualiza el área total
    this.totalArea += this.areaToAssign;

    // 3) Recalcula la cuadrícula
    this.calculateSquares();

    // 4) Limpia los campos del formulario
    this.areaToAssign = 0;
    this.selectedTechnician = null;
  }

  // (Ejemplo) Cálculo de porcentaje de capacidad de un técnico
  getCapacityPercentage(technician: Technician): number {
    return (technician.assignedArea / technician.maxCapacity) * 100;
  }
}
