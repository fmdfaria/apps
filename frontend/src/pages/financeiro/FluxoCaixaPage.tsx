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
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import api from '@/services/api';

import { 
  PageContainer, 
  PageHeader, 
  PageContent, 
  ViewToggle, 
  SearchBar, 
  FilterButton,
  ResponsiveTable, 
  ResponsiveCards, 
  ResponsivePagination,
  ActionButton,
  ResponsiveCardFooter,
  TableColumn 
} from '@/components/layout';
import { AdvancedFilter, type FilterField } from '@/components/ui/advanced-filter';
import type { FilterConfig } from '@/types/filters';
import { useViewMode } from '@/hooks/useViewMode';
import { useResponsiveTable } from '@/hooks/useResponsiveTable';
// import { useTableFilters } from '@/hooks/useTableFilters';
import { getModuleTheme } from '@/types/theme';
import { getContasBancarias } from '@/services/contas-bancarias';
import { getCategoriasFinanceiras } from '@/services/categorias-financeiras';

// Financial components
import { StatusBadge, ValorDisplay } from '@/components/financeiro';
import { formatarApenasData } from '@/utils/dateUtils';

// Modal Components
import FluxoCaixaModal from './FluxoCaixaModal';
import ConciliarMovimentoModal from './ConciliarMovimentoModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

// Campos do filtro avançado
const filterFields: FilterField[] = [
  { key: 'dataInicio', type: 'date', label: 'Data Início' },
  { key: 'dataFim', type: 'date', label: 'Data Fim' },
  { key: 'empresaId', type: 'api-select', label: 'Empresa', apiService: getEmpresas, placeholder: 'Selecione uma empresa...', searchFields: ['razaoSocial'] },
  { key: 'contaBancariaId', type: 'api-select', label: 'Conta Bancária', apiService: getContasBancarias, placeholder: 'Selecione uma conta...', searchFields: ['nome', 'banco'] },
  { key: 'categoriaId', type: 'api-select', label: 'Categoria', apiService: getCategoriasFinanceiras, placeholder: 'Selecione uma categoria...', searchFields: ['nome'] },
  { key: 'tipo', type: 'static-select', label: 'Tipo', options: [
      { id: 'ENTRADA', nome: 'Entrada' },
      { id: 'SAIDA', nome: 'Saída' }
    ], placeholder: 'Selecione o tipo...' },
  { key: 'conciliado', type: 'static-select', label: 'Conciliado', options: [
      { id: 'true', nome: 'Sim' },
      { id: 'false', nome: 'Não' }
    ], placeholder: 'Selecionar...' }
];

