import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, DollarSign, Calendar, User, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppToast } from '@/services/toast';
import { getContasReceber, createContaReceber, updateContaReceber, deleteContaReceber, receberConta } from '@/services/contas-receber';
import { getEmpresas } from '@/services/empresas';
import type { ContaReceber } from '@/types/ContaReceber';
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
import { getConvenios } from '@/services/convenios';
import { getPacientes } from '@/services/pacientes';
import { getContasBancarias } from '@/services/contas-bancarias';

// Financial components
import { StatusBadge, ValorDisplay } from '@/components/financeiro';
import { formatarApenasData } from '@/utils/dateUtils';

// Modal Components
import ContaReceberModal from './ContaReceberModal';
import ReceberContaModal from './ReceberContaModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

// Configuração dos campos de filtro avançado
const filterFields: FilterField[] = [
  { key: 'dataInicio', type: 'date', label: 'Data Início' },
  { key: 'dataFim', type: 'date', label: 'Data Fim' },
  { key: 'empresaId', type: 'api-select', label: 'Empresa', apiService: getEmpresas, placeholder: 'Selecione uma empresa...', searchFields: ['razaoSocial'] },
  { key: 'contaBancariaId', type: 'api-select', label: 'Conta Bancária', apiService: getContasBancarias, placeholder: 'Selecione uma conta bancária...', searchFields: ['nome', 'banco'] },
  { key: 'convenioId', type: 'api-select', label: 'Convênio', apiService: getConvenios, placeholder: 'Selecione um convênio...', searchFields: ['nome'] },
  { key: 'pacienteId', type: 'api-select', label: 'Paciente', apiService: getPacientes, placeholder: 'Selecione um paciente...', searchFields: ['nomeCompleto'] },
  { key: 'status', type: 'static-select', label: 'Status', options: [
    { id: 'PENDENTE', nome: 'Pendente' },
    { id: 'PARCIAL', nome: 'Parcial' },
    { id: 'RECEBIDO', nome: 'Recebido' },
    { id: 'VENCIDO', nome: 'Vencido' },
    { id: 'CANCELADO', nome: 'Cancelado' }
  ], placeholder: 'Selecione o status...' }
];

