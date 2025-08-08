import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AppToast } from '@/services/toast';
import { getEspecialidades, createEspecialidade, updateEspecialidade, deleteEspecialidade } from '@/services/especialidades';
import api from '@/services/api';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import type { Especialidade } from '@/types/Especialidade';
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
interface FormularioEspecialidade {
  nome: string;
}

export const EspecialidadesPage = () => {
  const theme = getModuleTheme('especialidades');
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [canCreate, setCanCreate] = useState(true);
  const [canUpdate, setCanUpdate] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Especialidade | null>(null);
  const [form, setForm] = useState<FormularioEspecialidade>({
    nome: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<Especialidade | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'especialidades-view' });
  
  // Configuração das colunas da tabela com filtros dinâmicos
  const columns: TableColumn<Especialidade>[] = [
    {
      key: 'nome',
      header: '🎯 Nome',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome da especialidade...',
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
              module="especialidades"
              onClick={() => abrirModalEditar(item)}
              title="Editar Especialidade"
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
                  <p>Você não tem permissão para editar especialidades</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {canDelete ? (
            <ActionButton
              variant="delete"
              module="especialidades"
              onClick={() => confirmarExclusao(item)}
              title="Excluir Especialidade"
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
                  <p>Você não tem permissão para excluir especialidades</p>
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
  const especialidadesFiltradas = useMemo(() => {
    // Primeiro aplicar busca textual
    let dadosFiltrados = especialidades.filter(e =>
      e.nome.toLowerCase().includes(busca.toLowerCase())
    );
    
    // Depois aplicar filtros dinâmicos
    return applyFilters(dadosFiltrados);
  }, [especialidades, busca, applyFilters]);

  const {
    data: especialidadesPaginadas,
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
  } = useResponsiveTable(especialidadesFiltradas, 10);

  useEffect(() => {
    fetchEspecialidades();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Verificar cada permissão específica para especialidades
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/especialidades' && route.method.toLowerCase() === 'get';
      });
      
      const canCreate = allowedRoutes.some((route: any) => {
        return route.path === '/especialidades' && route.method.toLowerCase() === 'post';
      });
      
      const canUpdate = allowedRoutes.some((route: any) => {
        return route.path === '/especialidades/:id' && route.method.toLowerCase() === 'put';
      });
      
      const canDelete = allowedRoutes.some((route: any) => {
        return route.path === '/especialidades/:id' && route.method.toLowerCase() === 'delete';
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

  const fetchEspecialidades = async () => {
    setLoading(true);
    setAccessDenied(false);
    setEspecialidades([]); // Limpa especialidades para evitar mostrar dados antigos
    try {
      const data = await getEspecialidades();
      setEspecialidades(data);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setAccessDenied(true);
        // Buscar informações da rota para mensagem mais específica
        try {
          const info = await getRouteInfo('/especialidades', 'GET');
          setRouteInfo(info);
        } catch (routeError) {
          // Erro ao buscar informações da rota
        }
        // Não mostra toast aqui pois o interceptor já cuida disso
      } else {
        AppToast.error('Erro ao carregar especialidades', {
          description: 'Ocorreu um problema ao carregar a lista de especialidades. Tente novamente.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Renderização do card
  const renderCard = (especialidade: Especialidade) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">🎯</span>
            <CardTitle className="text-sm font-medium truncate">{especialidade.nome}</CardTitle>
          </div>
          <div className={`w-8 h-8 bg-gradient-to-r ${theme.primaryButton} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {especialidade.nome.charAt(0).toUpperCase()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-muted-foreground">Nome:</span>
            <span className="text-xs text-gray-600 flex-1">
              {especialidade.nome}
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
            onClick={() => abrirModalEditar(especialidade)}
            title="Editar especialidade"
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
                <p>Você não tem permissão para editar especialidades</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {canDelete ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
            onClick={() => confirmarExclusao(especialidade)}
            title="Excluir especialidade"
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
                <p>Você não tem permissão para excluir especialidades</p>
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

  const abrirModalEditar = (esp: Especialidade) => {
    setEditando(esp);
    setForm({
      nome: esp.nome,
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
      AppToast.validation('Nome muito curto', 'O nome da especialidade deve ter pelo menos 2 caracteres.');
      return;
    }
    setFormLoading(true);
    try {
      if (editando) {
        await updateEspecialidade(editando.id, { nome: form.nome.trim() });
        AppToast.updated('Especialidade', `A especialidade "${form.nome.trim()}" foi atualizada com sucesso.`);
      } else {
        await createEspecialidade({ nome: form.nome.trim() });
        AppToast.created('Especialidade', `A especialidade "${form.nome.trim()}" foi criada com sucesso.`);
      }
      fecharModal();
      fetchEspecialidades();
    } catch (e: any) {
      let title = 'Erro ao salvar especialidade';
      let description = 'Não foi possível salvar a especialidade. Verifique os dados e tente novamente.';
      
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

  const confirmarExclusao = (esp: Especialidade) => {
    setExcluindo(esp);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteEspecialidade(excluindo.id);
      AppToast.deleted('Especialidade', `A especialidade "${excluindo.nome}" foi excluída permanentemente.`);
      setExcluindo(null);
      fetchEspecialidades();
    } catch (e) {
      if (e?.response?.status === 403) {
        // Erro de permissão será tratado pelo interceptor
        return;
      }
      
      AppToast.error('Erro ao excluir especialidade', {
        description: 'Não foi possível excluir a especialidade. Tente novamente ou entre em contato com o suporte.'
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando especialidades...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header da página */}
      <PageHeader title="Especialidades" module="especialidades" icon="🎯">
        <SearchBar
          placeholder="Buscar especialidades..."
          value={busca}
          onChange={setBusca}
          module="especialidades"
        />
        
        <FilterButton
          showFilters={mostrarFiltros}
          onToggleFilters={() => setMostrarFiltros(prev => !prev)}
          activeFiltersCount={activeFiltersCount}
          module="especialidades"
          disabled={filterConfigs.length === 0}
          tooltip={filterConfigs.length === 0 ? 'Nenhum filtro configurado' : undefined}
        />
        
        <ViewToggle 
          viewMode={viewMode} 
          onViewModeChange={setViewMode} 
          module="especialidades"
        />
        
        {canCreate ? (
          <Button 
            className={`!h-10 bg-gradient-to-r ${theme.primaryButton} ${theme.primaryButtonHover} shadow-lg hover:shadow-xl transition-all duration-200 font-semibold`}
            onClick={abrirModalNova}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Especialidade
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
                    Nova Especialidade
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para criar especialidades</p>
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
          module="especialidades"
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
                <p>Você não tem permissão para visualizar especialidades</p>
              )}
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <ResponsiveTable 
            data={especialidadesPaginadas}
            columns={columns}
            module="especialidades"
            emptyMessage="Nenhuma especialidade encontrada"
            isLoadingMore={isLoadingMore}
            hasNextPage={hasNextPage}
            isMobile={isMobile}
            scrollRef={targetRef}
          />
        ) : (
          <ResponsiveCards 
            data={especialidadesPaginadas}
            renderCard={renderCard}
            emptyMessage="Nenhuma especialidade encontrada"
            emptyIcon="🎯"
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
          module="especialidades"
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {/* Modal de cadastro/edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Especialidade' : 'Nova Especialidade'}</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent font-semibold`}>Nome</span>
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  disabled={formLoading}
                  autoFocus
                  minLength={1}
                  className="hover:border-indigo-300 focus:border-indigo-500 focus:ring-indigo-100"
                  placeholder="Ex: Cardiologia, Dermatologia, Pediatria"
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
        title="Confirmar Exclusão de Especialidade"
        entityName={excluindo?.nome || ''}
        entityType="especialidade"
        isLoading={deleteLoading}
        loadingText="Excluindo especialidade..."
        confirmText="Excluir Especialidade"
      />
    </PageContainer>
  );
}; 