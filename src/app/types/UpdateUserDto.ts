export interface UpdateUserDTO {
  nombreCompleto: string; // Esto debería ser un string, no una cadena vacía
  username: string;
  password: string;
  role: string;
  email: string,
}
