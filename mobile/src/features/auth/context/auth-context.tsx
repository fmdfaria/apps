import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  firstLogin as firstLoginRequest,
  getCurrentUser,
  getCurrentUserPermissions,
  login as loginRequest,
  logout as logoutRequest,
  refreshSession,
} from '@/features/auth/services/auth-api';
import { clearSessionStorage, getRefreshToken, getStoredUser, storeTokens, storeUser } from '@/features/auth/storage';
import { canAccessFeature, type FeatureKey } from '@/features/auth/permissions';
import type { FirstLoginChallenge, FirstLoginRequest, User, UserPermission } from '@/features/auth/types';

type LoginResult = {
  requiresPasswordChange: boolean;
};

type AuthContextValue = {
  user: User | null;
  permissions: UserPermission[];
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;
  firstLoginChallenge: FirstLoginChallenge | null;
  canAccessFeature: (feature: FeatureKey) => boolean;
  login: (email: string, senha: string) => Promise<LoginResult>;
  submitFirstLogin: (payload: Omit<FirstLoginRequest, 'email' | 'senhaAtual'>) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getErrorMessage(error: unknown, fallback: string) {
  const response = typeof error === 'object' && error && 'response' in error
    ? (error as { response?: { status?: number; data?: { message?: string } } }).response
    : undefined;
  const status = response?.status;
  const maybeMessage = response?.data?.message?.trim();

  const normalizedMessage = maybeMessage
    ? maybeMessage
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
    : '';

  if (
    status === 401 ||
    normalizedMessage.includes('credenciais invalidas') ||
    normalizedMessage.includes('usuario ou senha invalidos') ||
    normalizedMessage.includes('usuario nao encontrado') ||
    normalizedMessage.includes('senha incorreta')
  ) {
    return 'Usuário ou senha inválidos. Confira os dados e tente novamente.';
  }

  if (status === 429) {
    return 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.';
  }

  if (typeof error === 'object' && error && 'response' in error) {
    if (maybeMessage) {
      return maybeMessage;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstLoginChallenge, setFirstLoginChallenge] = useState<FirstLoginChallenge | null>(null);

  const finalizeAuthenticatedSession = useCallback(async (nextUser: User, accessToken: string, refreshToken: string) => {
    await storeTokens({ accessToken, refreshToken });

    let resolvedUser = nextUser;
    try {
      // Garante alinhamento com o estado atual do backend apÃ³s login/refresh/first-login.
      const currentUser = await getCurrentUser();
      resolvedUser = {
        ...nextUser,
        ...currentUser,
        roles: Array.isArray((currentUser as Partial<User>).roles) && (currentUser as Partial<User>).roles?.length
          ? (currentUser as Partial<User>).roles!
          : nextUser.roles || [],
      };
    } catch {
      resolvedUser = nextUser;
    }

    await storeUser(resolvedUser);
    try {
      const nextPermissions = await getCurrentUserPermissions();
      setPermissions(nextPermissions);
    } catch {
      setPermissions([]);
    }
    setUser(resolvedUser);
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      const refreshToken = await getRefreshToken();
      const localUser = await getStoredUser();

      if (!refreshToken) {
        setUser(localUser && localUser.primeiroLogin ? localUser : null);
        return;
      }

      const refreshed = await refreshSession(refreshToken);
      await finalizeAuthenticatedSession(refreshed.user, refreshed.accessToken, refreshed.refreshToken);
    } catch {
      await clearSessionStorage();
      setUser(null);
      setPermissions([]);
      setFirstLoginChallenge(null);
    } finally {
      setIsInitializing(false);
    }
  }, [finalizeAuthenticatedSession]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await loginRequest(email, senha);

      if (response.requiresPasswordChange) {
        setFirstLoginChallenge({ email, senhaAtual: senha });
        setUser(response.user);
        setPermissions([]);
        return { requiresPasswordChange: true };
      }

      await finalizeAuthenticatedSession(response.user, response.accessToken, response.refreshToken);
      setFirstLoginChallenge(null);

      return { requiresPasswordChange: false };
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao realizar login.'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [finalizeAuthenticatedSession]);

  const submitFirstLogin = useCallback(async ({ novaSenha }: Omit<FirstLoginRequest, 'email' | 'senhaAtual'>) => {
    if (!firstLoginChallenge) {
      throw new Error('SessÃ£o de primeiro login nÃ£o encontrada.');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await firstLoginRequest({
        email: firstLoginChallenge.email,
        senhaAtual: firstLoginChallenge.senhaAtual,
        novaSenha,
      });

      await finalizeAuthenticatedSession(response.user, response.accessToken, response.refreshToken);
      setFirstLoginChallenge(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao concluir primeiro login.'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [finalizeAuthenticatedSession, firstLoginChallenge]);

  const logout = useCallback(async () => {
    const refreshToken = await getRefreshToken();

    try {
      await logoutRequest(refreshToken || undefined);
    } catch {
      // logout remoto best effort
    } finally {
      await clearSessionStorage();
      setUser(null);
      setPermissions([]);
      setFirstLoginChallenge(null);
      setError(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      permissions,
      isAuthenticated: Boolean(user && user.primeiroLogin && !firstLoginChallenge),
      isInitializing,
      isLoading,
      error,
      firstLoginChallenge,
      canAccessFeature: (feature: FeatureKey) => canAccessFeature(permissions, feature),
      login,
      submitFirstLogin,
      logout,
      clearError,
    };
  }, [clearError, error, firstLoginChallenge, isInitializing, isLoading, login, logout, permissions, submitFirstLogin, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}

