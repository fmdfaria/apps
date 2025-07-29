import { create } from 'zustand';
import type { User } from '../types/User';
import api from '../services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  setAuth: (token: string | null) => void;
  initializeAuth: () => void;
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
      const { user, accessToken, refreshToken } = res.data;
      
      if (accessToken) localStorage.setItem('accessToken', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      if (user) {
        try {
          localStorage.setItem('user', JSON.stringify(user));
        } catch (jsonError) {
          console.error('Erro ao serializar usuário:', jsonError);
        }
      }
      
      set({ user, accessToken, refreshToken, loading: false, isAuthenticated: true });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao fazer login';
      set({ error: errorMessage, loading: false });
    }
  },

  logout: () => {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Erro ao limpar localStorage:', error);
    }
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
    window.location.href = '/';
  },

  refresh: async () => {
    set({ loading: true });
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const res = await api.post('/refresh', { refreshToken });
      const { accessToken } = res.data;
      
      if (accessToken) {
        try {
          localStorage.setItem('accessToken', accessToken);
        } catch (storageError) {
          console.error('Erro ao salvar token no localStorage:', storageError);
        }
      }
      
      set({ accessToken, loading: false, isAuthenticated: true });
    } catch (err) {
      console.error('Erro ao renovar token:', err);
      set({ loading: false });
      // Se falhar, faz logout automático
      (useAuthStore.getState().logout)();
    }
  },

  setAuth: (token) => set({ accessToken: token, isAuthenticated: !!token }),

  initializeAuth: () => {
    const token = localStorage.getItem('accessToken');
    const user = getStoredUser();
    set({ accessToken: token, isAuthenticated: !!token, user });
  },
})); 