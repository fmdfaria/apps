import { useAuthStore } from '../store/auth';

export function useAuth() {
  const {
    user,
    accessToken,
    refreshToken,
    loading,
    error,
    requiresPasswordChange,
    login,
    logout,
    refresh,
    setUser,
    completeFirstLogin,
    clearError,
  } = useAuthStore();

  return {
    user,
    accessToken,
    refreshToken,
    loading,
    error,
    requiresPasswordChange,
    login,
    logout,
    refresh,
    setUser,
    completeFirstLogin,
    clearError,
    isAuthenticated: !!accessToken,
  };
} 