import { create } from 'zustand';
import type { User } from '../types/User';
import api from '../services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  requiresPasswordChange: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<boolean>;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  setAuth: (token: string | null) => void;
  initializeAuth: () => Promise<void>;
  completeFirstLogin: (authData: any) => void;
  clearError: () => void;
}

const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem('user');
    return storedUser && storedUser !== 'undefined' ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  loading: false,
  error: null,
  requiresPasswordChange: false,
  isAuthenticated: !!localStorage.getItem('accessToken'),

  setUser: (user) => {
    try {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
      set({ user });
    } catch (error) {
      console.error('Erro ao salvar usuario no localStorage:', error);
      set({ user });
    }
  },

  login: async (email, senha) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/login', { email, senha });
      const { user, accessToken, refreshToken, requiresPasswordChange } = res.data;

      if (requiresPasswordChange) {
        set({
          loading: false,
          requiresPasswordChange: true,
          user: { ...user, email },
        });
        return;
      }

      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      if (user) {
        try {
          localStorage.setItem('user', JSON.stringify(user));
        } catch (jsonError) {
          console.error('Erro ao serializar usuario:', jsonError);
        }
      }

      set({
        user,
        accessToken,
        refreshToken,
        loading: false,
        isAuthenticated: true,
        requiresPasswordChange: false,
      });
    } catch (err: unknown) {
      console.error('Erro no login:', err);

      let errorMessage = 'Erro ao fazer login';

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      } else if (err instanceof Error) {
        if (err.message.includes('Request failed')) {
          errorMessage = 'Usuario ou senha invalidos.';
        } else {
          errorMessage = err.message;
        }
      }

      set({ error: errorMessage, loading: false });
    }
  },

  logout: () => {
    const currentRefreshToken = localStorage.getItem('refreshToken');

    if (currentRefreshToken) {
      void api.post('/logout', { refreshToken: currentRefreshToken }).catch(() => undefined);
    }

    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Erro ao limpar localStorage:', error);
    }

    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
    if (!window.location.pathname.includes('/auth') && window.location.pathname !== '/') {
      window.location.href = '/';
    }
  },

  refresh: async () => {
    const currentRefreshToken = localStorage.getItem('refreshToken');

    if (!currentRefreshToken) {
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      return false;
    }

    try {
      const response = await api.post('/refresh', { refreshToken: currentRefreshToken }, { skipAuthRefresh: true } as any);
      const { user, accessToken, refreshToken } = response.data;

      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }

      set({ user, accessToken, refreshToken, isAuthenticated: !!accessToken });
      return true;
    } catch {
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      return false;
    }
  },

  setAuth: (token) => set({ accessToken: token, isAuthenticated: !!token }),

  initializeAuth: async () => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedUser = getStoredUser();

    if (!storedAccessToken) {
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
      return;
    }

    set({
      user: storedUser,
      accessToken: storedAccessToken,
      refreshToken: storedRefreshToken,
      isAuthenticated: true,
    });
  },

  completeFirstLogin: (authData) => {
    const { user, accessToken, refreshToken } = authData;

    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    if (user) {
      try {
        localStorage.setItem('user', JSON.stringify(user));
      } catch (jsonError) {
        console.error('Erro ao serializar usuario:', jsonError);
      }
    }

    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      requiresPasswordChange: false,
      loading: false,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
