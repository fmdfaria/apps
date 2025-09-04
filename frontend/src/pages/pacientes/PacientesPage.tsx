import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Paperclip, Building2, Phone, History, RotateCcw, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppToast } from '@/services/toast';
import { getPacientes, createPaciente, updatePaciente, deletePaciente, togglePacienteStatus } from '@/services/pacientes';
import { getConvenios } from '@/services/convenios';
import { getServicos } from '@/services/servicos';
import type { Paciente } from '@/types/Paciente';
import type { Convenio } from '@/types/Convenio';
import type { Servico } from '@/types/Servico';
import api from '@/services/api';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Modais existentes
import CriarPacienteModal from './CriarPacienteModal';
import EditarPacienteModal from './EditarPacienteModal';
import AnexoPacientesModal from './AnexoPacientesModal';
import PedidosMedicosModal from './PedidosMedicosModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import ConfirmacaoModal from '@/components/ConfirmacaoModal';
import { AgendamentoModal } from '@/components/agendamentos';
import { useConfiguracoesPacientes } from '@/hooks/useConfiguracoesPacientes';

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
import { useMenuPermissions } from '@/hooks/useMenuPermissions';
import { getModuleTheme } from '@/types/theme';
import { formatWhatsAppDisplay, isValidWhatsApp } from '@/utils/whatsapp';
import { getAnexos } from '@/services/anexos';
import type { Anexo } from '@/types/Anexo';

// Formatação centralizada do WhatsApp
const formatWhatsApp = (whatsapp: string) => formatWhatsAppDisplay(whatsapp);

// Função para formatar CPF
const formatCPF = (cpf: string) => {
  if (!cpf) return '';
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length === 11) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
  }
  return cpf;
};

