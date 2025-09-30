import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { AdvancedFilter, type FilterField } from '@/components/ui/advanced-filter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Plus,
  Search,
  Users,
  Stethoscope,
  ClipboardCheck,
  Archive,
  LayoutGrid,
  List,
  Activity,
  X,
  Filter,
  FilterX,
  Eye,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react';
import type { Agendamento, StatusAgendamento } from '@/types/Agendamento';
import { getAgendamentos, deleteAgendamento, updateAgendamento, IPaginatedAgendamentos } from '@/services/agendamentos';
import { 
  AgendamentoModal,
  DetalhesAgendamentoModal
} from '@/components/agendamentos';
import { EditarAgendamentoModal } from '@/components/agendamentos/components/EditarAgendamentoModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import ConfirmDeleteAgendamentoModal from '@/components/ConfirmDeleteAgendamentoModal';
import ConfirmacaoModal from '@/components/ConfirmacaoModal';
import api from '@/services/api';
import { AppToast } from '@/services/toast';
import { useAuthStore } from '@/store/auth';
import { formatarDataHoraLocal } from '@/utils/dateUtils';
import { getConvenios } from '@/services/convenios';
import { getServicos } from '@/services/servicos';
import { getPacientes } from '@/services/pacientes';
import { getProfissionais } from '@/services/profissionais';
import type { Convenio } from '@/types/Convenio';
import type { Servico } from '@/types/Servico';
import type { Paciente } from '@/types/Paciente';
import type { Profissional } from '@/types/Profissional';

// Opções estáticas para Tipo Atendimento e Status (movidas para fora do componente)
const tipoAtendimentoOptions = [
  { id: 'presencial', nome: 'Presencial' },
  { id: 'online', nome: 'Online' }
];

const statusOptions = [
  { id: 'AGENDADO', nome: 'Agendado' },
  { id: 'SOLICITADO', nome: 'Solicitado' },
  { id: 'LIBERADO', nome: 'Liberado' },
  { id: 'ATENDIDO', nome: 'Atendido' },
  { id: 'FINALIZADO', nome: 'Finalizado' },
  { id: 'CANCELADO', nome: 'Cancelado' },
  { id: 'ARQUIVADO', nome: 'Arquivado' }
];

// Configuração dos campos de filtro para o AdvancedFilter (movida para fora do componente)
const filterFields: FilterField[] = [
  { 
    key: 'dataInicio', 
    type: 'date', 
    label: 'Data Início' 
  },
  { 
    key: 'dataFim', 
    type: 'date', 
    label: 'Data Fim' 
  },
  { 
    key: 'convenioId', 
    type: 'api-select', 
    label: 'Convênio',
    apiService: getConvenios,
    placeholder: 'Selecione um convênio...',
    searchFields: ['nome']
  },
  { 
    key: 'servicoId', 
    type: 'api-select', 
    label: 'Serviço',
    apiService: getServicos,
    placeholder: 'Selecione um serviço...',
    searchFields: ['nome']
  },
  { 
    key: 'tipoAtendimento', 
    type: 'static-select', 
    label: 'Tipo Atendimento',
    options: tipoAtendimentoOptions,
    placeholder: 'Selecione o tipo...'
  },
  { 
    key: 'pacienteId', 
    type: 'api-select', 
    label: 'Paciente',
    apiService: getPacientes,
    placeholder: 'Selecione um paciente...',
    searchFields: ['nomeCompleto']
  },
  { 
    key: 'profissionalId', 
    type: 'api-select', 
    label: 'Profissional',
    apiService: getProfissionais,
    placeholder: 'Selecione um profissional...',
    searchFields: ['nome']
  },
  { 
    key: 'status', 
    type: 'static-select', 
    label: 'Status',
    options: statusOptions,
    placeholder: 'Selecione o status...'
  }
];

