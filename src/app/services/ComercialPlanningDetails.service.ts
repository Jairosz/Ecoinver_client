import { Injectable } from '@angular/core';
import { environment } from '../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ComercialPlanningDetails } from '../types/ComercialPlanningDetails';

export interface ComercialPlanningDetailsWithId {
  id:number;
  idCommercialNeedsPlanning:number;
  kilos:number;
  fechaDesde:Date;
  fechaHasta:Date;
  numeroSemana:number;
}

@Injectable({
  providedIn: 'root'
})
export class ComercialPlanningDetailsService {
   private baseUrl = environment.baseUrl + '/CommercialNeedsPlanningDetails';
  constructor(private http:HttpClient) { }

  get():Observable<ComercialPlanningDetailsWithId[]>{
    return this.http.get<ComercialPlanningDetailsWithId[]>(this.baseUrl);
  }
  post(planning:ComercialPlanningDetails):Observable<ComercialPlanningDetails>{
    return this.http.post<ComercialPlanningDetails>(this.baseUrl,planning);
  }
  put(id:number,planning:ComercialPlanningDetailsWithId){
    return this.http.put(this.baseUrl+'/'+id,planning);
  }

}
