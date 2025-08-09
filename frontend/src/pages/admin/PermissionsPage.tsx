import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Settings, UserX, UserCheck, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AppToast } from '@/services/toast';
import { rbacService } from '@/services/rbac';
import type { RoleRoute, Role, Route, AssignRouteToRoleRequest, UpdateRoleRouteRequest } from '@/types/RBAC';
import { FormErrorMessage } from '@/components/form-error-message';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { 
  PageContainer, 
  PageHeader, 
  PageContent, 
  ViewToggle, 
  SearchBar, 
  FilterButton,
  DynamicFilterPanel,
  ResponsiveTable, 
  ResponsiveCards, 
  ResponsivePagination,
  ActionButton,
  TableColumn,
  ResponsiveCardFooter 
} from '@/components/layout';
import type { FilterConfig } from '@/types/filters';
import { useViewMode } from '@/hooks/useViewMode';
import { useResponsiveTable } from '@/hooks/useResponsiveTable';
import { useTableFilters } from '@/hooks/useTableFilters';

interface RoleRouteFormData {
  roleId: string;
  routeId: string;
  ativo: boolean;
}

// Interface estendida para exibição com dados relacionados
interface RoleRouteDisplay extends RoleRoute {
  role?: { nome: string; descricao?: string };
  route?: { path: string; method: string; nome: string; modulo?: string };
}

function getMethodColor(method: string) {
  const colors = {
    'GET': { bg: 'bg-blue-100', text: 'text-blue-800' },
    'POST': { bg: 'bg-green-100', text: 'text-green-800' },
    'PUT': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    'DELETE': { bg: 'bg-red-100', text: 'text-red-800' },
    'PATCH': { bg: 'bg-purple-100', text: 'text-purple-800' }
  };
  return colors[method as keyof typeof colors] || { bg: 'bg-gray-100', text: 'text-gray-800' };
}

