import { useAuthStore } from '../store/auth';

export function useAuth() {
  const {
    user,
    accessToken,
    refreshToken,
    loading,
    error,
    login,
    logout,
    refresh,
    setUser,
  } = useAuthStore();

  return {
    user,
    accessToken,
    refreshToken,
    loading,
    error,
    login,
    logout,
    refresh,
    setUser,
    isAuthenticated: !!accessToken,
  };
} 