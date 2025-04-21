import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../environment/environment';
import { CultivePlanning } from './CultivePlanning.service';
import { CultivePlanningDetails } from '../types/CultivePlanningDetails';

@Injectable({
  providedIn: 'root'
})
export class CultivePlanningDetailsService {
  private apiUrl = environment.baseUrl + '/cultivePlanningsDetails';

  constructor(private http: HttpClient) { }

  getAllCultivePlanningDetails(): Observable<CultivePlanningDetails[]> {
    return this.http
      .get<CultivePlanningDetails[]>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  getCultivePlanningDetailsById(id: number): Observable<CultivePlanningDetails> {
    return this.http
      .get<CultivePlanningDetails>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  getCultivePlanningDetailsByDateRange(startDate: Date, endDate: Date): Observable<CultivePlanningDetails[]> {
    return this.getAllCultivePlanningDetails().pipe(
      map((details: CultivePlanningDetails[]) =>
        details.filter((detail: CultivePlanningDetails) => {
          const detailStart = new Date(detail.fechaInicio);
          const detailEnd = new Date(detail.fechaFin);
          return detailStart >= startDate && detailEnd <= endDate;
        })
      )
    );
  }

  /**
 * Obtiene todos los detalles asociados a una planificación específica
 * filtrando la lista completa de detalles
 * @param planningId ID de la planificación
 * @returns Observable con los detalles de todos los tramos
 */
  getDetailsByPlanningId(planningId: string): Observable<CultivePlanningDetails[]> {
    // Verificar que el planningId no esté vacío
    if (!planningId || planningId === 'nueva' || planningId === '') {
      console.warn('ID de planificación inválido');
      return of([]);
    }
    
    console.log('Buscando detalles para planningId:', planningId);
    
    // Convertir el planningId a número para comparación
    const planningIdNum = Number(planningId);
    
    if (isNaN(planningIdNum)) {
      console.error('El ID de planificación no es un número válido:', planningId);
      return of([]);
    }
    
    // Ya que no tenemos un endpoint específico, obtenemos todos los detalles
    // y filtramos por el cultivePlanningId
    return this.getAllCultivePlanningDetails().pipe(
      map(details => {
        console.log('Total de detalles obtenidos:', details.length);
        
        // Filtrar los detalles que coincidan con el ID de planificación
        const filteredDetails = details.filter(detail => {
          // Verificar coincidencia en cultivePlanningId (puede ser un string o un número)
          const detailPlanningId = typeof detail.cultivePlanningId === 'string' 
            ? Number(detail.cultivePlanningId) 
            : detail.cultivePlanningId;
            
          // También verificar idCultivePlanning por si acaso
          const detailIdCultivePlanning = typeof detail.idCultivePlanning === 'string'
            ? Number(detail.idCultivePlanning)
            : detail.idCultivePlanning;
          
          return detailPlanningId === planningIdNum || detailIdCultivePlanning === planningIdNum;
        });
        
        console.log('Detalles filtrados para planningId', planningIdNum, ':', filteredDetails.length);
        
        // Ordenar por número de tramo para facilitar el procesamiento
        return filteredDetails.sort((a, b) => a.tramo - b.tramo);
      }),
      catchError(error => {
        console.error('Error al obtener detalles por ID de planificación:', error);
        return of([]);
      })
    );
  }

  /**
   * Crea un nuevo detalle de planificación asociado a un ID de planificación
   * @param planningId ID de la planificación
   * @param details Detalles a crear
   * @returns Observable con el detalle creado
   */
  createCultivePlanningDetails(planningId: string, details: any): Observable<CultivePlanningDetails> {
    // Formatear las fechas como strings ISO
    const fechaInicio = details.fechaInicio instanceof Date 
      ? details.fechaInicio.toISOString() 
      : details.fechaInicio;
    
    const fechaFin = details.fechaFin instanceof Date 
      ? details.fechaFin.toISOString() 
      : details.fechaFin;
    
    // Construir el objeto según el formato que muestra Swagger
    const detailsWithPlanningId = {
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      kilos: details.kilos || 0,
      tramos: details.tramo || 0,
      // Asegurarse de que cultivePlanningId es un número
      cultivePlanningId: Number(planningId)  // NOTA: Cambiado de 'idCultivePlanning' a 'cultivePlanningId'
    };
    
    // Log para depuración
    console.log('Creando detalle en:', this.apiUrl);
    console.log('Datos enviados:', JSON.stringify(detailsWithPlanningId));
    
    // Usar el endpoint POST genérico
    return this.http
      .post<CultivePlanningDetails>(this.apiUrl, detailsWithPlanningId)
      .pipe(catchError(this.handleError));
  }
  
 /**
 * Crea múltiples registros de detalles para todos los tramos de una planificación
 * usando llamadas individuales al endpoint existente
 * @param planningId ID de la planificación a la que pertenecen los tramos
 * @param tramosDetails Array de detalles para cada tramo
 * @returns Observable con el resultado de la operación
 */
createMultiplePlanningDetails(planningId: string, tramosDetails: any[]): Observable<CultivePlanningDetails[]> {
  // Log del ID de planificación y los datos completos que se envían
  console.log('Creando múltiples detalles de planificación para planningId:', planningId);
  console.log('Tipo de planningId:', typeof planningId);
  console.log('Datos de tramosDetails:', JSON.stringify(tramosDetails));
  
  // Crear un array de observables para cada detalle
  const createObservables = tramosDetails.map(detail => {
    // Formatear las fechas como strings ISO
    const fechaInicio = detail.fechaInicio instanceof Date 
      ? detail.fechaInicio.toISOString() 
      : detail.fechaInicio;
    
    const fechaFin = detail.fechaFin instanceof Date 
      ? detail.fechaFin.toISOString() 
      : detail.fechaFin;
    
    // Añadir el ID de planificación a cada detalle junto con los campos requeridos
    const detailWithPlanningId = {
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      kilos: detail.kilos || 0,
      tramo: detail.tramo || 0, // Usar 'tramo' en singular según el modelo de la API
      // Cambiado según lo que podría esperar el backend
      cultivePlanningId: Number(planningId)  // NOTA: Cambiado de 'idCultivePlanning' a 'cultivePlanningId'
    };
    
    // Log detallado para depuración
    console.log('Enviando detalle a la API:', JSON.stringify(detailWithPlanningId));
    console.log('Tipo de fechaInicio:', typeof detailWithPlanningId.fechaInicio);
    console.log('Valor de fechaInicio:', detailWithPlanningId.fechaInicio);
    console.log('Tipo de cultivePlanningId:', typeof detailWithPlanningId.cultivePlanningId);
    console.log('Número de tramo:', detailWithPlanningId.tramo);
    
    // Crear el detalle individual
    return this.http.post<CultivePlanningDetails>(this.apiUrl, detailWithPlanningId)
      .pipe(
        catchError(error => {
          console.error('Error al crear detalle:', error);
          console.error('Respuesta del servidor:', error.error);
          return throwError(() => error);
        })
      );
  });
  
  // Si no hay detalles para crear, devolver un array vacío
  if (createObservables.length === 0) {
    console.log('No hay detalles para crear');
    return of([]);
  }
  
  // Ejecutar todas las solicitudes en paralelo y esperar a que todas se completen
  return forkJoin(createObservables).pipe(
    catchError(error => {
      console.error('Error al crear múltiples detalles:', error);
      return throwError(() => error);
    })
  );
}
  
  /**
   * Calcula el total de kilos planificados para una planificación específica
   * @param planningId ID de la planificación
   * @returns Observable con el número total de kilos
   */
  getTotalKilosByPlanningId(planningId: string): Observable<number> {
    return this.getDetailsByPlanningId(planningId).pipe(
      map(details => details.reduce((total, detail) => total + detail.kilos, 0))
    );
  }

  updateCultivePlanningDetails(id: number, details: any): Observable<CultivePlanningDetails> {
    // Formatear las fechas como strings ISO
    const fechaInicio = details.fechaInicio instanceof Date 
      ? details.fechaInicio.toISOString() 
      : details.fechaInicio;
    
    const fechaFin = details.fechaFin instanceof Date 
      ? details.fechaFin.toISOString() 
      : details.fechaFin;
    
    // Crear el objeto con los campos necesarios para la actualización
    const updateDetails = {
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      kilos: details.kilos || 0,
      tramos: details.tramo || 0
    };
    
    return this.http
      .put<CultivePlanningDetails>(`${this.apiUrl}/${id}`, updateDetails)
      .pipe(catchError(this.handleError));
  }

  deleteCultivePlanningDetails(id: number): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Elimina todos los detalles asociados a una planificación
   * @param planningId ID de la planificación
   * @returns Observable con el resultado de la operación
   */
  deleteDetailsByPlanningId(planningId: string): Observable<any> {
    return this.getDetailsByPlanningId(planningId).pipe(
      map(details => {
        const deleteObservables = details.map(detail => 
          this.deleteCultivePlanningDetails(detail.id) // Usar el ID propio del detalle
        );
        
        if (deleteObservables.length === 0) {
          return of(null);
        }
        
        return forkJoin(deleteObservables);
      }),
      catchError(error => {
        console.error('Error al eliminar detalles por ID de planificación:', error);
        return throwError(() => error);
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
      
      // Intentar mostrar detalles adicionales si están disponibles
      if (error.error) {
        try {
          const errorDetails = typeof error.error === 'string' 
            ? JSON.parse(error.error) 
            : error.error;
          
          console.error('Detalles del error del servidor:', errorDetails);
          
          if (errorDetails.message) {
            errorMessage += `\nDetalle: ${errorDetails.message}`;
          }
        } catch(e) {
          console.error('No se pudieron analizar los detalles del error:', e);
        }
      }
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}