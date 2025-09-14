import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Building2, Power, PowerOff, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppToast } from '@/services/toast';
import { 
  getContasBancarias, 
  createContaBancaria, 
  updateContaBancaria, 
  deleteContaBancaria,
  atualizarSaldoContaBancaria 
} from '@/services/contas-bancarias';
import type { ContaBancaria } from '@/types/ContaBancaria';
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

// Modal Components
import ContaBancariaModal from './ContaBancariaModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

export const ContasBancariasPage = () => {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<ContaBancaria | null>(null);
  const [excluindo, setExcluindo] = useState<ContaBancaria | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'contas-bancarias-view' });
  
  // Configuração das colunas da tabela
  const columns: TableColumn<ContaBancaria>[] = [
    {
      key: 'nome',
      header: '🏦 Nome da Conta',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome da conta...',
        label: 'Nome'
      },
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {item.nome.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium">{item.nome}</span>
        </div>
      )
    },
    {
      key: 'banco',
      header: '🏛️ Banco',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Banco...',
        label: 'Banco'
      },
      render: (item) => (
        <span className="text-sm">{item.banco}</span>
      )
    },
    {
      key: 'agencia',
      header: '🏢 Agência/Conta',
      essential: false,
      render: (item) => (
        <div className="text-sm font-mono">
          <div>{item.agencia}</div>
          <div className="text-gray-500">{item.conta}{item.digito ? `-${item.digito}` : ''}</div>
        </div>
      )
    },
    {
      key: 'tipoConta',
      header: '📋 Tipo',
      essential: false,
      filterable: {
        type: 'select',
        options: [
          { value: 'CORRENTE', label: 'Corrente' },
          { value: 'POUPANCA', label: 'Poupança' },
          { value: 'INVESTIMENTO', label: 'Investimento' }
        ],
        label: 'Tipo de Conta'
      },
      render: (item) => (
        <Badge variant="outline" className="text-xs">
          {item.tipoConta}
        </Badge>
      )
    },
    {
      key: 'saldoAtual',
      header: '💰 Saldo Atual',
      essential: true,
      render: (item) => (
        <span className={`text-sm font-mono font-bold ${
          item.saldoAtual >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(item.saldoAtual)}
        </span>
      )
    },
    {
      key: 'contaPrincipal',
      header: '⭐ Principal',
      essential: true,
      filterable: {
        type: 'select',
        options: [
          { value: 'true', label: 'Principal' },
          { value: 'false', label: 'Secundária' }
        ],
        label: 'Tipo'
      },
      render: (item) => (
        <Badge 
          variant="outline" 
          className={`text-xs ${
            item.contaPrincipal 
              ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
              : 'bg-gray-50 text-gray-700 border-gray-200'
          }`}
        >
          {item.contaPrincipal ? 'Principal' : 'Secundária'}
        </Badge>
      )
    },
    {
      key: 'ativo',
      header: '📊 Status',
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
        <Badge 
          variant="outline" 
          className={`text-xs ${
            item.ativo === true
              ? 'bg-green-50 text-green-700 border-green-200' 
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {item.ativo === true ? 'Ativo' : 'Inativo'}
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
            title="Editar conta bancária"
          >
            <Edit className="w-4 h-4" />
          </ActionButton>
          
          <ActionButton
            variant="primary"
            module="financeiro"
            onClick={() => handleAtualizarSaldo(item)}
            title="Atualizar saldo"
          >
            <DollarSign className="w-4 h-4" />
          </ActionButton>
          
          <ActionButton
            variant={item.ativo ? "warning" : "success"}
            module="financeiro"
            onClick={() => handleToggleStatus(item)}
            title={item.ativo ? "Desativar conta" : "Ativar conta"}
          >
            {item.ativo ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
          </ActionButton>
          
          <ActionButton
            variant="delete"
            module="financeiro"
            onClick={() => setExcluindo(item)}
            title="Excluir conta bancária"
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
      const nome = normalizarBusca(conta.nome);
      const banco = normalizarBusca(conta.banco || '');
      
      return nome.includes(buscaNormalizada) || banco.includes(buscaNormalizada);
    }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
    
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
      const data = await getContasBancarias();
      setContas(data);
    } catch (error: any) {
      console.error('Erro ao carregar contas bancárias:', error);
      AppToast.error('Erro ao carregar contas bancárias', {
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

  const abrirModalEditar = (conta: ContaBancaria) => {
    setEditando(conta);
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
  };

  const handleSave = async (data: any) => {
    try {
      if (editando) {
        await updateContaBancaria(editando.id, data);
        AppToast.updated('Conta Bancária', 'Os dados da conta bancária foram atualizados com sucesso.');
      } else {
        await createContaBancaria(data);
        AppToast.created('Conta Bancária', 'A nova conta bancária foi cadastrada com sucesso.');
      }
      await fetchData();
      fecharModal();
    } catch (error: any) {
      console.error('Erro ao salvar conta bancária:', error);
      
      let title = 'Erro ao salvar conta bancária';
      let description = 'Ocorreu um problema ao salvar os dados. Tente novamente.';
      
      if (error?.response?.data?.message) {
        description = error.response.data.message;
      } else if (error?.message) {
        description = error.message;
      }
      
      AppToast.error(title, { description });
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteContaBancaria(excluindo.id);
      AppToast.deleted('Conta Bancária', `A conta "${excluindo.nome}" foi excluída permanentemente.`);
      setExcluindo(null);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      
      let title = 'Erro ao excluir conta bancária';
      let description = 'Não foi possível excluir a conta bancária. Tente novamente ou entre em contato com o suporte.';
      
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

  const handleToggleStatus = async (conta: ContaBancaria) => {
    try {
      const novoStatus = !conta.ativo;
      await updateContaBancaria(conta.id, { ativo: novoStatus });
      
      AppToast.success(
        'Status alterado', 
        `A conta "${conta.nome}" foi ${novoStatus ? 'ativada' : 'desativada'} com sucesso.`
      );
      
      await fetchData();
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      
      let description = 'Não foi possível alterar o status da conta. Tente novamente.';
      if (error?.response?.data?.message) {
        description = error.response.data.message;
      } else if (error?.message) {
        description = error.message;
      }
      
      AppToast.error('Erro ao alterar status', { description });
    }
  };

  const handleAtualizarSaldo = async (conta: ContaBancaria) => {
    const novoSaldo = prompt(
      `Atualizar saldo da conta "${conta.nome}":\nSaldo atual: ${new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(conta.saldoAtual)}\n\nDigite o novo saldo:`,
      conta.saldoAtual.toString()
    );

    if (novoSaldo !== null && !isNaN(Number(novoSaldo))) {
      try {
        await atualizarSaldoContaBancaria(conta.id, Number(novoSaldo));
        
        AppToast.success(
          'Saldo atualizado',
          `O saldo da conta "${conta.nome}" foi atualizado com sucesso.`
        );
        
        await fetchData();
      } catch (error: any) {
        console.error('Erro ao atualizar saldo:', error);
        
        let description = 'Não foi possível atualizar o saldo. Tente novamente.';
        if (error?.response?.data?.message) {
          description = error.response.data.message;
        } else if (error?.message) {
          description = error.message;
        }
        
        AppToast.error('Erro ao atualizar saldo', { description });
      }
    }
  };

  // Renderização do card
  const renderCard = (conta: ContaBancaria) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {conta.nome.charAt(0).toUpperCase()}
            </div>
            <CardTitle className="text-sm font-medium truncate">{conta.nome}</CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs ml-2 flex-shrink-0 ${
              conta.contaPrincipal
                ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
                : 'bg-gray-50 text-gray-700 border-gray-200'
            }`}
          >
            {conta.contaPrincipal ? 'Principal' : 'Secundária'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span>🏛️</span>
              <span className="text-gray-600">{conta.banco}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <span>🏢</span>
              <span className="font-mono text-gray-600">
                {conta.agencia} / {conta.conta}{conta.digito ? `-${conta.digito}` : ''}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span>💰</span>
              <span className={`font-mono font-bold ${
                conta.saldoAtual >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(conta.saldoAtual)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
      
      <ResponsiveCardFooter>
        <ActionButton
          variant="view"
          module="financeiro"
          onClick={() => abrirModalEditar(conta)}
          title="Editar conta bancária"
        >
          <Edit className="w-4 h-4" />
        </ActionButton>
        <ActionButton
          variant="primary"
          module="financeiro"
          onClick={() => handleAtualizarSaldo(conta)}
          title="Atualizar saldo"
        >
          <DollarSign className="w-4 h-4" />
        </ActionButton>
        <ActionButton
          variant={conta.ativo ? "warning" : "success"}
          module="financeiro"
          onClick={() => handleToggleStatus(conta)}
          title={conta.ativo ? "Desativar conta" : "Ativar conta"}
        >
          {conta.ativo ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
        </ActionButton>
        <ActionButton
          variant="delete"
          module="financeiro"
          onClick={() => setExcluindo(conta)}
          title="Excluir conta bancária"
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
            <p className="text-gray-500">Carregando contas bancárias...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <TooltipProvider>
      <PageContainer>
        {/* Header da página */}
        <PageHeader title="Contas Bancárias" module="financeiro" icon="🏦">
          <SearchBar
            placeholder="Buscar por nome da conta ou banco..."
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
              emptyMessage="Nenhuma conta bancária encontrada"
              isLoadingMore={isLoadingMore}
              hasNextPage={hasNextPage}
              isMobile={isMobile}
              scrollRef={targetRef}
            />
          ) : (
            <ResponsiveCards 
              data={contasPaginadas}
              renderCard={renderCard}
              emptyMessage="Nenhuma conta bancária encontrada"
              emptyIcon="🏦"
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
        <ContaBancariaModal
          isOpen={showModal}
          conta={editando}
          onClose={fecharModal}
          onSave={handleSave}
        />
        
        <ConfirmDeleteModal
          open={!!excluindo}
          onClose={() => setExcluindo(null)}
          onConfirm={handleDelete}
          title="Confirmar Exclusão de Conta Bancária"
          entityName={excluindo?.nome || ''}
          entityType="conta bancária"
          isLoading={deleteLoading}
          loadingText="Excluindo conta bancária..."
          confirmText="Excluir Conta"
        />
      </PageContainer>
    </TooltipProvider>
  );
};