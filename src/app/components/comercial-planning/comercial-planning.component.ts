import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Comercial, ComercialServiceService } from '../../services/Comercial.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonModule } from '@angular/common';
import { ComercialPlanningService } from '../../services/ComercialPlanning.service';
import { ComercialPlanning } from '../../types/ComercialPlanning';


@Component({
  selector: 'app-comercial-planning',
  imports: [FormsModule, NgSelectModule, CommonModule],
  templateUrl: './comercial-planning.component.html',
  styleUrl: './comercial-planning.component.css'
})
export class ComercialPlanningComponent {

  semanas: {semana:number,fecha:string}[]= [];//Array que contendrá la semana y fecha de los cards
  comercial: Comercial[] = [];
  planning:ComercialPlanning[]=[];
  distribuido:number=0;
  pendiente:number=0;
  selectedComercial: Comercial = {
    id: 0,
    clientCode: 0,
    clientName: '',
    startDate: new Date(),
    endDate: new Date(),
    generoId: 0,
    generoNombre: '',
    kgs: 0
  };

  constructor(private comercialServicio: ComercialServiceService, private comercialPlanning: ComercialPlanningService) {

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
    //Obtenemos los datos del planning de la BD
    this.comercialPlanning.get().subscribe(
      (data)=>{
        this.planning=data;
        
      },
      (error)=>{
        console.log(error);
      }

    )

  }

  calcularSemanas(evento: Comercial) {//Calculo del rengo de las fechas para generar los Cards
    this.semanas = [];
    this.selectedComercial = {//El comercial seleccionado en el ngSelect.
      id: evento.id,
      clientCode: evento.clientCode,
      clientName: evento.clientName,
      startDate: evento.startDate,
      endDate: evento.endDate,
      generoId: evento.generoId,
      generoNombre: evento.generoNombre,
      kgs: evento.kgs
    };
    this.pendiente=this.selectedComercial.kgs;
    const startDate = new Date(evento.startDate);
    const endDate = new Date(evento.endDate);
    let inicio = new Date(startDate);
    let fin;
    let numSemanas = 0;
    const primerDia= new Date(inicio.getFullYear(),0,1);
    let semana=Math.floor((inicio.getTime()-primerDia.getTime())/(1000*60*60*24));
    semana=Math.ceil(semana/7);

    for (let i = new Date(startDate); i <= endDate; i.setDate(i.getDate() + 1)) {//Se recorren las fechas

      if (i.getDay() == 0) {//Si el dia de la fecha es igual a domingo
        fin = new Date(i.getFullYear(), i.getMonth(), i.getDate());
        numSemanas++;//Sumamos una semana
        this.semanas.push({semana:semana, fecha:inicio.toLocaleDateString('es-ES', {
          day: '2-digit',   // Asegura que el día tenga 2 dígitos
          month: '2-digit', // Asegura que el mes tenga 2 dígitos
          year: 'numeric',
        }) + '-' + fin.toLocaleString('es-ES', {
          day: '2-digit',   // Asegura que el día tenga 2 dígitos
          month: '2-digit', // Asegura que el mes tenga 2 dígitos
          year: 'numeric',
        })});
        inicio = new Date(i.getFullYear(), i.getMonth(), i.getDate() + 1);
        semana++;
      }
      if (i.getTime() === endDate.getTime()) {
        
        fin = new Date(i.getFullYear(), i.getMonth(), i.getDate());
        this.semanas.push({semana:semana, fecha:inicio.toLocaleDateString('es-ES', {
          day: '2-digit',   // Asegura que el día tenga 2 dígitos
          month: '2-digit', // Asegura que el mes tenga 2 dígitos
          year: 'numeric',
        }) + '-' + fin.toLocaleString('es-ES', {
          day: '2-digit',   // Asegura que el día tenga 2 dígitos
          month: '2-digit', // Asegura que el mes tenga 2 dígitos
          year: 'numeric',
        })});
        if (i.getDay() != 0) {//Si hemos entrado en una nueva semana aunque no sea domingo.

          numSemanas++;//Sumamos una semana

        }
      }

    }
    alert(this.selectedComercial.id);
    const planning: ComercialPlanning = {
      idCommercialNeed: this.selectedComercial.id,
      weekNumber: numSemanas,
      kgs: this.selectedComercial.kgs,
      startDate: this.selectedComercial.startDate,
      endDate: this.selectedComercial.endDate
    }
    //Guardamos en la tabla planning la necesidad comercial.
   
    if (planning && !this.planning.find(item=>item.idCommercialNeed==planning.idCommercialNeed)) {
      console.log(this.planning);
      console.log(planning.idCommercialNeed);
      this.comercialPlanning.post(planning).subscribe(
        (data) => {
          console.log('Se han insertado los datos correctamente');
          this.planning.push(planning);
        },
        (error) => {
          console.log(error);
        }

      );
    }

  }
  resumen(){
    this.distribuido=0;
    const input=document.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>;
    for(let i=0;i<input.length;i++){
      this.distribuido+=Number(input[i].value);
    }
    this.pendiente=this.selectedComercial.kgs-this.distribuido;
  }

  search(nombre: string, comercial: Comercial) {//Búsqueda en el ng select
    nombre = nombre.toLowerCase().trim();

    return comercial.clientCode.toString().toLowerCase().includes(nombre) || comercial.clientName.toLowerCase().includes(nombre);

  }

  //Barra de progreso
  
 get calcularPorcentaje(){
      const porecentaje=(this.distribuido*100)/this.selectedComercial.kgs;
      if(porecentaje<=100){
        return porecentaje;
      }else{
        return 100;
      }
      
  }

}
