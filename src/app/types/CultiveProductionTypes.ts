// src/app/types/CultiveProductionTypes.ts

/** DTO de lectura para CultiveProduction */
export interface CultiveProductionDto {
    /** Identificador único */
    id: number;
    /** Llave foránea a detalles de planificación */
    cultivePlanningDetailsId: number;
    /** Kilos producidos */
    kilos: string;
    /** Fecha de inicio (ISO 8601) */
    fechaInicio?: string;
    /** Fecha de fin (ISO 8601) */
    fechaFin?: string;
    /** Navegación: Identificador del detalle de planificación */
    //cultivePlanningDetails: number;
  }
  
  /** DTO para creación de CultiveProduction */
  export interface CreateCultiveProductionDto {
    /** Llave foránea a detalles de planificación */
    cultivePlanningDetailsId: number;
    /** Kilos producidos */
    kilos: string;
    /** Fecha de inicio (ISO 8601) */
    fechaInicio?: string;
    /** Fecha de fin (ISO 8601) */
    fechaFin?: string;
    /** Navegación: Identificador del detalle de planificación */
    //cultivePlanningDetails: number;
  }
  
  /** DTO para actualización de CultiveProduction */
  export interface UpdateCultiveProductionDto {
    /** Llave foránea a detalles de planificación */
    cultivePlanningDetailsId: number;
    /** Kilos producidos */
    kilos: string;
    /** Fecha de inicio (ISO 8601) */
    fechaInicio?: string;
    /** Fecha de fin (ISO 8601) */
    fechaFin?: string;
    /** Navegación: Identificador del detalle de planificación */
    //cultivePlanningDetails: number;
  }