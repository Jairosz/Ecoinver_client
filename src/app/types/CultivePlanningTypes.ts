// src/app/types/CultivePlanningTypes.ts

/** Lo que envías al crear una planificación */
export interface CreateCultivePlanningDto {
    nombre:      string;
    fechaInicio: Date;    // ISO string
    fechaFin:    Date;    // ISO string
    idGenero?:   number;    // <-- aquí va el IdGenero seleccionado
  }
  
  /** Lo que envías al actualizar una planificación */
  export interface UpdateCultivePlanningDto {
    nombre:      string;
    fechaInicio: Date;
    fechaFin:    Date;
    idGenero?:   number;
  }
  