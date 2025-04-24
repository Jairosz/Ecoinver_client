// Update this interface in your types/CultivePlanningDetails.ts file
export interface CultivePlanningDetails {
  id: number;
  fechaInicio: Date | string;
  fechaFin: Date | string;
  kilos: number;
  tramo: number; 
  idCultivePlanning?: number; // Optional as it might be called different in your API
  cultivePlanningId: number; // Adding this as it appears in your API response
}