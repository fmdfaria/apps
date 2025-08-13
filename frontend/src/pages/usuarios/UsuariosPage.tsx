import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, UserX, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AppToast } from '@/services/toast';
import { getUsers, createUser, updateUser, deleteUser } from '@/services/users';
import type { User } from '@/types/User';
import { FormErrorMessage } from '@/components/form-error-message';
import { WhatsAppInput } from '@/components/ui/whatsapp-input';
import { whatsAppFromStorage } from '@/utils/whatsapp';
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
  whatsapp: string;
}




export const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<User | null>(null);
  const [form, setForm] = useState<FormularioUsuario>({
    nome: '',
    email: '',
    whatsapp: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [whatsappValid, setWhatsappValid] = useState(false);
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
      key: 'whatsapp',
      header: '📱 WhatsApp',
      essential: false,
      filterable: {
        type: 'text',
        placeholder: 'WhatsApp do usuário...',
        label: 'WhatsApp'
      },
      render: (item) => <span className="text-sm">{whatsAppFromStorage(item.whatsapp)}</span>
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
      u.whatsapp.toLowerCase().includes(busca.toLowerCase())
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
      AppToast.error('Erro ao carregar usuários', {
        description: 'Ocorreu um problema ao carregar a lista de usuários. Tente novamente.'
      });
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
      whatsapp: '',
    });
    setFormError('');
    setWhatsappValid(false);
    setShowModal(true);
  };

  const abrirModalEditar = (usuario: User) => {
    setEditando(usuario);
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      whatsapp: usuario.whatsapp,
    });
    setFormError('');
    setWhatsappValid(true); // Assume que WhatsApp existente é válido
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      nome: '',
      email: '',
      whatsapp: '',
    });
    setFormError('');
    setWhatsappValid(false);
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
    
    if (!editando && !whatsappValid) {
      setFormError('WhatsApp obrigatório para novos usuários.');
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
        if (form.whatsapp !== editando.whatsapp) payload.whatsapp = form.whatsapp;
        
        if (Object.keys(payload).length > 0) {
          await updateUser(editando.id, payload);
          AppToast.updated('Usuário', `O usuário "${form.nome.trim()}" foi atualizado com sucesso.`);
        }
      } else {
        await createUser({
          nome: form.nome.trim(),
          email: form.email.trim(),
          whatsapp: form.whatsapp
        });
        AppToast.created('Usuário', `O usuário "${form.nome.trim()}" foi criado com sucesso. A senha temporária foi enviada via WhatsApp.`);
      }
      fecharModal();
      fetchUsuarios();
    } catch (e: any) {
      let title = 'Erro ao salvar usuário';
      let description = 'Não foi possível salvar o usuário. Verifique os dados e tente novamente.';
      
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

  const toggleUsuarioStatus = async (usuario: User) => {
    try {
      await updateUser(usuario.id, { ativo: !usuario.ativo });
      AppToast.updated('Status do Usuário', `O usuário "${usuario.nome}" foi ${!usuario.ativo ? 'ativado' : 'desativado'} com sucesso.`);
      fetchUsuarios();
    } catch (e) {
      AppToast.error('Erro ao alterar status', {
        description: 'Não foi possível alterar o status do usuário. Tente novamente.'
      });
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
      AppToast.deleted('Usuário', `O usuário "${excluindo.nome}" foi excluído permanentemente.`);
      setExcluindo(null);
      fetchUsuarios();
    } catch (e) {
      AppToast.error('Erro ao excluir usuário', {
        description: 'Não foi possível excluir o usuário. Tente novamente ou entre em contato com o suporte.'
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

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">📱</span>
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-semibold">WhatsApp</span>
                  <span className="text-red-500">*</span>
                </label>
                <WhatsAppInput
                  value={form.whatsapp}
                  onChange={value => setForm(f => ({ ...f, whatsapp: value }))}
                  onValidityChange={setWhatsappValid}
                  disabled={formLoading}
                  error={!whatsappValid && form.whatsapp.length > 0}
                />
              </div>

              {!editando && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">ℹ️ Informação:</span> Uma senha temporária será gerada automaticamente e enviada via WhatsApp para o usuário.
                  </p>
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
                disabled={formLoading || (!editando && !whatsappValid)}
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
                    {editando ? 'Atualizar' : 'Criar Usuário'}
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