export const FluxoCaixaPage = () => {
  const [movimentos, setMovimentos] = useState<FluxoCaixa[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  
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
      key: 'empresa',
      header: '🏢 Empresa',
      essential: true,
      render: (item) => (
        <span className="text-sm">
          {item.empresa?.razaoSocial || '-'}
        </span>
      )
    },
    {
      key: 'contaBancaria',
      header: '🏦 Conta',
      essential: true,
      render: (item) => (
        <span className="text-sm">
          {item.contaBancaria?.nome || '-'}
        </span>
      )
    },
    {
      key: 'categoria',
      header: '🏷️ Categoria',
      essential: true,
      render: (item) => (
        <span className="text-sm">
          {item.categoria?.nome || '-'}
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
      key: 'dataMovimento',
      header: '📅 Data',
      essential: true,
      render: (item) => (
        <span className="text-sm">
          {formatarApenasData(item.dataMovimento)}
        </span>
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
      key: 'formaPagamento',
      header: '💳 Forma',
      essential: true,
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
  
  // AdvancedFilter - estados
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [filtrosAplicados, setFiltrosAplicados] = useState<Record<string, string>>({});
  
  // Filtrar dados baseado somente na busca (filtros avançados consultam backend)
  const movimentosFiltrados = useMemo(() => {
    const normalizarBusca = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

    let dadosFiltrados = movimentos.filter(movimento => {
      if (busca.trim() === '') return true;
      
      const buscaNormalizada = normalizarBusca(busca);
      const empresa = normalizarBusca(movimento.empresa?.razaoSocial || '');
      const categoria = normalizarBusca(movimento.categoria?.nome || '');
      const contaBancaria = normalizarBusca(movimento.contaBancaria?.nome || '');
      const formaPagamento = normalizarBusca(movimento.formaPagamento || '');
      
      return empresa.includes(buscaNormalizada) || 
             categoria.includes(buscaNormalizada) || 
             contaBancaria.includes(buscaNormalizada) ||
             formaPagamento.includes(buscaNormalizada);
    }).sort((a, b) => new Date(b.dataMovimento).getTime() - new Date(a.dataMovimento).getTime());
    return dadosFiltrados;
  }, [movimentos, busca]);

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

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/fluxo-caixa' && route.method.toLowerCase() === 'get';
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

  const fetchData = async (overrideFilters?: any) => {
    setAccessDenied(false);
    setLoading(true);
    setMovimentos([]);
    try {
      const backendFilters = overrideFilters ?? mapearFiltrosParaBackend(filtrosAplicados);
      const [movimentosData, empresasData] = await Promise.all([
        getFluxoCaixa(backendFilters),
        getEmpresas()
      ]);

      setMovimentos(movimentosData);
      setEmpresas(empresasData);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      if (error?.response?.status === 403) {
        const info = await getRouteInfo('/fluxo-caixa');
        setRouteInfo(info);
        setAccessDenied(true);
      } else {
        AppToast.error('Erro ao carregar dados', {
          description: 'Ocorreu um problema ao carregar os dados. Tente novamente.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Helpers filtros avançados
  const handleFilterChange = (key: string, value: string) => {
    setFiltros(prev => ({ ...prev, [key]: value }));
  };

  const aplicarFiltros = async () => {
    const aplicados = Object.fromEntries(
      Object.entries(filtros).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    );
    const backend = mapearFiltrosParaBackend(aplicados);
    setFiltrosAplicados(aplicados);
    await fetchData(backend);
    setMostrarFiltros(false);
  };

  const limparFiltros = async () => {
    setFiltros({});
    setFiltrosAplicados({});
    await fetchData({});
  };

  const mapearFiltrosParaBackend = (aplicados: Record<string, string>) => {
    const f: any = {};
    if (aplicados.empresaId) f.empresaId = aplicados.empresaId;
    if (aplicados.contaBancariaId) f.contaBancariaId = aplicados.contaBancariaId;
    if (aplicados.categoriaId) f.categoriaId = aplicados.categoriaId;
    if (aplicados.tipo) f.tipo = aplicados.tipo as any;
    if (aplicados.conciliado) f.conciliado = aplicados.conciliado === 'true';
    if (aplicados.dataInicio) f.dataMovimentoInicio = aplicados.dataInicio;
    if (aplicados.dataFim) f.dataMovimentoFim = aplicados.dataFim;
    return f;
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
      AppToast.deleted('Movimento', `O movimento foi excluído permanentemente.`);
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
          <CardTitle className="text-sm font-medium truncate">
            {movimento.empresa?.razaoSocial || 'Movimento'} - {formatarApenasData(movimento.dataMovimento)}
          </CardTitle>
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
                {formatarApenasData(movimento.dataMovimento)}
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
            placeholder="Buscar por empresa, categoria, conta ou forma de pagamento..."
            value={busca}
            onChange={setBusca}
            module="financeiro"
          />
          
          <FilterButton
            showFilters={mostrarFiltros}
            onToggleFilters={() => setMostrarFiltros(prev => !prev)}
            activeFiltersCount={Object.values(filtrosAplicados).filter(v => v !== '' && v !== undefined && v !== null).length}
            module="financeiro"
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
          {/* Filtros Avançados */}
          <AdvancedFilter
            fields={filterFields}
            filters={filtros}
            appliedFilters={filtrosAplicados}
            onFilterChange={handleFilterChange}
            onApplyFilters={aplicarFiltros}
            onClearFilters={limparFiltros}
            isVisible={mostrarFiltros}
            onClose={() => setMostrarFiltros(false)}
            loading={loading}
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
          entityName={excluindo ? `${excluindo.empresa?.razaoSocial || 'Movimento'} - ${formatarApenasData(excluindo.dataMovimento)}` : ''}
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