export const ContasReceberPage = () => {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showReceberModal, setShowReceberModal] = useState(false);
  const [editando, setEditando] = useState<ContaReceber | null>(null);
  const [recebendo, setRecebendo] = useState<ContaReceber | null>(null);
  const [excluindo, setExcluindo] = useState<ContaReceber | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'contas-receber-view' });
  
  // Configuração das colunas da tabela
  const columns: TableColumn<ContaReceber>[] = [
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
      key: 'convenio',
      header: '🏥 Convênio',
      essential: false,
      render: (item) => (
        <span className="text-sm">
          {item.convenio?.nome || '-'}
        </span>
      )
    },
    {
      key: 'paciente',
      header: '👤 Paciente',
      essential: false,
      render: (item) => (
        <span className="text-sm">
          {item.paciente?.nomeCompleto || '-'}
        </span>
      )
    },
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
      header: '💰 Valor',
      essential: true,
      render: (item) => (
        <ValorDisplay valor={item.valorOriginal || (item as any).valorTotal || 0} tipo="positivo" className="text-sm" />
      )
    },
    {
      key: 'dataVencimento',
      header: '📅 Vencimento',
      essential: true,
      render: (item) => (
        <span className="text-sm">
          {formatarApenasData(item.dataVencimento)}
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
          { value: 'RECEBIDO', label: 'Recebido' },
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
      key: 'actions',
      header: '⚙️ Ações',
      essential: true,
      render: (item) => (
        <div className="flex gap-1.5">
          <ActionButton
            variant="view"
            module="financeiro"
            onClick={() => abrirModalEditar(item)}
            title="Editar conta"
          >
            <Edit className="w-4 h-4" />
          </ActionButton>
          
          {item.status !== 'RECEBIDO' && item.status !== 'CANCELADO' && (
            <ActionButton
              variant="view"
              module="financeiro"
              onClick={() => abrirModalReceber(item)}
              title="Receber conta"
            >
              <DollarSign className="w-4 h-4" />
            </ActionButton>
          )}
          
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
  
  // AdvancedFilter - estados
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [filtrosAplicados, setFiltrosAplicados] = useState<Record<string, string>>({});
  
  // Filtrar dados baseado somente na busca (filtros avançados consultam backend)
  const contasFiltradas = useMemo(() => {
    const normalizarBusca = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

    let dadosFiltrados = contas.filter(conta => {
      if (busca.trim() === '') return true;
      
      const buscaNormalizada = normalizarBusca(busca);
      const descricao = normalizarBusca(conta.descricao);
      const empresa = normalizarBusca(conta.empresa?.razaoSocial || '');
      const convenio = normalizarBusca(conta.convenio?.nome || '');
      const paciente = normalizarBusca(conta.paciente?.nomeCompleto || '');
      
      return descricao.includes(buscaNormalizada) || 
             empresa.includes(buscaNormalizada) || 
             convenio.includes(buscaNormalizada) || 
             paciente.includes(buscaNormalizada);
    }).sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());
    return dadosFiltrados;
  }, [contas, busca]);

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

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/contas-receber' && route.method.toLowerCase() === 'get';
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
    setContas([]);
    try {
      const backendFilters = overrideFilters ?? mapearFiltrosParaBackend(filtrosAplicados);
      const [contasData, empresasData] = await Promise.all([
        getContasReceber(backendFilters),
        getEmpresas()
      ]);

      // Log temporário para debug
      console.log('Contas recebidas do backend:', contasData[0]);

      setContas(contasData);
      setEmpresas(empresasData);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      if (error?.response?.status === 403) {
        const info = await getRouteInfo('/contas-receber');
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

  // Helpers de filtros avançados
  const handleFilterChange = (key: string, value: string) => {
    setFiltros(prev => ({ ...prev, [key]: value }));
  };

  const aplicarFiltros = async () => {
    const aplicados = Object.fromEntries(
      Object.entries(filtros).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    );
    const backendFilters = mapearFiltrosParaBackend(aplicados);
    setFiltrosAplicados(aplicados);
    await fetchData(backendFilters);
    setMostrarFiltros(false);
  };

  const limparFiltros = async () => {
    setFiltros({});
    setFiltrosAplicados({});
    await fetchData({});
  };

  const mapearFiltrosParaBackend = (aplicados: Record<string, string>) => {
    const backendFilters: any = {};
    if (aplicados.empresaId) backendFilters.empresaId = aplicados.empresaId;
    if (aplicados.contaBancariaId) backendFilters.contaBancariaId = aplicados.contaBancariaId;
    if (aplicados.pacienteId) backendFilters.pacienteId = aplicados.pacienteId;
    if (aplicados.convenioId) backendFilters.convenioId = aplicados.convenioId;
    if (aplicados.status) backendFilters.status = aplicados.status as any;
    if (aplicados.dataInicio) backendFilters.dataVencimentoInicio = aplicados.dataInicio;
    if (aplicados.dataFim) backendFilters.dataVencimentoFim = aplicados.dataFim;
    return backendFilters;
  };

  const abrirModalNovo = () => {
    setEditando(null);
    setShowModal(true);
  };

  const abrirModalEditar = (conta: ContaReceber) => {
    setEditando(conta);
    setShowModal(true);
  };

  const abrirModalReceber = (conta: ContaReceber) => {
    setRecebendo(conta);
    setShowReceberModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
  };

  const fecharReceberModal = () => {
    setShowReceberModal(false);
    setRecebendo(null);
  };

  const handleSave = async (data: any) => {
    try {
      if (editando) {
        await updateContaReceber(editando.id, data);
        AppToast.updated('Conta a Receber', 'A conta foi atualizada com sucesso.');
      } else {
        await createContaReceber(data);
        AppToast.created('Conta a Receber', 'A nova conta foi cadastrada com sucesso.');
      }
      await fetchData();
      fecharModal();
    } catch (error: any) {
      console.error('Erro ao salvar conta:', error);
      AppToast.error('Erro ao salvar conta');
      throw error;
    }
  };

  const handleReceber = async (data: any) => {
    if (!recebendo) return;
    
    try {
      await receberConta(recebendo.id, data);
      AppToast.success('Conta Recebida', 'O recebimento foi registrado com sucesso.');
      await fetchData();
      fecharReceberModal();
    } catch (error: any) {
      console.error('Erro ao receber conta:', error);
      AppToast.error('Erro ao receber conta');
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteContaReceber(excluindo.id);
      AppToast.deleted('Conta a Receber', `A conta "${excluindo.descricao}" foi excluída permanentemente.`);
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
  const renderCard = (conta: ContaReceber) => (
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
            {/* Empresa - Primeiro */}
            {conta.empresa && (
              <div className="flex items-center gap-1">
                <span>🏢</span>
                <span className="text-blue-600 font-medium">{conta.empresa.razaoSocial}</span>
              </div>
            )}

            {/* Convênio - Segundo */}
            {conta.convenio && (
              <div className="flex items-center gap-1">
                <span>🏥</span>
                <span className="text-purple-600 font-medium">{conta.convenio.nome}</span>
              </div>
            )}

            {/* Paciente - Terceiro */}
            {conta.paciente && (
              <div className="flex items-center gap-1">
                <span>👤</span>
                <span className="text-indigo-600 font-medium">{conta.paciente.nomeCompleto}</span>
              </div>
            )}
            
            {/* Valor - Quinto */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">💰 Valor:</span>
              <ValorDisplay valor={conta.valorOriginal || (conta as any).valorTotal || 0} tipo="positivo" className="text-xs" />
            </div>
            
            {/* Vencimento - Sexto */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">📅 Vencimento:</span>
              <span className="text-gray-800">
                {formatarApenasData(conta.dataVencimento)}
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
          title="Editar conta"
        >
          <Edit className="w-4 h-4" />
        </ActionButton>
        {conta.status !== 'RECEBIDO' && conta.status !== 'CANCELADO' && (
          <ActionButton
            variant="view"
            module="financeiro"
            onClick={() => abrirModalReceber(conta)}
            title="Receber conta"
          >
            <DollarSign className="w-4 h-4" />
          </ActionButton>
        )}
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
            <p className="text-gray-500">Carregando contas a receber...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <TooltipProvider>
      <PageContainer>
        {/* Header da página */}
        <PageHeader title="Contas a Receber" module="financeiro" icon="💰">
          <SearchBar
            placeholder="Buscar por descrição, empresa, convênio ou paciente..."
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
            Nova Conta
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
              data={contasPaginadas}
              columns={columns}
              module="financeiro"
              emptyMessage="Nenhuma conta a receber encontrada"
              isLoadingMore={isLoadingMore}
              hasNextPage={hasNextPage}
              isMobile={isMobile}
              scrollRef={targetRef}
            />
          ) : (
            <ResponsiveCards 
              data={contasPaginadas}
              renderCard={renderCard}
              emptyMessage="Nenhuma conta a receber encontrada"
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
        <ContaReceberModal
          isOpen={showModal}
          conta={editando}
          onClose={fecharModal}
          onSave={handleSave}
        />
        
        <ReceberContaModal
          isOpen={showReceberModal}
          conta={recebendo}
          empresas={empresas}
          onClose={fecharReceberModal}
          onSave={handleReceber}
        />
        
        <ConfirmDeleteModal
          open={!!excluindo}
          onClose={() => setExcluindo(null)}
          onConfirm={handleDelete}
          title="Confirmar Exclusão de Conta"
          entityName={excluindo?.descricao || ''}
          entityType="conta a receber"
          isLoading={deleteLoading}
          loadingText="Excluindo conta..."
          confirmText="Excluir Conta"
        />
      </PageContainer>
    </TooltipProvider>
  );
};