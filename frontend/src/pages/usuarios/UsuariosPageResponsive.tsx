import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, UserX, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast, toast } from '@/components/ui/use-toast';
import { getUsers, createUser, updateUser, deleteUser } from '@/services/users';
import type { User } from '@/types/User';
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
  ResponsiveCardFooter,
  TableColumn 
} from '@/components/layout';
import type { FilterConfig } from '@/types/filters';
import { useViewMode } from '@/hooks/useViewMode';
import { useResponsiveTable } from '@/hooks/useResponsiveTable';
import { useTableFilters } from '@/hooks/useTableFilters';

// Definir tipo de formulário
interface FormularioUsuario {
  nome: string;
  email: string;
  senha: string;
}




export const UsuariosPageResponsive = () => {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<User | null>(null);
  const [form, setForm] = useState<FormularioUsuario>({
    nome: '',
    email: '',
    senha: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'usuarios-view' });
  
  // Configuração das colunas da tabela com filtros dinâmicos
  const columns: TableColumn<User>[] = [
    {
      key: 'nome',
      header: '👤 Nome',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome do usuário...',
        label: 'Nome'
      },
      render: (item) => <span className="text-sm font-medium">{item.nome}</span>
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
      render: (item) => <span className="text-sm">{item.email}</span>
    },
    {
      key: 'roles',
      header: '🏷️ Roles',
      essential: true,
      className: 'text-center',
      render: (item) => {
        if (!item.roles || item.roles.length === 0) {
          return <span className="text-xs text-gray-400">Nenhum role</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {item.roles.map((role, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                {role}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      key: 'ativo',
      header: '🔘 Status',
      essential: true,
      className: 'text-center',
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
            module="default"
            onClick={() => abrirModalEditar(item)}
            title="Editar Usuário"
          >
            <Edit className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            variant={item.ativo ? "warning" : "success"}
            module="default"
            onClick={() => toggleUsuarioStatus(item)}
            title={item.ativo ? "Desativar Usuário" : "Ativar Usuário"}
          >
            {item.ativo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </ActionButton>
          <ActionButton
            variant="delete"
            module="default"
            onClick={() => confirmarExclusao(item)}
            title="Excluir Usuário"
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
  const usuariosFiltrados = useMemo(() => {
    // Primeiro aplicar busca textual
    let dadosFiltrados = usuarios.filter(u =>
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase()) ||
      (u.roles && u.roles.some(role => role.toLowerCase().includes(busca.toLowerCase())))
    );
    
    // Aplicar filtros dinâmicos
    return applyFilters(dadosFiltrados);
  }, [usuarios, busca, applyFilters]);

  const {
    data: usuariosPaginados,
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
  } = useResponsiveTable(usuariosFiltrados, 10);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsuarios(data);
    } catch (e) {
      toast({ title: 'Erro ao carregar usuários', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Renderização do card
  const renderCard = (usuario: User) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">👤</span>
            <CardTitle className="text-sm font-medium truncate">{usuario.nome}</CardTitle>
          </div>
          <div className="flex flex-wrap gap-1 ml-2">
            {usuario.roles && usuario.roles.length > 0 ? (
              usuario.roles.slice(0, 2).map((role, index) => (
                <Badge key={index} className="text-xs flex-shrink-0 bg-blue-100 text-blue-800">
                  {role}
                </Badge>
              ))
            ) : (
              <Badge className="text-xs flex-shrink-0 bg-gray-100 text-gray-800">
                Sem roles
              </Badge>
            )}
            {usuario.roles && usuario.roles.length > 2 && (
              <Badge className="text-xs flex-shrink-0 bg-gray-100 text-gray-600">
                +{usuario.roles.length - 2}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2 mb-3">
          <CardDescription className="line-clamp-2 text-xs">
            {usuario.email}
          </CardDescription>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
              usuario.ativo 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {usuario.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
      </CardContent>
      <ResponsiveCardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white"
          onClick={() => abrirModalEditar(usuario)}
          title="Editar usuário"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className={
            usuario.ativo 
              ? 'border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white'
              : 'border-green-300 text-green-600 hover:bg-green-600 hover:text-white'
          }
          onClick={() => toggleUsuarioStatus(usuario)}
          title={usuario.ativo ? "Desativar usuário" : "Ativar usuário"}
        >
          {usuario.ativo ? (
            <UserX className="w-4 h-4" />
          ) : (
            <UserCheck className="w-4 h-4" />
          )}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
          onClick={() => confirmarExclusao(usuario)}
          title="Excluir usuário"
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
      email: '',
      senha: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (usuario: User) => {
    setEditando(usuario);
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      senha: '', // Não mostramos a senha atual
    });
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      nome: '',
      email: '',
      senha: '',
    });
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.nome.trim() || form.nome.trim().length < 2) {
      setFormError('O nome deve ter pelo menos 2 caracteres.');
      return;
    }
    
    if (!form.email.trim() || !form.email.includes('@')) {
      setFormError('E-mail inválido.');
      return;
    }
    
    if (!editando && (!form.senha.trim() || form.senha.trim().length < 6)) {
      setFormError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    

    // Verificar se email já existe
    const emailDuplicado = usuarios.some(u =>
      u.email.toLowerCase() === form.email.trim().toLowerCase() &&
      (!editando || u.id !== editando.id)
    );
    
    if (emailDuplicado) {
      setFormError('Já existe um usuário com este e-mail.');
      return;
    }

    setFormLoading(true);
    try {
      if (editando) {
        // Para edição, só enviar campos que mudaram
        const payload: any = {};
        if (form.nome !== editando.nome) payload.nome = form.nome.trim();
        if (form.email !== editando.email) payload.email = form.email.trim();
        
        if (Object.keys(payload).length > 0) {
          await updateUser(editando.id, payload);
          toast({ title: 'Usuário atualizado com sucesso', variant: 'success' });
        }
      } else {
        await createUser({
          nome: form.nome.trim(),
          email: form.email.trim(),
          senha: form.senha.trim()
        });
        toast({ title: 'Usuário criado com sucesso', variant: 'success' });
      }
      fecharModal();
      fetchUsuarios();
    } catch (e: any) {
      let msg = 'Erro ao salvar usuário';
      if (e?.response?.data?.message) {
        msg = e.response.data.message;
      } else if (e?.message) {
        msg = e.message;
      }
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setFormLoading(false);
    }
  };

  const toggleUsuarioStatus = async (usuario: User) => {
    try {
      await updateUser(usuario.id, { ativo: !usuario.ativo });
      toast({ 
        title: `Usuário ${!usuario.ativo ? 'ativado' : 'desativado'} com sucesso`, 
        variant: 'success' 
      });
      fetchUsuarios();
    } catch (e) {
      toast({ title: 'Erro ao alterar status do usuário', variant: 'destructive' });
    }
  };

  const confirmarExclusao = (usuario: User) => {
    setExcluindo(usuario);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteUser(excluindo.id);
      toast({ title: 'Usuário excluído com sucesso', variant: 'success' });
      setExcluindo(null);
      fetchUsuarios();
    } catch (e) {
      toast({ title: 'Erro ao excluir usuário', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando usuários...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header da página */}
      <PageHeader title="Usuários" module="default" icon="👤">
        <SearchBar
          placeholder="Buscar usuários..."
          value={busca}
          onChange={setBusca}
          module="default"
        />
        
        <FilterButton
          showFilters={mostrarFiltros}
          onToggleFilters={() => setMostrarFiltros(prev => !prev)}
          activeFiltersCount={activeFiltersCount}
          module="default"
          disabled={filterConfigs.length === 0}
        />
        
        <ViewToggle 
          viewMode={viewMode} 
          onViewModeChange={setViewMode} 
          module="default"
        />
        
        <Button 
          className="!h-10 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
          onClick={abrirModalNovo}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
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
          module="default"
        />

        {/* Conteúdo baseado no modo de visualização */}
        {viewMode === 'table' ? (
          <ResponsiveTable 
            data={usuariosPaginados}
            columns={columns}
            module="default"
            emptyMessage="Nenhum usuário encontrado"
            isLoadingMore={isLoadingMore}
            hasNextPage={hasNextPage}
            isMobile={isMobile}
            scrollRef={targetRef}
          />
        ) : (
          <ResponsiveCards 
            data={usuariosPaginados}
            renderCard={renderCard}
            emptyMessage="Nenhum usuário encontrado"
            emptyIcon="👤"
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
          module="default"
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {/* Modal de cadastro/edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">👤</span>
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-semibold">Nome</span>
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  minLength={2}
                  disabled={formLoading}
                  autoFocus
                  className="hover:border-blue-300 focus:border-blue-500 focus:ring-blue-100"
                  placeholder="Nome completo do usuário"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">📧</span>
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-semibold">E-mail</span>
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  disabled={formLoading}
                  className="hover:border-blue-300 focus:border-blue-500 focus:ring-blue-100"
                  placeholder="email@exemplo.com"
                />
              </div>

              {!editando && (
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">🔒</span>
                    <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-semibold">Senha</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    value={form.senha}
                    onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                    minLength={6}
                    disabled={formLoading}
                    className="hover:border-blue-300 focus:border-blue-500 focus:ring-blue-100"
                    placeholder="Mínimo 6 caracteres"
                  />
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
                  <span className="mr-2">🔴</span>
                  Cancelar
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={formLoading}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200"
              >
                {formLoading ? (
                  <>
                    <span className="mr-2">⏳</span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🟢</span>
                    Salvar
                  </>
                )}
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
        title="Confirmar Exclusão de Usuário"
        entityName={excluindo?.nome || ''}
        entityType="usuário"
        isLoading={deleteLoading}
        loadingText="Excluindo usuário..."
        confirmText="Excluir Usuário"
      />
    </PageContainer>
  );
};