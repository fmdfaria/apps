import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, DollarSign, Calendar, User, Building2, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppToast } from '@/services/toast';
import { getContasPagar, createContaPagar, updateContaPagar, deleteContaPagar, pagarConta } from '@/services/contas-pagar';
import api from '@/services/api';
import { getEmpresas } from '@/services/empresas';
import { getProfissionais } from '@/services/profissionais';
import type { ContaPagar } from '@/types/ContaPagar';
import type { Empresa } from '@/types/Empresa';
import type { Profissional } from '@/types/Profissional';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';

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

// Financial components
import { StatusBadge, ValorDisplay } from '@/components/financeiro';
import { formatarApenasData } from '@/utils/dateUtils';

// Modal Components
import ContaPagarModal from './ContaPagarModal';
import PagarContaModal from './PagarContaModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import ConfirmacaoModal from '@/components/ConfirmacaoModal';

// Campos do filtro avançado
const filterFields: FilterField[] = [
  { key: 'dataInicio', type: 'date', label: 'Data Início' },
  { key: 'dataFim', type: 'date', label: 'Data Fim' },
  { key: 'empresaId', type: 'api-select', label: 'Empresa', apiService: getEmpresas, placeholder: 'Selecione uma empresa...', searchFields: ['razaoSocial'] },
  { key: 'contaBancariaId', type: 'api-select', label: 'Conta Bancária', apiService: getContasBancarias, placeholder: 'Selecione uma conta...', searchFields: ['nome', 'banco'] },
  { key: 'profissionalId', type: 'api-select', label: 'Profissional', apiService: getProfissionais, placeholder: 'Selecione um profissional...', searchFields: ['nome'] },
  { key: 'status', type: 'static-select', label: 'Status', options: [
      { id: 'PENDENTE', nome: 'Pendente' },
      { id: 'SOLICITADO', nome: 'Solicitado' },
      { id: 'PARCIAL', nome: 'Parcial' },
      { id: 'PAGO', nome: 'Pago' },
      { id: 'VENCIDO', nome: 'Vencido' },
      { id: 'CANCELADO', nome: 'Cancelado' }
    ], placeholder: 'Selecione o status...' },
  { key: 'tipoConta', type: 'static-select', label: 'Tipo da Conta', options: [
      { id: 'DESPESA', nome: 'Despesa' },
      { id: 'SALARIO', nome: 'Salário' }
    ], placeholder: 'Selecione o tipo...' },
  { key: 'recorrente', type: 'static-select', label: 'Recorrente', options: [
      { id: 'true', nome: 'Sim' },
      { id: 'false', nome: 'Não' }
    ], placeholder: 'Selecionar...' }
];

