// cultivo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';
import { Cultive } from '../types/Cultive'; 

@Injectable({
  providedIn: 'root'
})
export class CultivoService {
  // Combinas la baseUrl con tu endpoint (p.ej. /Cultives, /Cultivos, etc.)
  private baseUrl = environment.baseUrl + '/Erp/cultives';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Cultive[]> {
    return this.http.get<Cultive[]>(this.baseUrl);
  }
  

  // Podrías agregar más métodos: create, update, delete, etc.
}
