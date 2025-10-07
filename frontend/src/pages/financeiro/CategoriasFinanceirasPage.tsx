import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppToast } from '@/services/toast';
import { getCategoriasFinanceiras, createCategoriaFinanceira, updateCategoriaFinanceira, deleteCategoriaFinanceira } from '@/services/categorias-financeiras';
import type { CategoriaFinanceira } from '@/types/CategoriaFinanceira';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import api from '@/services/api';

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
import { getModuleTheme } from '@/types/theme';

// Modal Components
import CategoriaFinanceiraModal from './CategoriaFinanceiraModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

export const CategoriasFinanceirasPage = () => {
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<CategoriaFinanceira | null>(null);
  const [excluindo, setExcluindo] = useState<CategoriaFinanceira | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'categorias-financeiras-view' });
  
  // Configuração das colunas da tabela
  const columns: TableColumn<CategoriaFinanceira>[] = [
    {
      key: 'nome',
      header: '🏷️ Nome',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome da categoria...',
        label: 'Nome'
      },
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
            item.tipo === 'RECEITA' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-rose-600'
          }`}>
            {item.nome.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium">{item.nome}</span>
        </div>
      )
    },
    {
      key: 'tipo',
      header: '📊 Tipo',
      essential: true,
      filterable: {
        type: 'select',
        options: [
          { value: 'RECEITA', label: 'Receita' },
          { value: 'DESPESA', label: 'Despesa' }
        ],
        label: 'Tipo'
      },
      render: (item) => (
        <Badge 
          variant={item.tipo === 'RECEITA' ? 'success' : 'destructive'}
          className="text-xs"
        >
          {item.tipo === 'RECEITA' ? '💰 Receita' : '💸 Despesa'}
        </Badge>
      )
    },
    {
      key: 'descricao',
      header: '📝 Descrição',
      essential: false,
      render: (item) => (
        <span className="text-sm text-gray-600">
          {item.descricao || '-'}
        </span>
      )
    },
    {
      key: 'ativo',
      header: '⚡ Status',
      essential: true,
      filterable: {
        type: 'select',
        options: [
          { value: 'true', label: 'Ativo' },
          { value: 'false', label: 'Inativo' }
        ],
        label: 'Status'
      },
      render: (item) => (
        <Badge variant={item.ativo ? 'success' : 'secondary'} className="text-xs">
          {item.ativo ? '✅ Ativo' : '🚫 Inativo'}
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
            module="financeiro"
            onClick={() => abrirModalEditar(item)}
            title="Editar categoria"
          >
            <Edit className="w-4 h-4" />
          </ActionButton>
          
          <ActionButton
            variant="delete"
            module="financeiro"
            onClick={() => setExcluindo(item)}
            title="Excluir categoria"
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
  const categoriasFiltradas = useMemo(() => {
    const normalizarBusca = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

    let dadosFiltrados = categorias.filter(categoria => {
      if (busca.trim() === '') return true;
      
      const buscaNormalizada = normalizarBusca(busca);
      const nome = normalizarBusca(categoria.nome);
      const descricao = normalizarBusca(categoria.descricao || '');
      
      return nome.includes(buscaNormalizada) || 
             descricao.includes(buscaNormalizada);
    }).sort((a, b) => a.nome.localeCompare(b.nome));
    
    return applyFilters(dadosFiltrados);
  }, [categorias, busca, applyFilters]);

  const {
    data: categoriasPaginadas,
    totalItems,
    currentPage,
    itemsPerPage,
    totalPages,
    handlePageChange,
    handleItemsPerPageChange,
    isDesktop,
    isMobile,
    hasNextPage,
    isLoadingMore,
    targetRef
  } = useResponsiveTable(categoriasFiltradas, 10);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/categorias-financeiras' && route.method.toLowerCase() === 'get';
      });
      if (!canRead) {
        setAccessDenied(true);
      }
    } catch (error: any) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };

  useEffect(() => {
    checkPermissions();
    fetchData();
  }, []);

  const fetchData = async () => {
    setAccessDenied(false);
    setLoading(true);
    setCategorias([]);
    try {
      const data = await getCategoriasFinanceiras();
      setCategorias(data);
    } catch (error: any) {
      console.error('Erro ao carregar categorias:', error);
      if (error?.response?.status === 403) {
        const info = await getRouteInfo('/categorias-financeiras');
        setRouteInfo(info);
        setAccessDenied(true);
      } else {
        AppToast.error('Erro ao carregar categorias', {
          description: 'Ocorreu um problema ao carregar as categorias. Tente novamente.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNovo = () => {
    setEditando(null);
    setShowModal(true);
  };

  const abrirModalEditar = (categoria: CategoriaFinanceira) => {
    setEditando(categoria);
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
  };

  const handleSave = async (data: any) => {
    try {
      if (editando) {
        await updateCategoriaFinanceira(editando.id, data);
        AppToast.updated('Categoria Financeira', 'A categoria foi atualizada com sucesso.');
      } else {
        await createCategoriaFinanceira(data);
        AppToast.created('Categoria Financeira', 'A nova categoria foi cadastrada com sucesso.');
      }
      await fetchData();
      fecharModal();
    } catch (error: any) {
      console.error('Erro ao salvar categoria:', error);
      AppToast.error('Erro ao salvar categoria');
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteCategoriaFinanceira(excluindo.id);
      AppToast.deleted('Categoria Financeira', `A categoria "${excluindo.nome}" foi excluída permanentemente.`);
      setExcluindo(null);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      
      let title = 'Erro ao excluir categoria';
      let description = 'Não foi possível excluir a categoria. Tente novamente ou entre em contato com o suporte.';
      
      if (error?.response?.data?.message) {
        description = error.response.data.message;
      } else if (error?.message) {
        description = error.message;
      }
      
      AppToast.error(title, { description });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Renderização do card
  const renderCard = (categoria: CategoriaFinanceira) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
              categoria.tipo === 'RECEITA' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-rose-600'
            }`}>
              {categoria.nome.charAt(0).toUpperCase()}
            </div>
            <CardTitle className="text-sm font-medium truncate">{categoria.nome}</CardTitle>
          </div>
          <Badge 
            variant={categoria.tipo === 'RECEITA' ? 'success' : 'destructive'}
            className="ml-2 flex-shrink-0 text-xs"
          >
            {categoria.tipo === 'RECEITA' ? '💰' : '💸'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">📊 Tipo:</span>
              <span className={`font-medium ${categoria.tipo === 'RECEITA' ? 'text-green-600' : 'text-red-600'}`}>
                {categoria.tipo === 'RECEITA' ? 'Receita' : 'Despesa'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">⚡ Status:</span>
              <span className={`font-medium ${categoria.ativo ? 'text-green-600' : 'text-gray-500'}`}>
                {categoria.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            {categoria.descricao && (
              <div className="mt-2">
                <span className="text-gray-600 text-xs">📝 Descrição:</span>
                <p className="text-gray-800 text-xs mt-1 break-words">{categoria.descricao}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <ResponsiveCardFooter>
        <ActionButton
          variant="view"
          module="financeiro"
          onClick={() => abrirModalEditar(categoria)}
          title="Editar categoria"
        >
          <Edit className="w-4 h-4" />
        </ActionButton>
        <ActionButton
          variant="delete"
          module="financeiro"
          onClick={() => setExcluindo(categoria)}
          title="Excluir categoria"
        >
          <Trash2 className="w-4 h-4" />
        </ActionButton>
      </ResponsiveCardFooter>
    </Card>
  );

  if (accessDenied) {
    return (
      <PageContainer>
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
              <p>Você não tem permissão para acessar este recurso</p>
            )}
          </div>
        </div>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando categorias financeiras...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <TooltipProvider>
      <PageContainer>
        {/* Header da página */}
        <PageHeader title="Categorias Financeiras" module="financeiro" icon="🏷️">
          <SearchBar
            placeholder="Buscar por nome ou descrição..."
            value={busca}
            onChange={setBusca}
            module="financeiro"
          />
          
          <FilterButton
            showFilters={mostrarFiltros}
            onToggleFilters={() => setMostrarFiltros(prev => !prev)}
            activeFiltersCount={activeFiltersCount}
            module="financeiro"
            disabled={filterConfigs.length === 0}
          />
          
          <ViewToggle 
            viewMode={viewMode} 
            onViewModeChange={setViewMode} 
            module="financeiro"
          />
          
          <Button 
            className={`!h-10 bg-gradient-to-r ${getModuleTheme('financeiro').primaryButton} ${getModuleTheme('financeiro').primaryButtonHover} shadow-lg hover:shadow-xl transition-all duration-200 font-semibold`}
            onClick={abrirModalNovo}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Categoria
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
            module="financeiro"
          />

          {/* Conteúdo baseado no modo de visualização */}
          {viewMode === 'table' ? (
            <ResponsiveTable 
              data={categoriasPaginadas}
              columns={columns}
              module="financeiro"
              emptyMessage="Nenhuma categoria financeira encontrada"
              isLoadingMore={isLoadingMore}
              hasNextPage={hasNextPage}
              isMobile={isMobile}
              scrollRef={targetRef}
            />
          ) : (
            <ResponsiveCards 
              data={categoriasPaginadas}
              renderCard={renderCard}
              emptyMessage="Nenhuma categoria financeira encontrada"
              emptyIcon="🏷️"
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
            module="financeiro"
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}

        {/* Modais */}
        <CategoriaFinanceiraModal
          isOpen={showModal}
          categoria={editando}
          onClose={fecharModal}
          onSave={handleSave}
        />
        
        <ConfirmDeleteModal
          open={!!excluindo}
          onClose={() => setExcluindo(null)}
          onConfirm={handleDelete}
          title="Confirmar Exclusão de Categoria"
          entityName={excluindo?.nome || ''}
          entityType="categoria financeira"
          isLoading={deleteLoading}
          loadingText="Excluindo categoria..."
          confirmText="Excluir Categoria"
        />
      </PageContainer>
    </TooltipProvider>
  );
};