export const PacientesPage = () => {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [canCreate, setCanCreate] = useState(true);
  const [canUpdate, setCanUpdate] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  const [canToggle, setCanToggle] = useState(true);
  const [canViewEvolucoes, setCanViewEvolucoes] = useState(true);
  const [canViewAnexos, setCanViewAnexos] = useState(true);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);

  // Estados dos modais existentes
  const [showCriarModal, setShowCriarModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [editando, setEditando] = useState<Paciente | null>(null);
  const [form, setForm] = useState({
    nomeCompleto: '',
    nomeResponsavel: '',
    cpf: '',
    email: '',
    whatsapp: '',
    dataNascimento: '',
    tipoServico: '',
    convenioId: '',
    numeroCarteirinha: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  
  // Hook para configurações do convênio selecionado
  const { validarFormularioPaciente } = useConfiguracoesPacientes(form.convenioId);

  // Estados para modal de anexo
  const [showAnexoModal, setShowAnexoModal] = useState(false);
  const [pacienteAnexo, setPacienteAnexo] = useState<Paciente | null>(null);
  const [anexoFiles, setAnexoFiles] = useState<File[]>([]);
  const [anexoDescricao, setAnexoDescricao] = useState('');
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [anexoError, setAnexoError] = useState('');
  const [anexoToDelete, setAnexoToDelete] = useState<Anexo | null>(null);
  const [deletingAnexo, setDeletingAnexo] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estados para modal de pedidos médicos
  const [showPedidosModal, setShowPedidosModal] = useState(false);
  const [pacientePedidos, setPacientePedidos] = useState<Paciente | null>(null);
  
  const [excluindo, setExcluindo] = useState<Paciente | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Estados para confirmação de agendamento após criação de paciente
  const [showConfirmAgendamento, setShowConfirmAgendamento] = useState(false);
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  const [pacienteCriado, setPacienteCriado] = useState<Paciente | null>(null);

  // Máscara passou a ser responsabilidade do componente WhatsAppInput nos modais

  // Hooks responsivos
  const { viewMode, setViewMode } = useViewMode({ defaultMode: 'table', persistMode: true, localStorageKey: 'pacientes-view' });
  
  
  // Hook de permissões
  const { hasPermission } = useMenuPermissions();
  
  // Configuração das colunas da tabela
  const columns: TableColumn<Paciente>[] = [
    {
      key: 'nomeCompleto',
      header: '👤 Nome',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'Nome do paciente...',
        label: 'Nome'
      },
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {item.nomeCompleto.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium">{item.nomeCompleto}</span>
        </div>
      )
    },
    {
      key: 'whatsapp',
      header: '📱 WhatsApp',
      essential: true,
      filterable: {
        type: 'text',
        placeholder: 'WhatsApp do paciente...',
        label: 'WhatsApp'
      },
      render: (item) => (
        <span className="text-sm font-mono bg-green-100 px-2 py-1 rounded text-green-700">
          {item.whatsapp ? formatWhatsApp(item.whatsapp) : '-'}
        </span>
      )
    },
    {
      key: 'tipoServico',
      header: '💼 Tipo Serviço',
      essential: true,
      filterable: {
        type: 'select',
        options: [
          { value: 'Particular', label: 'Particular' },
          { value: 'Convênio', label: 'Convênio' }
        ],
        label: 'Tipo de Serviço'
      },
      render: (item) => (
        <Badge 
          variant="outline" 
          className={`text-xs ${
            item.tipoServico === 'Convênio' 
              ? 'bg-rose-50 text-rose-700 border-rose-200' 
              : 'bg-pink-50 text-pink-700 border-pink-200'
          }`}
        >
          {item.tipoServico || 'Particular'}
        </Badge>
      )
    },
    {
      key: 'convenio',
      header: '🏥 Convênio',
      essential: false,
      filterable: {
        type: 'text',
        placeholder: 'Nome do convênio...',
        label: 'Convênio'
      },
      render: (item) => {
        return (
          <span className="text-sm">
            {item.convenio?.nome || '-'}
          </span>
        );
      }
    },
    {
      key: 'status',
      header: '📊 Status',
      essential: true,
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
      render: (item) => {
        return (
        <div className="flex gap-1.5">
          {/* Botão Editar */}
          {canUpdate ? (
            <ActionButton
              variant="view"
              module="pacientes"
              onClick={() => abrirModalEditar(item)}
              title="Editar dados do paciente"
            >
              <Edit className="w-4 h-4" />
            </ActionButton>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-gray-300 text-gray-400 cursor-not-allowed"
                    disabled
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para editar pacientes</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Botão Anexos - exige GET /pacientes */}
          {canViewAnexos ? (
            <ActionButton
              variant="view"
              module="pacientes"
              onClick={() => abrirModalAnexo(item)}
              title="Gerenciar anexos"
            >
              <Paperclip className="w-4 h-4" />
            </ActionButton>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-gray-300 text-gray-400 cursor-not-allowed"
                    disabled
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para visualizar anexos</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Botão Evolução - sempre visível */}
          {canViewEvolucoes ? (
            <ActionButton
              variant="view"
              module="pacientes"
              onClick={() => navigate(`/pacientes/evolucoes/${item.id}`)}
              title="Evolução do paciente"
            >
              <History className="w-4 h-4" />
            </ActionButton>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-gray-300 text-gray-400 cursor-not-allowed"
                    disabled
                  >
                    <History className="w-4 h-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para visualizar evoluções</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Botão Pedidos Médicos */}
          {canUpdate ? (
            <ActionButton
              variant="view"
              module="pacientes"
              onClick={() => abrirModalPedidos(item)}
              title="Pedidos médicos"
            >
              <Building2 className="w-4 h-4" />
            </ActionButton>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-gray-300 text-gray-400 cursor-not-allowed"
                    disabled
                  >
                    <Building2 className="w-4 h-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para editar pedidos médicos</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Botão Toggle - sempre visível */}
          {canToggle ? (
            <ActionButton
              variant={item.ativo === true ? "delete" : "view"}
              module="pacientes"
              onClick={() => handleToggleStatus(item.id, !item.ativo)}
              title={item.ativo === true ? "Inativar paciente" : "Ativar paciente"}
            >
              <RotateCcw className="w-4 h-4" />
            </ActionButton>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-gray-300 text-gray-400 cursor-not-allowed"
                    disabled
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para alterar status</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Botão Delete - sempre visível */}
          {canDelete ? (
            <ActionButton
              variant="delete"
              module="pacientes"
              onClick={() => setExcluindo(item)}
              title="Excluir paciente"
            >
              <Trash2 className="w-4 h-4" />
            </ActionButton>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-gray-300 text-gray-400 cursor-not-allowed"
                    disabled
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para excluir pacientes</p>
              </TooltipContent>
            </Tooltip>
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
  const pacientesFiltrados = useMemo(() => {
    // Função para normalizar texto
    const normalizarBusca = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const normalizarTelefone = (tel: string) => tel.replace(/\D/g, '');

    // Primeiro aplicar busca textual
    let dadosFiltrados = pacientes.filter(p => {
      if (busca.trim() === '') return true;
      
      const buscaNormalizada = normalizarBusca(busca);
      const nome = normalizarBusca(p.nomeCompleto);
      const nomeResponsavel = normalizarBusca(p.nomeResponsavel || '');
      const buscaNumeros = busca.replace(/\D/g, '');
      
      let match = false;
      
      if (buscaNormalizada.length > 0) {
        match = nome.includes(buscaNormalizada) || nomeResponsavel.includes(buscaNormalizada);
      }
      
      if (buscaNumeros.length > 0) {
        const whatsapp = normalizarTelefone(p.whatsapp || '');
        match = match || whatsapp.includes(buscaNumeros);
      }
      
      return match;
    }).sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR', { sensitivity: 'base' }));
    
    // Depois aplicar filtros dinâmicos
    return applyFilters(dadosFiltrados);
  }, [pacientes, busca, applyFilters]);

  const {
    data: pacientesPaginados,
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
  } = useResponsiveTable(pacientesFiltrados, 10);

  useEffect(() => {
    fetchData();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Verificar cada permissão específica para pacientes
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/pacientes' && route.method.toLowerCase() === 'get';
      });
      
      const canCreate = allowedRoutes.some((route: any) => {
        return route.path === '/pacientes' && route.method.toLowerCase() === 'post';
      });
      
      const canUpdate = allowedRoutes.some((route: any) => {
        return route.path === '/pacientes/:id' && route.method.toLowerCase() === 'put';
      });
      
      const canToggle = allowedRoutes.some((route: any) => {
        return route.path === '/pacientes/:id/status' && route.method.toLowerCase() === 'patch';
      });

      const canDelete = allowedRoutes.some((route: any) => {
        return route.path === '/pacientes/:id' && route.method.toLowerCase() === 'delete';
      });

      const canViewEvolucoes = allowedRoutes.some((route: any) => {
        return route.path === '/evolucoes' && route.method.toLowerCase() === 'get';
      });
      
      setCanCreate(canCreate);
      setCanUpdate(canUpdate);
      setCanToggle(canToggle);
      setCanDelete(canDelete);
      setCanViewEvolucoes(canViewEvolucoes);
      setCanViewAnexos(canRead);
      
      // Se não tem nem permissão de leitura, marca como access denied
      if (!canRead) {
        setAccessDenied(true);
      }
      
    } catch (error: any) {
      // Em caso de erro, desabilita tudo por segurança
      setCanCreate(false);
      setCanUpdate(false);
      setCanToggle(false);
      setCanDelete(false);
      setCanViewEvolucoes(false);
      setCanViewAnexos(false);
      
      // Se retornar 401/403 no endpoint de permissões, considera acesso negado
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setAccessDenied(false);
    setPacientes([]); // Limpa dados para evitar mostrar dados antigos
    try {
      const [pacientesData, conveniosData, servicosData] = await Promise.all([
        getPacientes(),
        getConvenios(),
        getServicos()
      ]);
      
      setPacientes(pacientesData);
      setConvenios(conveniosData);
      setServicos(servicosData);
    } catch (error: any) {
      if (error?.response?.status === 403) {
        setAccessDenied(true);
        // Buscar informações da rota para mensagem mais específica
        try {
          const info = await getRouteInfo('/pacientes', 'GET');
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

  const handleToggleStatus = async (id: string, ativo: boolean) => {
    try {
      await togglePacienteStatus(id, ativo);
      AppToast.success(ativo ? 'Paciente ativado' : 'Paciente inativado');
      fetchData();
    } catch (error: any) {
      if (error?.response?.status === 403) return;
      AppToast.error('Erro ao alterar status do paciente');
    }
  };

  // Funções dos modais existentes
  const abrirModalNovo = () => {
    setEditando(null);
    setForm({ nomeCompleto: '', nomeResponsavel: '', cpf: '', email: '', whatsapp: '', dataNascimento: '', tipoServico: '', convenioId: '', numeroCarteirinha: '' });
    setFormError('');
    setShowCriarModal(true);
  };

  const abrirModalEditar = async (p: Paciente) => {
    setEditando(p);
    setForm({
      nomeCompleto: p.nomeCompleto || '',
      nomeResponsavel: p.nomeResponsavel || '',
      cpf: p.cpf || '',
      email: p.email || '',
      whatsapp: p.whatsapp || '',
      dataNascimento: p.dataNascimento ? p.dataNascimento.substring(0, 10) : '',
      tipoServico: p.tipoServico || 'Particular',
      convenioId: p.convenioId || '',
      numeroCarteirinha: p.numeroCarteirinha || '',
    });
    setFormError('');
    setShowEditarModal(true);
  };

  const fecharCriarModal = () => {
    setShowCriarModal(false);
    setEditando(null);
    setForm({ nomeCompleto: '', nomeResponsavel: '', cpf: '', email: '', whatsapp: '', dataNascimento: '', tipoServico: '', convenioId: '', numeroCarteirinha: '' });
    setFormError('');
  };

  const fecharEditarModal = () => {
    setShowEditarModal(false);
    setEditando(null);
    setForm({ nomeCompleto: '', nomeResponsavel: '', cpf: '', email: '', whatsapp: '', dataNascimento: '', tipoServico: '', convenioId: '', numeroCarteirinha: '' });
    setFormError('');
  };

  const handleFormChange = (updates: Partial<typeof form>) => {
    setForm(f => ({ ...f, ...updates }));
  };

  const abrirModalAnexo = async (p: Paciente) => {
    setPacienteAnexo(p);
    setAnexoFiles([]);
    setAnexoDescricao('');
    setAnexoError('');
    setAnexos([]);
    setShowAnexoModal(true);
    // Buscar anexos reais
    try {
      const anexosDb = await getAnexos(p.id, 'pacientes');
      setAnexos(Array.isArray(anexosDb) ? anexosDb.filter((a: any) => !a.bucket || a.bucket === 'pacientes') : []);
    } catch (e) {
      setAnexos([]);
    }
  };

  const fecharModalAnexo = () => {
    setShowAnexoModal(false);
    setPacienteAnexo(null);
    setAnexoFiles([]);
    setAnexoDescricao('');
    setAnexoError('');
    setAnexos([]);
  };

  const abrirModalPedidos = async (p: Paciente) => {
    setPacientePedidos(p);
    setShowPedidosModal(true);
  };

  const fecharModalPedidos = () => {
    setShowPedidosModal(false);
    setPacientePedidos(null);
  };

  // Handlers para confirmação de agendamento
  const handleConfirmarAgendamento = () => {
    setShowConfirmAgendamento(false);
    setShowAgendamentoModal(true);
  };

  const handleRecusarAgendamento = () => {
    setShowConfirmAgendamento(false);
    setPacienteCriado(null);
  };

  const handleFecharAgendamentoModal = () => {
    setShowAgendamentoModal(false);
    setPacienteCriado(null);
  };

  const handleSuccessAgendamento = () => {
    setShowAgendamentoModal(false);
    setPacienteCriado(null);
    // Opcionalmente recarregar dados se necessário
  };

  // Renderização do card
  const renderCard = (paciente: Paciente) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {paciente.nomeCompleto.charAt(0).toUpperCase()}
            </div>
            <CardTitle className="text-sm font-medium truncate">{paciente.nomeCompleto}</CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs ml-2 flex-shrink-0 ${
              paciente.tipoServico === 'Convênio' 
                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                : 'bg-pink-50 text-pink-700 border-pink-200'
            }`}
          >
            {paciente.tipoServico || 'Particular'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-1 gap-2 text-xs">
            {paciente.nomeResponsavel && (
              <div className="flex items-center gap-1">
                <span>👤</span>
                <span className="text-gray-600">{paciente.nomeResponsavel}</span>
              </div>
            )}
            
            {paciente.whatsapp && (
              <div className="flex items-center gap-1">
                <span>📱</span>
                <span className="font-mono bg-green-100 px-1 py-0.5 rounded text-green-700">
                  {formatWhatsApp(paciente.whatsapp)}
                </span>
              </div>
            )}

            
            {paciente.convenio && (
              <div className="flex items-center gap-1">
                <span>🏥</span>
                <span className="text-blue-600 font-medium">{paciente.convenio.nome}</span>
              </div>
            )}
            
          </div>
        </div>
      </CardContent>
      
      <ResponsiveCardFooter>
        <ActionButton
          variant="view"
          module="pacientes"
          onClick={() => abrirModalEditar(paciente)}
          title="Editar dados do paciente"
        >
          <Edit className="w-4 h-4" />
        </ActionButton>
        {canViewAnexos ? (
          <ActionButton
            variant="view"
            module="pacientes"
            onClick={() => abrirModalAnexo(paciente)}
            title="Gerenciar anexos"
          >
            <Paperclip className="w-4 h-4" />
          </ActionButton>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-gray-300 text-gray-400 cursor-not-allowed"
                  disabled
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Você não tem permissão para visualizar anexos</p>
            </TooltipContent>
          </Tooltip>
        )}
        {canViewEvolucoes ? (
          <ActionButton
            variant="view"
            module="pacientes"
            onClick={() => navigate(`/pacientes/evolucoes/${paciente.id}`)}
            title="Evolução do paciente"
          >
            <History className="w-4 h-4" />
          </ActionButton>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-gray-300 text-gray-400 cursor-not-allowed"
                  disabled
                >
                  <History className="w-4 h-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Você não tem permissão para visualizar evoluções</p>
            </TooltipContent>
          </Tooltip>
        )}
        {canUpdate ? (
          <ActionButton
            variant="view"
            module="pacientes"
            onClick={() => abrirModalPedidos(paciente)}
            title="Pedidos médicos"
          >
            <Building2 className="w-4 h-4" />
          </ActionButton>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-gray-300 text-gray-400 cursor-not-allowed"
                  disabled
                >
                  <Building2 className="w-4 h-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Você não tem permissão para editar pedidos médicos</p>
            </TooltipContent>
          </Tooltip>
        )}
        {canToggle ? (
          <ActionButton
            variant={paciente.ativo === true ? "delete" : "view"}
            module="pacientes"
            onClick={() => handleToggleStatus(paciente.id, !paciente.ativo)}
            title={paciente.ativo === true ? "Inativar paciente" : "Ativar paciente"}
          >
            <RotateCcw className="w-4 h-4" />
          </ActionButton>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-gray-300 text-gray-400 cursor-not-allowed"
                  disabled
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Você não tem permissão para alterar status</p>
            </TooltipContent>
          </Tooltip>
        )}
        {canDelete ? (
          <ActionButton
            variant="delete"
            module="pacientes"
            onClick={() => setExcluindo(paciente)}
            title="Excluir paciente"
          >
            <Trash2 className="w-4 h-4" />
          </ActionButton>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-gray-300 text-gray-400 cursor-not-allowed"
                  disabled
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Você não tem permissão para excluir pacientes</p>
            </TooltipContent>
          </Tooltip>
        )}
      </ResponsiveCardFooter>
    </Card>
  );

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deletePaciente(excluindo.id);
      AppToast.deleted('Paciente', `O paciente "${excluindo.nomeCompleto}" foi excluído permanentemente.`);
      setExcluindo(null);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      
      if (error?.response?.status === 403) {
        // Erro de permissão será tratado pelo interceptor
        return;
      }
      
      let title = 'Erro ao excluir paciente';
      let description = 'Não foi possível excluir o paciente. Tente novamente ou entre em contato com o suporte.';
      
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

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando pacientes...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <TooltipProvider>
    <PageContainer>
      {/* Header da página */}
      <PageHeader title="Pacientes" module="pacientes" icon="👥">
        <SearchBar
          placeholder="Buscar por nome ou WhatsApp..."
          value={busca}
          onChange={setBusca}
          module="pacientes"
        />
        
        <FilterButton
          showFilters={mostrarFiltros}
          onToggleFilters={() => setMostrarFiltros(prev => !prev)}
          activeFiltersCount={activeFiltersCount}
          module="pacientes"
          disabled={filterConfigs.length === 0}
        />
        
        <ViewToggle 
          viewMode={viewMode} 
          onViewModeChange={setViewMode} 
          module="pacientes"
        />
        
        {canCreate ? (
          <Button 
            className={`!h-10 bg-gradient-to-r ${getModuleTheme('pacientes').primaryButton} ${getModuleTheme('pacientes').primaryButtonHover} shadow-lg hover:shadow-xl transition-all duration-200 font-semibold`}
            onClick={abrirModalNovo}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Paciente
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Button 
                  className={`!h-10 bg-gradient-to-r ${getModuleTheme('pacientes').primaryButton} ${getModuleTheme('pacientes').primaryButtonHover} shadow-lg hover:shadow-xl transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={true}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Paciente
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Você não tem permissão para criar pacientes</p>
            </TooltipContent>
          </Tooltip>
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
          module="pacientes"
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
                <p>Você não tem permissão para visualizar pacientes</p>
              )}
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <ResponsiveTable 
            data={pacientesPaginados}
            columns={columns}
            module="pacientes"
            emptyMessage="Nenhum paciente encontrado"
            isLoadingMore={isLoadingMore}
            hasNextPage={hasNextPage}
            isMobile={isMobile}
            scrollRef={targetRef}
          />
        ) : (
          <ResponsiveCards 
            data={pacientesPaginados}
            renderCard={renderCard}
            emptyMessage="Nenhum paciente encontrado"
            emptyIcon="👥"
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
          module="pacientes"
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {/* Modais existentes */}
      {/* Modal de Criação */}
      <CriarPacienteModal
        showModal={showCriarModal}
        editando={null}
        form={form}
        formError={formError}
        formLoading={formLoading}
        onClose={fecharCriarModal}
        onSubmit={async (e) => {
          e.preventDefault();
          
          // Validação - Nome Completo, WhatsApp e Tipo de Serviço são obrigatórios no frontend
          if (!form.nomeCompleto.trim() || form.nomeCompleto.trim().length < 2) {
            AppToast.error('Erro de Validação', {
              description: 'O Nome Completo deve ter pelo menos 2 caracteres.'
            });
            return;
          }
          
          if (!form.whatsapp.trim()) {
            AppToast.error('Erro de Validação', {
              description: 'O WhatsApp é obrigatório.'
            });
            return;
          }
          
          if (!form.tipoServico.trim()) {
            AppToast.error('Erro de Validação', {
              description: 'O Tipo de Serviço é obrigatório.'
            });
            return;
          }
          
          // Validar convênio quando tipo de serviço é "Convênio"
          if (form.tipoServico === 'Convênio' && !form.convenioId.trim()) {
            AppToast.error('Erro de Validação', {
              description: 'O Convênio é obrigatório quando o Tipo de Serviço é Convênio.'
            });
            return;
          }
          
          // Validar campos obrigatórios baseados no convênio selecionado
          const { isValid, errors } = validarFormularioPaciente(form);
          
          if (!isValid) {
            AppToast.error('Campos obrigatórios', {
              description: errors.join(' ')
            });
            return;
          }
          
          // Validar telefone internacional (E.164 dígitos; DDI + DDD + número)
          if (!isValidWhatsApp(form.whatsapp.trim())) {
            AppToast.error('Erro de Validação', {
              description: 'WhatsApp inválido. Exemplos: +55 (11) 99999-9999, +55 (11) 9999-9999, +1 (250) 999-9999'
            });
            return;
          }
          
          // Validar formato do CPF apenas se estiver preenchido
          if (form.cpf.trim() && form.cpf.length < 14) {
            AppToast.error('Erro de Validação', {
              description: 'CPF inválido. Exemplo: xxx.xxx.xxx-xx.'
            });
            return;
          }
          
          // Validar formato do email apenas se estiver preenchido
          if (form.email.trim() && !form.email.includes('@')) {
            AppToast.error('Erro de Validação', {
              description: 'E-mail inválido. Exemplo: nome@email.com'
            });
            return;
          }

          setFormLoading(true);
          setFormError('');
          const whatsappNumeros = form.whatsapp.replace(/\D/g, '');
          const pacientePayload: any = {
            nomeCompleto: form.nomeCompleto.trim().replace(/\s+/g, ' '),
            nomeResponsavel: form.nomeResponsavel.trim() || null,
            cpf: form.cpf.trim() || null,
            email: form.email.trim() || null,
            whatsapp: whatsappNumeros,
            dataNascimento: form.dataNascimento || null,
            tipoServico: form.tipoServico,
            convenioId: form.convenioId.trim() || null,
            numeroCarteirinha: form.numeroCarteirinha.trim() || null,
          };

          try {
            const novoPaciente = await createPaciente(pacientePayload);
            AppToast.created('Paciente', 'O novo paciente foi cadastrado com sucesso.');
            await fetchData();
            fecharCriarModal();
            
            // Mostrar confirmação para agendar
            setPacienteCriado(novoPaciente);
            setShowConfirmAgendamento(true);
          } catch (err: any) {
            let msg = 'Erro ao salvar paciente.';
            if (err?.response?.data?.message) msg = err.response.data.message;
            else if (err?.response?.data?.error) msg = err.response.data.error;
            setFormError(msg);
          } finally {
            setFormLoading(false);
          }
        }}
        onFormChange={handleFormChange}
        convenios={convenios}
      />

      {/* Modal de Edição */}
      <EditarPacienteModal
        showModal={showEditarModal}
        editando={editando}
        form={form}
        formError={formError}
        formLoading={formLoading}
        onClose={fecharEditarModal}
        onSubmit={async (e) => {
          e.preventDefault();
          
          // Validação - Nome Completo, WhatsApp e Tipo de Serviço são obrigatórios no frontend
          if (!form.nomeCompleto.trim() || form.nomeCompleto.trim().length < 2) {
            AppToast.error('Erro de Validação', {
              description: 'O Nome Completo deve ter pelo menos 2 caracteres.'
            });
            return;
          }
          
          if (!form.whatsapp.trim()) {
            AppToast.error('Erro de Validação', {
              description: 'O WhatsApp é obrigatório.'
            });
            return;
          }
          
          if (!form.tipoServico.trim()) {
            AppToast.error('Erro de Validação', {
              description: 'O Tipo de Serviço é obrigatório.'
            });
            return;
          }
          
          // Validar telefone internacional
          if (!isValidWhatsApp(form.whatsapp.trim())) {
            AppToast.error('Erro de Validação', {
              description: 'WhatsApp inválido. Exemplos: +55 (11) 99999-9999, +55 (11) 9999-9999, +1 (250) 999-9999'
            });
            return;
          }
          
          if (form.email.trim() && !form.email.includes('@')) {
            AppToast.error('Erro de Validação', {
              description: 'E-mail inválido. Exemplo: nome@email.com'
            });
            return;
          }

          // Validar convênio quando tipo de serviço é "Convênio"
          if (form.tipoServico === 'Convênio' && !form.convenioId.trim()) {
            AppToast.error('Erro de Validação', {
              description: 'O Convênio é obrigatório quando o Tipo de Serviço é Convênio.'
            });
            return;
          }
          
          // Validar campos obrigatórios baseados no convênio selecionado
          const { isValid, errors } = validarFormularioPaciente(form);
          
          if (!isValid) {
            AppToast.error('Campos obrigatórios', {
              description: errors.join(' ')
            });
            return;
          }

          setFormLoading(true);
          setFormError('');
          const whatsappNumeros = form.whatsapp.replace(/\D/g, '');
          const pacientePayload: any = {
            nomeCompleto: form.nomeCompleto.trim().replace(/\s+/g, ' '),
            nomeResponsavel: form.nomeResponsavel.trim() || null,
            cpf: form.cpf.trim() || null,
            email: form.email.trim() || null,
            whatsapp: whatsappNumeros,
            dataNascimento: form.dataNascimento || null,
            tipoServico: form.tipoServico,
            convenioId: form.convenioId.trim() || null,
            numeroCarteirinha: form.numeroCarteirinha.trim() || null,
          };

          try {
            if (editando) {
              await updatePaciente(editando.id, pacientePayload);
              AppToast.updated('Paciente', 'Os dados do paciente foram atualizados com sucesso.');
              await fetchData();
              fecharEditarModal();
            }
          } catch (err: any) {
            let msg = 'Erro ao salvar paciente.';
            if (err?.response?.data?.message) msg = err.response.data.message;
            else if (err?.response?.data?.error) msg = err.response.data.error;
            setFormError(msg);
          } finally {
            setFormLoading(false);
          }
        }}
        onFormChange={handleFormChange}
        convenios={convenios}
      />
      
      <AnexoPacientesModal
        showModal={showAnexoModal}
        paciente={pacienteAnexo}
        anexoFiles={anexoFiles}
        anexoDescricao={anexoDescricao}
        anexos={anexos}
        anexoError={anexoError}
        saving={saving}
        anexoToDelete={anexoToDelete}
        deletingAnexo={deletingAnexo}
        onClose={fecharModalAnexo}
        onAnexoFilesChange={setAnexoFiles}
        onAnexoDescricaoChange={setAnexoDescricao}
        onAnexosChange={setAnexos}
        onAnexoErrorChange={setAnexoError}
        onSavingChange={setSaving}
        onAnexoToDeleteChange={setAnexoToDelete}
        onDeletingAnexoChange={setDeletingAnexo}
      />
      
      <PedidosMedicosModal
        showModal={showPedidosModal}
        paciente={pacientePedidos}
        servicos={servicos}
        onClose={fecharModalPedidos}
      />
      
      {/* Modal de confirmação de exclusão */}
      <ConfirmDeleteModal
        open={!!excluindo}
        onClose={() => setExcluindo(null)}
        onConfirm={handleDelete}
        title="Confirmar Exclusão de Paciente"
        entityName={excluindo?.nomeCompleto || ''}
        entityType="paciente"
        isLoading={deleteLoading}
        loadingText="Excluindo paciente..."
        confirmText="Excluir Paciente"
      />

      {/* Modal de confirmação para agendar */}
      <ConfirmacaoModal
        open={showConfirmAgendamento}
        onClose={handleRecusarAgendamento}
        onConfirm={handleConfirmarAgendamento}
        onCancel={handleRecusarAgendamento}
        title="Paciente Cadastrado!"
        description={`O paciente "${pacienteCriado?.nomeCompleto}" foi cadastrado com sucesso. Deseja criar um agendamento para este paciente agora?`}
        confirmText="Sim, Agendar"
        cancelText="Não, Continuar"
        variant="default"
        icon={<Calendar className="w-6 h-6" />}
      />

      {/* Modal de agendamento */}
      <AgendamentoModal
        isOpen={showAgendamentoModal}
        onClose={handleFecharAgendamentoModal}
        onSuccess={handleSuccessAgendamento}
        preenchimentoInicial={pacienteCriado ? {
          pacienteId: pacienteCriado.id,
          convenioId: pacienteCriado.convenioId || undefined,
          tipoFluxo: 'por-profissional'
        } : undefined}
      />
    </PageContainer>
    </TooltipProvider>
  );
};