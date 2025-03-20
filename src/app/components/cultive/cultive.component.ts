import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Cultivo {
  idCultivo: number;
  finca: string;
  nave: string;
  genero: string;
  variedad: string;
  superficie: string;
  produccionEstimada: string;
}

@Component({
  selector: 'app-cultive',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cultive.component.html'
})
export class CultiveComponent implements OnInit {
  // Para usar Math en el template
  Math = Math;

  // Datos originales (ejemplo con datos ficticios)
  data: Cultivo[] = [
    { idCultivo: 1, finca: 'Finca La Esperanza', nave: 'Nave 1', genero: 'Tomate', variedad: 'Cherry', superficie: '2 ha', produccionEstimada: '10 ton' },
    { idCultivo: 2, finca: 'Finca El Sol', nave: 'Nave 3', genero: 'Lechuga', variedad: 'Romana', superficie: '1.5 ha', produccionEstimada: '8 ton' },
    { idCultivo: 3, finca: 'Finca Los Pinos', nave: 'Nave 2', genero: 'Pepino', variedad: 'English', superficie: '3 ha', produccionEstimada: '12 ton' },
    // Agrega más registros según necesites...
  ];

  // Variables para búsqueda y paginación
  searchQuery: string = '';
  itemsPerPage: number = 5;
  currentPage: number = 1;

  // Arrays auxiliares para filtrado y paginación
  filteredData: Cultivo[] = [];
  paginatedData: Cultivo[] = [];

  // Cultivo seleccionado
  selectedCultivo: Cultivo | null = null;

  // Calcula el total de páginas
  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.itemsPerPage);
  }

  ngOnInit(): void {
    this.filterData();
  }

  // Filtra datos en base a la búsqueda (en todas las columnas)
  filterData(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (query) {
      this.filteredData = this.data.filter(item => {
        return (
          item.idCultivo.toString().includes(query) ||
          item.finca.toLowerCase().includes(query) ||
          item.nave.toLowerCase().includes(query) ||
          item.genero.toLowerCase().includes(query) ||
          item.variedad.toLowerCase().includes(query) ||
          item.superficie.toLowerCase().includes(query) ||
          item.produccionEstimada.toLowerCase().includes(query)
        );
      });
    } else {
      this.filteredData = [...this.data];
    }
    // Reinicia paginación y selección
    this.currentPage = 1;
    this.selectedCultivo = null;
    this.updatePagination();
  }

  // Actualiza el subset de datos mostrado en la página actual
  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedData = this.filteredData.slice(startIndex, endIndex);
  }

  // Selecciona o deselecciona una fila
  selectRow(item: Cultivo): void {
    this.selectedCultivo = this.selectedCultivo?.idCultivo === item.idCultivo ? null : item;
  }

  // Método para editar (implementa la lógica que necesites)
  edit(): void {
    if (this.selectedCultivo) {
      console.log('Editar cultivo', this.selectedCultivo);
      // Aquí puedes abrir un modal o navegar a otra vista para editar.
    }
  }

  // Método para borrar (implementa la lógica que necesites)
  delete(): void {
    if (this.selectedCultivo) {
      console.log('Borrar cultivo', this.selectedCultivo);
      // Aquí podrías eliminar el registro de la lista, llamar a un servicio, etc.
    }
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