export const AgendamentosPage = () => {
  const { user } = useAuthStore();
  const [paginatedData, setPaginatedData] = useState<IPaginatedAgendamentos>({
    data: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('tabela');
  const [filtroStatus, setFiltroStatus] = useState<StatusAgendamento | 'TODOS'>('TODOS');
  
  // Estados para controle de permissões RBAC
  const [accessDenied, setAccessDenied] = useState(false);
  const [canRead, setCanRead] = useState(true);
  const [canCreate, setCanCreate] = useState(true);
  const [canUpdate, setCanUpdate] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  // Estados para modais de agendamento
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  
  const [showDetalhesAgendamento, setShowDetalhesAgendamento] = useState(false);
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState<Agendamento | null>(null);

  // Estados para edição de agendamento
  const [showEditarAgendamento, setShowEditarAgendamento] = useState(false);
  const [agendamentoEdicao, setAgendamentoEdicao] = useState<Agendamento | null>(null);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);
  
  // Filtros avançados por coluna
  const [filtros, setFiltros] = useState({
    pacienteId: '',
    profissionalId: '',
    servicoId: '',
    convenioId: '',
    tipoAtendimento: '',
    status: '',
    dataInicio: '',
    dataFim: ''
  });
  // Estados separados para filtros aplicados vs editados
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    pacienteId: '',
    profissionalId: '',
    servicoId: '',
    convenioId: '',
    tipoAtendimento: '',
    status: '',
    dataInicio: '',
    dataFim: ''
  });
  
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Estados para exclusão
  const [agendamentoExcluindo, setAgendamentoExcluindo] = useState<Agendamento | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteSeriesModal, setShowDeleteSeriesModal] = useState(false);
  const [showSimpleDeleteModal, setShowSimpleDeleteModal] = useState(false);
  const [seriesCount, setSeriesCount] = useState(1);
  const [futureCount, setFutureCount] = useState(0);

  // Estados para cancelamento
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [agendamentoCancelando, setAgendamentoCancelando] = useState<Agendamento | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Estados para alteração de status (quando já está cancelado)
  const [showAlterarStatusModal, setShowAlterarStatusModal] = useState(false);
  const [novoStatus, setNovoStatus] = useState<{id: string; nome: string} | null>(null);

  // Funções de controle do modal unificado
  const handleFecharAgendamentoModal = () => {
    setShowAgendamentoModal(false);
  };

  const handleSuccessAgendamento = () => {
    carregarAgendamentos();
    setShowAgendamentoModal(false);
  };

  const handleAbrirNovoAgendamento = () => {
    setShowAgendamentoModal(true);
  };

  // Handlers de edição removidos


  const [initialized, setInitialized] = useState(false);

  // Inicialização única
  useEffect(() => {
    checkPermissions();
    carregarAgendamentos();
    setInitialized(true);
  }, []);

  // Debounce da busca para evitar muitas chamadas à API
  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(busca);
    }, 500); // 500ms de debounce
    
    return () => clearTimeout(timer);
  }, [busca]);
  
  // Recarregamento quando dependências mudam (mas apenas após inicialização)
  useEffect(() => {
    if (initialized) {
      carregarAgendamentos();
    }
  }, [paginaAtual, itensPorPagina, filtroStatus, filtrosAplicados, buscaDebounced]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [buscaDebounced, filtroStatus, filtrosAplicados]);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Verificar cada permissão específica para agendamentos
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/agendamentos' && route.method.toLowerCase() === 'get';
      });
      
      const canCreate = allowedRoutes.some((route: any) => {
        return route.path === '/agendamentos' && route.method.toLowerCase() === 'post';
      });
      
      const canUpdate = allowedRoutes.some((route: any) => {
        return route.path === '/agendamentos/:id' && route.method.toLowerCase() === 'put';
      });
      
      const canDelete = allowedRoutes.some((route: any) => {
        return route.path === '/agendamentos/:id' && route.method.toLowerCase() === 'delete';
      });
      
      setCanRead(canRead);
      setCanCreate(canCreate);
      setCanUpdate(canUpdate);
      setCanDelete(canDelete);
      
      // Se não tem nem permissão de leitura, marca como access denied
      if (!canRead) {
        setAccessDenied(true);
      }
      
    } catch (error: any) {
      // Em caso de erro, desabilita tudo por segurança
      setCanRead(false);
      setCanCreate(false);
      setCanUpdate(false);
      setCanDelete(false);
      
      // Se retornar 401/403 no endpoint de permissões, considera acesso negado
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };

  const carregarAgendamentos = async () => {
    if (!canRead) {
      setAccessDenied(true);
      return;
    }
    
    setLoading(true);
    setAccessDenied(false);
    try {
      // Montar filtros para a API
      const filtrosAPI: any = {
        page: paginaAtual,
        limit: itensPorPagina,
      };

      // Aplicar filtro de status se não for 'TODOS'
      if (filtroStatus !== 'TODOS') {
        filtrosAPI.status = filtroStatus;
      }

      // Aplicar busca textual (usando versão debounced)
      if (buscaDebounced) {
        filtrosAPI.search = buscaDebounced;
      }

      // Aplicar outros filtros (usando filtrosAplicados)
      if (filtrosAplicados.pacienteId) filtrosAPI.pacienteId = filtrosAplicados.pacienteId;
      if (filtrosAplicados.profissionalId) filtrosAPI.profissionalId = filtrosAplicados.profissionalId;
      if (filtrosAplicados.servicoId) filtrosAPI.servicoId = filtrosAplicados.servicoId;
      if (filtrosAplicados.convenioId) filtrosAPI.convenioId = filtrosAplicados.convenioId;
      if (filtrosAplicados.tipoAtendimento) filtrosAPI.tipoAtendimento = filtrosAplicados.tipoAtendimento;
      if (filtrosAplicados.status && filtrosAplicados.status !== filtroStatus) filtrosAPI.status = filtrosAplicados.status;
      if (filtrosAplicados.dataInicio) filtrosAPI.dataInicio = filtrosAplicados.dataInicio;
      if (filtrosAplicados.dataFim) filtrosAPI.dataFim = filtrosAplicados.dataFim;
      
      // Se o usuário for PROFISSIONAL, filtrar apenas os agendamentos dele
      if (user?.roles?.includes('PROFISSIONAL')) {
        try {
          const profissionalResponse = await api.get('/profissionais/me');
          filtrosAPI.profissionalId = profissionalResponse.data.id;
        } catch (profissionalError) {
          AppToast.error('Erro ao carregar dados do profissional', {
            description: 'Não foi possível carregar os agendamentos do profissional.'
          });
          setPaginatedData({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
          return;
        }
      }
      
      const dados = await getAgendamentos(filtrosAPI);
      setPaginatedData(dados);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setAccessDenied(true);
      } else {
        AppToast.error('Erro ao carregar agendamentos', {
          description: 'Ocorreu um problema ao carregar a lista de agendamentos. Tente novamente.'
        });
      }
      setPaginatedData({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    } finally {
      setLoading(false);
    }
  };

  // Os dados já vêm filtrados e paginados da API (server-side)
  // Não precisamos fazer filtro nem paginação local
  const agendamentosFiltrados = paginatedData.data;

  // Para compatibilidade, mantemos a variável agendamentos referenciando os dados paginados
  const agendamentos = paginatedData.data;

  // Sempre usar paginação server-side (dados já vêm paginados da API)
  const totalPaginas = paginatedData.pagination.totalPages;
  
  const agendamentosPaginados = agendamentosFiltrados;

  const formatarDataHora = formatarDataHoraLocal;

  const getStatusColor = (status: StatusAgendamento) => {
    const cores = {
      'AGENDADO': 'bg-blue-100 text-blue-700',
      'SOLICITADO': 'bg-orange-100 text-orange-700',
      'LIBERADO': 'bg-green-100 text-green-700',
      'ATENDIDO': 'bg-yellow-100 text-yellow-700',
      'FINALIZADO': 'bg-emerald-100 text-emerald-700',
      'CANCELADO': 'bg-red-100 text-red-700',
      'ARQUIVADO': 'bg-gray-100 text-gray-700'
    };
    return cores[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status: StatusAgendamento) => {
    const icons = {
      'AGENDADO': Calendar,
      'SOLICITADO': Clock,
      'LIBERADO': CheckCircle,
      'ATENDIDO': Stethoscope,
      'FINALIZADO': ClipboardCheck,
      'CANCELADO': XCircle,
      'ARQUIVADO': Archive
    };
    return icons[status] || Calendar;
  };

  const contarPorStatus = (status: StatusAgendamento) => {
    return agendamentos.filter(a => a.status === status).length;
  };


  const updateFiltro = (campo: keyof typeof filtros, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const aplicarFiltros = () => {
    setFiltrosAplicados(filtros);
    setPaginaAtual(1);
  };

  const limparFiltros = () => {
    const filtrosLimpos = {
      pacienteId: '',
      profissionalId: '',
      servicoId: '',
      convenioId: '',
      tipoAtendimento: '',
      status: '',
      dataInicio: '',
      dataFim: ''
    };
    setFiltros(filtrosLimpos);
    setFiltrosAplicados(filtrosLimpos);
    setPaginaAtual(1);
  };


  const temFiltrosAtivos = Object.values(filtrosAplicados).some(filtro => filtro !== '');
  const temFiltrosNaoAplicados = JSON.stringify(filtros) !== JSON.stringify(filtrosAplicados);

  // Função para formatar data no formato brasileiro
  const formatarDataBrasil = (dataISO: string) => {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const handleVerDetalhes = (agendamento: Agendamento) => {
    setAgendamentoDetalhes(agendamento);
    setShowDetalhesAgendamento(true);
  };

  const handleEditarAgendamento = (agendamento: Agendamento) => {
    setAgendamentoEdicao(agendamento);
    setShowEditarAgendamento(true);
  };

  const handleSuccessEdicao = () => {
    carregarAgendamentos();
    setShowEditarAgendamento(false);
    setAgendamentoEdicao(null);
  };

  // Funções de exclusão
  const confirmarExclusao = async (agendamento: Agendamento) => {
    // Preparar estado
    setShowSimpleDeleteModal(false);
    setShowDeleteSeriesModal(false);
    setAgendamentoExcluindo(agendamento);
    try {
      // Usar novo endpoint para obter informações da série
      const response = await api.get(`/agendamentos/${agendamento.id}/series-info`);
      const serieInfo = response.data;
      
      if (serieInfo.isSeries) {
        // É uma série - mostrar modal de séries
        setSeriesCount(serieInfo.totalAgendamentos);
        // Calcular futuros baseado na posição na série
        const futureCount = serieInfo.posicaoNaSerie?.isFuturo ? 
          Math.max(0, serieInfo.totalAgendamentos - serieInfo.posicaoNaSerie.posicao) : 0;
        setFutureCount(futureCount);
        setShowDeleteSeriesModal(true);
      } else {
        // Agendamento individual
        setSeriesCount(1);
        setFutureCount(0);
        setShowSimpleDeleteModal(true);
      }
    } catch (e) {
      // Fallback: abrir modal simples se houver erro
      setSeriesCount(1);
      setFutureCount(0);
      setShowSimpleDeleteModal(true);
    }
  };

  const cancelarExclusao = () => {
    setAgendamentoExcluindo(null);
    setShowDeleteSeriesModal(false);
    setShowSimpleDeleteModal(false);
  };

  const handleDelete = async () => {
    if (!agendamentoExcluindo) return;

    setDeleteLoading(true);
    try {
      await deleteAgendamento(agendamentoExcluindo.id, 'apenas_esta');
      AppToast.success('Agendamento excluído', {
        description: 'O agendamento foi excluído com sucesso.'
      });
      cancelarExclusao();
      carregarAgendamentos();
    } catch (error: any) {
      const mensagemErro = error?.response?.data?.message || 'Não foi possível excluir o agendamento.';
      AppToast.error('Erro ao excluir', {
        description: mensagemErro
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteSeries = async () => {
    if (!agendamentoExcluindo) return;
    setDeleteLoading(true);
    try {
      await deleteAgendamento(agendamentoExcluindo.id, 'toda_serie');
      AppToast.success('Série excluída', {
        description: `Toda a série de ${seriesCount} agendamentos foi excluída com sucesso.`
      });
      cancelarExclusao();
      carregarAgendamentos();
    } catch (error: any) {
      const mensagemErro = error?.response?.data?.message || 'Não foi possível excluir a série de agendamentos.';
      AppToast.error('Erro ao excluir série', {
        description: mensagemErro
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteThisAndFuture = async () => {
    if (!agendamentoExcluindo) return;
    setDeleteLoading(true);
    try {
      await deleteAgendamento(agendamentoExcluindo.id, 'esta_e_futuras');
      AppToast.success('Agendamentos excluídos', {
        description: `${futureCount + 1} agendamentos (esta e futuras ocorrências) foram excluídos.`
      });
      cancelarExclusao();
      carregarAgendamentos();
    } catch (error: any) {
      const mensagemErro = error?.response?.data?.message || 'Não foi possível excluir os agendamentos.';
      AppToast.error('Erro ao excluir', {
        description: mensagemErro
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Funções para cancelamento de agendamento
  const handleCancelarAgendamento = (agendamento: Agendamento) => {
    setAgendamentoCancelando(agendamento);

    // Se já está cancelado, mostrar dropdown para alterar status
    if (agendamento.status === 'CANCELADO') {
      setShowAlterarStatusModal(true);
    } else {
      // Senão, mostrar confirmação de cancelamento
      setShowCancelarModal(true);
    }
  };

  const confirmarCancelamento = async () => {
    if (!agendamentoCancelando) return;

    setCancelLoading(true);
    try {
      await updateAgendamento(agendamentoCancelando.id, { status: 'CANCELADO' });
      AppToast.success('Agendamento cancelado', {
        description: 'O agendamento foi cancelado com sucesso.'
      });
      setShowCancelarModal(false);
      setAgendamentoCancelando(null);
      carregarAgendamentos();
    } catch (error: any) {
      const mensagemErro = error?.response?.data?.message || 'Não foi possível cancelar o agendamento.';
      AppToast.error('Erro ao cancelar', {
        description: mensagemErro
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const confirmarAlteracaoStatus = async () => {
    if (!agendamentoCancelando || !novoStatus) return;

    setCancelLoading(true);
    try {
      await updateAgendamento(agendamentoCancelando.id, { status: novoStatus.id });
      AppToast.success('Status alterado', {
        description: `O status foi alterado para ${novoStatus.nome} com sucesso.`
      });
      setShowAlterarStatusModal(false);
      setAgendamentoCancelando(null);
      setNovoStatus(null);
      carregarAgendamentos();
    } catch (error: any) {
      const mensagemErro = error?.response?.data?.message || 'Não foi possível alterar o status.';
      AppToast.error('Erro ao alterar status', {
        description: mensagemErro
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const cancelarOperacao = () => {
    setShowCancelarModal(false);
    setShowAlterarStatusModal(false);
    setAgendamentoCancelando(null);
    setNovoStatus(null);
  };

  // Removidos cards de estatísticas na visão de cards

  const renderCardView = () => (
    <div className="space-y-6">
      {/* Cards dos Agendamentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {agendamentosPaginados.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
            <Activity className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhum agendamento encontrado
            </h3>
            <p className="text-sm">
              {buscaDebounced || temFiltrosAtivos || filtroStatus !== 'TODOS' 
                ? 'Tente alterar os filtros de busca.' 
                : 'Comece criando um novo agendamento.'
              }
            </p>
          </div>
        ) : (
          agendamentosPaginados.map(agendamento => {
            const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);
            const StatusIcon = getStatusIcon(agendamento.status);
            
            return (
              <Card key={agendamento.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusIcon className="w-4 h-4 flex-shrink-0" />
                      <CardTitle className="text-sm font-medium truncate">{agendamento.pacienteNome}</CardTitle>
                    </div>
                    <Badge className={`text-xs flex-shrink-0 ml-2 ${getStatusColor(agendamento.status)}`}>
                      {agendamento.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-3">
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Users className="w-3 h-3" />
                      <span className="truncate">{agendamento.profissionalNome}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <FileText className="w-3 h-3" />
                      <span className="truncate">{agendamento.servicoNome}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{data}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{hora}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {agendamento.tipoAtendimento}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex gap-1.5">
                    {canRead ? (
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleVerDetalhes(agendamento)}
                        title="Visualizar Agendamento"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        disabled={true}
                        className="bg-gray-400 cursor-not-allowed h-8 w-8 p-0"
                        title="Você não tem permissão para visualizar agendamentos"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {canUpdate ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="group border-2 border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleEditarAgendamento(agendamento)}
                        title="Editar Agendamento"
                      >
                        <Edit className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={true}
                        className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                        title="Você não tem permissão para editar agendamentos"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="group border-2 border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white hover:border-orange-600 focus:ring-4 focus:ring-orange-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleCancelarAgendamento(agendamento)}
                        title={agendamento.status === 'CANCELADO' ? 'Alterar Status' : 'Cancelar Agendamento'}
                      >
                        <XCircle className="w-4 h-4 text-orange-600 group-hover:text-white transition-colors" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={true}
                        className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                        title="Você não tem permissão para cancelar agendamentos"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="group border-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 focus:ring-4 focus:ring-red-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => confirmarExclusao(agendamento)}
                        title="Excluir Agendamento"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 group-hover:text-white transition-colors" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={true}
                        className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                        title="Você não tem permissão para excluir agendamentos"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );

  const renderTableView = () => (
    <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-100">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                Data
              </div>
            </TableHead>
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">⏰</span>
                Horário
              </div>
            </TableHead>
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                Paciente
              </div>
            </TableHead>
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">👨‍⚕️</span>
                Profissional
              </div>
            </TableHead>
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">🩺</span>
                Serviço
              </div>
            </TableHead>
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏷️</span>
                Tipo
              </div>
            </TableHead>
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">📊</span>
                Status
              </div>
            </TableHead>
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚙️</span>
                Ações
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agendamentosPaginados.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">📅</span>
                  </div>
                  <p className="text-gray-500 font-medium">
                    {buscaDebounced || temFiltrosAtivos || filtroStatus !== 'TODOS' 
                      ? 'Nenhum resultado encontrado' 
                      : 'Nenhum agendamento cadastrado'
                    }
                  </p>
                  <p className="text-gray-400 text-sm">Tente ajustar os filtros de busca</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            agendamentosPaginados.map((agendamento) => {
              const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);
              
              return (
                <TableRow key={agendamento.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 h-12">
                  <TableCell className="py-2">
                    <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{data}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm font-mono bg-blue-100 px-2 py-1 rounded text-blue-700">{hora}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {agendamento.pacienteNome?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{agendamento.pacienteNome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm text-blue-600 hover:text-blue-800 transition-colors">{agendamento.profissionalNome}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm">{agendamento.servicoNome}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                      agendamento.tipoAtendimento === 'presencial' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {agendamento.tipoAtendimento}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge className={`text-xs ${getStatusColor(agendamento.status)}`}>
                      {agendamento.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex gap-1.5">
                      {canRead ? (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => handleVerDetalhes(agendamento)}
                          title="Visualizar Agendamento"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          disabled={true}
                          className="bg-gray-400 cursor-not-allowed h-8 w-8 p-0"
                          title="Você não tem permissão para visualizar agendamentos"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {canUpdate ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => handleEditarAgendamento(agendamento)}
                          title="Editar Agendamento"
                        >
                          <Edit className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={true}
                          className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                          title="Você não tem permissão para editar agendamentos"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white hover:border-orange-600 focus:ring-4 focus:ring-orange-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => handleCancelarAgendamento(agendamento)}
                          title={agendamento.status === 'CANCELADO' ? 'Alterar Status' : 'Cancelar Agendamento'}
                        >
                          <XCircle className="w-4 h-4 text-orange-600 group-hover:text-white transition-colors" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={true}
                          className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                          title="Você não tem permissão para cancelar agendamentos"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 focus:ring-4 focus:ring-red-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => confirmarExclusao(agendamento)}
                          title="Excluir Agendamento"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 group-hover:text-white transition-colors" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={true}
                          className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                          title="Você não tem permissão para excluir agendamentos"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return (
      <div className="pt-2 pl-6 pr-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  // Tela de acesso negado
  if (accessDenied) {
    return (
      <div className="pt-2 pl-6 pr-6 h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">
            Você não tem permissão para acessar esta funcionalidade.
          </p>
          
          
          <p className="text-sm text-gray-500">
            Entre em contato com o administrador do sistema para solicitar as devidas permissões.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2 pl-6 pr-6 h-full min-h-0 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white backdrop-blur border-b border-gray-200 flex justify-between items-center mb-6 px-6 py-4 rounded-lg gap-4 transition-shadow">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">📅</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Agendamentos
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar agendamentos..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Toggle de visualização */}
          <div className="flex border rounded-lg p-1 bg-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisualizacao('tabela')}
              className={`h-7 px-3 ${visualizacao === 'tabela' ? 'bg-white shadow-sm' : ''}`}
            >
              <List className="w-4 h-4 mr-1" />
              Tabela
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisualizacao('cards')}
              className={`h-7 px-3 ${visualizacao === 'cards' ? 'bg-white shadow-sm' : ''}`}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              Cards
            </Button>
          </div>

          {/* Botão Filtros Avançados */}
          <Button
            variant="outline"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`${mostrarFiltros ? 'bg-blue-50 border-blue-300' : ''} ${temFiltrosAtivos ? 'border-blue-500 bg-blue-50' : ''}`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {temFiltrosAtivos && (
              <Badge variant="secondary" className="ml-2 h-4 px-1">
                {Object.values(filtros).filter(f => f !== '').length}
              </Badge>
            )}
          </Button>
          
          {canCreate ? (
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleAbrirNovoAgendamento}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Agendamento
            </Button>
          ) : (
            <Button 
              disabled={true}
              className="bg-gray-400 cursor-not-allowed"
              title="Você não tem permissão para criar agendamentos"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Agendamento
            </Button>
          )}
        </div>
      </div>

      {/* Painel de Filtros Avançados */}
      <AdvancedFilter
        fields={filterFields}
        filters={filtros}
        appliedFilters={filtrosAplicados}
        onFilterChange={updateFiltro}
        onApplyFilters={aplicarFiltros}
        onClearFilters={limparFiltros}
        isVisible={mostrarFiltros}
        onClose={() => setMostrarFiltros(false)}
        loading={loading}
      />

      {/* Conteúdo */}
      {visualizacao === 'cards' ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {renderCardView()}
        </div>
      ) : (
        renderTableView()
      )}

      {/* Paginação */}
      {paginatedData.pagination.total > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-6 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 flex items-center gap-2">
            <span className="text-lg">📊</span>
            Exibir
          </span>
          <select
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-blue-300"
            value={itensPorPagina}
            onChange={e => {
              setItensPorPagina(Number(e.target.value));
              setPaginaAtual(1); // Resetar para primeira página
            }}
          >
            {[10, 25, 50, 100].map(qtd => (
              <option key={qtd} value={qtd}>{qtd}</option>
            ))}
          </select>
          <span className="text-sm text-gray-600">itens por página</span>
        </div>
        
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <span className="text-lg">📈</span>
          Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, paginatedData.pagination.total)} de {paginatedData.pagination.total} resultados
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
            disabled={paginaAtual === 1 || totalPaginas === 1}
            className={(paginaAtual === 1 || totalPaginas === 1)
              ? "border-2 border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed font-medium shadow-none hover:bg-gray-50" 
              : "border-2 border-gray-200 text-gray-700 hover:border-blue-500 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
            }
          >
            <span className="mr-1 text-gray-600 group-hover:text-blue-600 transition-colors">⬅️</span>
            Anterior
          </Button>
          {(() => {
            const startPage = Math.max(1, Math.min(paginaAtual - 2, totalPaginas - 4));
            const endPage = Math.min(totalPaginas, startPage + 4);
            return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
              <Button
                key={page}
                variant={page === paginaAtual ? "default" : "outline"}
                size="sm"
                onClick={() => totalPaginas > 1 ? setPaginaAtual(page) : undefined}
                disabled={totalPaginas === 1}
                className={page === paginaAtual 
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg font-semibold" 
                  : totalPaginas === 1
                  ? "border-2 border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed font-medium shadow-none hover:bg-gray-50"
                  : "border-2 border-gray-200 text-gray-700 hover:border-blue-500 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
                }
              >
                {page}
              </Button>
            ));
          })()}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
            disabled={paginaAtual === totalPaginas || totalPaginas === 1}
            className={(paginaAtual === totalPaginas || totalPaginas === 1)
              ? "border-2 border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed font-medium shadow-none hover:bg-gray-50"
              : "border-2 border-gray-200 text-gray-700 hover:border-blue-500 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
            }
          >
            Próximo
            <span className="ml-1 text-gray-600 group-hover:text-blue-600 transition-colors">➡️</span>
          </Button>
        </div>
        </div>
      )}

      {/* Modais */}
      {/* Modal de confirmação de exclusão */}
      <ConfirmDeleteModal
        open={agendamentoExcluindo !== null && showSimpleDeleteModal}
        onClose={cancelarExclusao}
        onConfirm={handleDelete}
        entityName={agendamentoExcluindo?.pacienteNome || ''}
        entityType="agendamento"
        isLoading={deleteLoading}
        loadingText="Excluindo..."
        confirmText="Excluir Agendamento"
      />

      <ConfirmDeleteAgendamentoModal
        open={showDeleteSeriesModal && agendamentoExcluindo !== null}
        onClose={cancelarExclusao}
        onConfirmSingle={handleDelete}
        onConfirmSeries={handleDeleteSeries}
        onConfirmThisAndFuture={futureCount > 0 ? handleDeleteThisAndFuture : undefined}
        isLoading={deleteLoading}
        entityName={agendamentoExcluindo?.pacienteNome || ''}
        seriesCount={seriesCount}
        futureCount={futureCount}
      />

      {/* Modal unificado de agendamento */}
      <AgendamentoModal
        isOpen={showAgendamentoModal}
        onClose={handleFecharAgendamentoModal}
        onSuccess={handleSuccessAgendamento}
      />

      <DetalhesAgendamentoModal
        isOpen={showDetalhesAgendamento}
        agendamento={agendamentoDetalhes}
        onClose={() => {
          setShowDetalhesAgendamento(false);
          setAgendamentoDetalhes(null);
        }}
      />

      {/* Modal de edição de agendamento */}
      <EditarAgendamentoModal
        isOpen={showEditarAgendamento}
        agendamento={agendamentoEdicao}
        onClose={() => {
          setShowEditarAgendamento(false);
          setAgendamentoEdicao(null);
        }}
        onSuccess={handleSuccessEdicao}
      />

      {/* Modal de confirmação de cancelamento */}
      <ConfirmacaoModal
        open={showCancelarModal}
        onClose={cancelarOperacao}
        onConfirm={confirmarCancelamento}
        title="Cancelar Agendamento"
        description={
          agendamentoCancelando
            ? `Tem certeza que deseja cancelar o agendamento de ${agendamentoCancelando.pacienteNome} em ${formatarDataHoraLocal(agendamentoCancelando.dataHoraInicio).data}?`
            : ''
        }
        confirmText="Sim, Cancelar"
        cancelText="Não"
        isLoading={cancelLoading}
        loadingText="Cancelando..."
        variant="warning"
      />

      {/* Modal de alteração de status (quando já está cancelado) */}
      <Dialog open={showAlterarStatusModal} onOpenChange={(isOpen) => !isOpen && !cancelLoading && cancelarOperacao()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Status do Agendamento</DialogTitle>
            <DialogDescription>
              Este agendamento já está cancelado. Selecione o novo status desejado.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Novo Status
            </label>
            <SingleSelectDropdown
              options={statusOptions}
              selected={novoStatus}
              onChange={setNovoStatus}
              placeholder="Selecione o novo status..."
              headerText="Selecione o status"
              disabled={cancelLoading}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelarOperacao}
              disabled={cancelLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarAlteracaoStatus}
              disabled={cancelLoading || !novoStatus}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {cancelLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 