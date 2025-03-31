import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Comercial, ComercialServiceService } from '../../services/Comercial.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonModule } from '@angular/common';
import { differenceInDays } from 'date-fns';

@Component({
  selector: 'app-comercial-planning',
  imports: [FormsModule,NgSelectModule,CommonModule],
  templateUrl: './comercial-planning.component.html',
  styleUrl: './comercial-planning.component.css'
})
export class ComercialPlanningComponent {
  
  semanas:number[]=[];
  comercial:Comercial[]=[];
  constructor( private comercialServicio:ComercialServiceService){

  }
  ngOnInit(): void {
  this.comercialServicio.getComercial().subscribe(//Obtenemos las necesidades comerciales guardadas en la base de datos
    (data)=>{
      this.comercial=data;
    },
    (error)=>{
      console.log(error);
    }

  );

  }

  calcularSemanas(evento:Comercial){
    const startDate=new Date(evento.startDate);
    const endDate=new Date(evento.endDate);
    console.log(evento);
    const numDias=differenceInDays(endDate,startDate);
   
     this.semanas=Array.from({length: Math.ceil(numDias/7)});
     for(let i=0;i<this.semanas.length;i++){
      this.semanas[i]=i+1;
     } 
  }


 search(nombre:string,comercial:Comercial){//Búsqueda en el ng select
  nombre=nombre.toLowerCase().trim();

  return comercial.clientCode.toString().toLowerCase().includes(nombre) || comercial.clientName.toLowerCase().includes(nombre);

 }

}
