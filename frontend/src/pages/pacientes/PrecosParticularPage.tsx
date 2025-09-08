import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { PageContainer, PageHeader, PageContent, ResponsiveTable, ResponsiveCards, ResponsivePagination, ViewToggle, SearchBar, FilterButton, DynamicFilterPanel, ActionButton } from '@/components/layout';
import type { PrecoParticular } from '@/types/PrecoParticular';
import { getPrecosParticulares, createPrecoParticular, updatePrecoParticular, deletePrecoParticular } from '@/services/precos-particulares';
import { getPacientes } from '@/services/pacientes';
import { getServicos } from '@/services/servicos';
import type { Paciente } from '@/types/Paciente';
import type { Servico } from '@/types/Servico';
import { getConvenios } from '@/services/convenios';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import PrecoParticularModal from './PrecoParticularModal';
import { useViewMode } from '@/hooks/useViewMode';
import { useResponsiveTable } from '@/hooks/useResponsiveTable';
import { useTableFilters } from '@/hooks/useTableFilters';
import { getModuleTheme } from '@/types/theme';
import api from '@/services/api';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AppToast } from '@/services/toast';

export default function PrecosParticularPage() {
  const [precos, setPrecos] = useState<PrecoParticular[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [canCreate, setCanCreate] = useState(true);
  const [canUpdate, setCanUpdate] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<PrecoParticular | null>(null);
  const [form, setForm] = useState({ pacienteId: '', servicoId: '', preco: '', duracaoMinutos: '', percentualClinica: '', percentualProfissional: '', precoPaciente: '', tipoPagamento: '', pagamentoAntecipado: true, diaPagamento: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [excluindo, setExcluindo] = useState<PrecoParticular | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [convenioParticularId, setConvenioParticularId] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [busca, setBusca] = useState('');
  const theme = getModuleTheme('pacientes');

  useEffect(() => {
    carregarPrecos();
    checkPermissions();
    getPacientes().then(setPacientes);
    getServicos().then(setServicos);
    getConvenios().then(convenios => {
      const particular = convenios.find(c => c.nome.toLowerCase().includes('particular'));
      setConvenioParticularId(particular?.id || null);
    });
  }, []);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Verificar cada permissão específica para precos-particulares
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/precos-particulares' && route.method.toLowerCase() === 'get';
      });
      
      const canCreate = allowedRoutes.some((route: any) => {
        return route.path === '/precos-particulares' && route.method.toLowerCase() === 'post';
      });
      
      const canUpdate = allowedRoutes.some((route: any) => {
        return route.path === '/precos-particulares/:id' && route.method.toLowerCase() === 'put';
      });
      
      const canDelete = allowedRoutes.some((route: any) => {
        return route.path === '/precos-particulares/:id' && route.method.toLowerCase() === 'delete';
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

  const carregarPrecos = async () => {
    setLoading(true);
    setAccessDenied(false);
    setPrecos([]); // Limpa dados para evitar mostrar dados antigos
    try {
      const data = await getPrecosParticulares();
      setPrecos(data);
    } catch (error: any) {
      if (error?.response?.status === 403) {
        setAccessDenied(true);
        // Buscar informações da rota para mensagem mais específica
        try {
          const info = await getRouteInfo('/precos-particulares', 'GET');
          setRouteInfo(info);
        } catch (routeError) {
          // Erro ao buscar informações da rota
        }
        // Não mostra toast aqui pois o interceptor já cuida disso
      } else {
        console.error('Erro ao carregar dados:', error);
        AppToast.error('Erro ao carregar dados', {
          description: 'Ocorreu um problema ao carregar os dados. Tente novamente.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Renderização dos cards para o modo cards
  const renderCard = (p: PrecoParticular) => {
    const paciente = pacientes.find(pac => pac.id === p.pacienteId);
    const servico = servicos.find(s => s.id === p.servicoId);
    return (
      <div className={`bg-white rounded-xl shadow-md border ${theme.headerBg} p-4 flex flex-col gap-2`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 bg-gradient-to-r ${theme.primaryButton} rounded-full flex items-center justify-center text-white text-lg font-bold`}>
            {paciente?.nomeCompleto?.charAt(0).toUpperCase() || 'P'}
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-base">{paciente?.nomeCompleto || p.pacienteId}</div>
            <div className="text-sm text-gray-500">{servico?.nome || p.servicoId}</div>
            {servico?.duracaoMinutos && (
              <div className="text-xs text-gray-400">⏱️ {servico.duracaoMinutos} min</div>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-2`}>
          <span className={`font-bold text-lg ${theme.hoverTextColor.replace('hover:', '')}`}>{p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Whatsapp:</span>
          <span className={`font-mono ${theme.headerBg} px-2 py-1 rounded ${theme.hoverTextColor.replace('hover:', '')}`}>
            {(() => {
              if (!paciente || !paciente.whatsapp) return '-';
              const tel = paciente.whatsapp.replace(/\D/g, '');
              if (tel.length > 12) {
                return `(${tel.slice(0, 2)}) ${tel.slice(2, 4)} ${tel.slice(4, 9)}-${tel.slice(9, 13)}`;
              } else if (tel.length === 11) {
                return `(${tel.slice(0, 2)}) ${tel.slice(2, 7)}-${tel.slice(7, 11)}`;
              } else if (tel.length === 10) {
                return `(${tel.slice(0, 2)}) ${tel.slice(2, 6)}-${tel.slice(6, 10)}`;
              }
              return paciente.whatsapp;
            })()}
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap mt-2">
          {canUpdate ? (
            <Button 
              variant="default" 
              size="sm" 
              className={`bg-gradient-to-r ${theme.primaryButton} text-white hover:${theme.primaryButtonHover} focus:ring-4 ${theme.focusRing} h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform`} 
              onClick={() => abrirModalEditar(p)}
              title="Editar Preço"
            >
              <Edit className="w-4 h-4" />
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="h-8 w-8 p-0 bg-orange-300 text-orange-600 opacity-50 cursor-not-allowed shadow-md"
                      disabled={true}
                      title="Sem permissão para editar"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para editar preços</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {canDelete ? (
            <Button
              variant="outline"
              size="sm"
              className="group border-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 focus:ring-4 focus:ring-red-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
              onClick={() => confirmarExclusao(p)}
              title="Excluir Preço"
            >
              <Trash2 className="w-4 h-4 text-red-600 group-hover:text-white transition-colors" />
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-red-300 text-red-600 opacity-50 cursor-not-allowed shadow-md"
                      disabled={true}
                      title="Sem permissão para excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para excluir preços</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    );
  };

  // Colunas para a tabela responsiva
  const columns = [
    {
      key: 'paciente',
      header: '👤 Paciente',
      render: (p: PrecoParticular) => {
        const paciente = pacientes.find(pac => pac.id === p.pacienteId);
        return paciente ? paciente.nomeCompleto : p.pacienteId;
      },
      essential: true,
      filterable: { type: 'text', placeholder: 'Buscar por paciente...' },
    },
    {
      key: 'servico',
      header: '🩺 Serviço',
      render: (p: PrecoParticular) => {
        const servico = servicos.find(s => s.id === p.servicoId);
        return servico ? servico.nome : p.servicoId;
      },
      essential: true,
      filterable: { type: 'text', placeholder: 'Buscar por serviço...' },
    },
    {
      key: 'duracao',
      header: '⏱️ Duração',
      render: (p: PrecoParticular) => {
        const servico = servicos.find(s => s.id === p.servicoId);
        return servico?.duracaoMinutos ? `${servico.duracaoMinutos} min` : '-';
      },
      className: 'text-center',
      filterable: { type: 'text', placeholder: 'Ex.: 30 min' },
    },
    {
      key: 'preco',
      header: '💰 Preço (R$)',
      render: (p: PrecoParticular) => (
        <span className={`text-sm font-medium ${theme.hoverTextColor.replace('hover:', '')} ${theme.headerBg} px-2 py-1 rounded`}>{p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
      ),
      className: 'text-center',
      filterable: { type: 'currency', placeholder: 'Valor em R$' },
    },
    {
      key: 'tipoPagamento',
      header: '💳 Tipo pagamento',
      render: (p: PrecoParticular) => p.tipoPagamento || '-',
      className: 'text-center',
      filterable: { type: 'text', placeholder: 'Ex.: PIX, Cartão' },
    },
    {
      key: 'pagamentoAntecipado',
      header: '⏱️ Antecipado?',
      render: (p: PrecoParticular) => (
        <span className={`text-xs px-2 py-1 rounded ${p.pagamentoAntecipado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {p.pagamentoAntecipado ? 'Sim' : 'Não'}
        </span>
      ),
      className: 'text-center',
      filterable: { type: 'select', options: [
        { label: 'Todos', value: '' },
        { label: 'Sim', value: 'true' },
        { label: 'Não', value: 'false' },
      ] },
    },
    {
      key: 'whatsapp',
      header: '📱 Whatsapp',
      render: (p: PrecoParticular) => {
        const paciente = pacientes.find(pac => pac.id === p.pacienteId);
        if (!paciente || !paciente.whatsapp) return '-';
        const tel = paciente.whatsapp.replace(/\D/g, '');
        if (tel.length > 12) {
          return `(${tel.slice(0, 2)}) ${tel.slice(2, 4)} ${tel.slice(4, 9)}-${tel.slice(9, 13)}`;
        } else if (tel.length === 11) {
          return `(${tel.slice(0, 2)}) ${tel.slice(2, 7)}-${tel.slice(7, 11)}`;
        } else if (tel.length === 10) {
          return `(${tel.slice(0, 2)}) ${tel.slice(2, 6)}-${tel.slice(6, 10)}`;
        }
        return paciente.whatsapp;
      },
      className: 'text-center',
      filterable: false,
    },
    {
      key: 'acoes',
      header: '⚙️ Ações',
      render: (p: PrecoParticular) => (
        <div className="flex gap-1.5 flex-wrap">
          {canUpdate ? (
            <Button 
              variant="default" 
              size="sm" 
              className={`bg-gradient-to-r ${theme.primaryButton} text-white hover:${theme.primaryButtonHover} focus:ring-4 ${theme.focusRing} h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform`} 
              onClick={() => abrirModalEditar(p)}
              title="Editar Preço"
            >
              <Edit className="w-4 h-4" />
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="h-8 w-8 p-0 border-green-300 text-green-600 opacity-50 cursor-not-allowed shadow-md"
                      disabled={true}
                      title="Sem permissão para editar"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para editar preços</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {canDelete ? (
            <Button
              variant="outline"
              size="sm"
              className="group border-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 focus:ring-4 focus:ring-red-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
              onClick={() => confirmarExclusao(p)}
              title="Excluir Preço"
            >
              <Trash2 className="w-4 h-4 text-red-600 group-hover:text-white transition-colors" />
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-red-300 text-red-600 opacity-50 cursor-not-allowed shadow-md"
                      disabled={true}
                      title="Sem permissão para excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para excluir preços</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      ),
      className: 'py-2',
      filterable: false,
    },
  ];

  // Filtros dinâmicos
  const {
    activeFilters,
    filterConfigs,
    activeFiltersCount,
    setFilter,
    clearAllFilters,
    applyFilters
  } = useTableFilters(columns);

  // Integração busca rápida com filtro de paciente/serviço
  const handleBusca = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusca(e.target.value);
    setFilter('paciente', { text: e.target.value });
    setFilter('servico', { text: e.target.value });
  };

  // Dados filtrados
  const precosFiltrados = applyFilters(precos);

  // Responsividade e paginação
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'precos-particular-view' });
  const {
    data: precosPaginados,
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    isMobile,
    handlePageChange,
    handleItemsPerPageChange,
    targetRef
  } = useResponsiveTable(precosFiltrados, 10);

  const abrirModalNovo = () => {
    setEditando(null);
    setForm({ pacienteId: '', servicoId: '', preco: '', duracaoMinutos: '', percentualClinica: '', percentualProfissional: '', precoPaciente: '', tipoPagamento: '', pagamentoAntecipado: true, diaPagamento: '' });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (p: PrecoParticular) => {
    setEditando(p);
    const servico = servicos.find(s => s.id === p.servicoId);
    setForm({
      pacienteId: p.pacienteId,
      servicoId: p.servicoId,
      preco: servico && servico.preco !== undefined && servico.preco !== null ? String(servico.preco) : '',
      duracaoMinutos: servico && servico.duracaoMinutos !== undefined && servico.duracaoMinutos !== null ? String(servico.duracaoMinutos) : '',
      percentualClinica: servico && servico.percentualClinica !== undefined && servico.percentualClinica !== null ? String(servico.percentualClinica) : '',
      percentualProfissional: servico && servico.percentualProfissional !== undefined && servico.percentualProfissional !== null ? String(servico.percentualProfissional) : '',
      precoPaciente: p.preco !== undefined && p.preco !== null
        ? Number(p.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '',
      tipoPagamento: p.tipoPagamento || '',
      pagamentoAntecipado: p.pagamentoAntecipado ?? true,
      diaPagamento: p.diaPagamento ? String(p.diaPagamento) : '',
    });
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({ pacienteId: '', servicoId: '', preco: '', duracaoMinutos: '', percentualClinica: '', percentualProfissional: '', precoPaciente: '', tipoPagamento: '', pagamentoAntecipado: true, diaPagamento: '' });
    setFormError('');
  };

  const handleFormChange = (updates: Partial<typeof form>) => {
    setForm(f => ({ ...f, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pacienteId.trim()) {
      setFormError('O pacienteId é obrigatório.');
      return;
    }
    if (!form.servicoId.trim()) {
      setFormError('O servicoId é obrigatório.');
      return;
    }
    if (!form.preco || isNaN(Number(form.preco))) {
      setFormError('O preço deve ser um número.');
      return;
    }
    if (!form.precoPaciente || form.precoPaciente === '00,00' || Number(form.precoPaciente.replace(',', '.')) <= 0) {
      setFormError('O preço do paciente é obrigatório.');
      return;
    }
    setFormLoading(true);
    try {
      if (editando) {
        await updatePrecoParticular(editando.id, {
          pacienteId: form.pacienteId,
          servicoId: form.servicoId,
          preco: Number(form.precoPaciente.replace(',', '.')),
          duracaoMinutos: form.duracaoMinutos ? Number(form.duracaoMinutos) : undefined,
          percentualClinica: form.percentualClinica ? Number(form.percentualClinica) : undefined,
          percentualProfissional: form.percentualProfissional ? Number(form.percentualProfissional) : undefined,
          tipoPagamento: form.tipoPagamento || undefined,
          pagamentoAntecipado: form.pagamentoAntecipado ?? undefined,
          diaPagamento: form.diaPagamento ? Number(form.diaPagamento) : undefined,
        });
      } else {
        await createPrecoParticular({
          pacienteId: form.pacienteId,
          servicoId: form.servicoId,
          preco: Number(form.precoPaciente.replace(',', '.')),
          duracaoMinutos: form.duracaoMinutos ? Number(form.duracaoMinutos) : undefined,
          percentualClinica: form.percentualClinica ? Number(form.percentualClinica) : undefined,
          percentualProfissional: form.percentualProfissional ? Number(form.percentualProfissional) : undefined,
          tipoPagamento: form.tipoPagamento || undefined,
          pagamentoAntecipado: form.pagamentoAntecipado ?? undefined,
          diaPagamento: form.diaPagamento ? Number(form.diaPagamento) : undefined,
        });
      }
      fecharModal();
      carregarPrecos();
    } catch (err: any) {
      let msg = 'Erro ao salvar preço.';
      if (err?.response?.data?.message) msg = err.response.data.message;
      else if (err?.response?.data?.error) msg = err.response.data.error;
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmarExclusao = (p: PrecoParticular) => setExcluindo(p);
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      if (excluindo) {
        await deletePrecoParticular(excluindo.id);
        setExcluindo(null);
        carregarPrecos();
      }
    } catch (error: any) {
      if (error?.response?.status === 403) {
        // O toast já será mostrado pelo interceptor
        setExcluindo(null);
      } else {
        console.error('Erro ao excluir preço:', error);
        AppToast.error('Erro ao excluir', {
          description: 'Ocorreu um problema ao excluir o preço. Tente novamente.'
        });
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <PageContainer>
        <PageHeader
          title="Preços Particulares"
          module="pacientes"
          icon={<span className="text-4xl">💰</span>}
        >
          <SearchBar
              value={busca}
            onChange={handleBusca}
            placeholder="Buscar por paciente, serviço ou valor..."
            className="w-full sm:w-64 md:w-80 lg:w-96"
            module="pacientes"
          />
          <FilterButton
            showFilters={mostrarFiltros}
            onToggleFilters={() => setMostrarFiltros(v => !v)}
            activeFiltersCount={activeFiltersCount}
            module="pacientes"
          />
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} module="pacientes" />
          {canCreate ? (
            <Button 
              onClick={abrirModalNovo} 
              className={`bg-gradient-to-r ${theme.primaryButton} hover:${theme.primaryButtonHover} shadow-lg hover:shadow-xl transition-all duration-200 font-semibold text-white`}
            >
              <span className="mr-2"><Plus className="w-4 h-4" /></span>
              Novo Preço
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button 
                      className={`bg-gradient-to-r ${theme.primaryButton} hover:${theme.primaryButtonHover} shadow-lg hover:shadow-xl transition-all duration-200 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                      disabled={true}
                    >
                      <span className="mr-2"><Plus className="w-4 h-4" /></span>
                      Novo Preço
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para criar preços particulares</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </PageHeader>
        <DynamicFilterPanel
          isVisible={mostrarFiltros}
          filterConfigs={filterConfigs}
          activeFilters={activeFilters}
          onFilterChange={setFilter}
          onClearAll={clearAllFilters}
          onClose={() => setMostrarFiltros(false)}
          module="pacientes"
        />
        <PageContent scrollRef={isMobile ? targetRef : undefined}>
          {accessDenied ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="text-red-500 text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2 text-center">
                Acesso Negado
              </h2>
              <p className="text-gray-600 text-center mb-6 max-w-md">
                Você não tem permissão para acessar esta página.
              </p>
              {routeInfo && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
                  <p className="text-sm text-red-700">
                    <strong>Rota:</strong> {routeInfo.path} ({routeInfo.method})
                  </p>
                  {routeInfo.descricao && (
                    <p className="text-sm text-red-600 mt-1">
                      <strong>Descrição:</strong> {routeInfo.descricao}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {viewMode === 'table' ? (
                <ResponsiveTable
                  data={precosPaginados}
                  columns={columns}
                  module="pacientes"
                  emptyMessage="Nenhum preço encontrado"
                  isMobile={isMobile}
                  scrollRef={isMobile ? targetRef : undefined}
                />
              ) : (
                <ResponsiveCards
                  data={precosPaginados}
                  renderCard={renderCard}
                  emptyMessage="Nenhum preço encontrado"
                  emptyIcon="💰"
                  isMobile={isMobile}
                  scrollRef={isMobile ? targetRef : undefined}
                />
              )}
            </>
          )}
        </PageContent>
        {totalItems > 0 && (
          <ResponsivePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            module="pacientes"
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </PageContainer>
      <PrecoParticularModal
        showModal={showModal}
        editando={editando}
        form={form}
        formError={formError}
        formLoading={formLoading}
        pacientes={pacientes}
        servicos={servicos}
        convenioParticularId={convenioParticularId}
        onClose={fecharModal}
        onSubmit={handleSubmit}
        onFormChange={handleFormChange}
      />
      <ConfirmDeleteModal
        open={!!excluindo}
        onClose={() => setExcluindo(null)}
        onConfirm={handleDelete}
        title="Confirmar Exclusão de Preço Particular"
        entityName={
          excluindo 
            ? `${pacientes.find(p => p.id === excluindo.pacienteId)?.nomeCompleto} - ${servicos.find(s => s.id === excluindo.servicoId)?.nome}`
            : ''
        }
        entityType="preço particular"
        isLoading={deleteLoading}
        loadingText="Excluindo preço particular..."
        confirmText="Excluir Preço"
      />
    </>
  );
} 