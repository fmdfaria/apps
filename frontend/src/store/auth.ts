import { create } from 'zustand';
import type { User } from '../types/User';
import api from '../services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  requiresPasswordChange: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
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
      console.error('Erro ao salvar usuário no localStorage:', error);
      set({ user });
    }
  },

  login: async (email, senha) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/login', { email, senha });
      const { user, accessToken, requiresPasswordChange } = res.data;

      // Se requer mudança de senha, não armazena os tokens ainda
      if (requiresPasswordChange) {
        set({
          loading: false,
          requiresPasswordChange: true,
          user: { ...user, email } // Armazena email temporariamente
        });
        return;
      }

      if (accessToken) localStorage.setItem('accessToken', accessToken);
      if (user) {
        try {
          localStorage.setItem('user', JSON.stringify(user));
        } catch (jsonError) {
          console.error('Erro ao serializar usuário:', jsonError);
        }
      }

      set({ user, accessToken, loading: false, isAuthenticated: true, requiresPasswordChange: false });
    } catch (err: unknown) {
      console.error('Erro no login:', err);

      let errorMessage = 'Erro ao fazer login';

      // Tentar extrair mensagem de erro do axios response
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      }
      // Se for um erro padrão do JavaScript
      else if (err instanceof Error) {
        // Se a mensagem contém "Request failed", é erro genérico do axios
        if (err.message.includes('Request failed')) {
          errorMessage = 'Usuário ou senha inválidos.';
        } else {
          errorMessage = err.message;
        }
      }

      set({ error: errorMessage, loading: false });
    }
  },

  logout: () => {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Erro ao limpar localStorage:', error);
    }

    set({ user: null, accessToken: null, isAuthenticated: false });
    // Só redireciona se não estivermos já na página inicial ou de login
    if (!window.location.pathname.includes('/auth') && window.location.pathname !== '/') {
      window.location.href = '/';
    }
  },

  setAuth: (token) => set({ accessToken: token, isAuthenticated: !!token }),

  initializeAuth: async () => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedUser = getStoredUser();

    // Se não há token, limpa tudo e sai
    if (!storedAccessToken) {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false
      });
      return;
    }

    // Se tem token, carrega os dados do usuário
    set({
      user: storedUser,
      accessToken: storedAccessToken,
      isAuthenticated: true
    });
  },

  completeFirstLogin: (authData) => {
    const { user, accessToken } = authData;

    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (user) {
      try {
        localStorage.setItem('user', JSON.stringify(user));
      } catch (jsonError) {
        console.error('Erro ao serializar usuário:', jsonError);
      }
    }

    set({
      user,
      accessToken,
      isAuthenticated: true,
      requiresPasswordChange: false,
      loading: false,
      error: null
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
