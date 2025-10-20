import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { AdvancedFilter, type FilterField } from '@/components/ui/advanced-filter';
import {
  Stethoscope,
  Clock,
  Users,
  Calendar,
  FileText,
  CreditCard,
  Search,
  LayoutGrid,
  List,
  CheckCircle2,
  Filter,
  FilterX,
  X,
  Eye,
  ClipboardList,
  CheckSquare,
  UserCheck,
  PenTool,
  UserCheck2,
  AlertCircle,
  Check,
  Video
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Agendamento } from '@/types/Agendamento';
import { getAgendamentos, updateCompareceu, updateAssinaturaPaciente, updateAssinaturaProfissional } from '@/services/agendamentos';
import { AtenderAgendamentoModal, DetalhesAgendamentoModal } from '@/components/agendamentos';
import ConfirmacaoModal from '@/components/ConfirmacaoModal';
import EvolucaoPacientesModal from '@/pages/pacientes/EvolucaoPacientesModal';
import { getPacientes } from '@/services/pacientes';
import { getEvolucaoByAgendamento, getStatusEvolucoesPorAgendamentos } from '@/services/evolucoes';
import { getConvenios } from '@/services/convenios';
import { getServicos } from '@/services/servicos';
import { getProfissionais } from '@/services/profissionais';
import type { Paciente } from '@/types/Paciente';
import type { EvolucaoPaciente } from '@/types/EvolucaoPaciente';
import type { Convenio } from '@/types/Convenio';
import type { Servico } from '@/types/Servico';
import type { Profissional } from '@/types/Profissional';
import api from '@/services/api';
import { AppToast } from '@/services/toast';
import { useAuthStore } from '@/store/auth';
import { formatarDataHoraLocal } from '@/utils/dateUtils';
import { useMultipleConfiguracoesAtenderPage } from '@/hooks/useConfiguracoesAtenderPage';
import { useBreakpoint } from '@/hooks/useInfiniteScroll';
import { useViewMode } from '@/hooks/useViewMode';

// Opções estáticas (movidas para fora do componente)
const tipoAtendimentoOptions = [
  { id: 'presencial', nome: 'Presencial' },
  { id: 'online', nome: 'Online' }
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
  }
];

