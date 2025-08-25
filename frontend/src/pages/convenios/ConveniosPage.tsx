import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AppToast } from '@/services/toast';
import api from '@/services/api';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import { getConvenios, createConvenio, updateConvenio, deleteConvenio } from '@/services/convenios';
import type { Convenio } from '@/types/Convenio';
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
import { useViewMode } from '@/hooks/useViewMode';
import { useResponsiveTable } from '@/hooks/useResponsiveTable';
import { useTableFilters } from '@/hooks/useTableFilters';
import { getModuleTheme } from '@/types/theme';

// Definir tipo de formulário separado
interface FormularioConvenio {
  nome: string;
}

export const ConveniosPage = () => {
  const theme = getModuleTheme('convenios');
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [canCreate, setCanCreate] = useState(true);
  const [canUpdate, setCanUpdate] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Convenio | null>(null);
  const [form, setForm] = useState<FormularioConvenio>({
    nome: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<Convenio | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'convenios-view' });
  
  // Configuração das colunas da tabela com filtros dinâmicos
  const columns: TableColumn<Convenio>[] = [
    {
      key: 'nome',
      header: '🏥 Nome',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome do convênio...',
        label: 'Nome'
      },
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 bg-gradient-to-r ${theme.primaryButton} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
            {item.nome.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium">{item.nome}</span>
        </div>
      )
    },
    {
      key: 'actions',
      header: '⚙️ Ações',
      essential: true,
      render: (item) => {
        return (
        <div className="flex gap-1.5">
          {canUpdate ? (
            <ActionButton
              variant="view"
              module="convenios"
              onClick={() => abrirModalEditar(item)}
              title="Editar Convênio"
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
                  <p>Você não tem permissão para editar convênios</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {canDelete ? (
            <ActionButton
              variant="delete"
              module="convenios"
              onClick={() => confirmarExclusao(item)}
              title="Excluir Convênio"
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
                  <p>Você não tem permissão para excluir convênios</p>
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
  const conveniosFiltrados = useMemo(() => {
    // Primeiro aplicar busca textual
    let dadosFiltrados = convenios.filter(c =>
      c.nome.toLowerCase().includes(busca.toLowerCase())
    );
    
    // Depois aplicar filtros dinâmicos
    return applyFilters(dadosFiltrados);
  }, [convenios, busca, applyFilters]);

  const {
    data: conveniosPaginados,
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
  } = useResponsiveTable(conveniosFiltrados, 10);

  useEffect(() => {
    fetchConvenios();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Verificar cada permissão específica para acesso à página de convênios
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/convenios-page' && route.method.toLowerCase() === 'get';
      });
      
      const canCreate = allowedRoutes.some((route: any) => {
        return route.path === '/convenios' && route.method.toLowerCase() === 'post';
      });
      
      const canUpdate = allowedRoutes.some((route: any) => {
        return route.path === '/convenios/:id' && route.method.toLowerCase() === 'put';
      });
      
      const canDelete = allowedRoutes.some((route: any) => {
        return route.path === '/convenios/:id' && route.method.toLowerCase() === 'delete';
      });
      
      setCanCreate(canCreate);
      setCanUpdate(canUpdate);
      setCanDelete(canDelete);
      
      // Se não tem nem permissão de leitura, marca como access denied
      if (!canRead) {
        setAccessDenied(true);
      }
      
    } catch (error: any) {
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

  const fetchConvenios = async () => {
    setLoading(true);
    setAccessDenied(false);
    setConvenios([]); // Limpa convênios para evitar mostrar dados antigos
    try {
      const data = await getConvenios();
      setConvenios(data);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setAccessDenied(true);
        // Buscar informações da rota para mensagem mais específica
        try {
          const info = await getRouteInfo('/convenios-page', 'GET');
          setRouteInfo(info);
        } catch (routeError) {
          // Erro ao buscar informações da rota
        }
        // Não mostra toast aqui pois o interceptor já cuida disso
      } else {
        AppToast.error('Erro ao carregar convênios', {
          description: 'Ocorreu um problema ao carregar a lista de convênios. Tente novamente.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Renderização do card
  const renderCard = (convenio: Convenio) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">🏥</span>
            <CardTitle className="text-sm font-medium truncate">{convenio.nome}</CardTitle>
          </div>
          <div className={`w-8 h-8 bg-gradient-to-r ${theme.primaryButton} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {convenio.nome.charAt(0).toUpperCase()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Convênio:</span>
            <span className="text-xs font-medium text-blue-700">
              {convenio.nome}
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
            onClick={() => abrirModalEditar(convenio)}
            title="Editar convênio"
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
                <p>Você não tem permissão para editar convênios</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {canDelete ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
            onClick={() => confirmarExclusao(convenio)}
            title="Excluir convênio"
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
                <p>Você não tem permissão para excluir convênios</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </ResponsiveCardFooter>
    </Card>
  );

  // Funções de manipulação
  const abrirModalNova = () => {
    setEditando(null);
    setForm({
      nome: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (c: Convenio) => {
    setEditando(c);
    setForm({
      nome: c.nome,
    });
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      nome: '',
    });
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || form.nome.trim().length < 2) {
      setFormError('O nome deve ter pelo menos 2 caracteres.');
      AppToast.validation('Nome muito curto', 'O nome do convênio deve ter pelo menos 2 caracteres.');
      return;
    }
    setFormLoading(true);
    try {
      if (editando) {
        await updateConvenio(editando.id, { nome: form.nome.trim() });
        AppToast.updated('Convênio', `O convênio "${form.nome.trim()}" foi atualizado com sucesso.`);
      } else {
        await createConvenio({ nome: form.nome.trim() });
        AppToast.created('Convênio', `O convênio "${form.nome.trim()}" foi criado com sucesso.`);
      }
      fecharModal();
      fetchConvenios();
    } catch (e: any) {
      let title = 'Erro ao salvar convênio';
      let description = 'Não foi possível salvar o convênio. Verifique os dados e tente novamente.';
      
      if (e?.response?.status === 403) {
        // Erro de permissão será tratado pelo interceptor
        return;
      } else if (e?.response?.data?.message) {
        description = e.response.data.message;
      } else if (e?.message) {
        description = e.message;
      }
      
      AppToast.error(title, { description });
    } finally {
      setFormLoading(false);
    }
  };

  const confirmarExclusao = (c: Convenio) => {
    setExcluindo(c);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteConvenio(excluindo.id);
      AppToast.deleted('Convênio', `O convênio "${excluindo.nome}" foi excluído permanentemente.`);
      setExcluindo(null);
      fetchConvenios();
    } catch (e) {
      if (e?.response?.status === 403) {
        // Erro de permissão será tratado pelo interceptor
        return;
      }
      
      AppToast.error('Erro ao excluir convênio', {
        description: 'Não foi possível excluir o convênio. Tente novamente ou entre em contato com o suporte.'
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
            <p className="text-gray-500">Carregando convênios...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header da página */}
      <PageHeader title="Convênios" module="convenios" icon="🏥">
        <SearchBar
          placeholder="Buscar convênios..."
          value={busca}
          onChange={setBusca}
          module="convenios"
        />
        
        <FilterButton
          showFilters={mostrarFiltros}
          onToggleFilters={() => setMostrarFiltros(prev => !prev)}
          activeFiltersCount={activeFiltersCount}
          module="convenios"
          disabled={filterConfigs.length === 0}
          tooltip={filterConfigs.length === 0 ? 'Nenhum filtro configurado' : undefined}
        />
        
        <ViewToggle 
          viewMode={viewMode} 
          onViewModeChange={setViewMode} 
          module="convenios"
        />
        
        {canCreate ? (
          <Button 
            className={`!h-10 bg-gradient-to-r ${theme.primaryButton} ${theme.primaryButtonHover} shadow-lg hover:shadow-xl transition-all duration-200 font-semibold`}
            onClick={abrirModalNova}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Convênio
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button 
                    className={`!h-10 bg-gradient-to-r ${theme.primaryButton} ${theme.primaryButtonHover} shadow-lg hover:shadow-xl transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={true}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Convênio
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para criar convênios</p>
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
          module="convenios"
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
                <p>Você não tem permissão para visualizar convênios</p>
              )}
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <ResponsiveTable 
            data={conveniosPaginados}
            columns={columns}
            module="convenios"
            emptyMessage="Nenhum convênio encontrado"
            isLoadingMore={isLoadingMore}
            hasNextPage={hasNextPage}
            isMobile={isMobile}
            scrollRef={targetRef}
          />
        ) : (
          <ResponsiveCards 
            data={conveniosPaginados}
            renderCard={renderCard}
            emptyMessage="Nenhum convênio encontrado"
            emptyIcon="🏥"
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
          module="convenios"
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {/* Modal de cadastro/edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Convênio' : 'Novo Convênio'}</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">🏥</span>
                  <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>Nome</span>
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  disabled={formLoading}
                  autoFocus
                  minLength={2}
                  className="hover:border-blue-300 focus:border-blue-500 focus:ring-blue-100"
                  placeholder="Ex: Unimed, Amil, Bradesco Saúde"
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
                className={`bg-gradient-to-r ${theme.primaryButton} ${theme.primaryButtonHover} shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200`}
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
        title="Confirmar Exclusão de Convênio"
        entityName={excluindo?.nome || ''}
        entityType="convênio"
        isLoading={deleteLoading}
        loadingText="Excluindo convênio..."
        confirmText="Excluir Convênio"
      />
    </PageContainer>
  );
}; 