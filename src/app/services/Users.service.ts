import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environment/environment';
import { map } from 'rxjs/operators';
import { UpdateUserDTO } from '../types/UpdateUserDto';
import { RoleResponse } from '../types/RoleResponse';

export interface Usuario {
  id: string;
  nombreCompleto: string;
  userName: string;
  password: string;
  email: string;
  role: string; //devielve un hash ahora mismos 9.06am
  showPassword?: boolean;
  //level:number;
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private apiUrl = environment.baseUrl + '/users';
  private roleUrl= environment.baseUrl + '/Roles';

  constructor(private http: HttpClient) {}

  getUsuarios(): Observable<Usuario[]> {
    return this.http
      .get<Usuario[]>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  getRolesUsuarios(): Observable<string[]> {
    return this.getUsuarios().pipe(
      map((usuarios: Usuario[]) =>
        usuarios.map((usuario: Usuario) => usuario.role)
      ) // Tipado explícito
    );
  }

  // En UsersService
  updateUsuario(usuario: UpdateUserDTO, id: string): Observable<Usuario> {
    return this.http
      .put<Usuario>(`${this.apiUrl}/${id}`, usuario)
      .pipe(catchError(this.handleError));
  }

  deleteUsuario(id: string): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Añade este método a tu UsersService
  // Cambiar el tipo de parámetro a UpdateUserDTO
  createUsuario(usuario: UpdateUserDTO): Observable<Usuario> {
    return this.http
      .post<Usuario>(`${this.apiUrl}/create`, usuario)
      .pipe(catchError(this.handleError));
  }


  //Para obtener roles de la tabla aspnetuserroles
  // users.service.ts
getRoles(): Observable<RoleResponse[]> {
  return this.http.get<RoleResponse[]>(this.roleUrl).pipe(
    catchError((error: HttpErrorResponse) => {
      this.handleError(error);
      return of([]); // Retornar array vacío en caso de error
    })
  );
}

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error desconocido';
    if (error.error instanceof ErrorEvent) {
      // Error del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del servidor
      errorMessage = `Código: ${error.status}\nMensaje: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  
}
