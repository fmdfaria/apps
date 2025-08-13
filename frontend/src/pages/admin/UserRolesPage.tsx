import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Users, UserX, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AppToast } from '@/services/toast';
import { rbacService } from '@/services/rbac';
import { getUsers } from '@/services/users';
import type { UserRole, Role, AssignRoleToUserRequest } from '@/types/RBAC';
import type { User } from '@/types/User';
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

interface UserRoleFormData {
  userId: string;
  roleId: string;
  ativo: boolean;
}

// Interface estendida para exibição com dados relacionados
interface UserRoleDisplay extends UserRole {
  user?: { nome: string; email: string };
  role?: { nome: string; descricao?: string };
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

export const UserRolesPage = () => {
  const [rawUserRoles, setRawUserRoles] = useState<UserRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<UserRoleDisplay | null>(null);
  const [form, setForm] = useState<UserRoleFormData>({
    userId: '',
    roleId: '',
    ativo: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<UserRoleDisplay | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'user-roles-view' });
  
  // Configuração das colunas da tabela
  const columns: TableColumn<UserRoleDisplay>[] = [
    {
      key: 'nome',
      header: '👤 Nome',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome do usuário...',
        label: 'Nome'
      },
      render: (item) => (
        <span className="text-sm font-medium">{item.user?.nome || 'Usuário não encontrado'}</span>
      )
    },
    {
      key: 'email',
      header: '📧 E-mail',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'E-mail do usuário...',
        label: 'E-mail'
      },
      render: (item) => (
        <span className="text-sm">{item.user?.email || '-'}</span>
      )
    },
    {
      key: 'role',
      header: '🛡️ Role',
      essential: true,
      className: 'text-center',
      filterable: {
        type: 'text',
        placeholder: 'Nome da role...',
        label: 'Role'
      },
      render: (item) => {
        if (item.role) {
          const colors = getRoleColor(item.role.nome);
          return (
            <Badge className={`${colors.bg} ${colors.text} text-xs font-medium`}>
              {item.role.nome}
            </Badge>
          );
        }
        return <span className="text-gray-400 text-xs">Role não encontrada</span>;
      }
    },
    {
      key: 'ativo',
      header: '🔘 Status',
      essential: true,
      className: 'text-center',
      filterable: {
        type: 'select',
        label: 'Status',
        options: [
          { value: 'true', label: 'Ativo' },
          { value: 'false', label: 'Inativo' }
        ]
      },
      render: (item) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
          item.ativo 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </span>
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
            title="Editar Atribuição"
          >
            <Edit className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            variant={item.ativo ? "warning" : "success"}
            module="permissions"
            onClick={() => toggleUserRoleStatus(item)}
            title={item.ativo ? "Desativar Atribuição" : "Ativar Atribuição"}
          >
            {item.ativo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </ActionButton>
          <ActionButton
            variant="delete"
            module="permissions"
            onClick={() => confirmarExclusao(item)}
            title="Remover Atribuição"
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
  
  // Processar dados com relações
  const userRoles = useMemo(() => {
    return rawUserRoles.map(ur => ({
      ...ur,
      user: users.find(u => u.id === ur.userId),
      role: roles.find(r => r.id === ur.roleId)
    }));
  }, [rawUserRoles, users, roles]);
  
  // Filtrar dados baseado na busca e filtros dinâmicos
  const userRolesFiltradas = useMemo(() => {
    // Primeiro aplicar busca textual
    let dadosFiltrados = userRoles.filter(ur =>
      (ur.user?.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
      (ur.user?.email || '').toLowerCase().includes(busca.toLowerCase()) ||
      (ur.role?.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
      (ur.role?.descricao || '').toLowerCase().includes(busca.toLowerCase())
    );
    
    const filtrados = applyFilters(dadosFiltrados);
    // Ordenar alfabeticamente pelo nome do usuário (pt-BR, case-insensitive)
    return filtrados.sort((a, b) => (a.user?.nome || '').localeCompare(b.user?.nome || '', 'pt-BR', { sensitivity: 'base' }));
  }, [userRoles, busca, applyFilters]);

  const {
    data: userRolesPaginadas,
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
  } = useResponsiveTable(userRolesFiltradas, 10);

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        // Primeiro carregar usuários e roles
        await Promise.all([
          fetchRoles(), 
          fetchUsers()
        ]);
        // Depois carregar as associações user-roles
        // (será executado via useEffect separado)
      } finally {
        setLoading(false);
      }
    };
    
    loadAllData();
  }, []);

  // Carregar user-roles após users e roles estarem disponíveis
  useEffect(() => {
    if (users.length > 0 && roles.length > 0) {
      fetchUserRoles();
    }
  }, [users, roles]);