function getRoleColor(roleId: string) {
  const colors = [
    { bg: 'bg-blue-100', text: 'text-blue-800' },
    { bg: 'bg-green-100', text: 'text-green-800' },
    { bg: 'bg-purple-100', text: 'text-purple-800' },
    { bg: 'bg-orange-100', text: 'text-orange-800' },
    { bg: 'bg-pink-100', text: 'text-pink-800' },
    { bg: 'bg-indigo-100', text: 'text-indigo-800' },
    { bg: 'bg-cyan-100', text: 'text-cyan-800' },
    { bg: 'bg-teal-100', text: 'text-teal-800' },
  ];
  
  let hash = 0;
  for (let i = 0; i < roleId.length; i++) {
    const char = roleId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export const PermissionsPage = () => {
  const [roleRoutes, setRoleRoutes] = useState<RoleRouteDisplay[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<RoleRouteDisplay | null>(null);
  const [form, setForm] = useState<RoleRouteFormData>({
    roleId: '',
    routeId: '',
    ativo: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<RoleRouteDisplay | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'permissions-view' });
  
  // Configuração das colunas da tabela
  const columns: TableColumn<RoleRouteDisplay>[] = [
    {
      key: 'role',
      header: '🛡️ Role',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome da role...',
        label: 'Role'
      },
      render: (item) => {
        if (item.role) {
          const colors = getRoleColor(item.role.nome);
          return (
            <Badge className={`${colors.bg} ${colors.text} text-xs font-medium w-fit`}>
              {item.role.nome}
            </Badge>
          );
        }
        return <span className="text-gray-400 text-xs">Role não encontrada</span>;
      }
    },
    {
      key: 'routeMethod',
      header: '📝 Method',
      essential: true,
      filterable: {
        type: 'select',
        label: 'Method',
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' },
          { value: 'PATCH', label: 'PATCH' }
        ]
      },
      render: (item) => {
        if (item.route) {
          const methodColors = getMethodColor(item.route.method);
          return (
            <Badge className={`${methodColors.bg} ${methodColors.text} text-xs font-medium`}>
              {item.route.method}
            </Badge>
          );
        }
        return <span className="text-gray-400 text-xs">-</span>;
      }
    },
    {
      key: 'routePath',
      header: '🔗 Path',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Caminho da rota...',
        label: 'Path'
      },
      render: (item) => {
        if (item.route) {
          return (
            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
              {item.route.path}
            </code>
          );
        }
        return <span className="text-gray-400 text-xs">Rota não encontrada</span>;
      }
    },
    {
      key: 'ativo',
      header: '🟢 Status',
      essential: true,
      filterable: {
        type: 'select',
        label: 'Status',
        options: [
          { value: 'true', label: 'Ativo' },
          { value: 'false', label: 'Inativo' }
        ]
      },
      render: (item) => (
        <Badge variant={item.ativo ? "default" : "secondary"}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: '⚙️ Ações',
      essential: true,
      render: (item) => (
        <div className="flex gap-1.5">
          <ActionButton
            variant="view"
            module="permissions"
            onClick={() => abrirModalEditar(item)}
            title="Editar Permissão"
          >
            <Edit className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            variant={item.ativo ? "warning" : "success"}
            module="permissions"
            onClick={() => toggleRoleRouteStatus(item)}
            title={item.ativo ? "Desativar Permissão" : "Ativar Permissão"}
          >
            {item.ativo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </ActionButton>
          <ActionButton
            variant="delete"
            module="permissions"
            onClick={() => confirmarExclusao(item)}
            title="Remover Permissão"
          >
            <Trash2 className="w-4 h-4" />
          </ActionButton>
        </div>
      )
    }
  ];
  
  // Sistema de filtros dinâmicos
  const {
    activeFilters,
    filterConfigs,
    activeFiltersCount,
    setFilter,
    clearFilter,
    clearAllFilters,
    applyFilters
  } = useTableFilters(columns);
  
  // Estado para mostrar/ocultar painel de filtros
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Filtrar dados baseado na busca e filtros dinâmicos
  const roleRoutesFiltradas = useMemo(() => {
    // Primeiro aplicar busca textual
    let dadosFiltrados = roleRoutes.filter(rr =>
      (rr.role?.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
      (rr.role?.descricao || '').toLowerCase().includes(busca.toLowerCase()) ||
      (rr.route?.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
      (rr.route?.path || '').toLowerCase().includes(busca.toLowerCase()) ||
      (rr.route?.method || '').toLowerCase().includes(busca.toLowerCase()) ||
      (rr.route?.modulo || '').toLowerCase().includes(busca.toLowerCase())
    );
    
    return applyFilters(dadosFiltrados);
  }, [roleRoutes, busca, applyFilters]);

  const {
    data: roleRoutesPaginadas,
    totalItems,
    currentPage,
    itemsPerPage,
    totalPages,
    handlePageChange,
    handleItemsPerPageChange,
    // Infinite scroll específico
    isDesktop,
    isMobile,
    hasNextPage,
    isLoadingMore,
    targetRef
  } = useResponsiveTable(roleRoutesFiltradas, 10);

  useEffect(() => {
    fetchRoleRoutes();
    fetchRoles();
    fetchRoutes();
  }, []);

  const fetchRoleRoutes = async () => {
    setLoading(true);
    try {
      const data = await rbacService.getAllRoleRoutes();
      setRoleRoutes(data);
    } catch (e) {
      AppToast.error('Erro ao carregar permissões', {
        description: 'Ocorreu um problema ao carregar as permissões. Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await rbacService.getRoles();
      setRoles(data.filter(r => r.ativo)); // Apenas roles ativas
    } catch (e) {
      AppToast.error('Erro ao carregar roles', {
        description: 'Ocorreu um problema ao carregar as roles. Tente novamente.'
      });
    }
  };

  const fetchRoutes = async () => {
    try {
      const data = await rbacService.getRoutes();
      setRoutes(data.filter(r => r.ativo)); // Apenas rotas ativas
    } catch (e) {
      AppToast.error('Erro ao carregar rotas', {
        description: 'Ocorreu um problema ao carregar as rotas. Tente novamente.'
      });
    }
  };

  // Renderização do card
  const renderCard = (roleRoute: RoleRouteDisplay) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Settings className="w-5 h-5 text-red-600" />
            <CardTitle className="text-sm font-medium truncate">
              {roleRoute.role?.nome || 'Role não encontrada'}
            </CardTitle>
          </div>
          <Badge variant={roleRoute.ativo ? "default" : "secondary"} className="flex-shrink-0 ml-2">
            {roleRoute.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2 mb-3">
          {roleRoute.role?.descricao && (
            <div className="text-xs text-gray-500">
              <span>{roleRoute.role.descricao}</span>
            </div>
          )}

          {roleRoute.route && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Rota:</span>
                {(() => {
                  const methodColors = getMethodColor(roleRoute.route.method);
                  return (
                    <Badge className={`text-xs ${methodColors.bg} ${methodColors.text}`}>
                      {roleRoute.route.method}
                    </Badge>
                  );
                })()}
                <span className="text-sm font-medium">{roleRoute.route.nome}</span>
              </div>
              <div>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {roleRoute.route.path}
                </code>
              </div>
              {roleRoute.route.modulo && (
                <div className="text-xs text-gray-500">
                  <span>Módulo: {roleRoute.route.modulo}</span>
                </div>
              )}
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            <span>Atribuído em: {new Date(roleRoute.createdAt).toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="text-xs text-gray-500">
            <span>ID: {roleRoute.id.slice(0, 8)}...</span>
          </div>
        </div>
      </CardContent>
      <ResponsiveCardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
          onClick={() => abrirModalEditar(roleRoute)}
          title="Editar permissão"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className={
            roleRoute.ativo 
              ? 'border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white'
              : 'border-green-300 text-green-600 hover:bg-green-600 hover:text-white'
          }
          onClick={() => toggleRoleRouteStatus(roleRoute)}
          title={roleRoute.ativo ? "Desativar permissão" : "Ativar permissão"}
        >
          {roleRoute.ativo ? (
            <UserX className="w-4 h-4" />
          ) : (
            <UserCheck className="w-4 h-4" />
          )}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
          onClick={() => confirmarExclusao(roleRoute)}
          title="Remover permissão"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </ResponsiveCardFooter>
    </Card>
  );

  // Funções de manipulação
  const abrirModalNovo = () => {
    setEditando(null);
    setForm({
      roleId: '',
      routeId: '',
      ativo: true,
    });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (roleRoute: RoleRouteDisplay) => {
    setEditando(roleRoute);
    setForm({
      roleId: roleRoute.roleId,
      routeId: roleRoute.routeId,
      ativo: roleRoute.ativo,
    });
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      roleId: '',
      routeId: '',
      ativo: true,
    });
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roleId) {
      setFormError('Selecione uma role.');
      return;
    }
    if (!form.routeId) {
      setFormError('Selecione uma rota.');
      return;
    }

    // Verificar duplicatas
    const duplicata = roleRoutes.some(rr =>
      rr.roleId === form.roleId &&
      rr.routeId === form.routeId &&
      (!editando || rr.id !== editando.id)
    );
    if (duplicata) {
      setFormError('Esta role já possui permissão para esta rota.');
      return;
    }

    setFormLoading(true);
    try {
      if (editando) {
        // Para edição, apenas fechar o modal pois os campos estão desabilitados
        // A edição agora é feita apenas através dos botões de ação
        toast.info('Use os botões de ação para ativar/desativar permissões');
        fecharModal();
        return;
      } else {
        const payload: AssignRouteToRoleRequest = {
          roleId: form.roleId,
          routeId: form.routeId,
        };
        await rbacService.assignRouteToRole(payload);
        AppToast.created('Permissão', `A permissão foi criada com sucesso.`);
      }
      fecharModal();
      fetchRoleRoutes();
    } catch (e: any) {
      let title = 'Erro ao salvar permissão';
      let description = 'Não foi possível salvar a permissão. Verifique os dados e tente novamente.';
      
      if (e?.response?.data?.message) {
        description = e.response.data.message;
      } else if (e?.message) {
        description = e.message;
      }
      
      AppToast.error(title, { description });
    } finally {
      setFormLoading(false);
    }
  };

  const toggleRoleRouteStatus = async (roleRoute: RoleRouteDisplay) => {
    try {
      const payload: UpdateRoleRouteRequest = {
        ativo: !roleRoute.ativo,
      };
      await rbacService.updateRoleRoute(roleRoute.id, payload);
      AppToast.updated('Status da Permissão', `A permissão foi ${!roleRoute.ativo ? 'ativada' : 'desativada'} com sucesso.`);
      fetchRoleRoutes();
    } catch (e) {
      AppToast.error('Erro ao alterar status', {
        description: 'Não foi possível alterar o status da permissão. Tente novamente.'
      });
    }
  };

  const confirmarExclusao = (roleRoute: RoleRouteDisplay) => {
    setExcluindo(roleRoute);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await rbacService.deleteRoleRoute(excluindo.id);
      AppToast.deleted('Permissão', `A permissão foi removida permanentemente.`);
      setExcluindo(null);
      fetchRoleRoutes();
    } catch (e) {
      AppToast.error('Erro ao remover permissão', {
        description: 'Não foi possível remover a permissão. Tente novamente ou entre em contato com o suporte.'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando permissões...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
      <PageContainer>
        {/* Header da página */}
        <PageHeader title="Gerenciar Permissões" module="permissions" icon={<Settings />}>
          <SearchBar
            placeholder="Buscar permissões..."
            value={busca}
            onChange={setBusca}
            module="permissions"
          />
          
          <FilterButton
            showFilters={mostrarFiltros}
            onToggleFilters={() => setMostrarFiltros(prev => !prev)}
            activeFiltersCount={activeFiltersCount}
            module="permissions"
            disabled={filterConfigs.length === 0}
            tooltip={filterConfigs.length === 0 ? 'Nenhum filtro configurado' : undefined}
          />
          
          <ViewToggle 
            viewMode={viewMode} 
            onViewModeChange={setViewMode} 
            module="permissions"
          />
          
          <Button 
            className="!h-10 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
            onClick={abrirModalNovo}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Permissão
          </Button>
        </PageHeader>

        {/* Conteúdo principal */}
        <PageContent>
          {/* Painel de Filtros Dinâmicos */}
          <DynamicFilterPanel
            isVisible={mostrarFiltros}
            filterConfigs={filterConfigs}
            activeFilters={activeFilters}
            onFilterChange={setFilter}
            onClearAll={clearAllFilters}
            onClose={() => setMostrarFiltros(false)}
            module="permissions"
          />

          {/* Conteúdo baseado no modo de visualização */}
          {viewMode === 'table' ? (
            <ResponsiveTable 
              data={roleRoutesPaginadas}
              columns={columns}
              module="permissions"
              emptyMessage="Nenhuma permissão encontrada"
              isLoadingMore={isLoadingMore}
              hasNextPage={hasNextPage}
              isMobile={isMobile}
              scrollRef={targetRef}
            />
          ) : (
            <ResponsiveCards 
              data={roleRoutesPaginadas}
              renderCard={renderCard}
              emptyMessage="Nenhuma permissão encontrada"
              emptyIcon="⚙️"
              isLoadingMore={isLoadingMore}
              hasNextPage={hasNextPage}
              isMobile={isMobile}
              scrollRef={targetRef}
            />
          )}
        </PageContent>

        {/* Paginação */}
        {totalItems > 0 && (
          <ResponsivePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            module="permissions"
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}

        {/* Modal de cadastro/edição */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editando ? 'Editar Permissão' : 'Nova Permissão'}</DialogTitle>
              </DialogHeader>
              <div className="py-2 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">🛡️</span>
                    <span className="bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent font-semibold">Role</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="max-w-full">
                    <SingleSelectDropdown
                      options={roles}
                      selected={roles.find(r => r.id === form.roleId) || null}
                      onChange={editando ? undefined : (selected) => setForm(f => ({ ...f, roleId: selected?.id || '' }))}
                      placeholder={editando ? "Campo somente leitura" : "Digite para buscar roles..."}
                      formatOption={(option: Role) => option.nome.length > 25 ? option.nome.substring(0, 22) + '...' : option.nome}
                      headerText="Roles disponíveis"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">🔗</span>
                    <span className="bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent font-semibold">Rota</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="max-w-full">
                    <SingleSelectDropdown
                      options={routes.map(route => ({
                        id: route.id,
                        nome: `${route.method} ${route.path}`,
                        path: route.path,
                        method: route.method,
                        modulo: route.modulo
                      }))}
                      selected={routes.find(r => r.id === form.routeId) ? {
                        id: form.routeId,
                        nome: `${routes.find(r => r.id === form.routeId)!.method} ${routes.find(r => r.id === form.routeId)!.path}`,
                        path: routes.find(r => r.id === form.routeId)!.path,
                        method: routes.find(r => r.id === form.routeId)!.method
                      } : null}
                      onChange={editando ? undefined : (selected) => setForm(f => ({ ...f, routeId: selected?.id || '' }))}
                      placeholder={editando ? "Campo somente leitura" : "Digite para buscar rotas (ex: /profissionais/:id/servicos)..."}
                      searchFields={['nome', 'path', 'method', 'modulo']}
                      formatOption={(option: any) => (
                        <div className="flex items-center gap-3 py-1">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            option.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                            option.method === 'POST' ? 'bg-green-100 text-green-800' :
                            option.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                            option.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {option.method}
                          </span>
                          <span className="font-mono text-sm flex-1">{option.path}</span>
                          {option.modulo && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {option.modulo}
                            </span>
                          )}
                        </div>
                      )}
                      headerText="Busque por método, caminho ou módulo"
                      className="w-full"
                    />
                  </div>
                </div>

                {formError && <FormErrorMessage>{formError}</FormErrorMessage>}
              </div> 
              <DialogFooter className="mt-6">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={formLoading}
                    className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6 transition-all duration-200"
                  >
                    Cancelar
                  </Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={formLoading}
                  className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200"
                >
                  {formLoading ? (editando ? 'Fechando...' : 'Salvando...') : (editando ? 'Fechar' : 'Salvar')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de confirmação de exclusão */}
        <ConfirmDeleteModal
          open={!!excluindo}
          onClose={cancelarExclusao}
          onConfirm={handleDelete}
          title="Confirmar Remoção de Permissão"
          entityName={excluindo?.role?.nome && excluindo?.route?.nome 
            ? (() => {
                const roleName = excluindo.role.nome.length > 15 ? excluindo.role.nome.substring(0, 12) + '...' : excluindo.role.nome;
                const routeName = excluindo.route.nome.length > 15 ? excluindo.route.nome.substring(0, 12) + '...' : excluindo.route.nome;
                return `${roleName} → ${routeName}`;
              })()
            : ''}
          entityType="permissão"
          isLoading={deleteLoading}
          loadingText="Removendo permissão..."
          confirmText="Remover Permissão"
        />
      </PageContainer>
  );
};

export default PermissionsPage;