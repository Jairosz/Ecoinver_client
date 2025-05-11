import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { StockService } from "../../services/Stock.service";
import type { StockDto }           from "../../types/StockDto";        // ← type-only import stays


@Component({
  selector: 'app-stock',
  imports: [CommonModule],
  templateUrl: './stock.component.html',
  styleUrl: './stock.component.css'
})
export class StockComponent {
  stockRecords: StockDto[] = []

  constructor(private stockService: StockService) { }

  ngOnInit(): void {
    this.loadStockRecords()
  }

  loadStockRecords(): void {
    this.stockService.getStockRecords().subscribe((records) => {
      this.stockRecords = records
    })
  }

  openAddRecordModal(): void {
    // Implementar lógica para abrir modal de nuevo registro
    console.log("Abrir modal para añadir nuevo registro")
  }

  viewRecordDetails(id: number): void {
    // Implementar lógica para ver detalles del registro
    console.log("Ver detalles del registro:", id)
  }
}
