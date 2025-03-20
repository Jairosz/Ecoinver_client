import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../app/environment/environment';
interface comercial {
  
  clientCode: string;
  clientName: string;
  startDate: string;
  endDate: string;
  kgs: number;
}

@Injectable({
  providedIn: 'root'
})

export class ComercialServiceService {

  constructor(private http:HttpClient) { }

  getComercial ():Observable<comercial[]>{
    const url=environment.baseUrl+'/commercialneeds';
    return this.http.get<comercial[]>(url);
  }
}
