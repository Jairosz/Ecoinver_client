// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// por ejemplo, si está en "src/app/environment/environment.ts"
import { environment } from '../../app/environment/environment';
import { LoginResponse } from '../types/LoginResponse';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private http: HttpClient) {}

  login(usuario: string, password: string): Observable<LoginResponse> {
    const url = `${environment.baseUrl}/auth/login`;
    return this.http.post<LoginResponse>(url, { username: usuario, password: password });
  }
  
}
