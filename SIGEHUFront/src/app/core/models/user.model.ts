export interface User {
  idTrabajador: number;
  usuario: string;
  nombre: string;
  rol: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  trabajador: User;
}

export interface LoginCredentials {
  Usuario: string;
  Contra: string;
}