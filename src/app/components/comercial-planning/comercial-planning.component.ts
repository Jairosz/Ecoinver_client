import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Comercial, ComercialServiceService } from '../../services/Comercial.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-comercial-planning',
  imports: [FormsModule, NgSelectModule, CommonModule],
  templateUrl: './comercial-planning.component.html',
  styleUrl: './comercial-planning.component.css'
})
export class ComercialPlanningComponent {

  semanas: string[] = [];
  comercial: Comercial[] = [];
  constructor(private comercialServicio: ComercialServiceService) {

  }
  ngOnInit(): void {
    this.comercialServicio.getComercial().subscribe(//Obtenemos las necesidades comerciales guardadas en la base de datos
      (data) => {
        this.comercial = data;
      },
      (error) => {
        console.log(error);
      }

    );

  }

  calcularSemanas(evento: Comercial) {//Calculo del rengo de las fechas para generar los Cards
    this.semanas = [];
    const startDate = new Date(evento.startDate);
    const endDate = new Date(evento.endDate);
    let inicio = new Date(startDate);
    let fin;
    let numSemanas = 0;

    for (let i = new Date(startDate); i <= endDate; i.setDate(i.getDate() + 1)) {//Se recorren las fechas
      
      if (i.getDay() == 0) {//Si el dia de la fecha es igual a domingo
        fin = new Date(i.getFullYear(),i.getMonth(),i.getDate());
        numSemanas++;//Sumamos una semana
        this.semanas[this.semanas.length] = inicio.toLocaleDateString('es-ES', {
          day: '2-digit',   // Asegura que el día tenga 2 dígitos
          month: '2-digit', // Asegura que el mes tenga 2 dígitos
          year: 'numeric',
        }) + '-' + fin.toLocaleString('es-ES', {
          day: '2-digit',   // Asegura que el día tenga 2 dígitos
          month: '2-digit', // Asegura que el mes tenga 2 dígitos
          year: 'numeric',
        });
        inicio= new Date(i.getFullYear(),i.getMonth(),i.getDate()+1);
      }
      if (i.getTime() === endDate.getTime()) {
        fin = new Date(i.getFullYear(),i.getMonth(),i.getDate());
        this.semanas[this.semanas.length] = inicio.toLocaleDateString('es-ES', {
          day: '2-digit',   // Asegura que el día tenga 2 dígitos
          month: '2-digit', // Asegura que el mes tenga 2 dígitos
          year: 'numeric',
        }) + '-' + fin.toLocaleString('es-ES', {
          day: '2-digit',   // Asegura que el día tenga 2 dígitos
          month: '2-digit', // Asegura que el mes tenga 2 dígitos
          year: 'numeric',
        });
        if (i.getDay() != 0) {//Si hemos entrado en una nueva semana aunque no sea domingo.

          numSemanas++;//Sumamos una semana

        }
      }

    }
    alert(numSemanas);
    console.log(this.semanas);

  }


  search(nombre: string, comercial: Comercial) {//Búsqueda en el ng select
    nombre = nombre.toLowerCase().trim();

    return comercial.clientCode.toString().toLowerCase().includes(nombre) || comercial.clientName.toLowerCase().includes(nombre);

  }

}
