import { Injectable } from '@angular/core';
import { environment } from '../environment/environment';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { RoleResponse } from '../types/RoleResponse';
import { Observable, of, throwError } from 'rxjs';

export interface Rol {
  id: string;
  name: string;
  description: string;
  level: number;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private roleUrl = environment.baseUrl + '/Roles';

  constructor(private http: HttpClient) {}

  getRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(this.roleUrl).pipe(
      catchError(this.handleError)
    );
  }

  getRoleById(id: string): Observable<Rol> {
    return this.http.get<Rol>(`${this.roleUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  createRole(role: Rol): Observable<Rol> {
    return this.http.post<Rol>(this.roleUrl, role).pipe(
      catchError(this.handleError)
    );
  }

  updateRole(id: string, role: Rol): Observable<Rol> {
    return this.http.put<Rol>(`${this.roleUrl}/${id}`, role).pipe(
      catchError(this.handleError)
    );
  }

  deleteRole(id: string): Observable<any> {
    return this.http.delete(`${this.roleUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error desconocido';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Código: ${error.status} - Mensaje: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
