import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../app/environment/environment';
interface Comercial {
  codCliente: string;
  nombCliente: string;
  fInicio: string;
  fFin: string;
  kg: string;
}

@Injectable({
  providedIn: 'root'
})

export class ComercialServiceService {

  constructor(private http:HttpClient) { }

  getComercial ():Observable<Comercial[]>{
    const url=environment.baseUrl+'/comercial';
    return this.http.get<Comercial[]>(url);
  }
}
