import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ComercialServiceService } from '../../services/Comercial.service';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CreateComercial } from '../../types/createComercial';

interface Comercial {
  id: number;
  clientCode: string;
  clientName: string;
  startDate: Date;
  endDate: Date;
  kgs: number;
}

@Component({
  selector: 'app-comercial',
  standalone: true,
  imports: [CommonModule, FormsModule,ReactiveFormsModule],
  templateUrl: './comercial.component.html',
  styleUrls: ['./comercial.component.css']
})
export class ComercialComponent implements OnInit {
  // Propiedad para acceder a Math desde el template
  Math = Math;
  //Variables
  selectedComercial: Comercial | null = null;
  validarFechas:boolean=false;
  numId: number = 0;
  isModalOpen: boolean = false;
  miFormulario: FormGroup;
  clientData: CreateComercial = {
    clientCode: '',
    clientName: '',
    startDate: undefined,
    endDate: undefined,
    kgs: 0
  };



  constructor(private comercialServicio: ComercialServiceService, private ruta: Router, private fb: FormBuilder) {

    this.miFormulario = this.fb.group(
      {
        clientCode: ['', Validators.required],
        clientName: ['', Validators.required],
        startDate: ['', Validators.required],
        endDate: ['', Validators.required],
        kgs: ['', [Validators.required, Validators.pattern('^[0-9]+$')]]
      });
  }

  // Variables para búsqueda y paginación
  searchQuery: string = '';
  itemsPerPage: number = 5;
  currentPage: number = 1;

  // Arrays auxiliares
  filteredData: Comercial[] = [];
  paginatedData: Comercial[] = [];

  // Getter para calcular el total de páginas
  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.itemsPerPage);
  }

  ngOnInit(): void {

    
    //Obtenemos los registros de los datos de la base de datos
    this.comercialServicio.getComercial().subscribe(
      (data) => {
        this.paginatedData = data;


      },
      (error) => {
        console.error('Error: ' + error);
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
          item.startDate.toLocaleDateString('en-US').includes(query) ||
          item.endDate.toLocaleDateString('en-US').includes(query) ||
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
  create(): void {

    const formulario=this.miFormulario.value;

    this.clientData={
      clientCode:formulario.clientCode,
      clientName:formulario.clientName,
      startDate:formulario.startDate,
      endDate:formulario.endDate,
      kgs:formulario.kgs
    };

    if (this.clientData.startDate && this.clientData.endDate) {
      const startDate=new Date(this.clientData.startDate);
      const endDate=new Date (this.clientData.endDate);

      if(startDate.getTime()>endDate.getTime()){
       this.validarFechas=true;
      }
      else{
        this.validarFechas=false;
      }
    }
    else{
      this.validarFechas=false;
    }
    
    this.comercialServicio.createComercial(this.clientData).subscribe(

      (data) => {
        this.paginatedData = data;
      },
      (error) => {
        console.error('Error al crear el cliente ', error);
      }
    )
    window.location.reload();
  }
  // Método para editar
  edit(): void {
    if (this.selectedComercial) {
      console.log('Editar cultivo', this.selectedComercial);
      // Aquí puedes abrir un modal o navegar a otra vista para editar.
    }
  }

  // Método para borrar
  delete(id: number): void {
    this.comercialServicio.deleteComercial(id).subscribe(
      (data) => {
        this.paginatedData = data;
      }

    )
    window.location.reload();

  }

  selectRow(item: Comercial) {
    this.selectedComercial = item;
    this.numId = this.selectedComercial.id;
  }

  


}