export const AtenderPage = () => {
  const { user } = useAuthStore();

  // Detecta breakpoint para definir visualização padrão
  const { isDesktop } = useBreakpoint(); // isDesktop = xl ou 2xl (>= 1280px)

  // Limpa localStorage se não for desktop (garante que não tenha 'table' salvo)
  useEffect(() => {
    if (!isDesktop) {
      localStorage.removeItem('atender-view');
    }
  }, [isDesktop]);

  // Hook de visualização - Cards para < 1280px (FORÇADO), Tabela para >= 1280px (persistível)
  const { viewMode, setViewMode } = useViewMode({
    defaultMode: isDesktop ? 'table' : 'cards',
    persistMode: isDesktop, // Só persiste quando for desktop
    localStorageKey: 'atender-view'
  });

  // FORÇA cards quando não for desktop (< 1280px)
  useEffect(() => {
    if (!isDesktop && viewMode !== 'cards') {
      setViewMode('cards');
    }
  }, [isDesktop, viewMode, setViewMode]);

  // FORÇA table quando for desktop (>= 1280px) e não houver preferência salva
  useEffect(() => {
    if (isDesktop && viewMode !== 'table' && !localStorage.getItem('atender-view')) {
      setViewMode('table');
    }
  }, [isDesktop, viewMode, setViewMode]);

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para controle de permissões RBAC
  const [accessDenied, setAccessDenied] = useState(false);
  const [canAtender, setCanAtender] = useState(true);
  const [canViewEvolucoes, setCanViewEvolucoes] = useState(true);
  const [canCreateEvolucoes, setCanCreateEvolucoes] = useState(true);
  const [canUpdateEvolucoes, setCanUpdateEvolucoes] = useState(true);
  const [canDeleteEvolucoes, setCanDeleteEvolucoes] = useState(true);
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [showAtenderAgendamento, setShowAtenderAgendamento] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);
  const [showDetalhesAgendamento, setShowDetalhesAgendamento] = useState(false);
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState<Agendamento | null>(null);
  const [showEvolucaoModal, setShowEvolucaoModal] = useState(false);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacientesCarregados, setPacientesCarregados] = useState(false);
  const [agendamentoParaEvolucao, setAgendamentoParaEvolucao] = useState<Agendamento | null>(null);
  const [evolucaoExistente, setEvolucaoExistente] = useState<EvolucaoPaciente | null>(null);
  const [evolucoesMap, setEvolucoesMap] = useState<Map<string, boolean>>(new Map());
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalResultados, setTotalResultados] = useState(0); // filtrado
  const [totalGlobal, setTotalGlobal] = useState(0); // sem filtros adicionais
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Estados para os modais de confirmação
  const [showCompareceuModal, setShowCompareceuModal] = useState(false);
  const [showAssinaturaPacienteModal, setShowAssinaturaPacienteModal] = useState(false);
  const [showAssinaturaProfissionalModal, setShowAssinaturaProfissionalModal] = useState(false);
  const [agendamentoParaAtualizar, setAgendamentoParaAtualizar] = useState<Agendamento | null>(null);
  const [isLoadingUpdate, setIsLoadingUpdate] = useState(false);
  
  // Estados para modal de validação de finalização
  const [showValidacaoFinalizacaoModal, setShowValidacaoFinalizacaoModal] = useState(false);
  const [problemasFinalizacao, setProblemasFinalizacao] = useState<string[]>([]);

  // Estados para os filtros do AdvancedFilter
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [filtrosAplicados, setFiltrosAplicados] = useState<Record<string, string>>({});

  // Função helper para renderizar indicador de status nos botões
  const renderStatusIndicator = (status: boolean | null | undefined, isEnabled: boolean = true) => {
    // Se o botão está desabilitado, não mostrar indicador
    if (!isEnabled) {
      return null;
    }

    if (status === true) {
      return (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </div>
      );
    } else if (status === false) {
      return (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <X className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </div>
      );
    }
    return null;
  };

  // Função helper específica para indicador de evolução
  const renderEvolucaoIndicator = (temEvolucao: boolean | undefined, isEnabled: boolean = true) => {
    // Se o botão está desabilitado, não mostrar indicador
    if (!isEnabled) {
      return null;
    }

    // Para evolução: só mostra indicador verde se tem evolução (true)
    // Se não tem evolução (false), não mostra indicador (botão original)
    if (temEvolucao === true) {
      return (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </div>
      );
    }
    
    // Para false ou undefined, não mostra indicador
    return null;
  };

  // Estado para controle de inicialização (mesmo padrão da AgendamentosPage)
  const [initialized, setInitialized] = useState(false);

  // Hook para configurações por convênio e tipo de atendimento
  const agendamentosInfo = useMemo(() => {
    return agendamentos.map(agendamento => ({
      id: agendamento.id,
      convenioId: agendamento.convenioId,
      tipoAtendimento: agendamento.tipoAtendimento
    }));
  }, [agendamentos]);

  const { 
    configuracoesMap, 
    loading: loadingConfiguracoes 
  } = useMultipleConfiguracoesAtenderPage(agendamentosInfo);

  // Função helper para obter configurações de um agendamento específico
  const getConfiguracoesPorAgendamento = useCallback((agendamento: Agendamento) => {
    return configuracoesMap.get(agendamento.id) || {
      evolucao: true,
      compareceu: true,
      assinatura_paciente: true,
      assinatura_profissional: true,
    };
  }, [configuracoesMap]);

  // Função helper para verificar se as configurações estão carregando para um agendamento
  const isConfiguracoesLoading = useCallback((agendamento: Agendamento) => {
    return loadingConfiguracoes && !configuracoesMap.has(agendamento.id);
  }, [loadingConfiguracoes, configuracoesMap]);

  // Inicialização única (mesmo padrão da AgendamentosPage)
  useEffect(() => {
    checkPermissions();
    carregarAgendamentos();
    setInitialized(true);
  }, []);

  // Recarregamento quando dependências mudam (mas apenas após inicialização)
  useEffect(() => {
    if (initialized) {
      carregarAgendamentos();
    }
  }, [paginaAtual, itensPorPagina, filtrosAplicados, buscaDebounced]);

  // Debounce da busca para evitar muitas chamadas à API
  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(busca);
    }, 500); // 500ms de debounce
    
    return () => clearTimeout(timer);
  }, [busca]);

  // Reset de página quando busca/filtros/limite mudarem
  useEffect(() => {
    setPaginaAtual(1);
  }, [buscaDebounced, itensPorPagina, filtrosAplicados]);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Verificar apenas a permissão específica desta página
      const canAtender = allowedRoutes.some((route: any) => {
        return route.path === '/agendamentos-atender/:id' && route.method.toLowerCase() === 'put';
      });
      
      // Verificar permissões de evolução
      const canViewEvolucoes = allowedRoutes.some((route: any) => {
        return route.path === '/evolucoes' && route.method.toLowerCase() === 'get';
      });
      
      const canCreateEvolucoes = allowedRoutes.some((route: any) => {
        return route.path === '/evolucoes' && route.method.toLowerCase() === 'post';
      });
      
      const canUpdateEvolucoes = allowedRoutes.some((route: any) => {
        return route.path === '/evolucoes/:id' && route.method.toLowerCase() === 'put';
      });
      
      const canDeleteEvolucoes = allowedRoutes.some((route: any) => {
        return route.path === '/evolucoes/:id' && route.method.toLowerCase() === 'delete';
      });
      
      setCanAtender(canAtender);
      setCanViewEvolucoes(canViewEvolucoes);
      setCanCreateEvolucoes(canCreateEvolucoes);
      setCanUpdateEvolucoes(canUpdateEvolucoes);
      setCanDeleteEvolucoes(canDeleteEvolucoes);
      
      // Se não tem permissão de atendimento, marca como access denied
      if (!canAtender) {
        setAccessDenied(true);
      }
      
    } catch (error: any) {
      // Em caso de erro, desabilita tudo por segurança
      setCanAtender(false);
      setCanViewEvolucoes(false);
      setCanCreateEvolucoes(false);
      setCanUpdateEvolucoes(false);
      setCanDeleteEvolucoes(false);
      
      // Se retornar 401/403 no endpoint de permissões, considera acesso negado
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };

  const carregarAgendamentos = async () => {
    // Não verifica canRead aqui pois a verificação é apenas para a permissão de atendimento
    setLoading(true);
    setAgendamentos([]); // Limpa agendamentos para evitar mostrar dados antigos
    try {
      // Buscar pela API já paginada e filtrada por status
      let profissionalIdFiltro: string | undefined;
      if (user?.roles?.includes('PROFISSIONAL')) {
        try {
          const profissionalResponse = await api.get('/profissionais/me');
          profissionalIdFiltro = profissionalResponse.data.id;
        } catch (profissionalError) {
          console.error('Erro ao buscar dados do profissional:', profissionalError);
          AppToast.error('Erro ao carregar dados do profissional', {
            description: 'Não foi possível carregar os agendamentos do profissional.'
          });
        }
      }

      const dados = await getAgendamentos({
        page: paginaAtual,
        limit: itensPorPagina,
        status: 'LIBERADO',
        ...(buscaDebounced ? { search: buscaDebounced } : {}),
        ...(filtrosAplicados.dataInicio ? { dataInicio: filtrosAplicados.dataInicio } : {}),
        ...(filtrosAplicados.dataFim ? { dataFim: filtrosAplicados.dataFim } : {}),
        ...(filtrosAplicados.tipoAtendimento ? { tipoAtendimento: filtrosAplicados.tipoAtendimento } : {}),
        ...(filtrosAplicados.convenioId ? { convenioId: filtrosAplicados.convenioId } : {}),
        ...(filtrosAplicados.servicoId ? { servicoId: filtrosAplicados.servicoId } : {}),
        ...(filtrosAplicados.pacienteId ? { pacienteId: filtrosAplicados.pacienteId } : {}),
        ...(filtrosAplicados.profissionalId && !profissionalIdFiltro ? { profissionalId: filtrosAplicados.profissionalId } : {}),
        ...(profissionalIdFiltro ? { profissionalId: profissionalIdFiltro } : {}),
      });

      setAgendamentos(dados.data);
      const totalFiltrado = dados.pagination.total || 0;
      setTotalResultados(totalFiltrado);
      // Usar totais das consultas já feitas (evita chamadas extras à API)
      // Removida a chamada extra - usar dados já calculados
      setTotalGlobal(totalFiltrado); // Usar o mesmo total já calculado
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setAccessDenied(true);
        // Não mostra toast aqui pois o interceptor já cuida disso
      } else {
        AppToast.error('Erro ao carregar agendamentos', {
          description: 'Ocorreu um problema ao carregar a lista de agendamentos. Tente novamente.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFiltros(prev => ({ ...prev, [field]: value }));
  };

  const aplicarFiltros = () => {
    setFiltrosAplicados(filtros);
    setPaginaAtual(1);
  };

  const limparFiltros = () => {
    setFiltros({});
    setFiltrosAplicados({});
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

  // Com a busca via API, apenas ordenamos os dados recebidos
  const agendamentosFiltrados = agendamentos
    .filter(a => a.status === 'LIBERADO')
    .sort((a, b) => {
      // Ordenação personalizada: Data > Hora > Paciente
      
      // 1. Extrair data e hora de cada agendamento
      const [dataA, horaA] = a.dataHoraInicio.split('T');
      const [dataB, horaB] = b.dataHoraInicio.split('T');
      
      // 2. Comparar primeiro por data
      const comparacaoData = dataA.localeCompare(dataB);
      if (comparacaoData !== 0) {
        return comparacaoData;
      }
      
      // 3. Se datas iguais, comparar por hora
      const comparacaoHora = horaA.localeCompare(horaB);
      if (comparacaoHora !== 0) {
        return comparacaoHora;
      }
      
      // 4. Se data e hora iguais, comparar por nome do paciente
      return (a.pacienteNome || '').localeCompare(b.pacienteNome || '', 'pt-BR', { 
        sensitivity: 'base' 
      });
    });

  // Usar paginação da API
  const totalPaginas = Math.ceil(totalResultados / itensPorPagina);
  const agendamentosPaginados = agendamentosFiltrados;

  // Carregar evoluções quando os agendamentos, filtros ou paginação mudarem
  useEffect(() => {
    if (agendamentosFiltrados.length > 0) {
      carregarEvolucoes(agendamentosFiltrados);
    }
  }, [agendamentos, buscaDebounced, filtros, paginaAtual, itensPorPagina]);

  const formatarDataHora = formatarDataHoraLocal;

  const handleVerDetalhes = (agendamento: Agendamento) => {
    setAgendamentoDetalhes(agendamento);
    setShowDetalhesAgendamento(true);
  };

  const handleAbrirProntuario = async (agendamento: Agendamento) => {
    setAgendamentoParaEvolucao(agendamento);
    
    // Carregar pacientes apenas quando necessário
    await carregarPacientes();
    
    const temEvolucao = evolucoesMap.get(agendamento.id) === true;
    
    if (!temEvolucao) {
      // Já sabemos pelo batch que não existe evolução → abrir em modo criação sem chamar API
      setEvolucaoExistente(null);
      setShowEvolucaoModal(true);
      return;
    }

    try {
      // Somente busca detalhes se o batch indicou que existe evolução
      const evolucaoEncontrada = await getEvolucaoByAgendamento(agendamento.id);
      setEvolucaoExistente(evolucaoEncontrada);
    } catch (_err) {
      // Evitar logs no console; abre como criação se houver qualquer problema
      setEvolucaoExistente(null);
    } finally {
      setShowEvolucaoModal(true);
    }
  };

  const carregarPacientes = async () => {
    // Se os pacientes já foram carregados, não carregar novamente
    if (pacientesCarregados) return;
    
    try {
      const dados = await getPacientes();
      setPacientes(dados);
      setPacientesCarregados(true);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      AppToast.error('Erro ao carregar pacientes');
    }
  };

  const carregarEvolucoes = async (agendamentos: Agendamento[]) => {
    try {
      const ids = agendamentos.map(a => a.id);
      if (ids.length === 0) {
        setEvolucoesMap(new Map());
        return;
      }
      const resultados = await getStatusEvolucoesPorAgendamentos(ids);
      const novoMap = new Map<string, boolean>();
      resultados.forEach(({ agendamentoId, temEvolucao }) => {
        novoMap.set(agendamentoId, temEvolucao);
      });
      setEvolucoesMap(novoMap);
    } catch (error) {
      console.error('Erro ao carregar evoluções:', error);
      // fallback: marca todos como false para não quebrar UI
      const fallbackMap = new Map<string, boolean>();
      agendamentos.forEach(a => fallbackMap.set(a.id, false));
      setEvolucoesMap(fallbackMap);
    }
  };

  // Handlers para os novos campos
  const handleCompareceu = (agendamento: Agendamento) => {
    setAgendamentoParaAtualizar(agendamento);
    setShowCompareceuModal(true);
  };

  const handleAssinaturaPaciente = (agendamento: Agendamento) => {
    setAgendamentoParaAtualizar(agendamento);
    setShowAssinaturaPacienteModal(true);
  };

  const handleAssinaturaProfissional = (agendamento: Agendamento) => {
    setAgendamentoParaAtualizar(agendamento);
    setShowAssinaturaProfissionalModal(true);
  };

  // Handlers para cancelar (apenas fechar modal sem salvar)
  const handleCancelCompareceu = () => {
    setShowCompareceuModal(false);
    setAgendamentoParaAtualizar(null);
  };

  const handleCancelAssinaturaPaciente = () => {
    setShowAssinaturaPacienteModal(false);
    setAgendamentoParaAtualizar(null);
  };

  const handleCancelAssinaturaProfissional = () => {
    setShowAssinaturaProfissionalModal(false);
    setAgendamentoParaAtualizar(null);
  };

  const handleConfirmCompareceu = async (compareceu: boolean | null) => {
    if (!agendamentoParaAtualizar) return;

    setIsLoadingUpdate(true);
    try {
      await updateCompareceu(agendamentoParaAtualizar.id, compareceu);
      AppToast.success(compareceu ? 'Comparecimento confirmado!' : 'Comparecimento marcado como NÃO', {
        description: `Status de comparecimento atualizado com sucesso.`
      });
      carregarAgendamentos(); // Recarregar a lista
    } catch (error) {
      AppToast.error('Erro ao atualizar comparecimento', {
        description: 'Ocorreu um erro ao salvar as alterações. Tente novamente.'
      });
    } finally {
      setIsLoadingUpdate(false);
      setShowCompareceuModal(false);
      setAgendamentoParaAtualizar(null);
    }
  };

  const handleConfirmAssinaturaPaciente = async (assinou: boolean | null) => {
    if (!agendamentoParaAtualizar) return;

    setIsLoadingUpdate(true);
    try {
      await updateAssinaturaPaciente(agendamentoParaAtualizar.id, assinou);
      AppToast.success(assinou ? 'Assinatura do paciente confirmada!' : 'Assinatura do paciente marcada como NÃO', {
        description: `Status da assinatura atualizado com sucesso.`
      });
      carregarAgendamentos(); // Recarregar a lista
    } catch (error) {
      AppToast.error('Erro ao atualizar assinatura do paciente', {
        description: 'Ocorreu um erro ao salvar as alterações. Tente novamente.'
      });
    } finally {
      setIsLoadingUpdate(false);
      setShowAssinaturaPacienteModal(false);
      setAgendamentoParaAtualizar(null);
    }
  };

  const handleConfirmAssinaturaProfissional = async (assinou: boolean | null) => {
    if (!agendamentoParaAtualizar) return;

    setIsLoadingUpdate(true);
    try {
      await updateAssinaturaProfissional(agendamentoParaAtualizar.id, assinou);
      AppToast.success(assinou ? 'Sua assinatura confirmada!' : 'Sua assinatura marcada como NÃO', {
        description: `Status da assinatura atualizado com sucesso.`
      });
      carregarAgendamentos(); // Recarregar a lista
    } catch (error) {
      AppToast.error('Erro ao atualizar assinatura profissional', {
        description: 'Ocorreu um erro ao salvar as alterações. Tente novamente.'
      });
    } finally {
      setIsLoadingUpdate(false);
      setShowAssinaturaProfissionalModal(false);
      setAgendamentoParaAtualizar(null);
    }
  };

  // Função para validar se pode finalizar o atendimento
  const validarFinalizacaoAtendimento = (agendamento: Agendamento): { podeFinalizarAtendimento: boolean; problemas: string[] } => {
    const problemas: string[] = [];
    const configuracoes = getConfiguracoesPorAgendamento(agendamento);
    
    // Verificar evolução - apenas se estiver habilitada nas configurações
    if (configuracoes.evolucao) {
      const temEvolucao = evolucoesMap.get(agendamento.id) === true;
      if (!temEvolucao) {
        problemas.push('• Evolução não foi registrada');
      }
    }
    
    // Verificar comparecimento - apenas se estiver habilitado nas configurações
    if (configuracoes.compareceu) {
      if (agendamento.compareceu === null || agendamento.compareceu === undefined) {
        problemas.push('• Status de comparecimento não foi definido');
      }
    }
    
    // Verificar assinatura do paciente - apenas se estiver habilitada nas configurações
    if (configuracoes.assinatura_paciente) {
      if (agendamento.assinaturaPaciente !== true) {
        problemas.push('• Paciente não assinou a guia');
      }
    }
    
    // Verificar assinatura do profissional - apenas se estiver habilitada nas configurações
    if (configuracoes.assinatura_profissional) {
      if (agendamento.assinaturaProfissional !== true) {
        problemas.push('• Profissional não assinou a guia');
      }
    }
    
    return {
      podeFinalizarAtendimento: problemas.length === 0,
      problemas
    };
  };

  // Handler modificado para o botão Finalizar Atendimento
  const handleAtender = (agendamento: Agendamento) => {
    const { podeFinalizarAtendimento, problemas } = validarFinalizacaoAtendimento(agendamento);
    
    if (podeFinalizarAtendimento) {
      // Pode finalizar - abrir modal normal
      setAgendamentoSelecionado(agendamento);
      setShowAtenderAgendamento(true);
    } else {
      // Não pode finalizar - mostrar problemas
      setProblemasFinalizacao(problemas);
      setShowValidacaoFinalizacaoModal(true);
    }
  };

  const renderCardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {agendamentosPaginados.length === 0 ? (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
          <Stethoscope className="w-12 h-12 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            Nenhum agendamento liberado para atendimento
          </h3>
          <p className="text-sm">
            {(busca || temFiltrosAtivos) ? 'Tente alterar os filtros de busca.' : 'Aguardando agendamentos liberados.'}
          </p>
        </div>
      ) : (
        agendamentosPaginados.map(agendamento => {
          const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);
          
          return (
            <Card key={agendamento.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Stethoscope className="w-4 h-4 flex-shrink-0 text-blue-600" />
                    <CardTitle className="text-sm font-medium truncate">{agendamento.pacienteNome}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {typeof agendamento.numeroSessao === 'number' && (
                      <Badge className={`text-xs font-bold ${
                        agendamento.numeroSessao === 1
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}>
                        Sessão #{agendamento.numeroSessao}
                      </Badge>
                    )}
                    <Badge className={`text-xs flex-shrink-0 ml-2 ${
                      agendamento.status === 'LIBERADO'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {agendamento.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-3 pb-3">
                <div className="space-y-1 mb-3">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Users className="w-3 h-3" />
                    <span className="truncate">{agendamento.profissionalNome}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <CreditCard className="w-3 h-3" />
                    <span className="truncate">{agendamento.convenioNome}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <FileText className="w-3 h-3" />
                    <span className="truncate">{agendamento.servicoNome}</span>
                    {typeof agendamento.numeroSessao === 'number' && (
                      <Badge className={`text-[10px] font-bold ${
                        agendamento.numeroSessao === 1
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}>
                        Sessão #{agendamento.numeroSessao}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar className="w-3 h-3" />
                    <span>{data} - {hora}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {agendamento.tipoAtendimento}
                    </Badge>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-1.5">
                  {agendamento.tipoAtendimento === 'online' && agendamento.urlMeet && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(agendamento.urlMeet!, '_blank', 'noopener,noreferrer')}
                      className="group border-2 border-cyan-300 text-cyan-600 hover:bg-cyan-600 hover:text-white hover:border-cyan-600 focus:ring-4 focus:ring-cyan-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                      title="Entrar no Google Meet"
                    >
                      <Video className="w-4 h-4 text-cyan-600 group-hover:text-white transition-colors" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                    onClick={() => handleVerDetalhes(agendamento)}
                    title="Visualizar Agendamento"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                    {canViewEvolucoes ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        disabled={!getConfiguracoesPorAgendamento(agendamento).evolucao}
                        className={`group border-2 border-purple-300 text-purple-600 hover:bg-purple-600 hover:text-white hover:border-purple-600 focus:ring-4 focus:ring-purple-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform relative ${!getConfiguracoesPorAgendamento(agendamento).evolucao ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={getConfiguracoesPorAgendamento(agendamento).evolucao ? () => handleAbrirProntuario(agendamento) : undefined}
                        title={getConfiguracoesPorAgendamento(agendamento).evolucao ? "Prontuário" : "Prontuário desabilitado para este convênio"}
                      >
                        <ClipboardList className="w-4 h-4 text-purple-600 group-hover:text-white transition-colors" />
                        {renderEvolucaoIndicator(evolucoesMap.get(agendamento.id), getConfiguracoesPorAgendamento(agendamento).evolucao)}
                      </Button>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-block">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 text-gray-400 opacity-50 cursor-not-allowed"
                                disabled={true}
                                title="Sem permissão para visualizar evoluções"
                              >
                                <ClipboardList className="w-4 h-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Você não tem permissão para visualizar evoluções de pacientes</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={!getConfiguracoesPorAgendamento(agendamento).compareceu}
                      className={`group border-2 border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform relative ${!getConfiguracoesPorAgendamento(agendamento).compareceu ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={getConfiguracoesPorAgendamento(agendamento).compareceu ? () => handleCompareceu(agendamento) : undefined}
                      title={getConfiguracoesPorAgendamento(agendamento).compareceu ? "Marcar comparecimento" : "Comparecimento desabilitado para este convênio"}
                    >
                      <UserCheck className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
                      {renderStatusIndicator(agendamento.compareceu, getConfiguracoesPorAgendamento(agendamento).compareceu)}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={!getConfiguracoesPorAgendamento(agendamento).assinatura_paciente}
                      className={`group border-2 border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white hover:border-orange-600 focus:ring-4 focus:ring-orange-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform relative ${!getConfiguracoesPorAgendamento(agendamento).assinatura_paciente ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={getConfiguracoesPorAgendamento(agendamento).assinatura_paciente ? () => handleAssinaturaPaciente(agendamento) : undefined}
                      title={getConfiguracoesPorAgendamento(agendamento).assinatura_paciente ? "Assinatura do paciente" : "Assinatura do paciente desabilitada para este convênio"}
                    >
                      <PenTool className="w-4 h-4 text-orange-600 group-hover:text-white transition-colors" />
                      {renderStatusIndicator(agendamento.assinaturaPaciente, getConfiguracoesPorAgendamento(agendamento).assinatura_paciente)}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={!getConfiguracoesPorAgendamento(agendamento).assinatura_profissional}
                      className={`group border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 focus:ring-4 focus:ring-indigo-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform relative ${!getConfiguracoesPorAgendamento(agendamento).assinatura_profissional ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={getConfiguracoesPorAgendamento(agendamento).assinatura_profissional ? () => handleAssinaturaProfissional(agendamento) : undefined}
                      title={getConfiguracoesPorAgendamento(agendamento).assinatura_profissional ? "Sua assinatura" : "Sua assinatura desabilitada para este convênio"}
                    >
                      <UserCheck2 className="w-4 h-4 text-indigo-600 group-hover:text-white transition-colors" />
                      {renderStatusIndicator(agendamento.assinaturaProfissional, getConfiguracoesPorAgendamento(agendamento).assinatura_profissional)}
                    </Button>
                    {canAtender ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="group border-2 border-green-300 text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600 focus:ring-4 focus:ring-green-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleAtender(agendamento)}
                        title="Finalizar Atendimento"
                      >
                        <CheckSquare className="w-4 h-4 text-green-600 group-hover:text-white transition-colors" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={true}
                        className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                        title="Você não tem permissão para finalizar atendimentos"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </Button>
                    )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );

  const renderTableView = () => (
    <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  Data - Hora
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
                  <span className="text-lg">🔢</span>
                  Sessão
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
              <TableCell colSpan={6} className="py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🩺</span>
                  </div>
                  <p className="text-gray-500 font-medium">
                    {(busca || temFiltrosAtivos) ? 'Nenhum resultado encontrado' : 'Nenhum agendamento para atendimento'}
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
                    <span className="text-sm font-mono bg-gradient-to-r from-gray-100 to-blue-100 px-3 py-1 rounded text-gray-700">{data} - {hora}</span>
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
                    <span className="text-sm">{agendamento.profissionalNome}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm">{agendamento.servicoNome}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    {typeof agendamento.numeroSessao === 'number' ? (
                      <Badge className={`text-xs font-bold ${
                        agendamento.numeroSessao === 1
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}>
                        Sessão #{agendamento.numeroSessao}
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <div className="flex justify-end gap-1">
                      {/* Botão Meet para agendamentos online */}
                      {agendamento.tipoAtendimento === 'online' && agendamento.urlMeet && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(agendamento.urlMeet!, '_blank', 'noopener,noreferrer')}
                          className="border-blue-300 text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                          title="Entrar no Google Meet"
                        >
                          📹
                        </Button>
                      )}
                      
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleVerDetalhes(agendamento)}
                        title="Visualizar Agendamento"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canViewEvolucoes ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!getConfiguracoesPorAgendamento(agendamento).evolucao}
                          className={`group border-2 border-purple-300 text-purple-600 hover:bg-purple-600 hover:text-white hover:border-purple-600 focus:ring-4 focus:ring-purple-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform relative ${!getConfiguracoesPorAgendamento(agendamento).evolucao ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={getConfiguracoesPorAgendamento(agendamento).evolucao ? () => handleAbrirProntuario(agendamento) : undefined}
                          title={getConfiguracoesPorAgendamento(agendamento).evolucao ? "Evolução" : "Evolução desabilitada para este convênio"}
                        >
                          <ClipboardList className="w-4 h-4 text-purple-600 group-hover:text-white transition-colors" />
                          {renderEvolucaoIndicator(evolucoesMap.get(agendamento.id), getConfiguracoesPorAgendamento(agendamento).evolucao)}
                        </Button>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 border-gray-300 text-gray-400 opacity-50 cursor-not-allowed"
                                  disabled={true}
                                  title="Sem permissão para visualizar evoluções"
                                >
                                  <ClipboardList className="w-4 h-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Você não tem permissão para visualizar evoluções de pacientes</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!getConfiguracoesPorAgendamento(agendamento).compareceu}
                        className={`group border-2 border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform relative ${!getConfiguracoesPorAgendamento(agendamento).compareceu ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={getConfiguracoesPorAgendamento(agendamento).compareceu ? () => handleCompareceu(agendamento) : undefined}
                        title={getConfiguracoesPorAgendamento(agendamento).compareceu ? "Marcar comparecimento" : "Comparecimento desabilitado para este convênio"}
                      >
                        <UserCheck className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
                        {renderStatusIndicator(agendamento.compareceu, getConfiguracoesPorAgendamento(agendamento).compareceu)}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!getConfiguracoesPorAgendamento(agendamento).assinatura_paciente}
                        className={`group border-2 border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white hover:border-orange-600 focus:ring-4 focus:ring-orange-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform relative ${!getConfiguracoesPorAgendamento(agendamento).assinatura_paciente ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={getConfiguracoesPorAgendamento(agendamento).assinatura_paciente ? () => handleAssinaturaPaciente(agendamento) : undefined}
                        title={getConfiguracoesPorAgendamento(agendamento).assinatura_paciente ? "Assinatura do paciente" : "Assinatura do paciente desabilitada para este convênio"}
                      >
                        <PenTool className="w-4 h-4 text-orange-600 group-hover:text-white transition-colors" />
                        {renderStatusIndicator(agendamento.assinaturaPaciente, getConfiguracoesPorAgendamento(agendamento).assinatura_paciente)}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!getConfiguracoesPorAgendamento(agendamento).assinatura_profissional}
                        className={`group border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 focus:ring-4 focus:ring-indigo-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform relative ${!getConfiguracoesPorAgendamento(agendamento).assinatura_profissional ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={getConfiguracoesPorAgendamento(agendamento).assinatura_profissional ? () => handleAssinaturaProfissional(agendamento) : undefined}
                        title={getConfiguracoesPorAgendamento(agendamento).assinatura_profissional ? "Sua assinatura" : "Sua assinatura desabilitada para este convênio"}
                      >
                        <UserCheck2 className="w-4 h-4 text-indigo-600 group-hover:text-white transition-colors" />
                        {renderStatusIndicator(agendamento.assinaturaProfissional, getConfiguracoesPorAgendamento(agendamento).assinatura_profissional)}
                      </Button>
                      {canAtender ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-green-300 text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600 focus:ring-4 focus:ring-green-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => handleAtender(agendamento)}
                          title="Finalizar Atendimento"
                        >
                          <CheckSquare className="w-4 h-4 text-green-600 group-hover:text-white transition-colors" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={true}
                          className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                          title="Você não tem permissão para finalizar atendimentos"
                        >
                          <CheckSquare className="w-4 h-4" />
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
    <div className="pt-2 pl-6 pr-6 h-full flex flex-col">
      {/* Indicador de loading das configurações */}
      {loadingConfiguracoes && (
        <div className="sticky top-0 z-50 bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="flex items-center justify-center gap-2 text-blue-700 text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            Carregando configurações por convênio...
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white backdrop-blur border-b border-gray-200 mb-6 px-6 py-4 rounded-lg gap-4 transition-shadow">
        {/* Layout responsivo: 3 linhas < 640px, 2 linhas 640-1023px, 1 linha >= 1024px */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          {/* Primeira linha: Título (mobile < 640) | Título + Busca (>= 640) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
            <div className="flex-shrink-0">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 lg:gap-3">
                <span className="text-3xl lg:text-4xl">🩺</span>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Atendimentos
                </span>
              </h1>
            </div>

            {/* Busca - segunda linha em mobile (< 640), primeira linha em sm+ */}
            <div className="relative w-full sm:flex-1 sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar agendamentos..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Segunda linha: Controles */}
          <div className="flex items-center justify-center lg:justify-end gap-1.5 lg:gap-4 flex-wrap">

            {/* Toggle de visualização */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={`h-7 lg:h-8 px-2 lg:px-3 ${viewMode === 'table' ? 'bg-white shadow-sm' : ''}`}
                title="Visualização em Tabela"
              >
                <List className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <span className="ml-1 2xl:inline hidden">Tabela</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('cards')}
                className={`h-7 lg:h-8 px-2 lg:px-3 ${viewMode === 'cards' ? 'bg-white shadow-sm' : ''}`}
                title="Visualização em Cards"
              >
                <LayoutGrid className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <span className="ml-1 2xl:inline hidden">Cards</span>
              </Button>
            </div>

            {/* Botão Filtros Avançados */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className={`h-7 lg:h-8 px-2 lg:px-3 text-xs lg:text-sm ${mostrarFiltros ? 'bg-blue-50 border-blue-300' : ''} ${temFiltrosAtivos ? 'border-blue-500 bg-blue-50' : ''}`}
              title="Filtros Avançados"
            >
              <Filter className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span className="ml-1.5 lg:ml-2 2xl:inline hidden">Filtros</span>
              {temFiltrosAtivos && (
                <Badge variant="secondary" className="ml-1.5 lg:ml-2 h-3.5 lg:h-4 px-1 text-xs">
                  {Object.values(filtrosAplicados).filter(f => f !== '').length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

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

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-100">
        {viewMode === 'cards' ? renderCardView() : renderTableView()}
      </div>

      {/* Paginação */}
      {agendamentosFiltrados.length > 0 && (
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
          Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, totalResultados)} de {totalResultados} resultados
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
      <AtenderAgendamentoModal
        isOpen={showAtenderAgendamento}
        agendamento={agendamentoSelecionado}
        onClose={() => {
          setShowAtenderAgendamento(false);
          setAgendamentoSelecionado(null);
        }}
        onSuccess={carregarAgendamentos}
      />

      <DetalhesAgendamentoModal
        isOpen={showDetalhesAgendamento}
        agendamento={agendamentoDetalhes}
        onClose={() => {
          setShowDetalhesAgendamento(false);
          setAgendamentoDetalhes(null);
        }}
      />

      <EvolucaoPacientesModal
        open={showEvolucaoModal}
        onClose={() => {
          setShowEvolucaoModal(false);
          setAgendamentoParaEvolucao(null);
          setEvolucaoExistente(null);
        }}
        onSuccess={() => {
          // Atualizar o mapa de evoluções para refletir a mudança
          if (agendamentoParaEvolucao) {
            setEvolucoesMap(prev => {
              const novoMap = new Map(prev);
              novoMap.set(agendamentoParaEvolucao.id, true);
              return novoMap;
            });
          }
        }}
        onDeleted={(agendamentoId) => {
          setEvolucoesMap(prev => {
            const novoMap = new Map(prev);
            novoMap.set(agendamentoId, false);
            return novoMap;
          });
        }}
        pacientes={pacientes}
        evolucaoParaEditar={evolucaoExistente}
        agendamentoInicial={agendamentoParaEvolucao}
        canCreate={canCreateEvolucoes}
        canUpdate={canUpdateEvolucoes}
        canDelete={canDeleteEvolucoes}
      />

      {/* Modais de confirmação para os novos campos */}
      <ConfirmacaoModal
        open={showCompareceuModal}
        onClose={handleCancelCompareceu}
        onCancel={() => handleConfirmCompareceu(false)}
        onConfirm={() => handleConfirmCompareceu(true)}
        title="Confirmação de Comparecimento"
        description="O paciente compareceu?"
        confirmText="SIM"
        cancelText="NÃO"
        isLoading={isLoadingUpdate}
        loadingText="Salvando..."
        variant="default"
        icon={<UserCheck className="w-6 h-6" />}
      />

      <ConfirmacaoModal
        open={showAssinaturaPacienteModal}
        onClose={handleCancelAssinaturaPaciente}
        onCancel={() => handleConfirmAssinaturaPaciente(false)}
        onConfirm={() => handleConfirmAssinaturaPaciente(true)}
        title="Assinatura do Paciente"
        description="O paciente assinou a guia referente ao atendimento?"
        confirmText="SIM"
        cancelText="NÃO"
        isLoading={isLoadingUpdate}
        loadingText="Salvando..."
        variant="default"
        icon={<PenTool className="w-6 h-6" />}
      />

      <ConfirmacaoModal
        open={showAssinaturaProfissionalModal}
        onClose={handleCancelAssinaturaProfissional}
        onCancel={() => handleConfirmAssinaturaProfissional(false)}
        onConfirm={() => handleConfirmAssinaturaProfissional(true)}
        title="Assinatura do Profissional"
        description="Você (profissional) assinou a guia referente ao atendimento?"
        confirmText="SIM"
        cancelText="NÃO"
        isLoading={isLoadingUpdate}
        loadingText="Salvando..."
        variant="default"
        icon={<UserCheck2 className="w-6 h-6" />}
      />

      {/* Modal de validação para finalização de atendimento */}
      <ConfirmacaoModal
        open={showValidacaoFinalizacaoModal}
        onClose={() => setShowValidacaoFinalizacaoModal(false)}
        onConfirm={() => setShowValidacaoFinalizacaoModal(false)}
        title="Não é possível finalizar o atendimento"
        description={
          <>
            <p className="mb-3">Para finalizar o atendimento, você precisa resolver os seguintes problemas:</p>
            <div className="bg-orange-50 border-l-4 border-orange-400 p-3 mb-3">
              {problemasFinalizacao.map((problema, index) => (
                <p key={index} className="text-sm text-orange-800 mb-1 last:mb-0">
                  {problema}
                </p>
              ))}
            </div>
            <p className="text-sm">Após resolver estes itens, você poderá finalizar o atendimento.</p>
          </>
        }
        confirmText="Entendi"
        cancelText=""
        variant="warning"
        icon={<AlertCircle className="w-6 h-6" />}
      />
    </div>
  );
}; 