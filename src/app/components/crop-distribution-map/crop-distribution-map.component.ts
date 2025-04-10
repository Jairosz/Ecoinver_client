import { Component, type OnInit, ViewEncapsulation } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"

interface Zone {
  id: number
  name: string
  area: number
  availableArea: number
}

interface Technician {
  id: number
  name: string
  assignedArea: number
  maxCapacity: number
}

interface Square {
  id: number
  zoneId: number | null
  type: "current" | "needed"
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
  // Datos principales
  totalArea = 1000 // hectáreas totales actuales
  commercialNeed = 1500 // hectáreas necesarias para cubrir demanda comercial
  zones: Zone[] = [
    { id: 1, name: "Zona Norte", area: 400, availableArea: 200 },
    { id: 2, name: "Zona Sur", area: 350, availableArea: 150 },
    { id: 3, name: "Zona Este", area: 250, availableArea: 100 },
  ]
  technicians: Technician[] = [
    { id: 1, name: "Carlos Rodríguez", assignedArea: 200, maxCapacity: 300 },
    { id: 2, name: "Ana Martínez", assignedArea: 300, maxCapacity: 350 },
    { id: 3, name: "Miguel López", assignedArea: 250, maxCapacity: 400 },
    { id: 4, name: "Laura Sánchez", assignedArea: 250, maxCapacity: 350 },
  ]

  // Estado del componente
  selectedZone: number | null = null
  selectedTechnician: number | null = null
  areaToAssign = 0
  squares: Square[] = []
  squareSize = 24
  zoneSquares: Record<number, number> = {}

  // Getters calculados
  get additionalAreaNeeded(): number {
    return this.commercialNeed - this.totalArea
  }

  get percentComplete(): number {
    return Math.round((this.totalArea / this.commercialNeed) * 100)
  }

  get selectedZoneData(): Zone | null {
    return this.selectedZone ? this.zones.find((z) => z.id === this.selectedZone) || null : null
  }

  get selectedTechnicianData(): Technician | null {
    return this.selectedTechnician ? this.technicians.find((t) => t.id === this.selectedTechnician) || null : null
  }

  get availableTechnicians(): Technician[] {
    return this.technicians.filter((tech) => tech.assignedArea < tech.maxCapacity)
  }

  get maxAssignableArea(): number {
    if (!this.selectedZoneData || !this.selectedTechnicianData) return 0

    return Math.min(
      this.selectedZoneData.availableArea,
      this.selectedTechnicianData.maxCapacity - this.selectedTechnicianData.assignedArea,
    )
  }

  constructor() {}

  ngOnInit(): void {
    this.calculateSquares()
  }

  // Métodos para el mapa
  calculateSquares(): void {
    // Calculamos el total de cuadrados que necesitamos mostrar
    const totalSquares = this.commercialNeed

    // Calculamos cuántos cuadrados representan el área actual
    const currentSquares = this.totalArea

    // Calculamos cuántos cuadrados representan el área adicional necesaria
    const additionalSquares = this.additionalAreaNeeded

    // Calculamos el tamaño de los cuadrados basado en el total
    const squaresPerRow = Math.ceil(Math.sqrt(totalSquares))
    this.squareSize = Math.max(16, Math.min(32, Math.floor(800 / squaresPerRow)))

    // Creamos un mapa de distribución de cuadrados por zona
    this.zoneSquares = {}
    this.zones.forEach((zone) => {
      this.zoneSquares[zone.id] = Math.floor((zone.area / this.totalArea) * currentSquares)
    })

    // Generamos los cuadrados para el mapa
    this.squares = []
    let squareCount = 0

    // Primero agregamos los cuadrados de área actual por zona
    for (const zone of this.zones) {
      const zoneSquareCount = this.zoneSquares[zone.id]
      for (let i = 0; i < zoneSquareCount; i++) {
        this.squares.push({
          id: squareCount++,
          zoneId: zone.id,
          type: "current",
        })
      }
    }

    // Luego agregamos los cuadrados de área adicional necesaria
    for (let i = 0; i < additionalSquares; i++) {
      this.squares.push({
        id: squareCount++,
        zoneId: null,
        type: "needed",
      })
    }
  }

  getSquareColor(square: Square): string {
    if (square.type === "needed") {
      return "bg-amber-300 dark:bg-amber-500"
    }

    // Asignamos diferentes tonos de verde según la zona
    if (square.zoneId === 1) return "bg-green-600 dark:bg-green-500"
    if (square.zoneId === 2) return "bg-green-500 dark:bg-green-400"
    if (square.zoneId === 3) return "bg-green-400 dark:bg-green-300"
    return "bg-green-500 dark:bg-green-400"
  }

  getMaxWidth(): string {
    const squaresPerRow = Math.ceil(Math.sqrt(this.commercialNeed))
    return `${squaresPerRow * (this.squareSize + 4)}px`
  }

  onSquareClick(square: Square): void {
    if (square.zoneId !== null) {
      this.selectedZone = square.zoneId
    }
  }

  getZoneName(zoneId: number | null): string {
    if (zoneId === null) return "Área adicional necesaria"
    const zone = this.zones.find((z) => z.id === zoneId)
    return zone ? zone.name : ""
  }

  // Métodos para la selección de zonas
  onZoneClick(zoneId: number): void {
    this.selectedZone = zoneId
  }

  // Métodos para la asignación de técnicos
  onTechnicianChange(event: any): void {
    this.selectedTechnician = Number.parseInt(event.target.value, 10)
  }

  onAreaChange(event: any): void {
    this.areaToAssign = Number.parseInt(event.target.value, 10) || 0
  }

  handleAssign(): void {
    if (!this.selectedZone || !this.selectedTechnician || this.areaToAssign <= 0) return

    // Actualizar técnicos
    this.technicians = this.technicians.map((tech) => {
      if (tech.id === this.selectedTechnician) {
        return { ...tech, assignedArea: tech.assignedArea + this.areaToAssign }
      }
      return tech
    })

    // Actualizar zonas
    this.zones = this.zones.map((zone) => {
      if (zone.id === this.selectedZone) {
        return {
          ...zone,
          area: zone.area + this.areaToAssign,
          availableArea: zone.availableArea - this.areaToAssign,
        }
      }
      return zone
    })

    // Actualizar área total
    this.totalArea += this.areaToAssign

    // Recalcular cuadrados
    this.calculateSquares()

    // Reset form
    this.areaToAssign = 0
    this.selectedTechnician = null
  }

  getCapacityPercentage(technician: Technician): number {
    return (technician.assignedArea / technician.maxCapacity) * 100
  }
}