export const ContasPagarPage = () => {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showPagarModal, setShowPagarModal] = useState(false);
  const [editando, setEditando] = useState<ContaPagar | null>(null);
  const [pagando, setPagando] = useState<ContaPagar | null>(null);
  const [excluindo, setExcluindo] = useState<ContaPagar | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Estados para modal de reenvio WhatsApp
  const [showConfirmacaoReenvio, setShowConfirmacaoReenvio] = useState(false);
  const [contaParaReenvio, setContaParaReenvio] = useState<ContaPagar | null>(null);
  
  // Estado para loading do WhatsApp
  const [whatsappLoadingIds, setWhatsappLoadingIds] = useState<Set<string>>(new Set());

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'contas-pagar-view' });
  
  // Configuração das colunas da tabela na sequência: Empresa, Profissional, Descrição, Valor, Vencimento, Status
  const columns: TableColumn<ContaPagar>[] = [
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
      key: 'profissional',
      header: '👨‍⚕️ Profissional',
      essential: true,
      render: (item) => (
        <span className="text-sm">
          {item.profissional?.nome || '-'}
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
      key: 'valorLiquido',
      header: '💸 Valor',
      essential: true,
      render: (item) => (
        <ValorDisplay valor={item.valorLiquido} tipo="negativo" className="text-sm" />
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
          { value: 'SOLICITADO', label: 'Solicitado' },
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
            variant="primary"
            module="financeiro"
            onClick={() => handleEnviarWhatsAppClick(item)}
            title="Enviar WhatsApp"
            disabled={whatsappLoadingIds.has(item.id)}
          >
            {whatsappLoadingIds.has(item.id) ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
          </ActionButton>
          
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
      const profissional = normalizarBusca(conta.profissional?.nome || '');
      
      return descricao.includes(buscaNormalizada) || 
             empresa.includes(buscaNormalizada) || 
             profissional.includes(buscaNormalizada);
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
        return route.path === '/contas-pagar' && route.method.toLowerCase() === 'get';
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
      const [contasData, empresasData, profissionaisData] = await Promise.all([
        getContasPagar(backendFilters),
        getEmpresas(),
        getProfissionais()
      ]);

      setContas(contasData);
      setEmpresas(empresasData);
      setProfissionais(profissionaisData);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      if (error?.response?.status === 403) {
        const info = await getRouteInfo('/contas-pagar');
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
    if (aplicados.profissionalId) f.profissionalId = aplicados.profissionalId;
    if (aplicados.status) f.status = aplicados.status as any;
    if (aplicados.tipoConta) f.tipoConta = aplicados.tipoConta as any;
    if (aplicados.recorrente) f.recorrente = aplicados.recorrente === 'true';
    if (aplicados.dataInicio) f.dataVencimentoInicio = aplicados.dataInicio;
    if (aplicados.dataFim) f.dataVencimentoFim = aplicados.dataFim;
    return f;
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
      AppToast.success('Conta Paga', {
        description: 'O pagamento foi registrado com sucesso.'
      });
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

  const handleEnviarWhatsAppClick = (conta: ContaPagar) => {
    if (conta.status === 'SOLICITADO') {
      // Mostrar modal de confirmação para reenvio
      setContaParaReenvio(conta);
      setShowConfirmacaoReenvio(true);
    } else {
      // Prosseguir normalmente
      enviarWhatsApp(conta);
    }
  };

  const confirmarReenvio = () => {
    if (contaParaReenvio) {
      enviarWhatsApp(contaParaReenvio);
    }
    setShowConfirmacaoReenvio(false);
    setContaParaReenvio(null);
  };

  const cancelarReenvio = () => {
    setShowConfirmacaoReenvio(false);
    setContaParaReenvio(null);
  };

  const enviarWhatsApp = async (conta: ContaPagar) => {
    // Adicionar conta ao loading
    setWhatsappLoadingIds(prev => new Set(prev).add(conta.id));
    
    try {
      AppToast.info('Enviando WhatsApp', {
        description: 'Preparando dados para envio via WhatsApp...'
      });
      
      // Buscar dados completos para webhook usando a API interna
      const response = await api.get(`/contas-pagar/${conta.id}/webhook-data`);
      const dadosWebhook = response.data.data;
      
      // URL do webhook para envio de dados de pagamento
      const webhookUrl = import.meta.env.VITE_WEBHOOK_ENVIAR_DADOS_PAGAMENTO;
      
      if (!webhookUrl) {
        AppToast.error('Erro de configuração', {
          description: 'URL do webhook não configurada. Verifique o arquivo .env'
        });
        return;
      }

      // Enviar dados via webhook usando fetch para URL externa
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: 'DADOS_PAGAMENTO_CONTA_PAGAR',
          conta: dadosWebhook,
          timestamp: new Date().toISOString(),
          origem: 'sistema-clinica'
        })
      });

      if (!webhookResponse.ok) {
        throw new Error(`Erro ao enviar webhook: ${webhookResponse.status}`);
      }

      // Atualizar status da conta para SOLICITADO após sucesso do webhook
      try {
        await api.put(`/contas-pagar/${conta.id}`, {
          status: 'SOLICITADO'
        });

        // Atualizar a conta localmente
        setContas(prev => 
          prev.map(c => 
            c.id === conta.id 
              ? { ...c, status: 'SOLICITADO' }
              : c
          )
        );
      } catch (updateError) {
        console.warn('Erro ao atualizar status da conta:', updateError);
        // Não falha o processo principal se a atualização do status falhar
      }

      AppToast.success('WhatsApp Enviado', {
        description: `Dados da conta "${conta.descricao}" enviados com sucesso via WhatsApp. Status atualizado para "Solicitado".`
      });
      
    } catch (error: any) {
      console.error('Erro ao enviar WhatsApp:', error);
      
      let errorMessage = 'Tente novamente.';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      AppToast.error('Erro ao enviar WhatsApp', {
        description: `Erro ao enviar dados da conta "${conta.descricao}". ${errorMessage}`
      });
    } finally {
      // Remover conta do loading
      setWhatsappLoadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(conta.id);
        return newSet;
      });
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
            {/* Empresa - Primeiro */}
            {conta.empresa && (
              <div className="flex items-center gap-1">
                <span>🏢</span>
                <span className="text-blue-600 font-medium">{conta.empresa.razaoSocial}</span>
              </div>
            )}

            {/* Profissional - Segundo */}
            {conta.profissional && (
              <div className="flex items-center gap-1">
                <span>👨‍⚕️</span>
                <span className="text-purple-600 font-medium">{conta.profissional.nome}</span>
              </div>
            )}
            
            {/* Valor - Terceiro */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">💸 Valor:</span>
              <ValorDisplay valor={conta.valorLiquido} tipo="negativo" className="text-xs" />
            </div>
            
            {/* Vencimento - Quarto */}
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
          variant="primary"
          module="financeiro"
          onClick={() => handleEnviarWhatsAppClick(conta)}
          title="Enviar WhatsApp"
          disabled={whatsappLoadingIds.has(conta.id)}
        >
          {whatsappLoadingIds.has(conta.id) ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <MessageCircle className="w-4 h-4" />
          )}
        </ActionButton>
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
        
        <ConfirmacaoModal
          open={showConfirmacaoReenvio}
          onClose={cancelarReenvio}
          onConfirm={confirmarReenvio}
          title="Reenviar WhatsApp"
          description={`Deseja realmente reenviar os dados da conta "${contaParaReenvio?.descricao}" via WhatsApp? Esta conta já foi solicitada anteriormente.`}
          confirmText="Reenviar"
          cancelText="Cancelar"
          variant="warning"
        />
      </PageContainer>
    </TooltipProvider>
  );
};