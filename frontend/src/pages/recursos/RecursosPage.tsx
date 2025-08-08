import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast, toast } from '@/components/ui/use-toast';
import { getRecursos, createRecurso, updateRecurso, deleteRecurso } from '@/services/recursos';
import type { Recurso } from '@/types/Recurso';
import api from '@/services/api';
import { FormErrorMessage } from '@/components/form-error-message';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
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
import { useViewMode } from '@/hooks/useViewMode';
import { useResponsiveTable } from '@/hooks/useResponsiveTable';
import { useTableFilters } from '@/hooks/useTableFilters';

// Definir tipo de formulário separado
interface FormularioRecurso {
  nome: string;
  descricao: string;
}

export const RecursosPage = () => {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [canCreate, setCanCreate] = useState(true);
  const [canUpdate, setCanUpdate] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Recurso | null>(null);
  const [form, setForm] = useState<FormularioRecurso>({
    nome: '',
    descricao: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<Recurso | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'recursos-view' });
  
  // Configuração das colunas da tabela com filtros dinâmicos
  const columns: TableColumn<Recurso>[] = [
    {
      key: 'nome',
      header: '🛠️ Nome',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome do recurso...',
        label: 'Nome'
      },
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {item.nome.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium">{item.nome}</span>
        </div>
      )
    },
    {
      key: 'descricao',
      header: '📝 Descrição',
      essential: false,
      filterable: {
        type: 'text',
        placeholder: 'Descrição do recurso...',
        label: 'Descrição'
      },
      render: (item) => <span className="text-sm text-gray-600">{item.descricao || '-'}</span>
    },
    {
      key: 'actions',
      header: '⚙️ Ações',
      essential: true,
      render: (item) => {
        console.log('🎯 Renderizando ações - canUpdate:', canUpdate, 'canDelete:', canDelete);
        return (
        <div className="flex gap-1.5">
          {canUpdate ? (
            <ActionButton
              variant="view"
              module="recursos"
              onClick={() => abrirModalEditar(item)}
              title="Editar Recurso"
            >
              <Edit className="w-4 h-4" />
            </ActionButton>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0 border-orange-300 text-orange-600 opacity-50 cursor-not-allowed"
                      disabled={true}
                      title="Sem permissão para editar"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para editar recursos</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {canDelete ? (
            <ActionButton
              variant="delete"
              module="recursos"
              onClick={() => confirmarExclusao(item)}
              title="Excluir Recurso"
            >
              <Trash2 className="w-4 h-4" />
            </ActionButton>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0 border-red-300 text-red-600 opacity-50 cursor-not-allowed"
                      disabled={true}
                      title="Sem permissão para excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para excluir recursos</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        );
      }
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
  const recursosFiltrados = useMemo(() => {
    // Primeiro aplicar busca textual
    let dadosFiltrados = recursos.filter(r =>
      r.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (r.descricao || '').toLowerCase().includes(busca.toLowerCase())
    );
    
    // Depois aplicar filtros dinâmicos
    return applyFilters(dadosFiltrados);
  }, [recursos, busca, applyFilters]);

  const {
    data: recursosPaginados,
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
  } = useResponsiveTable(recursosFiltrados, 10);

  useEffect(() => {
    fetchRecursos();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    console.log('🔍 Verificando permissões do usuário');
    
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      console.log('📋 Rotas permitidas recebidas:', allowedRoutes);
      
      // Verificar cada permissão específica para recursos
      console.log('🔍 Buscando rotas de recursos...');
      
      const canRead = allowedRoutes.some((route: any) => {
        const match = route.path === '/recursos' && route.method.toLowerCase() === 'get';
        console.log(`📋 Rota: ${route.path} ${route.method} - Match GET:`, match);
        return match;
      });
      
      const canCreate = allowedRoutes.some((route: any) => {
        const match = route.path === '/recursos' && route.method.toLowerCase() === 'post';
        console.log(`📋 Rota: ${route.path} ${route.method} - Match POST:`, match);
        return match;
      });
      
      const canUpdate = allowedRoutes.some((route: any) => {
        const match = route.path === '/recursos/:id' && route.method.toLowerCase() === 'put';
        console.log(`📋 Rota: ${route.path} ${route.method} - Match PUT:`, match);
        return match;
      });
      
      const canDelete = allowedRoutes.some((route: any) => {
        const match = route.path === '/recursos/:id' && route.method.toLowerCase() === 'delete';
        console.log(`📋 Rota: ${route.path} ${route.method} - Match DELETE:`, match);
        return match;
      });
      
      console.log('🎯 Permissões calculadas:', { canRead, canCreate, canUpdate, canDelete });
      
      console.log('🔄 Atualizando estados das permissões...');
      setCanCreate(canCreate);
      console.log('✅ canCreate definido como:', canCreate);
      setCanUpdate(canUpdate);
      console.log('✅ canUpdate definido como:', canUpdate);
      setCanDelete(canDelete);
      console.log('✅ canDelete definido como:', canDelete);
      
      // Se não tem nem permissão de leitura, marca como access denied
      if (!canRead) {
        setAccessDenied(true);
      }
      
    } catch (error: any) {
      console.log('❌ Erro ao verificar permissões:', error);
      // Em caso de erro, desabilita tudo por segurança
      setCanCreate(false);
      setCanUpdate(false);
      setCanDelete(false);
      
      // Se retornar 401/403 no endpoint de permissões, considera acesso negado
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };

  const fetchRecursos = async () => {
    setLoading(true);
    setAccessDenied(false);
    setRecursos([]); // Limpa recursos para evitar mostrar dados antigos
    try {
      const data = await getRecursos();
      setRecursos(data);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setAccessDenied(true);
        // Buscar informações da rota para mensagem mais específica
        try {
          const info = await getRouteInfo('/recursos', 'GET');
          setRouteInfo(info);
        } catch (routeError) {
          console.log('❌ Erro ao buscar route info:', routeError);
        }
        // Não mostra toast aqui pois o interceptor já cuida disso
      } else {
        toast({ title: 'Erro ao carregar recursos', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Renderização do card
  const renderCard = (recurso: Recurso) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">🛠️</span>
            <CardTitle className="text-sm font-medium truncate">{recurso.nome}</CardTitle>
          </div>
          <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {recurso.nome.charAt(0).toUpperCase()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-muted-foreground">Descrição:</span>
            <span className="text-xs text-gray-600 flex-1">
              {recurso.descricao || 'Sem descrição'}
            </span>
          </div>
        </div>
      </CardContent>
      <ResponsiveCardFooter>
        {canUpdate ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white"
            onClick={() => abrirModalEditar(recurso)}
            title="Editar recurso"
          >
            <Edit className="w-4 h-4" />
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-orange-300 text-orange-600 opacity-50 cursor-not-allowed"
                    disabled={true}
                    title="Sem permissão para editar"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para editar recursos</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {canDelete ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
            onClick={() => confirmarExclusao(recurso)}
            title="Excluir recurso"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-red-300 text-red-600 opacity-50 cursor-not-allowed"
                    disabled={true}
                    title="Sem permissão para excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para excluir recursos</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </ResponsiveCardFooter>
    </Card>
  );

  // Funções de manipulação
  const abrirModalNovo = () => {
    setEditando(null);
    setForm({
      nome: '',
      descricao: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (r: Recurso) => {
    setEditando(r);
    setForm({
      nome: r.nome,
      descricao: r.descricao || '',
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
    });
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || form.nome.trim().length < 2) {
      setFormError('O nome deve ter pelo menos 2 caracteres.');
      return;
    }
    setFormLoading(true);
    try {
      if (editando) {
        await updateRecurso(editando.id, { nome: form.nome.trim(), descricao: form.descricao.trim() });
        toast({ title: 'Recurso atualizado com sucesso', variant: 'success' });
      } else {
        await createRecurso({ nome: form.nome.trim(), descricao: form.descricao.trim() });
        toast({ title: 'Recurso criado com sucesso', variant: 'success' });
      }
      fecharModal();
      fetchRecursos();
    } catch (e: any) {
      let msg = 'Erro ao salvar recurso';
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

  const confirmarExclusao = (r: Recurso) => {
    setExcluindo(r);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteRecurso(excluindo.id);
      toast({ title: 'Recurso excluído com sucesso', variant: 'success' });
      setExcluindo(null);
      fetchRecursos();
    } catch (e) {
      toast({ title: 'Erro ao excluir recurso', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando recursos...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header da página */}
      <PageHeader title="Recursos" module="recursos" icon="🛠️">
        <SearchBar
          placeholder="Buscar recursos..."
          value={busca}
          onChange={setBusca}
          module="recursos"
        />
        
        <FilterButton
          showFilters={mostrarFiltros}
          onToggleFilters={() => setMostrarFiltros(prev => !prev)}
          activeFiltersCount={activeFiltersCount}
          module="recursos"
          disabled={filterConfigs.length === 0}
          tooltip={filterConfigs.length === 0 ? 'Nenhum filtro configurado' : undefined}
        />
        
        <ViewToggle 
          viewMode={viewMode} 
          onViewModeChange={setViewMode} 
          module="recursos"
        />
        
        {(() => {
          console.log('🎨 Renderizando botão Novo Recurso - canCreate:', canCreate);
          return canCreate;
        })() ? (
          <Button 
            className="!h-10 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
            onClick={abrirModalNovo}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Recurso
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button 
                    className="!h-10 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={true}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Recurso
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para criar recursos</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
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
          module="recursos"
        />

        {/* Conteúdo baseado no modo de visualização */}
        {accessDenied ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">🚫</span>
            </div>
            <p className="text-red-600 font-medium mb-2">Acesso Negado</p>
            <div className="text-gray-600 text-sm space-y-1 max-w-md">
              {routeInfo ? (
                <>
                  <p><strong>Rota:</strong> {routeInfo.nome}</p>
                  <p><strong>Descrição:</strong> {routeInfo.descricao}</p>
                  {routeInfo.modulo && <p><strong>Módulo:</strong> {routeInfo.modulo}</p>}
                  <p className="text-gray-400 mt-2">Você não tem permissão para acessar este recurso</p>
                </>
              ) : (
                <p>Você não tem permissão para visualizar recursos</p>
              )}
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <ResponsiveTable 
            data={recursosPaginados}
            columns={columns}
            module="recursos"
            emptyMessage="Nenhum recurso encontrado"
            isLoadingMore={isLoadingMore}
            hasNextPage={hasNextPage}
            isMobile={isMobile}
            scrollRef={targetRef}
          />
        ) : (
          <ResponsiveCards 
            data={recursosPaginados}
            renderCard={renderCard}
            emptyMessage="Nenhum recurso encontrado"
            emptyIcon="🛠️"
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
          module="recursos"
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {/* Modal de cadastro/edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Recurso' : 'Novo Recurso'}</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">🛠️</span>
                  <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent font-semibold">Nome</span>
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  disabled={formLoading}
                  autoFocus
                  minLength={2}
                  className="hover:border-orange-300 focus:border-orange-500 focus:ring-orange-100"
                  placeholder="Ex: Sala de Consulta, Equipamento"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent font-semibold">Descrição</span>
                </label>
                <Textarea
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  disabled={formLoading}
                  className="hover:border-orange-300 focus:border-orange-500 focus:ring-orange-100"
                  placeholder="Descrição opcional do recurso..."
                  rows={3}
                />
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
                  <span className="mr-2">🔴</span>
                  Cancelar
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={formLoading}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200"
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
        title="Confirmar Exclusão de Recurso"
        entityName={excluindo?.nome || ''}
        entityType="recurso"
        isLoading={deleteLoading}
        loadingText="Excluindo recurso..."
        confirmText="Excluir Recurso"
      />
    </PageContainer>
  );
}; 