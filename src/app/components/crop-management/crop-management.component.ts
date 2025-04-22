import { Component, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { initFlowbite } from "flowbite"

interface CropType {
  id: number
  name: string
  color: string
  bgColor: string
}

interface CropData {
  cropTypeId: number
  occupiedArea: number
  requiredArea: number
}

@Component({
  selector: "app-crop-management",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./crop-management.component.html",
  styleUrls: ["./crop-management.component.css"],
})
export class CropManagementComponent implements OnInit {
  darkMode = true // Por defecto en modo oscuro según la captura

  cropTypes: CropType[] = [
    { id: 1, name: "Maíz", color: "text-yellow-400", bgColor: "bg-yellow-400" },
    { id: 2, name: "Trigo", color: "text-amber-200", bgColor: "bg-amber-200" },
    { id: 3, name: "Soja", color: "text-green-500", bgColor: "bg-green-500" },
    { id: 4, name: "Girasol", color: "text-yellow-600", bgColor: "bg-yellow-600" },
    { id: 5, name: "Algodón", color: "text-white", bgColor: "bg-white" },
  ]

  cropData: CropData[] = [
    { cropTypeId: 1, occupiedArea: 1200, requiredArea: 1500 },
    { cropTypeId: 2, occupiedArea: 800, requiredArea: 1000 },
    { cropTypeId: 3, occupiedArea: 2000, requiredArea: 1800 },
    { cropTypeId: 4, occupiedArea: 500, requiredArea: 700 },
    { cropTypeId: 5, occupiedArea: 300, requiredArea: 600 },
  ]

  selectedCropTypeId = 1 // Maíz seleccionado por defecto
  filteredCropData: CropData | null = null
  selectedCropType: CropType | null = null

  // Para la representación visual
  totalArea = 5000 // Área total disponible (ejemplo)
  surfaceSegments: { color: string; width: string }[] = []

  ngOnInit(): void {
    // Inicializar Flowbite
    initFlowbite()

    // Detectar preferencia de tema del sistema
    this.detectColorScheme()

    // Inicialmente seleccionar el primer tipo de cultivo
    this.updateFilteredData()
  }

  detectColorScheme() {
    // Verificar si el usuario tiene preferencia de tema oscuro
    const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    this.darkMode = darkModeMediaQuery.matches

    // Escuchar cambios en la preferencia de tema
    darkModeMediaQuery.addEventListener("change", (e) => {
      this.darkMode = e.matches
    })
  }

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode
    document.documentElement.classList.toggle("dark", this.darkMode)
  }

  updateFilteredData(): void {
    this.filteredCropData = this.cropData.find((data) => data.cropTypeId === this.selectedCropTypeId) || null
    this.selectedCropType = this.cropTypes.find((type) => type.id === this.selectedCropTypeId) || null
    this.updateSurfaceRepresentation()
  }

  updateSurfaceRepresentation(): void {
    this.surfaceSegments = []

    if (this.filteredCropData && this.selectedCropType) {
      const occupiedPercentage = (this.filteredCropData.occupiedArea / this.totalArea) * 100
      const requiredPercentage = (this.filteredCropData.requiredArea / this.totalArea) * 100

      // Segmento ocupado
      this.surfaceSegments.push({
        color: this.selectedCropType.bgColor,
        width: `${(this.filteredCropData.occupiedArea / this.filteredCropData.requiredArea) * 100}%`,
      })

      // Segmento requerido pero no ocupado (si es mayor que el ocupado)
      if (this.filteredCropData.requiredArea > this.filteredCropData.occupiedArea) {
        this.surfaceSegments.push({
          color: this.darkMode ? "bg-gray-600" : "bg-gray-300",
          width: `${(1 - this.filteredCropData.occupiedArea / this.filteredCropData.requiredArea) * 100}%`,
        })
      }
    }
  }

  onCropTypeChange(): void {
    this.updateFilteredData()
  }

  getOccupationPercentage(): number {
    if (!this.filteredCropData) return 0
    return Math.round((this.filteredCropData.occupiedArea / this.filteredCropData.requiredArea) * 100)
  }

  getRequirementStatus(): string {
    if (!this.filteredCropData) return ""

    if (this.filteredCropData.occupiedArea >= this.filteredCropData.requiredArea) {
      return "Cubierto"
    } else {
      const deficit = this.filteredCropData.requiredArea - this.filteredCropData.occupiedArea
      return `Faltan ${deficit} m²`
    }
  }

  getRequirementStatusClass(): string {
    if (!this.filteredCropData) return ""

    if (this.filteredCropData.occupiedArea >= this.filteredCropData.requiredArea) {
      return "text-green-500"
    } else {
      return "text-red-500"
    }
  }

  getCropTypeName(cropTypeId: number): string {
    const cropType = this.cropTypes.find((t) => t.id === cropTypeId)
    return cropType ? cropType.name : ""
  }

  getCropTypeColor(cropTypeId: number): string {
    const cropType = this.cropTypes.find((t) => t.id === cropTypeId)
    return cropType ? cropType.bgColor : "bg-gray-300"
  }

  getStatusText(data: CropData): string {
    return data.occupiedArea >= data.requiredArea ? "Cubierto" : `Falta ${data.requiredArea - data.occupiedArea} m²`
  }

  isRequirementMet(data: CropData): boolean {
    return data.occupiedArea >= data.requiredArea
  }
}
