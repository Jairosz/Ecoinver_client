import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';
import { CreateComercial } from '../types/createComercial';

export interface Comercial {
  id:number;
  clientCode: string;
  clientName: string;
  startDate: Date;
  endDate: Date;
  kgs: number;
}


@Injectable({
  providedIn: 'root'
})

export class ComercialServiceService {
   private url=environment.baseUrl+'/commercialneeds';
  constructor(private http:HttpClient) { }

  getComercial ():Observable<Comercial[]>{
   
    return this.http.get<Comercial[]>(this.url);
  }
  deleteComercial(id:number):Observable<Comercial[]>{
  
    return this.http.delete<Comercial[]>(this.url+'/'+id);
  }
  createComercial(clientData:CreateComercial):Observable<Comercial[]>{
    return this.http.post<Comercial[]>(this.url,clientData);
  }

  editComercial(id:number,clientData:CreateComercial):Observable<Comercial[]>{

    return this.http.put<Comercial[]>(this.url+'/'+id,clientData);
  }
  
}
