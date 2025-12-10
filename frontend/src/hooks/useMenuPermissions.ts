import { useState, useEffect } from 'react';
import api from '@/services/api';

// Mapeamento de rotas para verificação de permissões
const routePermissionMap: Record<string, { path: string; method: string }> = {
  'dashboard': { path: '/dashboard', method: 'GET' },
  'dashboard/pedidos-medicos': { path: '/pedidos-medicos', method: 'GET' },
  'calendario': { path: '/agendamentos-calendario', method: 'GET' },
  'agendamentos': { path: '/agendamentos', method: 'GET' },
  'agendamentos/liberacao': { path: '/agendamentos-liberar/:id', method: 'PUT' },
  'agendamentos/liberacao-particulares': { path: '/agendamentos-liberar-particular/:id', method: 'PUT' },
  'agendamentos/calendario-profissional': { path: '/agendamentos-calendario-profissional', method: 'GET' },
  'agendamentos/atendimento': { path: '/agendamentos-atender/:id', method: 'PUT' },
  'agendamentos/conclusao': { path: '/agendamentos-concluir-page', method: 'GET' },
  'agendamentos/fechamento': { path: '/agendamentos-fechamento', method: 'GET' },
  'agendamentos/pagamentos': { path: '/agendamentos-pagamentos', method: 'GET' },
  'agendamentos/pendencias': { path: '/agendamentos-pendencias', method: 'GET' },
  'pacientes': { path: '/pacientes', method: 'GET' },
  'pacientes/evolucoes': { path: '/evolucoes', method: 'GET' },
  'pacientes/evolucoes-create': { path: '/evolucoes', method: 'POST' },
  'pacientes/evolucoes-update': { path: '/evolucoes/:id', method: 'PUT' },
  'pacientes/evolucoes-delete': { path: '/evolucoes/:id', method: 'DELETE' },
  'pacientes/precos-particulares': { path: '/precos-particulares', method: 'GET' },
  'fila-de-espera': { path: '/fila-de-espera', method: 'GET' },
  'profissionais': { path: '/profissionais', method: 'POST' },
  'profissionais/disponibilidade': { path: '/disponibilidades-profissionais', method: 'GET' },
  'servicos': { path: '/servicos-page', method: 'GET' },
  'servicos/precos-profissionais': { path: '/precos-servicos-profissionais', method: 'GET' },
  'convenios': { path: '/convenios-page', method: 'GET' },
  'recursos': { path: '/recursos', method: 'POST' },
  'especialidades': { path: '/especialidades-menu', method: 'GET' },
  'conselhos': { path: '/conselhos', method: 'GET' },
  'bancos': { path: '/bancos', method: 'GET' },
  'administracao/usuarios': { path: '/users', method: 'GET' },
  'administracao/roles': { path: '/roles', method: 'GET' },
  'administracao/rotas': { path: '/routes', method: 'GET' },
  'administracao/usuarios-roles': { path: '/user-roles', method: 'GET' },
  'administracao/permissoes': { path: '/role-routes', method: 'GET' },
  'configuracoes': { path: '/configuracoes', method: 'GET' },
  'financeiro/empresas': { path: '/empresas', method: 'GET' },
  'financeiro/contas-bancarias': { path: '/contas-bancarias', method: 'GET' },
  'financeiro/contas-receber': { path: '/contas-receber', method: 'GET' },
  'financeiro/contas-pagar': { path: '/contas-pagar', method: 'GET' },
  'financeiro/categorias-financeiras': { path: '/categorias-financeiras', method: 'GET' },
  'financeiro/fluxo-caixa': { path: '/fluxo-caixa', method: 'GET' },
  'financeiro/relatorios': { path: '/relatorios-financeiros', method: 'GET' },
  'financeiro/historico': { path: '/profissionais/historico-financeiro/me', method: 'GET' },
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
      
      
      // Remover override do Dashboard - deve respeitar permissões de rota
      // userPermissions['dashboard'] = true; // REMOVIDO: deve seguir permissões normais
      
      console.log('🔍 Permissões carregadas:', userPermissions);
      console.log('🏦 Tem permissão para contas bancárias:', userPermissions['financeiro/contas-bancarias']);
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

  return {
    permissions,
    loading,
    hasPermission,
    refetchPermissions: fetchUserPermissions
  };
};