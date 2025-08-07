import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { rbacService } from '../services/rbac';
import { UserAllowedRoute } from '../types/RBAC';

export const usePermissions = () => {
  const { user } = useAuth();
  
  const { data: allowedRoutes = [], isLoading, error } = useQuery({
    queryKey: ['user-allowed-routes', user?.id],
    queryFn: () => user?.id ? rbacService.getUserAllowedRoutes(user.id) : Promise.resolve([]),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (gcTime é a nova propriedade no React Query v5)
  });

  // Verificar se o usuário tem permissão para uma rota específica
  const hasPermission = (path: string, method = 'GET') => {
    if (!allowedRoutes.length) return false;
    
    return allowedRoutes.some((route: UserAllowedRoute) => {
      // Exact match primeiro
      if (route.path === path && route.method.toLowerCase() === method.toLowerCase()) {
        return true;
      }
      
      // Pattern matching para rotas dinâmicas
      const routePattern = route.path.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${routePattern}$`);
      
      return regex.test(path) && route.method.toLowerCase() === method.toLowerCase();
    });
  };

  // Verificar se o usuário pode acessar uma rota (mais simples, só path)
  const canAccess = (routePath: string) => {
    if (!allowedRoutes.length) return false;
    
    return allowedRoutes.some((route: UserAllowedRoute) => {
      // Exact match primeiro
      if (route.path === routePath) {
        return true;
      }
      
      // Pattern matching para rotas dinâmicas
      const routePattern = route.path.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${routePattern}$`);
      
      return regex.test(routePath);
    });
  };

  // Filtrar rotas permitidas por módulo
  const getRoutesByModule = (modulo: string) => {
    return allowedRoutes.filter((route: UserAllowedRoute) => route.modulo === modulo);
  };

  // Verificar se o usuário tem acesso a qualquer rota de um módulo
  const canAccessModule = (modulo: string) => {
    return allowedRoutes.some((route: UserAllowedRoute) => route.modulo === modulo);
  };

  // Obter todas as rotas permitidas agrupadas por módulo
  const getRoutesByModules = () => {
    const grouped: Record<string, UserAllowedRoute[]> = {};
    
    allowedRoutes.forEach((route: UserAllowedRoute) => {
      const module = route.modulo || 'geral';
      if (!grouped[module]) {
        grouped[module] = [];
      }
      grouped[module].push(route);
    });
    
    return grouped;
  };

  // Verificar se o usuário é admin (tem role ADMIN)
  const isAdmin = () => {
    return user?.roles?.includes('ADMIN') || user?.tipo === 'ADMIN';
  };

  // Verificar se o usuário tem uma role específica
  const hasRole = (roleName: string) => {
    return user?.roles?.includes(roleName);
  };

  return {
    allowedRoutes,
    isLoading,
    error,
    hasPermission,
    canAccess,
    getRoutesByModule,
    canAccessModule,
    getRoutesByModules,
    isAdmin,
    hasRole,
    // Métodos de conveniência
    canManageUsers: () => canAccess('/admin/users') || isAdmin(),
    canManageRoles: () => canAccess('/admin/roles') || isAdmin(),
    canManagePermissions: () => canAccess('/admin/permissions') || isAdmin(),
    canViewReports: () => canAccessModule('relatorios') || isAdmin(),
  };
};