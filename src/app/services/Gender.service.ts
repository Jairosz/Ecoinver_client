import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environment/environment';
import { Observable } from 'rxjs';
import { Gender } from '../types/gender';

@Injectable({
  providedIn: 'root'
})
export class GenderService {
 private url = environment.baseUrl + '/genders';
  constructor(private http:HttpClient) { }

  get():Observable<Gender[]>{
    return this.http.get<Gender[]>(this.url);
  }

}
