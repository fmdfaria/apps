import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, CheckCircle, TrendingUp, TrendingDown, Calendar, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppToast } from '@/services/toast';
import { 
  getFluxoCaixa, 
  createFluxoCaixa, 
  updateFluxoCaixa, 
  deleteFluxoCaixa, 
  conciliarMovimento 
} from '@/services/fluxo-caixa';
import { getEmpresas } from '@/services/empresas';
import type { FluxoCaixa, TipoMovimento } from '@/types/FluxoCaixa';
import type { Empresa } from '@/types/Empresa';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

// Financial components
import { StatusBadge, ValorDisplay } from '@/components/financeiro';

// Modal Components
import FluxoCaixaModal from './FluxoCaixaModal';
import ConciliarMovimentoModal from './ConciliarMovimentoModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

export const FluxoCaixaPage = () => {
  const [movimentos, setMovimentos] = useState<FluxoCaixa[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showConciliarModal, setShowConciliarModal] = useState(false);
  const [editando, setEditando] = useState<FluxoCaixa | null>(null);
  const [conciliando, setConciliando] = useState<FluxoCaixa | null>(null);
  const [excluindo, setExcluindo] = useState<FluxoCaixa | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'fluxo-caixa-view' });
  
  // Configuração das colunas da tabela
  const columns: TableColumn<FluxoCaixa>[] = [
    {
      key: 'dataMovimento',
      header: '📅 Data',
      essential: true,
      render: (item) => (
        <span className="text-sm">
          {new Date(item.dataMovimento).toLocaleDateString('pt-BR')}
        </span>
      )
    },
    {
      key: 'tipo',
      header: '🔄 Tipo',
      essential: true,
      filterable: {
        type: 'select',
        options: [
          { value: 'ENTRADA', label: 'Entrada' },
          { value: 'SAIDA', label: 'Saída' }
        ],
        label: 'Tipo'
      },
      render: (item) => (
        <Badge 
          className={`${
            item.tipo === 'ENTRADA' 
              ? 'bg-green-100 text-green-700 border-green-200' 
              : 'bg-red-100 text-red-700 border-red-200'
          }`}
        >
          {item.tipo === 'ENTRADA' ? (
            <><TrendingUp className="w-3 h-3 mr-1" />Entrada</>
          ) : (
            <><TrendingDown className="w-3 h-3 mr-1" />Saída</>
          )}
        </Badge>
      )
    },
    {
      key: 'descricao',
      header: '📄 Descrição',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Descrição do movimento...',
        label: 'Descrição'
      },
      render: (item) => (
        <span className="text-sm font-medium">{item.descricao}</span>
      )
    },
    {
      key: 'valor',
      header: '💰 Valor',
      essential: true,
      render: (item) => (
        <ValorDisplay 
          valor={item.valor} 
          tipo={item.tipo === 'ENTRADA' ? 'positivo' : 'negativo'} 
          className="text-sm" 
        />
      )
    },
    {
      key: 'empresa',
      header: '🏢 Empresa',
      essential: false,
      render: (item) => (
        <span className="text-sm">
          {item.empresa?.razaoSocial || '-'}
        </span>
      )
    },
    {
      key: 'contaBancaria',
      header: '🏦 Conta',
      essential: false,
      render: (item) => (
        <span className="text-sm">
          {item.contaBancaria?.nome || '-'}
        </span>
      )
    },
    {
      key: 'categoria',
      header: '🏷️ Categoria',
      essential: false,
      render: (item) => (
        <span className="text-sm">
          {item.categoria?.nome || '-'}
        </span>
      )
    },
    {
      key: 'formaPagamento',
      header: '💳 Forma',
      essential: false,
      render: (item) => (
        <span className="text-sm">
          {item.formaPagamento || '-'}
        </span>
      )
    },
    {
      key: 'conciliado',
      header: '✅ Status',
      essential: true,
      filterable: {
        type: 'select',
        options: [
          { value: 'true', label: 'Conciliado' },
          { value: 'false', label: 'Pendente' }
        ],
        label: 'Status'
      },
      render: (item) => (
        <Badge 
          className={`${
            item.conciliado 
              ? 'bg-green-100 text-green-700 border-green-200' 
              : 'bg-yellow-100 text-yellow-700 border-yellow-200'
          }`}
        >
          {item.conciliado ? (
            <><CheckCircle className="w-3 h-3 mr-1" />Conciliado</>
          ) : (
            <><Calendar className="w-3 h-3 mr-1" />Pendente</>
          )}
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
            title="Editar movimento"
          >
            <Edit className="w-4 h-4" />
          </ActionButton>
          
          {!item.conciliado && (
            <ActionButton
              variant="view"
              module="financeiro"
              onClick={() => abrirModalConciliar(item)}
              title="Conciliar movimento"
            >
              <CheckCircle className="w-4 h-4" />
            </ActionButton>
          )}
          
          <ActionButton
            variant="delete"
            module="financeiro"
            onClick={() => setExcluindo(item)}
            title="Excluir movimento"
            disabled={item.conciliado}
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
  const movimentosFiltrados = useMemo(() => {
    const normalizarBusca = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

    let dadosFiltrados = movimentos.filter(movimento => {
      if (busca.trim() === '') return true;
      
      const buscaNormalizada = normalizarBusca(busca);
      const descricao = normalizarBusca(movimento.descricao);
      const empresa = normalizarBusca(movimento.empresa?.razaoSocial || '');
      const categoria = normalizarBusca(movimento.categoria?.nome || '');
      const contaBancaria = normalizarBusca(movimento.contaBancaria?.nome || '');
      
      return descricao.includes(buscaNormalizada) || 
             empresa.includes(buscaNormalizada) || 
             categoria.includes(buscaNormalizada) || 
             contaBancaria.includes(buscaNormalizada);
    }).sort((a, b) => new Date(b.dataMovimento).getTime() - new Date(a.dataMovimento).getTime());
    
    return applyFilters(dadosFiltrados);
  }, [movimentos, busca, applyFilters]);

  const {
    data: movimentosPaginados,
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
  } = useResponsiveTable(movimentosFiltrados, 10);

  // Calcular totais para o resumo
  const resumo = useMemo(() => {
    const totalEntradas = movimentosFiltrados
      .filter(m => m.tipo === 'ENTRADA')
      .reduce((acc, m) => acc + m.valor, 0);
    
    const totalSaidas = movimentosFiltrados
      .filter(m => m.tipo === 'SAIDA')
      .reduce((acc, m) => acc + m.valor, 0);
    
    const saldoLiquido = totalEntradas - totalSaidas;
    
    const pendentes = movimentosFiltrados.filter(m => !m.conciliado).length;
    
    return {
      totalEntradas,
      totalSaidas,
      saldoLiquido,
      pendentes
    };
  }, [movimentosFiltrados]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [movimentosData, empresasData] = await Promise.all([
        getFluxoCaixa(),
        getEmpresas()
      ]);
      
      setMovimentos(movimentosData);
      setEmpresas(empresasData);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      AppToast.error('Erro ao carregar dados', {
        description: 'Ocorreu um problema ao carregar os dados. Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNovo = () => {
    setEditando(null);
    setShowModal(true);
  };

  const abrirModalEditar = (movimento: FluxoCaixa) => {
    setEditando(movimento);
    setShowModal(true);
  };

  const abrirModalConciliar = (movimento: FluxoCaixa) => {
    setConciliando(movimento);
    setShowConciliarModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
  };

  const fecharConciliarModal = () => {
    setShowConciliarModal(false);
    setConciliando(null);
  };

  const handleSave = async (data: any) => {
    try {
      if (editando) {
        await updateFluxoCaixa(editando.id, data);
        AppToast.updated('Movimento', 'Movimento atualizado com sucesso.');
      } else {
        await createFluxoCaixa(data);
        AppToast.created('Movimento', 'Nova movimentação criada com sucesso.');
      }
      await fetchData();
      fecharModal();
    } catch (error: any) {
      console.error('Erro ao salvar movimento:', error);
      AppToast.error('Erro ao salvar movimento');
      throw error;
    }
  };

  const handleConciliar = async (data: any) => {
    if (!conciliando) return;
    
    try {
      await conciliarMovimento(conciliando.id, data);
      AppToast.success('Movimento Conciliado', 'O movimento foi conciliado com sucesso.');
      await fetchData();
      fecharConciliarModal();
    } catch (error: any) {
      console.error('Erro ao conciliar movimento:', error);
      AppToast.error('Erro ao conciliar movimento');
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteFluxoCaixa(excluindo.id);
      AppToast.deleted('Movimento', `O movimento "${excluindo.descricao}" foi excluído permanentemente.`);
      setExcluindo(null);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      
      let title = 'Erro ao excluir movimento';
      let description = 'Não foi possível excluir o movimento. Tente novamente ou entre em contato com o suporte.';
      
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
  const renderCard = (movimento: FluxoCaixa) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium truncate">{movimento.descricao}</CardTitle>
          <div className="flex flex-col gap-1 ml-2 flex-shrink-0">
            <Badge 
              className={`text-xs ${
                movimento.tipo === 'ENTRADA' 
                  ? 'bg-green-100 text-green-700 border-green-200' 
                  : 'bg-red-100 text-red-700 border-red-200'
              }`}
            >
              {movimento.tipo === 'ENTRADA' ? (
                <><TrendingUp className="w-2 h-2 mr-1" />Entrada</>
              ) : (
                <><TrendingDown className="w-2 h-2 mr-1" />Saída</>
              )}
            </Badge>
            <Badge 
              className={`text-xs ${
                movimento.conciliado 
                  ? 'bg-green-100 text-green-700 border-green-200' 
                  : 'bg-yellow-100 text-yellow-700 border-yellow-200'
              }`}
            >
              {movimento.conciliado ? 'Conciliado' : 'Pendente'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-1 gap-2 text-xs">
            {/* Valor - Primeiro */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">💰 Valor:</span>
              <ValorDisplay 
                valor={movimento.valor} 
                tipo={movimento.tipo === 'ENTRADA' ? 'positivo' : 'negativo'} 
                className="text-xs font-medium" 
              />
            </div>
            
            {/* Data - Segundo */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">📅 Data:</span>
              <span className="text-gray-800">
                {new Date(movimento.dataMovimento).toLocaleDateString('pt-BR')}
              </span>
            </div>

            {/* Empresa - Terceiro */}
            {movimento.empresa && (
              <div className="flex items-center gap-1">
                <span>🏢</span>
                <span className="text-blue-600 font-medium text-xs truncate">{movimento.empresa.razaoSocial}</span>
              </div>
            )}

            {/* Conta Bancária - Quarto */}
            {movimento.contaBancaria && (
              <div className="flex items-center gap-1">
                <span>🏦</span>
                <span className="text-purple-600 font-medium text-xs truncate">{movimento.contaBancaria.nome}</span>
              </div>
            )}

            {/* Categoria - Quinto */}
            {movimento.categoria && (
              <div className="flex items-center gap-1">
                <span>🏷️</span>
                <span className="text-indigo-600 font-medium text-xs truncate">{movimento.categoria.nome}</span>
              </div>
            )}
            
            {/* Forma Pagamento - Sexto */}
            {movimento.formaPagamento && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">💳 Forma:</span>
                <span className="text-gray-800 text-xs">{movimento.formaPagamento}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <ResponsiveCardFooter>
        <ActionButton
          variant="view"
          module="financeiro"
          onClick={() => abrirModalEditar(movimento)}
          title="Editar movimento"
        >
          <Edit className="w-4 h-4" />
        </ActionButton>
        {!movimento.conciliado && (
          <ActionButton
            variant="view"
            module="financeiro"
            onClick={() => abrirModalConciliar(movimento)}
            title="Conciliar movimento"
          >
            <CheckCircle className="w-4 h-4" />
          </ActionButton>
        )}
        <ActionButton
          variant="delete"
          module="financeiro"
          onClick={() => setExcluindo(movimento)}
          title="Excluir movimento"
          disabled={movimento.conciliado}
        >
          <Trash2 className="w-4 h-4" />
        </ActionButton>
      </ResponsiveCardFooter>
    </Card>
  );

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando fluxo de caixa...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <TooltipProvider>
      <PageContainer>
        {/* Header da página */}
        <PageHeader title="Fluxo de Caixa" module="financeiro" icon="💰">
          <SearchBar
            placeholder="Buscar por descrição, empresa, categoria ou conta..."
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
            Nova Movimentação
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
              data={movimentosPaginados}
              columns={columns}
              module="financeiro"
              emptyMessage="Nenhuma movimentação encontrada"
              isLoadingMore={isLoadingMore}
              hasNextPage={hasNextPage}
              isMobile={isMobile}
              scrollRef={targetRef}
            />
          ) : (
            <ResponsiveCards 
              data={movimentosPaginados}
              renderCard={renderCard}
              emptyMessage="Nenhuma movimentação encontrada"
              emptyIcon="💰"
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
        <FluxoCaixaModal
          isOpen={showModal}
          movimento={editando}
          onClose={fecharModal}
          onSave={handleSave}
        />
        
        <ConciliarMovimentoModal
          isOpen={showConciliarModal}
          movimento={conciliando}
          onClose={fecharConciliarModal}
          onConciliar={handleConciliar}
        />
        
        <ConfirmDeleteModal
          open={!!excluindo}
          onClose={() => setExcluindo(null)}
          onConfirm={handleDelete}
          title="Confirmar Exclusão de Movimento"
          entityName={excluindo?.descricao || ''}
          entityType="movimento de fluxo de caixa"
          isLoading={deleteLoading}
          loadingText="Excluindo movimento..."
          confirmText="Excluir Movimento"
          warningText={excluindo?.conciliado ? "Movimentos conciliados não podem ser excluídos." : undefined}
        />
      </PageContainer>
    </TooltipProvider>
  );
};