// src/app/types/CultiveProductionTypes.ts

/** DTO de lectura para CultiveProduction */
export interface CultiveProductionDto {
  /** Identificador único */
  id: number;
  /** Llave foránea a detalles de planificación */
  cultivePlanningDetailsId: number;
  /** Kilos producidos (crudos) */
  kilos: string;
  /** Fecha de inicio (ISO 8601) */
  fechaInicio?: string;
  /** Fecha de fin (ISO 8601) */
  fechaFin?: string;
  /** FK al cultivo */
  cultiveId: number;
}

/** DTO para creación de CultiveProduction */
export interface CreateCultiveProductionDto {
  /** Llave foránea a detalles de planificación */
  cultivePlanningDetailsId: number;
  /** FK al cultivo */
  cultiveId: number;
  /** Kilos producidos (crudos) */
  kilos: string;
  /** Fecha de inicio (ISO 8601) */
  fechaInicio: string;
  /** Fecha de fin (ISO 8601) */
  fechaFin: string;
}

/** DTO para actualización de CultiveProduction */
export interface UpdateCultiveProductionDto {
  /** Llave foránea a detalles de planificación */
  cultivePlanningDetailsId: number;
  /** FK al cultivo */
  cultiveId: number;
  /** Kilos producidos (crudos) */
  kilos: string;
  /** Fecha de inicio (ISO 8601) */
  fechaInicio?: string;
  /** Fecha de fin (ISO 8601) */
  fechaFin?: string;
}
