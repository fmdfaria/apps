import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Shield, UserX, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { rbacService } from '@/services/rbac';
import type { Role, CreateRoleRequest, UpdateRoleRequest } from '@/types/RBAC';
import { FormErrorMessage } from '@/components/form-error-message';
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

interface RoleFormData {
  nome: string;
  descricao: string;
  ativo: boolean;
}

export const RolesPage = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Role | null>(null);
  const [form, setForm] = useState<RoleFormData>({
    nome: '',
    descricao: '',
    ativo: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<Role | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'roles-view' });
  
  // Configuração das colunas da tabela
  const columns: TableColumn<Role>[] = [
    {
      key: 'nome',
      header: '🛡️ Nome',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome da role...',
        label: 'Nome'
      },
      render: (item) => <span className="text-sm font-medium">{item.nome}</span>
    },
    {
      key: 'descricao',
      header: '📝 Descrição',
      essential: false,
      filterable: {
        type: 'text',
        placeholder: 'Buscar na descrição...',
        label: 'Descrição'
      },
      render: (item) => <span className="text-sm">{item.descricao || '-'}</span>
    },
    {
      key: 'ativo',
      header: '🟢 Status',
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
        <Badge variant={item.ativo ? "default" : "secondary"}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    },
    {
      key: 'createdAt',
      header: '📅 Criado em',
      essential: false,
      className: 'text-center',
      render: (item) => (
        <span className="text-sm text-gray-600">
          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
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
            module="admin"
            onClick={() => abrirModalEditar(item)}
            title="Editar Role"
          >
            <Edit className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            variant={item.ativo ? "warning" : "success"}
            module="admin"
            onClick={() => toggleRoleStatus(item)}
            title={item.ativo ? "Desativar Role" : "Ativar Role"}
          >
            {item.ativo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </ActionButton>
          <ActionButton
            variant="delete"
            module="admin"
            onClick={() => confirmarExclusao(item)}
            title="Excluir Role"
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
  const rolesFiltradas = useMemo(() => {
    // Primeiro aplicar busca textual
    let dadosFiltrados = roles.filter(r =>
      r.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (r.descricao || '').toLowerCase().includes(busca.toLowerCase())
    );
    
    return applyFilters(dadosFiltrados);
  }, [roles, busca, applyFilters]);

  const {
    data: rolesPaginadas,
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
  } = useResponsiveTable(rolesFiltradas, 10);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await rbacService.getRoles();
      setRoles(data);
    } catch (e) {
      toast.error('Erro ao carregar roles');
    } finally {
      setLoading(false);
    }
  };

  // Renderização do card
  const renderCard = (role: Role) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="w-5 h-5 text-slate-600" />
            <CardTitle className="text-sm font-medium truncate">{role.nome}</CardTitle>
          </div>
          <Badge variant={role.ativo ? "default" : "secondary"} className="flex-shrink-0 ml-2">
            {role.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2 mb-3">
          {role.descricao && (
            <CardDescription className="line-clamp-2 text-xs">
              {role.descricao}
            </CardDescription>
          )}
          <div className="text-xs text-gray-500">
            <span>Criado em: {new Date(role.createdAt).toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="text-xs text-gray-500">
            <span>ID: {role.id.slice(0, 8)}...</span>
          </div>
        </div>
      </CardContent>
      <ResponsiveCardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-slate-300 text-slate-600 hover:bg-slate-600 hover:text-white"
          onClick={() => abrirModalEditar(role)}
          title="Editar role"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className={
            role.ativo 
              ? 'border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white'
              : 'border-green-300 text-green-600 hover:bg-green-600 hover:text-white'
          }
          onClick={() => toggleRoleStatus(role)}
          title={role.ativo ? "Desativar role" : "Ativar role"}
        >
          {role.ativo ? (
            <UserX className="w-4 h-4" />
          ) : (
            <UserCheck className="w-4 h-4" />
          )}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
          onClick={() => confirmarExclusao(role)}
          title="Excluir role"
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
      nome: '',
      descricao: '',
      ativo: true,
    });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (role: Role) => {
    setEditando(role);
    setForm({
      nome: role.nome,
      descricao: role.descricao || '',
      ativo: role.ativo,
    });
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      nome: '',
      descricao: '',
      ativo: true,
    });
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || form.nome.trim().length < 2) {
      setFormError('O nome deve ter pelo menos 2 caracteres.');
      return;
    }

    const nomeDuplicado = roles.some(r =>
      r.nome.trim().toLowerCase() === form.nome.trim().toLowerCase() &&
      (!editando || r.id !== editando.id)
    );
    if (nomeDuplicado) {
      setFormError('Já existe uma role com este nome.');
      return;
    }

    setFormLoading(true);
    try {
      if (editando) {
        const payload: UpdateRoleRequest = {
          nome: form.nome,
          descricao: form.descricao || undefined,
          ativo: form.ativo,
        };
        await rbacService.updateRole(editando.id, payload);
        toast.success('Role atualizada com sucesso');
      } else {
        const payload: CreateRoleRequest = {
          nome: form.nome,
          descricao: form.descricao || undefined,
        };
        await rbacService.createRole(payload);
        toast.success('Role criada com sucesso');
      }
      fecharModal();
      fetchRoles();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erro ao salvar role';
      toast.error(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const toggleRoleStatus = async (role: Role) => {
    try {
      const payload: UpdateRoleRequest = {
        nome: role.nome,
        descricao: role.descricao || undefined,
        ativo: !role.ativo,
      };
      await rbacService.updateRole(role.id, payload);
      toast.success(`Role ${!role.ativo ? 'ativada' : 'desativada'} com sucesso`);
      fetchRoles();
    } catch (e) {
      toast.error('Erro ao alterar status da role');
    }
  };

  const confirmarExclusao = (role: Role) => {
    setExcluindo(role);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await rbacService.deleteRole(excluindo.id);
      toast.success('Role excluída com sucesso');
      setExcluindo(null);
      fetchRoles();
    } catch (e) {
      toast.error('Erro ao excluir role');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando roles...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
      <PageContainer>
        {/* Header da página */}
        <PageHeader title="Gerenciar Roles" module="admin" icon={<Shield />}>
          <SearchBar
            placeholder="Buscar roles..."
            value={busca}
            onChange={setBusca}
            module="admin"
          />
          
          <FilterButton
            showFilters={mostrarFiltros}
            onToggleFilters={() => setMostrarFiltros(prev => !prev)}
            activeFiltersCount={activeFiltersCount}
            module="admin"
            disabled={filterConfigs.length === 0}
            tooltip={filterConfigs.length === 0 ? 'Nenhum filtro configurado' : undefined}
          />
          
          <ViewToggle 
            viewMode={viewMode} 
            onViewModeChange={setViewMode} 
            module="admin"
          />
          
          <Button 
            className="!h-10 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
            onClick={abrirModalNovo}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Role
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
            module="admin"
          />

          {/* Conteúdo baseado no modo de visualização */}
          {viewMode === 'table' ? (
            <ResponsiveTable 
              data={rolesPaginadas}
              columns={columns}
              module="admin"
              emptyMessage="Nenhuma role encontrada"
              isLoadingMore={isLoadingMore}
              hasNextPage={hasNextPage}
              isMobile={isMobile}
              scrollRef={targetRef}
            />
          ) : (
            <ResponsiveCards 
              data={rolesPaginadas}
              renderCard={renderCard}
              emptyMessage="Nenhuma role encontrada"
              emptyIcon="🛡️"
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
            module="admin"
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}

        {/* Modal de cadastro/edição */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editando ? 'Editar Role' : 'Nova Role'}</DialogTitle>
              </DialogHeader>
              <div className="py-2 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="bg-gradient-to-r from-slate-600 to-gray-800 bg-clip-text text-transparent font-semibold">Nome da Role</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    minLength={2}
                    disabled={formLoading}
                    autoFocus
                    className="hover:border-slate-300 focus:border-slate-500 focus:ring-slate-100"
                    placeholder="Ex: GERENTE, VENDEDOR, etc."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    <span className="bg-gradient-to-r from-slate-600 to-gray-800 bg-clip-text text-transparent font-semibold">Descrição</span>
                  </label>
                  <Textarea
                    value={form.descricao}
                    onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    disabled={formLoading}
                    className="hover:border-slate-300 focus:border-slate-500 focus:ring-slate-100"
                    placeholder="Descreva as responsabilidades desta role"
                    rows={3}
                  />
                </div>

                {editando && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ativo"
                      checked={form.ativo}
                      onCheckedChange={(checked) => setForm(f => ({ ...f, ativo: checked }))}
                    />
                    <Label htmlFor="ativo">Role ativa</Label>
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
                  className="bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200"
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
          title="Confirmar Exclusão de Role"
          entityName={excluindo?.nome || ''}
          entityType="role"
          isLoading={deleteLoading}
          loadingText="Excluindo role..."
          confirmText="Excluir Role"
        />
      </PageContainer>
  );
};

export default RolesPage;