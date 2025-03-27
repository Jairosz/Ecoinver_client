import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ComercialServiceService } from '../../services/Comercial.service';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CreateComercial } from '../../types/createComercial';
import { NgSelectModule } from '@ng-select/ng-select';
import { Client } from '../../types/client';


export interface Comercial {
  id: number;
  clientCode: number;
  clientName: string;
  startDate: Date;
  endDate: Date;
  kgs: number;
}

@Component({
  selector: 'app-comercial',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule],
  templateUrl: './comercial.component.html',
  styleUrls: ['./comercial.component.css']
})
export class ComercialComponent implements OnInit {
  // Propiedad para acceder a Math desde el template
  Math = Math;
  //Variables
  selectedComercial: Comercial | null = null;
  validarFechas: boolean = false;
  numId: number = 0;
  fecha: boolean = false;//Manejo de errores dentro del HTML.
  miFormulario: FormGroup;
  codigoElegido: number = 0;
  clientData: CreateComercial = {
    clientCode: 0,
    clientName: '',
    startDate: undefined,
    endDate: undefined,
    kgs: 0
  };
  clientErp: Client[] = [];//Array para la base de datos del Erp



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
    return Math.ceil(this.paginatedData.length / this.itemsPerPage);
  }

  ngOnInit(): void {


    //Obtenemos los registros de los datos de la base de datos
    this.comercialServicio.getComercial().subscribe(
      (data) => {
        this.paginatedData = data;
        this.filteredData = this.paginatedData;
        this.updatePagination();
        
      },
      (error) => {
        console.error('Error: ' + error);
      }

    );

    //Obtenemos los registros de la base de datos Erp.
    this.comercialServicio.getClienteErp();
    this.comercialServicio.getCliente().subscribe(
      (data)=>{
        this.clientErp=data;
        
      },
      (error)=>{
        console.log('Error:'+error);
      }
      
    );
   


  }

  // Filtrar datos basado en la búsqueda
  filterData(): void {
    const query = this.searchQuery.toLowerCase().trim();



    if (query) {
      // Si hay texto en la búsqueda, filtrar los datos
      this.filteredData = this.paginatedData.filter(item => {
        // Asegúrate de que las fechas estén formateadas de manera consistente
        const startDate = new Date(item.startDate).toISOString().slice(0, 10); // 'YYYY-MM-DD'
        const endDate = new Date(item.endDate).toISOString().slice(0, 10); // 'YYYY-MM-DD'

        return (
          // Verifica si la propiedad es una cadena y realiza la búsqueda de manera insensible a mayúsculas
          (item.clientCode.toString().toLowerCase().includes(query)) ||
          (item.clientName.toLowerCase().includes(query)) ||
          (startDate.includes(query)) ||
          (endDate.includes(query)) ||
          (item.kgs?.toString().includes(query))
        );
      });
    } else {
      // Si no hay consulta, se restauran todos los datos y se restablece a la primera página
      this.filteredData = [...this.paginatedData];

      this.currentPage = 1;  // Restablecer la página a la primera
    }

    // Actualizar la paginación para reflejar los datos filtrados
    this.updatePagination();
  }

  // Actualiza los datos mostrados en la página actual
  updatePagination(): void {
    let startIndex = (this.currentPage - 1) * this.itemsPerPage;
    let endIndex = Number(startIndex) + Number(this.itemsPerPage);
    startIndex = Number(startIndex);
    const currentPageData = this.paginatedData.slice(startIndex, endIndex);

    this.filteredData = currentPageData;


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
  //Método para crear un nuevo comercial
  create(): void {

    const formulario = this.miFormulario.value;

    this.clientData = {
      clientCode: formulario.clientCode,
      clientName: formulario.clientName,
      startDate: formulario.startDate,
      endDate: formulario.endDate,
      kgs: formulario.kgs
    };
   
    //Comprobación de la fecha fechaInicio>fechaFin
    if (this.clientData.startDate && this.clientData.endDate) {
      const startDate = new Date(this.clientData.startDate);
      const endDate = new Date(this.clientData.endDate);

      if (startDate.getTime() > endDate.getTime()) {
        this.validarFechas = true;
      }
      else {
        this.validarFechas = false;
      }
    }
    else {
      this.validarFechas = false;
    }

    if (this.validarFechas) {
      setTimeout(() => {
        this.fecha = true;
        this.validarFechas = false; // De esta manera, Angular actualizará la vista.
      }, 0); //Cambiamos la variable para que el usuario pueda volver a darle al botón
      return;
    }
    this.comercialServicio.createComercial(this.clientData).subscribe(

      (data) => {
        this.paginatedData = data;
        window.location.reload();
      },
      (error) => {
        console.error('Error al crear el cliente ', error);
      }
    );


    
  }

  
  // Método para editar
  edit(): void {
    const formulario = this.miFormulario.value;

    this.clientData = {
      clientCode: formulario.clientCode,
      clientName: formulario.clientName,
      startDate: formulario.startDate,
      endDate: formulario.endDate,
      kgs: formulario.kgs
    };
    //Comprobación de la fecha fechaInicio>fechaFin
    if (this.clientData.startDate && this.clientData.endDate) {
      const startDate = new Date(this.clientData.startDate);
      const endDate = new Date(this.clientData.endDate);

      if (startDate.getTime() > endDate.getTime()) {
        this.validarFechas = true;
      }
      else {
        this.validarFechas = false;
      }
    }
    else {
      this.validarFechas = false;
    }

    if (this.validarFechas) {
      setTimeout(() => {

        this.validarFechas = false; // De esta manera, Angular actualizará la vista.
      }, 0); //Cambiamos la variable para que el usuario pueda volver a darle al botón
      return;
    }
    this.comercialServicio.editComercial(this.numId, this.clientData).subscribe(

      (data) => {
        this.paginatedData = data;
        window.location.reload();
      },
      (error) => {
        console.error('Error al crear el cliente ', error);
      }
    );

   

  }

  // Método para borrar
  delete(id: number): void {
    this.comercialServicio.deleteComercial(id).subscribe(
      (data) => {
        this.paginatedData = data;
        window.location.reload();
      }

    );
    

  }

  selectRow(item: Comercial) {//Al comerical asignado en HTML, guardamos su ID en la variable numId
    this.selectedComercial = item;
    this.numId = this.selectedComercial.id;

    this.miFormulario.patchValue({clientCode:this.selectedComercial.clientCode});
    this.miFormulario.get('clientName')?.setValue(this.selectedComercial.clientName);
    
    let dateObj = new Date(this.selectedComercial.startDate);
    let formattedDate = dateObj.toISOString().slice(0, 10); // "YYYY-MM-DD"
    this.miFormulario.get('startDate')?.setValue(formattedDate);
    
     dateObj = new Date(this.selectedComercial.endDate);
     formattedDate = dateObj.toISOString().slice(0, 10); // "YYYY-MM-DD"
    this.miFormulario.get('endDate')?.setValue(formattedDate);
    this.miFormulario.get('kgs')?.setValue(this.selectedComercial.kgs);
  }

  buscarComercial(evento: Client) {
    const selectedComercial = this.clientErp.find(item => item.clientId == evento.clientId);
    this.miFormulario.get('clientName')?.setValue(selectedComercial?.name);

  }
  buscarComercial2(evento: Client) {
    const selectedComercial = this.clientErp.find(item => item.clientId == evento.clientId);
    this.miFormulario.get('clientName2')?.setValue(selectedComercial?.name);

  }

  search(nombre: string, cliente: Client) {
    nombre = nombre.toLowerCase();
    return cliente.clientId.toString().toLowerCase().includes(nombre) || cliente.name.toLowerCase().includes(nombre);

  }

}