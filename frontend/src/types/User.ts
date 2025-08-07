export type UserType = 'ADMIN' | 'RECEPCIONISTA' | 'PROFISSIONAL' | 'PACIENTE';

export interface User {
  id: string;
  nome: string;
  email: string;
  tipo: UserType;
  ativo: boolean;
  roles?: string[]; // Nova propriedade para roles RBAC
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
} 