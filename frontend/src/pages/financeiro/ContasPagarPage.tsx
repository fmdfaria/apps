import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, DollarSign, Calendar, User, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppToast } from '@/services/toast';
import { getContasPagar, createContaPagar, updateContaPagar, deleteContaPagar, pagarConta } from '@/services/contas-pagar';
import { getEmpresas } from '@/services/empresas';
import { getProfissionais } from '@/services/profissionais';
import type { ContaPagar } from '@/types/ContaPagar';
import type { Empresa } from '@/types/Empresa';
import type { Profissional } from '@/types/Profissional';
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
import ContaPagarModal from './ContaPagarModal';
import PagarContaModal from './PagarContaModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

export const ContasPagarPage = () => {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showPagarModal, setShowPagarModal] = useState(false);
  const [editando, setEditando] = useState<ContaPagar | null>(null);
  const [pagando, setPagando] = useState<ContaPagar | null>(null);
  const [excluindo, setExcluindo] = useState<ContaPagar | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'contas-pagar-view' });
  
  // Configuração das colunas da tabela
  const columns: TableColumn<ContaPagar>[] = [
    {
      key: 'descricao',
      header: '📄 Descrição',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Descrição da conta...',
        label: 'Descrição'
      },
      render: (item) => (
        <span className="text-sm font-medium">{item.descricao}</span>
      )
    },
    {
      key: 'valorOriginal',
      header: '💸 Valor',
      essential: true,
      render: (item) => (
        <ValorDisplay valor={item.valorOriginal || (item as any).valorTotal || 0} tipo="negativo" className="text-sm" />
      )
    },
    {
      key: 'valorPago',
      header: '✅ Pago',
      essential: true,
      render: (item) => (
        <ValorDisplay valor={item.valorPago} tipo="negativo" className="text-sm" />
      )
    },
    {
      key: 'dataVencimento',
      header: '📅 Vencimento',
      essential: true,
      render: (item) => (
        <span className="text-sm">
          {new Date(item.dataVencimento).toLocaleDateString('pt-BR')}
        </span>
      )
    },
    {
      key: 'status',
      header: '📊 Status',
      essential: true,
      filterable: {
        type: 'select',
        options: [
          { value: 'PENDENTE', label: 'Pendente' },
          { value: 'PARCIAL', label: 'Parcial' },
          { value: 'PAGO', label: 'Pago' },
          { value: 'VENCIDO', label: 'Vencido' },
          { value: 'CANCELADO', label: 'Cancelado' }
        ],
        label: 'Status'
      },
      render: (item) => (
        <StatusBadge status={item.status} />
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
      key: 'profissional',
      header: '👨‍⚕️ Profissional',
      essential: false,
      render: (item) => (
        <span className="text-sm">
          {item.profissional?.nome || '-'}
        </span>
      )
    },
    {
      key: 'actions',
      header: '⚙️ Ações',
      essential: true,
      render: (item) => (
        <div className="flex gap-1.5">
          {item.status !== 'PAGO' && item.status !== 'CANCELADO' && (
            <ActionButton
              variant="view"
              module="financeiro"
              onClick={() => abrirModalPagar(item)}
              title="Pagar conta"
            >
              <DollarSign className="w-4 h-4" />
            </ActionButton>
          )}
          
          <ActionButton
            variant="view"
            module="financeiro"
            onClick={() => abrirModalEditar(item)}
            title="Editar conta"
          >
            <Edit className="w-4 h-4" />
          </ActionButton>
          
          <ActionButton
            variant="delete"
            module="financeiro"
            onClick={() => setExcluindo(item)}
            title="Excluir conta"
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
  const contasFiltradas = useMemo(() => {
    const normalizarBusca = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

    let dadosFiltrados = contas.filter(conta => {
      if (busca.trim() === '') return true;
      
      const buscaNormalizada = normalizarBusca(busca);
      const descricao = normalizarBusca(conta.descricao);
      const empresa = normalizarBusca(conta.empresa?.razaoSocial || '');
      const profissional = normalizarBusca(conta.profissional?.nome || '');
      
      return descricao.includes(buscaNormalizada) || 
             empresa.includes(buscaNormalizada) || 
             profissional.includes(buscaNormalizada);
    }).sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());
    
    return applyFilters(dadosFiltrados);
  }, [contas, busca, applyFilters]);

  const {
    data: contasPaginadas,
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
  } = useResponsiveTable(contasFiltradas, 10);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contasData, empresasData, profissionaisData] = await Promise.all([
        getContasPagar(),
        getEmpresas(),
        getProfissionais()
      ]);
      
      setContas(contasData);
      setEmpresas(empresasData);
      setProfissionais(profissionaisData);
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

  const abrirModalEditar = (conta: ContaPagar) => {
    setEditando(conta);
    setShowModal(true);
  };

  const abrirModalPagar = (conta: ContaPagar) => {
    setPagando(conta);
    setShowPagarModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
  };

  const fecharPagarModal = () => {
    setShowPagarModal(false);
    setPagando(null);
  };

  const handleSave = async (data: any) => {
    try {
      if (editando) {
        await updateContaPagar(editando.id, data);
        AppToast.updated('Conta a Pagar', 'A conta foi atualizada com sucesso.');
      } else {
        await createContaPagar(data);
        AppToast.created('Conta a Pagar', 'A nova conta foi cadastrada com sucesso.');
      }
      await fetchData();
      fecharModal();
    } catch (error: any) {
      console.error('Erro ao salvar conta:', error);
      AppToast.error('Erro ao salvar conta');
      throw error;
    }
  };

  const handlePagar = async (data: any) => {
    if (!pagando) return;
    
    try {
      await pagarConta(pagando.id, data);
      AppToast.success('Conta Paga', 'O pagamento foi registrado com sucesso.');
      await fetchData();
      fecharPagarModal();
    } catch (error: any) {
      console.error('Erro ao pagar conta:', error);
      AppToast.error('Erro ao pagar conta');
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteContaPagar(excluindo.id);
      AppToast.deleted('Conta a Pagar', `A conta "${excluindo.descricao}" foi excluída permanentemente.`);
      setExcluindo(null);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      
      let title = 'Erro ao excluir conta';
      let description = 'Não foi possível excluir a conta. Tente novamente ou entre em contato com o suporte.';
      
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
  const renderCard = (conta: ContaPagar) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium truncate">{conta.descricao}</CardTitle>
          <StatusBadge status={conta.status} className="ml-2 flex-shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">💸 Valor:</span>
              <ValorDisplay valor={conta.valorOriginal || (conta as any).valorTotal || 0} tipo="negativo" className="text-xs" />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">✅ Pago:</span>
              <ValorDisplay valor={conta.valorPago} tipo="negativo" className="text-xs" />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">📅 Vencimento:</span>
              <span className="text-gray-800">
                {new Date(conta.dataVencimento).toLocaleDateString('pt-BR')}
              </span>
            </div>

            {conta.empresa && (
              <div className="flex items-center gap-1">
                <span>🏢</span>
                <span className="text-blue-600 font-medium">{conta.empresa.razaoSocial}</span>
              </div>
            )}

            {conta.profissional && (
              <div className="flex items-center gap-1">
                <span>👨‍⚕️</span>
                <span className="text-purple-600 font-medium">{conta.profissional.nome}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <ResponsiveCardFooter>
        {conta.status !== 'PAGO' && conta.status !== 'CANCELADO' && (
          <ActionButton
            variant="view"
            module="financeiro"
            onClick={() => abrirModalPagar(conta)}
            title="Pagar conta"
          >
            <DollarSign className="w-4 h-4" />
          </ActionButton>
        )}
        <ActionButton
          variant="view"
          module="financeiro"
          onClick={() => abrirModalEditar(conta)}
          title="Editar conta"
        >
          <Edit className="w-4 h-4" />
        </ActionButton>
        <ActionButton
          variant="delete"
          module="financeiro"
          onClick={() => setExcluindo(conta)}
          title="Excluir conta"
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando contas a pagar...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <TooltipProvider>
      <PageContainer>
        {/* Header da página */}
        <PageHeader title="Contas a Pagar" module="financeiro" icon="💸">
          <SearchBar
            placeholder="Buscar por descrição, empresa ou profissional..."
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
            Nova Conta
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
              data={contasPaginadas}
              columns={columns}
              module="financeiro"
              emptyMessage="Nenhuma conta a pagar encontrada"
              isLoadingMore={isLoadingMore}
              hasNextPage={hasNextPage}
              isMobile={isMobile}
              scrollRef={targetRef}
            />
          ) : (
            <ResponsiveCards 
              data={contasPaginadas}
              renderCard={renderCard}
              emptyMessage="Nenhuma conta a pagar encontrada"
              emptyIcon="💸"
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
        <ContaPagarModal
          isOpen={showModal}
          conta={editando}
          onClose={fecharModal}
          onSave={handleSave}
        />
        
        <PagarContaModal
          isOpen={showPagarModal}
          conta={pagando}
          empresas={empresas}
          onClose={fecharPagarModal}
          onSave={handlePagar}
        />
        
        <ConfirmDeleteModal
          open={!!excluindo}
          onClose={() => setExcluindo(null)}
          onConfirm={handleDelete}
          title="Confirmar Exclusão de Conta"
          entityName={excluindo?.descricao || ''}
          entityType="conta a pagar"
          isLoading={deleteLoading}
          loadingText="Excluindo conta..."
          confirmText="Excluir Conta"
        />
      </PageContainer>
    </TooltipProvider>
  );
};