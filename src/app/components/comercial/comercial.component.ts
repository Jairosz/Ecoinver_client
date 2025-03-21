import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComercialServiceService } from '../../services/comercial-service.service';

interface comercial {
  clientCode: string;
  clientName: string;
  startDate: string;
  endDate: string;
  kgs: number;
}

@Component({
  selector: 'app-comercial',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comercial.component.html',
  styleUrls: ['./comercial.component.css']
})
export class ComercialComponent implements OnInit {
  // Propiedad para acceder a Math desde el template
  Math = Math;

  // Datos originales
  

  constructor(private comercialServicio: ComercialServiceService) { }

  // Variables para búsqueda y paginación
  searchQuery: string = '';
  itemsPerPage: number = 5;
  currentPage: number = 1;

  // Arrays auxiliares
  filteredData: comercial[] = [];
  paginatedData: comercial[] = [];

  // Getter para calcular el total de páginas
  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.itemsPerPage);
  }

  ngOnInit(): void {

    this.comercialServicio.getComercial().subscribe(
      (data) => {
        this.paginatedData = data;
       

      },
      (error)=>{
        console.error('Error: '+error);
      }

    );
    // Inicializamos filtrando (muestra todos los datos)
    this.filterData();
  }

  // Filtrar datos basado en la búsqueda
  filterData(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (query) {
      this.filteredData = this.paginatedData.filter(item => {
        return (
          item.clientCode.toLowerCase().includes(query) ||
          item.clientName.toLowerCase().includes(query) ||
          item.startDate.toLowerCase().includes(query) ||
          item.endDate.toLowerCase().includes(query) ||
          item.kgs.toString().includes(query)
        );
      });
    } else {
      this.filteredData = [...this.paginatedData];
    }
    // Reinicia la paginación a la primera página
    this.currentPage = 1;
    this.updatePagination();
  }

  // Actualiza los datos mostrados en la página actual
  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedData = this.filteredData.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }
}