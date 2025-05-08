import { Injectable } from '@angular/core';
import { environment } from '../environment/environment';
import { HttpClient } from '@angular/common/http';
import {Observable } from 'rxjs';
import { RealProduction } from '../types/RealProduction';

@Injectable({
  providedIn: 'root'
})
export class RealProductionService {
  url=environment.baseUrl+'/CultiveDataReal';

  constructor(private http: HttpClient) { }

  get():Observable<RealProduction[]>{
    return this.http.get<RealProduction[]>(this.url);
  }

}
