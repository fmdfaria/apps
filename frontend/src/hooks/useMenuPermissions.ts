import { useState, useEffect } from 'react';
import api from '@/services/api';

// Mapeamento de rotas para verificação de permissões
const routePermissionMap: Record<string, { path: string; method: string }> = {
  // Páginas principais
  'dashboard': { path: '/dashboard', method: 'GET' },
  'calendario': { path: '/agendamentos', method: 'GET' }, // Calendário usa agendamentos
  'pacientes': { path: '/pacientes', method: 'GET' },
  'profissionais': { path: '/profissionais', method: 'GET' },
  'servicos': { path: '/servicos', method: 'GET' },
  'convenios': { path: '/convenios', method: 'GET' },
  'recursos': { path: '/recursos', method: 'GET' },
  'especialidades': { path: '/especialidades', method: 'GET' },
  'conselhos': { path: '/conselhos', method: 'GET' },
  'bancos': { path: '/bancos', method: 'GET' },
  
  // Subpáginas de agendamentos
  'agendamentos': { path: '/agendamentos', method: 'GET' },
  'agendamentos/liberacao': { path: '/agendamentos', method: 'GET' },
  'agendamentos/atendimento': { path: '/agendamentos', method: 'GET' },
  'agendamentos/conclusao': { path: '/agendamentos', method: 'GET' },
  
  // Subpáginas de pacientes
  'pacientes/precos-particulares': { path: '/precos-particulares', method: 'GET' },
  
  // Subpáginas de profissionais
  'profissionais/disponibilidade': { path: '/disponibilidades-profissionais', method: 'GET' },
  
  // Subpáginas de serviços
  'servicos/precos-profissionais': { path: '/precos-servicos-profissionais', method: 'GET' },
  
  // Páginas de administração
  'administracao': { path: '/users', method: 'GET' }, // Administração geral
  'administracao/usuarios': { path: '/users', method: 'GET' },
  'administracao/roles': { path: '/roles', method: 'GET' },
  'administracao/rotas': { path: '/routes', method: 'GET' },
  'administracao/usuarios-roles': { path: '/user-roles', method: 'GET' },
  'administracao/permissoes': { path: '/role-routes', method: 'GET' },
};

interface UserPermissions {
  [key: string]: boolean;
}

export const useMenuPermissions = () => {
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserPermissions();
  }, []);

  const fetchUserPermissions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Converter rotas em permissões booleanas para cada página
      const userPermissions: UserPermissions = {};
      
      // Para cada página no mapeamento, verificar se o usuário tem permissão
      Object.entries(routePermissionMap).forEach(([pageId, routeConfig]) => {
        const hasPermission = allowedRoutes.some((route: any) => {
          return route.path === routeConfig.path && 
                 route.method.toLowerCase() === routeConfig.method.toLowerCase();
        });
        
        userPermissions[pageId] = hasPermission;
      });
      
      // Dashboard sempre visível (usuário autenticado)
      userPermissions['dashboard'] = true;
      
      console.log('🔐 Permissões do menu calculadas:', userPermissions);
      setPermissions(userPermissions);
      
    } catch (error) {
      console.error('❌ Erro ao buscar permissões do usuário:', error);
      // Em caso de erro, mostrar apenas dashboard por segurança
      setPermissions({ 'dashboard': true });
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (pageId: string): boolean => {
    return permissions[pageId] ?? false;
  };

  const hasAnyChildPermission = (children: Array<{ id: string }>): boolean => {
    return children.some(child => hasPermission(child.id));
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyChildPermission,
    refetchPermissions: fetchUserPermissions
  };
};