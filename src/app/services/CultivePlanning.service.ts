//CultivePlanning.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../environment/environment';
import { CreateCultivePlanningDto, UpdateCultivePlanningDto } from '../types/CultivePlanningTypes';

export interface CultivePlanning {
  idGenero: null;
  id: string;
  nombre: string;
  fechaInicio: Date | null;
  fechaFin: Date | null;
}

export interface CultivePlanningDTO {
  nombre: string;
  fechaInicio: Date | null;
  fechaFin: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class CultivePlanningService {
  private apiUrl = environment.baseUrl + '/cultivePlannings';

  constructor(private http: HttpClient) { }

  getAllCultivePlannings(): Observable<CultivePlanning[]> {
    return this.http
      .get<CultivePlanning[]>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  getCultivePlanningById(id: string): Observable<CultivePlanning> {
    // Asegurar que el ID sea válido
    if (!id || id === 'nueva') {
      console.error('ID de planificación inválido');
      return throwError(() => new Error('ID de planificación inválido'));
    }
    
    console.log('Obteniendo planificación con ID:', id);
    
    // Construir URL para obtener una planificación específica
    const url = `${this.apiUrl}/${id}`;
    
    // Realizar la solicitud GET
    return this.http.get<CultivePlanning>(url)
      .pipe(
        catchError(error => {
          console.error('Error al obtener planificación con ID', id, error);
          return throwError(() => error);
        })
      );
  }

  getCultivePlanningsByDateRange(startDate: Date, endDate: Date): Observable<CultivePlanning[]> {
    return this.getAllCultivePlannings().pipe(
      map((plannings: CultivePlanning[]) =>
        plannings.filter((planning: CultivePlanning) => {
          if (planning.fechaInicio && planning.fechaFin) {
            const planningStart = new Date(planning.fechaInicio);
            const planningEnd = new Date(planning.fechaFin);
            return planningStart >= startDate && planningEnd <= endDate;
          }
          return false;
        })
      )
    );
  }

  createCultivePlanning(planning: CreateCultivePlanningDto): Observable<CultivePlanning> {
    return this.http
      .post<CultivePlanning>(this.apiUrl, planning)
      .pipe(catchError(this.handleError));
  }

  // Updated method for CultivePlanning.service.ts
  updateCultivePlanning(id: string, planificacion: UpdateCultivePlanningDto): Observable<CultivePlanning> {
    console.log('Actualizando planificación en:', `${this.apiUrl}/${id}`);
    console.log('Datos enviados:', JSON.stringify(planificacion));
    
    // Ensure we're sending the correctly formatted data
    const updateData = {
      // Make sure we include the id in the object being sent
      id: Number(id),
      nombre: planificacion.nombre,
      fechaInicio: planificacion.fechaInicio,
      fechaFin: planificacion.fechaFin,
      idGenero: planificacion.idGenero
    };
    
    return this.http
      .put<CultivePlanning>(`${this.apiUrl}/${id}`, updateData)
      .pipe(
        catchError(this.handleError),
        tap((response: CultivePlanning) => console.log('Respuesta de actualización:', response))
      );
  }

  deleteCultivePlanning(id: string): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
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