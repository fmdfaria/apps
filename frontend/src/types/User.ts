export interface User {
  id: string;
  nome: string;
  email: string;
  whatsapp: string; // Formato armazenado: 5511999999999 ou 551199999999
  ativo: boolean;
  primeiroLogin: boolean;
  roles: string[]; // Array de roles para RBAC
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  requiresPasswordChange: boolean;
}

export interface CreateUserRequest {
  nome: string;
  email: string;
  whatsapp: string;
  profissionalId?: string;
  pacienteId?: string;
}

export interface CreateUserResponse {
  user: Omit<User, 'senha'>;
  senhaTemporaria: string;
}

export interface FirstLoginRequest {
  email: string;
  senhaAtual: string;
  novaSenha: string;
}

export interface FirstLoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: User;
} 