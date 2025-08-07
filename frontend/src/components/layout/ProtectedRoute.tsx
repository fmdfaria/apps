import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle, Shield } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPath?: string;
  requiredModule?: string;
  requiredRole?: string;
  fallback?: string;
  showAccessDenied?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPath,
  requiredModule,
  requiredRole,
  fallback = '/dashboard',
  showAccessDenied = true
}) => {
  const { user, isAuthenticated } = useAuth();
  const { canAccess, canAccessModule, hasRole, isAdmin, isLoading } = usePermissions();
  const location = useLocation();

  // Se não está autenticado, redireciona para login
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Se está carregando as permissões, mostra loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Verificar se o usuário é admin (admin tem acesso a tudo)
  if (isAdmin()) {
    return <>{children}</>;
  }

  // Verificar permissão por role específica
  if (requiredRole && !hasRole(requiredRole)) {
    if (showAccessDenied) {
      return (
        <div className="p-6">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Acesso negado. É necessário ter a permissão "{requiredRole}" para acessar esta página.
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    return <Navigate to={fallback} replace />;
  }

  // Verificar permissão por módulo
  if (requiredModule && !canAccessModule(requiredModule)) {
    if (showAccessDenied) {
      return (
        <div className="p-6">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Acesso negado. Você não possui permissão para acessar o módulo "{requiredModule}".
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    return <Navigate to={fallback} replace />;
  }

  // Verificar permissão por rota específica
  if (requiredPath && !canAccess(requiredPath)) {
    if (showAccessDenied) {
      return (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Acesso negado. Você não possui permissão para acessar esta página.
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    return <Navigate to={fallback} replace />;
  }

  // Se chegou até aqui, tem permissão
  return <>{children}</>;
};

// Componente de conveniência para rotas administrativas
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ProtectedRoute requiredModule="admin" requiredRole="ADMIN">
      {children}
    </ProtectedRoute>
  );
};

// Componente de conveniência para verificar acesso apenas
export const ConditionalRender: React.FC<{
  children: React.ReactNode;
  requiredPath?: string;
  requiredModule?: string;
  requiredRole?: string;
  fallback?: React.ReactNode;
}> = ({ 
  children, 
  requiredPath, 
  requiredModule, 
  requiredRole, 
  fallback = null 
}) => {
  const { canAccess, canAccessModule, hasRole, isAdmin, isLoading } = usePermissions();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated || isLoading) {
    return <>{fallback}</>;
  }

  // Admin tem acesso a tudo
  if (isAdmin()) {
    return <>{children}</>;
  }

  // Verificar permissões
  const hasRequiredRole = !requiredRole || hasRole(requiredRole);
  const hasRequiredModule = !requiredModule || canAccessModule(requiredModule);
  const hasRequiredPath = !requiredPath || canAccess(requiredPath);

  if (hasRequiredRole && hasRequiredModule && hasRequiredPath) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};