  const fetchUserRoles = async () => {
    try {
      const userRoles = await rbacService.getAllUserRoles();
      setRawUserRoles(userRoles);
    } catch (e) {
      AppToast.error('Erro ao carregar atribuições', {
        description: 'Ocorreu um problema ao carregar as atribuições de usuário. Tente novamente.'
      });
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await rbacService.getRoles();
      setRoles(data.filter(r => r.ativo)); // Apenas roles ativas para atribuição
    } catch (e) {
      AppToast.error('Erro ao carregar roles', {
        description: 'Ocorreu um problema ao carregar as roles. Tente novamente.'
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data.filter(u => u.ativo)); // Apenas usuários ativos para atribuição
    } catch (e) {
      AppToast.error('Erro ao carregar usuários', {
        description: 'Ocorreu um problema ao carregar os usuários. Tente novamente.'
      });
    }
  };

  // Mapear usuários para o formato Option do SingleSelectDropdown
  const userOptions = users.map(u => ({ 
    id: u.id, 
    nome: u.nome,
    sigla: u.email // Usar sigla para mostrar email na lista
  }));

  // Renderização do card
  const renderCard = (userRole: UserRoleDisplay) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-5 h-5 text-red-600" />
            <CardTitle className="text-sm font-medium truncate">
              {userRole.user?.nome || 'Usuário não encontrado'}
            </CardTitle>
          </div>
          <Badge variant={userRole.ativo ? "default" : "secondary"} className="flex-shrink-0 ml-2">
            {userRole.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2 mb-3">
          <div className="text-xs text-gray-500">
            <span>{userRole.user?.email}</span>
          </div>
          
          {userRole.role && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Role:</span>
              {(() => {
                const colors = getRoleColor(userRole.role.nome);
                return (
                  <Badge className={`text-xs ${colors.bg} ${colors.text}`}>
                    {userRole.role.nome}
                  </Badge>
                );
              })()}
            </div>
          )}
          
          {userRole.role?.descricao && (
            <CardDescription className="line-clamp-2 text-xs">
              {userRole.role.descricao}
            </CardDescription>
          )}
          
          <div className="text-xs text-gray-500">
            <span>Atribuído em: {new Date(userRole.createdAt).toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="text-xs text-gray-500">
            <span>ID: {userRole.id.slice(0, 8)}...</span>
          </div>
        </div>
      </CardContent>
      <ResponsiveCardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
          onClick={() => abrirModalEditar(userRole)}
          title="Editar atribuição"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className={
            userRole.ativo 
              ? 'border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white'
              : 'border-green-300 text-green-600 hover:bg-green-600 hover:text-white'
          }
          onClick={() => toggleUserRoleStatus(userRole)}
          title={userRole.ativo ? "Desativar atribuição" : "Ativar atribuição"}
        >
          {userRole.ativo ? (
            <UserX className="w-4 h-4" />
          ) : (
            <UserCheck className="w-4 h-4" />
          )}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
          onClick={() => confirmarExclusao(userRole)}
          title="Remover atribuição"
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
      userId: '',
      roleId: '',
      ativo: true,
    });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (userRole: UserRoleDisplay) => {
    setEditando(userRole);
    setForm({
      userId: userRole.userId,
      roleId: userRole.roleId,
      ativo: userRole.ativo,
    });
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      userId: '',
      roleId: '',
      ativo: true,
    });
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId) {
      setFormError('Selecione um usuário.');
      return;
    }
    if (!form.roleId) {
      setFormError('Selecione uma role.');
      return;
    }

    // Verificar duplicatas
    const duplicata = userRoles.some(ur =>
      ur.userId === form.userId &&
      ur.roleId === form.roleId &&
      (!editando || ur.id !== editando.id)
    );
    if (duplicata) {
      setFormError('Este usuário já possui esta role atribuída.');
      return;
    }

    setFormLoading(true);
    try {
      if (editando) {
        // Backend não suporta update, então vamos remover a antiga e criar nova
        // se houve mudança
        const mudouRole = editando.roleId !== form.roleId;
        
        if (mudouRole) {
          // Remover atribuição antiga
          await rbacService.removeRoleFromUser(editando.userId, editando.roleId);
          
          // Criar nova atribuição
          const payload: AssignRoleToUserRequest = {
            userId: form.userId,
            roleId: form.roleId,
          };
          await rbacService.assignRoleToUser(payload);
          AppToast.updated('Atribuição', `A atribuição foi atualizada com sucesso.`);
        } else {
          AppToast.info('Nenhuma alteração foi feita.');
        }
      } else {
        const payload: AssignRoleToUserRequest = {
          userId: form.userId,
          roleId: form.roleId,
        };
        await rbacService.assignRoleToUser(payload);
        AppToast.created('Atribuição', `A role foi atribuída ao usuário com sucesso.`);
      }
      fecharModal();
      fetchUserRoles();
    } catch (e: any) {
      let title = 'Erro ao salvar atribuição';
      let description = 'Não foi possível salvar a atribuição. Verifique os dados e tente novamente.';
      
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

  const toggleUserRoleStatus = async (userRole: UserRoleDisplay) => {
    const novoStatus = !userRole.ativo;
    const acao = novoStatus ? 'ativar' : 'desativar';
    
    try {
      await rbacService.updateUserRole(userRole.id, { ativo: novoStatus });
      AppToast.updated('Status da Atribuição', `A atribuição foi ${acao === 'ativar' ? 'ativada' : 'desativada'} com sucesso.`);
      fetchUserRoles();
    } catch (e) {
      AppToast.error(`Erro ao ${acao} atribuição`, {
        description: `Não foi possível ${acao} a atribuição. Tente novamente.`
      });
    }
  };

  const confirmarExclusao = (userRole: UserRoleDisplay) => {
    setExcluindo(userRole);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await rbacService.removeRoleFromUser(excluindo.userId, excluindo.roleId);
      AppToast.deleted('Atribuição', `A atribuição foi removida permanentemente.`);
      setExcluindo(null);
      fetchUserRoles();
    } catch (e) {
      AppToast.error('Erro ao remover atribuição', {
        description: 'Não foi possível remover a atribuição. Tente novamente ou entre em contato com o suporte.'
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
            <p className="text-gray-500">Carregando atribuições...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
      <PageContainer>
        {/* Header da página */}
        <PageHeader title="Atribuições de Usuário" module="permissions" icon={<Users />}>
          <SearchBar
            placeholder="Buscar atribuições..."
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
            Nova Atribuição
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
              data={userRolesPaginadas}
              columns={columns}
              module="permissions"
              emptyMessage="Nenhuma atribuição encontrada"
              isLoadingMore={isLoadingMore}
              hasNextPage={hasNextPage}
              isMobile={isMobile}
              scrollRef={targetRef}
            />
          ) : (
            <ResponsiveCards 
              data={userRolesPaginadas}
              renderCard={renderCard}
              emptyMessage="Nenhuma atribuição encontrada"
              emptyIcon="👥"
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
                <DialogTitle>{editando ? 'Editar Atribuição' : 'Nova Atribuição'}</DialogTitle>
              </DialogHeader>
              <div className="py-2 space-y-4">
                {!editando && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                        <span className="text-lg">👤</span>
                        <span className="bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent font-semibold">Usuário</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-1">
                        <SingleSelectDropdown
                          options={userOptions}
                          selected={userOptions.find(u => u.id === form.userId) || null}
                          onChange={(selected) => setForm(f => ({ ...f, userId: selected?.id || '' }))}
                          placeholder="Digite para buscar usuários..."
                          headerText="Usuários disponíveis"
                        />
                        {form.userId && (() => {
                          const selectedUser = users.find(u => u.id === form.userId);
                          return selectedUser && (
                            <div className="text-xs text-gray-500 mt-1 pl-1">
                              📧 {selectedUser.email}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                        <span className="text-lg">🛡️</span>
                        <span className="bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent font-semibold">Role</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <SingleSelectDropdown
                        options={roles}
                        selected={roles.find(r => r.id === form.roleId) || null}
                        onChange={(selected) => setForm(f => ({ ...f, roleId: selected?.id || '' }))}
                        placeholder="Digite para buscar roles..."
                        formatOption={(option) => option.nome}
                        headerText="Roles disponíveis"
                      />
                    </div>
                  </>
                )}

                {editando && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-800 mb-2">Usuário Selecionado</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Nome:</span>
                          <span className="text-sm font-medium">{editando.user?.nome}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">E-mail:</span>
                          <span className="text-sm font-medium">{editando.user?.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Role atual:</span>
                          <span className="text-sm font-medium text-orange-600">{editando.role?.nome}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                        <span className="text-lg">🛡️</span>
                        <span className="bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent font-semibold">Nova Role</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <SingleSelectDropdown
                        options={roles}
                        selected={roles.find(r => r.id === form.roleId) || null}
                        onChange={(selected) => setForm(f => ({ ...f, roleId: selected?.id || '' }))}
                        placeholder="Digite para buscar roles..."
                        formatOption={(option) => option.nome}
                        headerText="Roles disponíveis"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        A role atual será removida e a nova será atribuída.
                      </p>
                    </div>
                  </div>
                )}

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
                  {formLoading ? 'Salvando...' : 'Salvar'}
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
          title="Confirmar Remoção de Atribuição"
          entityName={excluindo?.user?.nome || ''}
          entityType="atribuição de role"
          isLoading={deleteLoading}
          loadingText="Removendo atribuição..."
          confirmText="Remover Atribuição"
        />
      </PageContainer>
  );
};

export default UserRolesPage;