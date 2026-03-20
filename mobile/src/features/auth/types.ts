export type LoginFormValues = {
  email: string;
  password: string;
};

export type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;

export type User = {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  ativo: boolean;
  primeiroLogin: boolean;
  roles: string[];
  profissionalId?: string | null;
  pacienteId?: string | null;
  avatarUrl?: string | null;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
  requiresPasswordChange: boolean;
};

export type FirstLoginRequest = {
  email: string;
  senhaAtual: string;
  novaSenha: string;
};

export type FirstLoginResponse = {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type UserPermission = {
  path: string;
  method: string;
  modulo?: string;
};

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

export type FirstLoginChallenge = {
  email: string;
  senhaAtual: string;
};
