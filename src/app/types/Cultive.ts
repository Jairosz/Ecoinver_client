export interface Cultive {
    id: number;                  // Clave autoincremental local
    idCultivo: number;           // ID original del ERP
    idAgricultor?: number;       // Opcional en C#
    nombreAgricultor: string;
    idFinca?: number;            // Opcional
    nombreFinca: string;
    idNave?: number;             // Opcional
    nombreNave: string;
    idGenero?: number;           // Opcional
    nombreGenero: string;
    nombreVariedad: string;
    superficie?: number;         // Opcional
    produccionEstimada?: number; // Opcional
    fechaSiembra?: Date;         // Opcional
    fechaFin?: Date;             // Opcional
  }
  