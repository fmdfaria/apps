export interface User {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  roles: string[]; // Array de roles para RBAC
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
} 