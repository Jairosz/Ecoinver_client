import { Injectable } from "@angular/core"
import { type Observable, of } from "rxjs"
import type { StockDto } from "../types/StockDto"

@Injectable({
  providedIn: "root",
})
export class StockService {
  // Datos de ejemplo para mostrar en la interfaz
  private mockRecords: StockDto[] = [
    {
      id: 1,
      date: new Date(2025, 4, 10, 9, 30),
      itemCount: 42,
      description: "Inventario inicial",
    },
    {
      id: 2,
      date: new Date(2025, 4, 9, 14, 15),
      itemCount: 37,
      description: "Actualización después de ventas",
    },
    {
      id: 3,
      date: new Date(2025, 4, 8, 11, 0),
      itemCount: 45,
      description: "Reposición de stock",
    },
    {
      id: 4,
      date: new Date(2025, 4, 7, 16, 45),
      itemCount: 30,
      description: "Inventario semanal",
    },
  ]

  constructor() {}

  getStockRecords(): Observable<StockDto[]> {
    // En un caso real, aquí se conectaría a una API
    return of(this.mockRecords)
  }

  getStockRecordById(id: number): Observable<StockDto | undefined> {
    const record = this.mockRecords.find((r) => r.id === id)
    return of(record)
  }

  addStockRecord(record: Omit<StockDto, "id">): Observable<StockDto> {
    // Simulando la creación de un nuevo registro con ID
    const newRecord: StockDto = {
      ...record,
      id: this.mockRecords.length + 1,
    }

    this.mockRecords.unshift(newRecord)
    return of(newRecord)
  }
}
