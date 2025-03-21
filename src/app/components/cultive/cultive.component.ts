import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Cultivo {
  idCultivo: number;
  codAgr: string;            // Nuevo: Código del Agricultor (Cod Agr)
  finca: string;
  nave: string;
  genero: string;
  familia: string;           // Se reemplaza "variedad" por "familia"
  tipoVariedad: string;      // Nuevo: Tipo de variedad comercial
  superficie: string;
  produccionEstimada: string;
  fechaTrasplante: Date;     // Nuevo: Fecha trasplante
  fechaInicioCultivo: Date;  // Nuevo: Fecha inicio cultivo
  fechaFinCultivo: Date;     // Nuevo: Fecha fin cultivo
  calidadCultivo: number;    // Nuevo: Calidad del cultivo (1 al 5)
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
    { 
      idCultivo: 1,
      codAgr: 'AG001',  
      finca: 'Finca La Esperanza', 
      nave: 'Nave 1', 
      genero: 'Tomate', 
      familia: 'Cherry', 
      tipoVariedad: 'Variedad Comercial A', 
      superficie: '2 ha', 
      produccionEstimada: '10 ton',
      fechaTrasplante: new Date('2022-03-15'),
      fechaInicioCultivo: new Date('2022-03-01'),
      fechaFinCultivo: new Date('2022-06-01'),
      calidadCultivo: 4
    },
    { 
      idCultivo: 2,
      codAgr: 'AG002',  
      finca: 'Finca El Sol', 
      nave: 'Nave 3', 
      genero: 'Lechuga', 
      familia: 'Romana', 
      tipoVariedad: 'Variedad Comercial B',
      superficie: '1.5 ha', 
      produccionEstimada: '8 ton',
      fechaTrasplante: new Date('2022-04-10'),
      fechaInicioCultivo: new Date('2022-04-01'),
      fechaFinCultivo: new Date('2022-07-01'),
      calidadCultivo: 3
    },
    { 
      idCultivo: 3,
      codAgr: 'AG003',  
      finca: 'Finca Los Pinos', 
      nave: 'Nave 2', 
      genero: 'Pepino', 
      familia: 'English', 
      tipoVariedad: 'Variedad Comercial C',
      superficie: '3 ha', 
      produccionEstimada: '12 ton',
      fechaTrasplante: new Date('2022-05-05'),
      fechaInicioCultivo: new Date('2022-05-01'),
      fechaFinCultivo: new Date('2022-08-01'),
      calidadCultivo: 5
    }
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

  // Filtra datos en base a la búsqueda (se buscan en todas las columnas)
  filterData(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (query) {
      this.filteredData = this.data.filter(item => {
        return (
          item.idCultivo.toString().includes(query) ||
          item.codAgr.toLowerCase().includes(query) ||
          item.finca.toLowerCase().includes(query) ||
          item.nave.toLowerCase().includes(query) ||
          item.genero.toLowerCase().includes(query) ||
          item.familia.toLowerCase().includes(query) ||
          item.tipoVariedad.toLowerCase().includes(query) ||
          item.superficie.toLowerCase().includes(query) ||
          item.produccionEstimada.toLowerCase().includes(query) ||
          item.fechaTrasplante.toLocaleDateString().toLowerCase().includes(query) ||
          item.fechaInicioCultivo.toLocaleDateString().toLowerCase().includes(query) ||
          item.fechaFinCultivo.toLocaleDateString().toLowerCase().includes(query) ||
          item.calidadCultivo.toString().includes(query)
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
