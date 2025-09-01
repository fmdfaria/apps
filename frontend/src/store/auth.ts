import { create } from 'zustand';
import type { User } from '../types/User';
import api from '../services/api';
import { isTokenExpired, isTokenExpiringSoon } from '../utils/jwt';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  requiresPasswordChange: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  setAuth: (token: string | null) => void;
  initializeAuth: () => Promise<void>;
  checkTokenValidity: () => Promise<void>;
  startTokenWatcher: () => void;
  stopTokenWatcher: () => void;
  updateLastActivity: () => void;
  startActivityTracking: () => void;
  stopActivityTracking: () => void;
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

// Timer para verificação periódica de tokens
let tokenWatcherInterval: NodeJS.Timeout | null = null;

// Controle de atividade do usuário
let lastActivity = Date.now();
let activityListeners: (() => void)[] = [];

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
      console.error('Erro ao salvar usuário no localStorage:', error);
      set({ user });
    }
  },

  login: async (email, senha) => {
    // Para o token watcher durante o login para evitar interferências
    useAuthStore.getState().stopTokenWatcher();
    set({ loading: true, error: null });
    try {
      const res = await api.post('/login', { email, senha });
      const { user, accessToken, refreshToken, requiresPasswordChange } = res.data;
      
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
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      if (user) {
        try {
      localStorage.setItem('user', JSON.stringify(user));
        } catch (jsonError) {
          console.error('Erro ao serializar usuário:', jsonError);
        }
      }
      
      set({ user, accessToken, refreshToken, loading: false, isAuthenticated: true, requiresPasswordChange: false });
      
      // Inicia o token watcher após login bem-sucedido
      useAuthStore.getState().startTokenWatcher();
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
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    } catch (error) {
      console.error('Erro ao limpar localStorage:', error);
    }
    
    // Para o token watcher
    useAuthStore.getState().stopTokenWatcher();
    
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
    // Só redireciona se não estivermos já na página inicial ou de login
    if (!window.location.pathname.includes('/auth') && window.location.pathname !== '/') {
      window.location.href = '/';
    }
  },

  refresh: async () => {
    set({ loading: true });
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const res = await api.post('/refresh', { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = res.data;
      
      if (accessToken) {
        try {
          localStorage.setItem('accessToken', accessToken);
          // Atualiza refresh token se fornecido
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
        } catch (storageError) {
          console.error('Erro ao salvar tokens no localStorage:', storageError);
        }
      }
      
      set({ 
        accessToken, 
        refreshToken: newRefreshToken || refreshToken, // usa o novo ou mantém o atual
        loading: false, 
        isAuthenticated: true 
      });
    } catch (err) {
      console.error('Erro ao renovar token:', err);
      set({ loading: false });
      // Se falhar, faz logout automático
      (useAuthStore.getState().logout)();
    }
  },

  setAuth: (token) => set({ accessToken: token, isAuthenticated: !!token }),

  initializeAuth: async () => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedUser = getStoredUser();

    // Se não há tokens, limpa tudo e sai
    if (!storedAccessToken && !storedRefreshToken) {
      set({ 
        user: null, 
        accessToken: null, 
        refreshToken: null, 
        isAuthenticated: false 
      });
      return;
    }

    // Verifica se o refresh token está expirado
    if (storedRefreshToken && isTokenExpired(storedRefreshToken)) {
      console.log('🔒 Refresh token expirado, fazendo logout automático');
      useAuthStore.getState().logout();
      return;
    }

    // Se o access token está expirado mas temos refresh token válido, renova
    if (storedAccessToken && isTokenExpired(storedAccessToken) && storedRefreshToken) {
      try {
        console.log('🔄 Access token expirado, tentando renovar automaticamente...');
        await useAuthStore.getState().refresh();
        useAuthStore.getState().startTokenWatcher();
        return;
      } catch (error) {
        console.error('Erro ao renovar token na inicialização:', error);
        useAuthStore.getState().logout();
        return;
      }
    }

    // Se chegou até aqui, os tokens parecem válidos
    set({ 
      user: storedUser, 
      accessToken: storedAccessToken, 
      refreshToken: storedRefreshToken,
      isAuthenticated: !!storedAccessToken 
    });
    
    useAuthStore.getState().startTokenWatcher();
  },

  checkTokenValidity: async () => {
    const { accessToken, refreshToken } = useAuthStore.getState();

    if (!refreshToken) {
      console.log('🔒 Sem refresh token, fazendo logout');
      useAuthStore.getState().logout();
      return;
    }

    // Se refresh token expirado, faz logout
    if (isTokenExpired(refreshToken)) {
      console.log('🔒 Refresh token expirado, fazendo logout');
      useAuthStore.getState().logout();
      return;
    }

    // Só renova se o usuário esteve ativo nos últimos 10 minutos
    const timeSinceLastActivity = Date.now() - lastActivity;
    const isUserActive = timeSinceLastActivity < 10 * 60 * 1000; // 10 minutos

    // Se access token está expirando em menos de 2 minutos E usuário está ativo, renova
    if (accessToken && isTokenExpiringSoon(accessToken, 2) && isUserActive) {
      try {
        console.log('🔄 Access token expirando em breve e usuário ativo, renovando...');
        await useAuthStore.getState().refresh();
      } catch (error) {
        console.error('Erro ao renovar token automaticamente:', error);
        useAuthStore.getState().logout();
      }
    } else if (accessToken && isTokenExpiringSoon(accessToken, 2) && !isUserActive) {
      console.log('⏸️  Access token expirando mas usuário inativo - aguardando atividade');
    }
  },

  startTokenWatcher: () => {
    // Limpa qualquer timer anterior
    if (tokenWatcherInterval) {
      clearInterval(tokenWatcherInterval);
    }

    // Verifica a cada 30 minutos
    tokenWatcherInterval = setInterval(() => {
      useAuthStore.getState().checkTokenValidity();
    }, 30 * 60 * 1000);

    // Inicia o rastreamento de atividade
    useAuthStore.getState().startActivityTracking();

    console.log('Token watcher iniciado - verificação a cada 30 minutos');
  },

  stopTokenWatcher: () => {
    if (tokenWatcherInterval) {
      clearInterval(tokenWatcherInterval);
      tokenWatcherInterval = null;
      console.log('Token watcher parado');
    }
    useAuthStore.getState().stopActivityTracking();
  },

  updateLastActivity: () => {
    lastActivity = Date.now();
  },

  startActivityTracking: () => {
    const updateActivity = () => {
      useAuthStore.getState().updateLastActivity();
    };

    // Lista de eventos que indicam atividade do usuário
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Remove listeners antigos
    useAuthStore.getState().stopActivityTracking();
    
    // Adiciona novos listeners
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
      activityListeners.push(() => document.removeEventListener(event, updateActivity));
    });
  },

  stopActivityTracking: () => {
    activityListeners.forEach(removeListener => removeListener());
    activityListeners = [];
  },

  completeFirstLogin: (authData) => {
    const { user, accessToken, refreshToken } = authData;
    
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
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
      refreshToken, 
      isAuthenticated: true, 
      requiresPasswordChange: false,
      loading: false,
      error: null
    });
    
    // Inicia o token watcher após primeiro login completo
    useAuthStore.getState().startTokenWatcher();
  },

  clearError: () => {
    set({ error: null });
  },
})); 