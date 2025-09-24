import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdvancedFilter, type FilterField } from '@/components/ui/advanced-filter';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  CheckCircle,
  Clock,
  Users,
  Calendar,
  FileText,
  CreditCard,
  Search,
  LayoutGrid,
  List,
  Filter,
  X,
  FilterX,
  Plus,
  Loader2,
  Eye,
  Unlock,
  CheckSquare,
  MessageCircle
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Agendamento } from '@/types/Agendamento';
import { getAgendamentos, updateAgendamento } from '@/services/agendamentos';

import { LiberarAgendamentoModal, DetalhesAgendamentoModal, LiberarParticularModal } from '@/components/agendamentos';
import ConfirmacaoModal from '@/components/ConfirmacaoModal';
import api from '@/services/api';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import { AppToast } from '@/services/toast';
import { formatarDataHoraLocal } from '@/utils/dateUtils';
import { useAuthStore } from '@/store/auth';
import { getConvenios } from '@/services/convenios';
import { getServicos } from '@/services/servicos';
import { getPacientes } from '@/services/pacientes';
import { getProfissionais } from '@/services/profissionais';
import { getPrecosParticulares } from '@/services/precos-particulares';
import type { PrecoParticular } from '@/types/PrecoParticular';

// Interface para item da fila de webhooks
interface WebhookQueueItem {
  agendamento: Agendamento;
  grupo?: AgendamentoAgrupado; // Informações do grupo se for um agendamento mensal
  timestamp: number;
}

// Interface para agendamentos agrupados (mensais)
interface AgendamentoAgrupado {
  id: string; // ID único gerado para o grupo
  pacienteId: string;
  pacienteNome: string;
  servicoId: string;
  servicoNome: string;
  profissionalId: string;
  profissionalNome: string;
  agendamentos: Agendamento[]; // Array dos agendamentos originais
  mesAno: string; // "2024-09" formato para agrupamento
  mesAnoDisplay: string; // "Setembro 2024" para display completo
  mesAnoOtimizado: string; // "Set24" para display otimizado na tabela
  precoUnitario: number;
  precoTotal: number;
  quantidadeAgendamentos: number;
  tipoPagamento: string;
  status: string; // Status comum de todos os agendamentos
  tipoAtendimento: string;
}

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

export const LiberarParticularPage = () => {
  const { user } = useAuthStore();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [precosParticulares, setPrecosParticulares] = useState<PrecoParticular[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para controle de permissões RBAC
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [canLiberar, setCanLiberar] = useState(true);
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('tabela');

  const [showLiberarAgendamento, setShowLiberarAgendamento] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);
  const [grupoSelecionadoParaLiberacao, setGrupoSelecionadoParaLiberacao] = useState<AgendamentoAgrupado | null>(null);
  const [showDetalhesAgendamento, setShowDetalhesAgendamento] = useState(false);
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState<Agendamento | null>(null);
  const [showAgendamentosGrupo, setShowAgendamentosGrupo] = useState(false);
  const [grupoSelecionado, setGrupoSelecionado] = useState<AgendamentoAgrupado | null>(null);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalResultados, setTotalResultados] = useState(0); // filtrado
  const [totalGlobal, setTotalGlobal] = useState(0); // sem filtros adicionais
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [agendamentosProcessando, setAgendamentosProcessando] = useState<Set<string>>(new Set());
  
  // Estados para confirmação de reenvio
  const [showConfirmacaoReenvio, setShowConfirmacaoReenvio] = useState(false);
  const [agendamentoParaReenvio, setAgendamentoParaReenvio] = useState<Agendamento | null>(null);
  const [grupoParaReenvio, setGrupoParaReenvio] = useState<AgendamentoAgrupado | null>(null);

  // Sistema de fila para webhooks
  const [webhookQueue, setWebhookQueue] = useState<WebhookQueueItem[]>([]);
  const [isProcessingWebhook, setIsProcessingWebhook] = useState(false);
  const webhookTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estado para controle de inicialização (mesmo padrão da AgendamentosPage)
  const [initialized, setInitialized] = useState(false);

  // Funções auxiliares para gerenciar processamento paralelo
  const adicionarProcessamento = (agendamentoId: string) => {
    setAgendamentosProcessando(prev => new Set([...prev, agendamentoId]));
  };

  const removerProcessamento = (agendamentoId: string) => {
    setAgendamentosProcessando(prev => {
      const novo = new Set(prev);
      novo.delete(agendamentoId);
      return novo;
    });
  };

  const estaProcessando = (agendamentoId: string) => {
    return agendamentosProcessando.has(agendamentoId);
  };

  // Funções para gerenciar a fila de webhooks
  const adicionarNaFila = (agendamento: Agendamento, grupo?: AgendamentoAgrupado) => {
    const novoItem: WebhookQueueItem = {
      agendamento,
      grupo,
      timestamp: Date.now()
    };
    
    setWebhookQueue(prev => [...prev, novoItem]);
    adicionarProcessamento(agendamento.id);
    
    // O effect useEffect vai cuidar de disparar o processamento
  };

  // Função para processar o próximo webhook na fila
  const processarProximoWebhook = async () => {
    // Verificação dupla para evitar processamento paralelo
    if (isProcessingWebhook) {
      return;
    }

    // Pegar primeiro item da fila sem modificar o estado ainda
    if (webhookQueue.length === 0) {
      return;
    }

    setIsProcessingWebhook(true);
    
    const proximoItem = webhookQueue[0];
    
    try {
      // Aplicar delay de 2 segundos
      const tempoEspera = Math.max(0, 2000 - (Date.now() - proximoItem.timestamp));
      
      if (tempoEspera > 0) {
        await new Promise(resolve => {
          webhookTimeoutRef.current = setTimeout(resolve, tempoEspera);
        });
      }

      // Executar webhook e aguardar sucesso completo
      await executarWebhook(proximoItem.agendamento, proximoItem.grupo);
      
      // Sucesso: remover da fila e do processamento
      setWebhookQueue(prev => prev.slice(1)); // Remove primeiro item
      removerProcessamento(proximoItem.agendamento.id);
      
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      AppToast.error("Erro", { 
        description: `Erro ao enviar solicitação para ${proximoItem.agendamento.pacienteNome}. Tente novamente.` 
      });
      
      // Erro: também remover da fila
      setWebhookQueue(prev => prev.slice(1)); // Remove primeiro item
      removerProcessamento(proximoItem.agendamento.id);
    } finally {
      // Sempre liberar o processamento
      setIsProcessingWebhook(false);
    }
  };

  // Estados para os filtros do AdvancedFilter
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [filtrosAplicados, setFiltrosAplicados] = useState<Record<string, string>>({});

  // Inicialização única (mesmo padrão da AgendamentosPage)
  useEffect(() => {
    checkPermissions();
    carregarAgendamentos();
    carregarPrecosParticulares();
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
  }, [paginaAtual, itensPorPagina, filtrosAplicados, buscaDebounced]);

  // Reset de página quando busca/filtros/limite mudarem
  useEffect(() => {
    setPaginaAtual(1);
  }, [buscaDebounced, itensPorPagina, filtrosAplicados]);


  // Effect para processar fila quando há itens e não está processando
  useEffect(() => {
    // Só executar se há items na fila e não há processamento ativo
    if (webhookQueue.length > 0 && !isProcessingWebhook) {
      const timeoutId = setTimeout(() => {
        // Verificação dupla antes de executar
        if (webhookQueue.length > 0 && !isProcessingWebhook) {
          processarProximoWebhook();
        }
      }, 50); // Pequeno delay para evitar chamadas simultâneas
      
      return () => clearTimeout(timeoutId);
    }
  }, [webhookQueue.length, isProcessingWebhook]);

  // Cleanup do timeout de webhook ao desmontar componente
  useEffect(() => {
    return () => {
      if (webhookTimeoutRef.current) {
        clearTimeout(webhookTimeoutRef.current);
      }
    };
  }, []);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Verificar apenas a permissão específica desta página
      const canLiberar = allowedRoutes.some((route: any) => {
        return route.path === '/agendamentos-liberar/:id' && route.method.toLowerCase() === 'put';
      });
      
      setCanLiberar(canLiberar);
      
      // Se não tem permissão de liberação, marca como access denied
      if (!canLiberar) {
        setAccessDenied(true);
      }
      
    } catch (error: any) {
      // Em caso de erro, desabilita tudo por segurança
      setCanLiberar(false);
      
      // Se retornar 401/403 no endpoint de permissões, considera acesso negado
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };

  const carregarPrecosParticulares = async () => {
    try {
      const precos = await getPrecosParticulares();
      setPrecosParticulares(precos);
    } catch (error) {
      console.error('Erro ao carregar preços particulares:', error);
      // Não mostra erro pois não é crítico para o funcionamento da página
    }
  };

  // Função para encontrar preço baseado em pacienteId e servicoId
  const encontrarPreco = (pacienteId: string, servicoId: string): PrecoParticular | null => {
    return precosParticulares.find(
      preco => preco.pacienteId === pacienteId && preco.servicoId === servicoId
    ) || null;
  };

  // Função para verificar se há preço cadastrado
  const temPrecoCadastrado = (pacienteId: string, servicoId: string): boolean => {
    return encontrarPreco(pacienteId, servicoId) !== null;
  };

  // Componente auxiliar para botões com validação de preço (para Solicitar Liberação)
  const BotaoComValidacaoPreco = ({ 
    pacienteId, 
    servicoId, 
    onClick, 
    disabled = false, 
    className = '', 
    title = '', 
    children,
    variant = 'default' as any
  }: {
    pacienteId: string;
    servicoId: string;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
    title?: string;
    children: React.ReactNode;
    variant?: 'default' | 'outline';
  }) => {
    const haPreco = temPrecoCadastrado(pacienteId, servicoId);
    const precoInfo = encontrarPreco(pacienteId, servicoId);
    const temPagamentoAntecipado = precoInfo?.pagamentoAntecipado === true;
    const isDisabled = disabled || !haPreco || !temPagamentoAntecipado;

    if (!haPreco) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Button
                  variant={variant}
                  disabled={true}
                  className={`${className} opacity-50 cursor-not-allowed`}
                  title="Sem preço cadastrado"
                >
                  {children}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Não é possível liberar um atendimento sem preço particular cadastrado</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (!temPagamentoAntecipado) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Button
                  variant={variant}
                  disabled={true}
                  className={`${className} opacity-50 cursor-not-allowed`}
                  title="Pagamento antecipado não habilitado"
                >
                  {children}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Só é possível solicitar liberação para pagamentos antecipados</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Button
        variant={variant}
        disabled={isDisabled}
        onClick={onClick}
        className={className}
        title={title}
      >
        {children}
      </Button>
    );
  };

  // Componente auxiliar para botões de liberação (apenas valida preço, ignora pagamento antecipado)
  const BotaoComValidacaoPrecoLiberacao = ({ 
    pacienteId, 
    servicoId, 
    onClick, 
    disabled = false, 
    className = '', 
    title = '', 
    children,
    variant = 'default' as any
  }: {
    pacienteId: string;
    servicoId: string;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
    title?: string;
    children: React.ReactNode;
    variant?: 'default' | 'outline';
  }) => {
    const haPreco = temPrecoCadastrado(pacienteId, servicoId);
    const isDisabled = disabled || !haPreco;

    if (!haPreco) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Button
                  variant={variant}
                  disabled={true}
                  className={`${className} opacity-50 cursor-not-allowed`}
                  title="Sem preço cadastrado"
                >
                  {children}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Não é possível liberar um atendimento sem preço particular cadastrado</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Button
        variant={variant}
        disabled={isDisabled}
        onClick={onClick}
        className={className}
        title={title}
      >
        {children}
      </Button>
    );
  };

  // Função para formatar informações de pagamento
  const formatarPagamento = (precoInfo: PrecoParticular | null): string => {
    if (!precoInfo) return '-';
    
    const parts: string[] = [];
    
    // Tipo de pagamento
    if (precoInfo.tipoPagamento) {
      parts.push(precoInfo.tipoPagamento);
    }
    
    // Dia do pagamento
    if (precoInfo.diaPagamento) {
      parts.push(precoInfo.diaPagamento.toString());
    }
    
    // Antecipado
    const antecipado = precoInfo.pagamentoAntecipado ? 'SIM' : 'NÃO';
    parts.push(antecipado);
    
    return parts.length > 0 ? parts.join(' - ') : '-';
  };

  // Função para formatar mês/ano para display
  const formatarMesAno = (mesAno: string): string => {
    const [ano, mes] = mesAno.split('-');
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${meses[parseInt(mes) - 1]} ${ano}`;
  };

  // Função para formatar mês/ano de forma otimizada (ex: Set25)
  const formatarMesAnoOtimizado = (mesAno: string): string => {
    const [ano, mes] = mesAno.split('-');
    const mesesAbrev = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    return `${mesesAbrev[parseInt(mes) - 1]}${ano.slice(-2)}`;
  };

  // Função helper para verificar se um item é agrupado
  const isAgendamentoAgrupado = (item: Agendamento | AgendamentoAgrupado): item is AgendamentoAgrupado => {
    return 'agendamentos' in item;
  };

  // Função para agrupar agendamentos mensais
  const agruparAgendamentos = (agendamentos: Agendamento[]): (Agendamento | AgendamentoAgrupado)[] => {
    const agrupados: { [key: string]: AgendamentoAgrupado } = {};
    const individuais: Agendamento[] = [];

    agendamentos.forEach(agendamento => {
      const precoInfo = encontrarPreco(agendamento.pacienteId, agendamento.servicoId);
      
      // Se não tem preço ou não é mensal, mantém individual
      if (!precoInfo || precoInfo.tipoPagamento !== 'Mensal') {
        individuais.push(agendamento);
        return;
      }

      // Extrair mês/ano da data do agendamento
      const dataAgendamento = new Date(agendamento.dataHoraInicio);
      const mesAno = `${dataAgendamento.getFullYear()}-${String(dataAgendamento.getMonth() + 1).padStart(2, '0')}`;
      
      // Chave única para agrupamento: paciente + serviço + mês/ano
      const chaveAgrupamento = `${agendamento.pacienteId}-${agendamento.servicoId}-${mesAno}`;
      
      
      if (!agrupados[chaveAgrupamento]) {
        // Criar novo grupo
        agrupados[chaveAgrupamento] = {
          id: `grupo-${chaveAgrupamento}`,
          pacienteId: agendamento.pacienteId,
          pacienteNome: agendamento.pacienteNome || 'N/A',
          servicoId: agendamento.servicoId,
          servicoNome: agendamento.servicoNome || 'N/A',
          profissionalId: agendamento.profissionalId,
          profissionalNome: agendamento.profissionalNome || 'N/A',
          agendamentos: [agendamento],
          mesAno,
          mesAnoDisplay: formatarMesAno(mesAno), // Versão completa para modal
          mesAnoOtimizado: formatarMesAnoOtimizado(mesAno), // Versão otimizada para tabela
          precoUnitario: precoInfo.preco,
          precoTotal: precoInfo.preco,
          quantidadeAgendamentos: 1,
          tipoPagamento: precoInfo.tipoPagamento || 'Mensal',
          status: agendamento.status,
          tipoAtendimento: agendamento.tipoAtendimento
        };
      } else {
        // Adicionar ao grupo existente
        agrupados[chaveAgrupamento].agendamentos.push(agendamento);
        agrupados[chaveAgrupamento].quantidadeAgendamentos += 1;
        agrupados[chaveAgrupamento].precoTotal = agrupados[chaveAgrupamento].precoUnitario * agrupados[chaveAgrupamento].quantidadeAgendamentos;
        
        // Atualizar status do grupo: priorizar SOLICITADO > AGENDADO
        if (agendamento.status === 'SOLICITADO' && agrupados[chaveAgrupamento].status !== 'SOLICITADO') {
          agrupados[chaveAgrupamento].status = 'SOLICITADO';
        }
      }
    });

    // Atualizar status final de cada grupo baseado em todos os agendamentos
    Object.values(agrupados).forEach(grupo => {
      const statusAgendamentos = grupo.agendamentos.map(ag => ag.status);
      
      // Se todos estão solicitados, grupo fica SOLICITADO
      // Se todos estão agendados, grupo fica AGENDADO
      // Se tem mix, grupo fica SOLICITADO (status mais avançado)
      if (statusAgendamentos.includes('SOLICITADO')) {
        grupo.status = 'SOLICITADO';
      } else {
        grupo.status = 'AGENDADO';
      }
    });

    // Combinar agrupados e individuais
    const resultado: (Agendamento | AgendamentoAgrupado)[] = [
      ...Object.values(agrupados),
      ...individuais
    ];


    // Ordenar por data (usar primeira data do grupo para agrupados)
    return resultado.sort((a, b) => {
      const dataA = 'agendamentos' in a ? a.agendamentos[0].dataHoraInicio : a.dataHoraInicio;
      const dataB = 'agendamentos' in b ? b.agendamentos[0].dataHoraInicio : b.dataHoraInicio;
      return dataA.localeCompare(dataB);
    });
  };

  const carregarAgendamentos = async () => {
    // Não verifica canRead aqui pois a verificação é apenas para a permissão de liberação
    setLoading(true);
    setAgendamentos([]); // Limpa agendamentos para evitar mostrar dados antigos
    try {
      // Se o usuário for PROFISSIONAL, buscar o ID do profissional
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

      // ID fixo do convênio particular
      const convenioParticularId = 'f4af6586-8b56-4cf3-8b87-d18605cea381';

      // Buscar agendamentos do convênio particular com status AGENDADO e SOLICITADO (sem limit para agrupamento)
      const [agendadosRes, solicitadosRes] = await Promise.all([
        getAgendamentos({ 
          status: 'AGENDADO',
          convenioId: convenioParticularId,
          ...(buscaDebounced ? { search: buscaDebounced } : {}),
          ...(filtrosAplicados.dataInicio ? { dataInicio: filtrosAplicados.dataInicio } : {}),
          ...(filtrosAplicados.dataFim ? { dataFim: filtrosAplicados.dataFim } : {}),
          ...(filtrosAplicados.tipoAtendimento ? { tipoAtendimento: filtrosAplicados.tipoAtendimento } : {}),
          ...(filtrosAplicados.servicoId ? { servicoId: filtrosAplicados.servicoId } : {}),
          ...(filtrosAplicados.pacienteId ? { pacienteId: filtrosAplicados.pacienteId } : {}),
          ...(filtrosAplicados.profissionalId && !profissionalIdFiltro ? { profissionalId: filtrosAplicados.profissionalId } : {}),
          ...(profissionalIdFiltro ? { profissionalId: profissionalIdFiltro } : {}),
        }),
        getAgendamentos({ 
          status: 'SOLICITADO',
          convenioId: convenioParticularId,
          ...(buscaDebounced ? { search: buscaDebounced } : {}),
          ...(filtrosAplicados.dataInicio ? { dataInicio: filtrosAplicados.dataInicio } : {}),
          ...(filtrosAplicados.dataFim ? { dataFim: filtrosAplicados.dataFim } : {}),
          ...(filtrosAplicados.tipoAtendimento ? { tipoAtendimento: filtrosAplicados.tipoAtendimento } : {}),
          ...(filtrosAplicados.servicoId ? { servicoId: filtrosAplicados.servicoId } : {}),
          ...(filtrosAplicados.pacienteId ? { pacienteId: filtrosAplicados.pacienteId } : {}),
          ...(filtrosAplicados.profissionalId && !profissionalIdFiltro ? { profissionalId: filtrosAplicados.profissionalId } : {}),
          ...(profissionalIdFiltro ? { profissionalId: profissionalIdFiltro } : {}),
        }),
      ]);
      
      // Combinar as duas listas
      const lista = [...agendadosRes.data, ...solicitadosRes.data];
      
      console.log('📊 Debug carregamento agendamentos:', {
        agendados: agendadosRes.data.length,
        solicitados: solicitadosRes.data.length,
        total: lista.length,
        exemploSolicitado: solicitadosRes.data[0] ? {
          id: solicitadosRes.data[0].id,
          paciente: solicitadosRes.data[0].pacienteNome,
          status: solicitadosRes.data[0].status,
          servico: solicitadosRes.data[0].servicoNome
        } : 'Nenhum solicitado'
      });
      setAgendamentos(lista);
      const totalFiltrado = agendadosRes.pagination?.total || 0;
      setTotalResultados(totalFiltrado);
      setTotalGlobal(totalFiltrado);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setAccessDenied(true);
        // Buscar informações da rota para mensagem mais específica
        try {
          const info = await getRouteInfo('/agendamentos-liberar/:id', 'PUT');
          setRouteInfo(info);
        } catch (routeError) {
          // Erro ao buscar informações da rota
        }
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

  // Extrair listas únicas para os selects
  const agendadosBase = agendamentos.filter(a => a.status === 'AGENDADO' || a.status === 'SOLICITADO');

  // Processar agendamentos com agrupamento mensal (usando useMemo para aguardar preços)
  const agendamentosFiltrados = useMemo(() => {
    // Incluir agendamentos AGENDADO e SOLICITADO
    const agendadosFiltered = agendamentos.filter(a => a.status === 'AGENDADO' || a.status === 'SOLICITADO');
    
    console.log('🔍 DEBUG: Total agendamentos:', agendadosFiltered.length);
    console.log('🔍 DEBUG: Total preços:', precosParticulares.length);
    
    // Só executa agrupamento se tiver preços carregados
    if (precosParticulares.length === 0) {
      console.log('🔍 DEBUG: Sem preços, retornando todos individuais');
      return agendadosFiltered;
    }
    
    const resultado = agruparAgendamentos(agendadosFiltered);
    
    console.log('🔍 Debug agrupamento final:', {
      agendamentosParaAgrupar: agendadosFiltered.length,
      resultadoAgrupamento: resultado.length,
      grupos: resultado.filter(item => isAgendamentoAgrupado(item)).length,
      individuais: resultado.filter(item => !isAgendamentoAgrupado(item)).length,
      statusDosAgendamentos: agendadosFiltered.map(ag => ({ 
        paciente: ag.pacienteNome, 
        status: ag.status,
        tipoPagamento: encontrarPreco(ag.pacienteId, ag.servicoId)?.tipoPagamento 
      })),
      exemploGrupo: resultado.find(item => isAgendamentoAgrupado(item)) ? {
        id: (resultado.find(item => isAgendamentoAgrupado(item)) as AgendamentoAgrupado).id,
        paciente: (resultado.find(item => isAgendamentoAgrupado(item)) as AgendamentoAgrupado).pacienteNome,
        status: (resultado.find(item => isAgendamentoAgrupado(item)) as AgendamentoAgrupado).status,
        quantidade: (resultado.find(item => isAgendamentoAgrupado(item)) as AgendamentoAgrupado).quantidadeAgendamentos
      } : 'Nenhum grupo encontrado'
    });
    
    return resultado;
  }, [agendamentos, precosParticulares]);

  // Aplicar paginação local após agrupamento
  const totalPaginas = Math.ceil(agendamentosFiltrados.length / itensPorPagina);
  const startIndex = (paginaAtual - 1) * itensPorPagina;
  const endIndex = startIndex + itensPorPagina;
  const agendamentosPaginados = agendamentosFiltrados.slice(startIndex, endIndex);
  
  // Atualizar total com base nos itens agrupados
  const totalItensAgrupados = agendamentosFiltrados.length;

  const formatarDataHora = formatarDataHoraLocal;

  // Função para determinar as cores do badge baseado no status
  const getBadgeColors = (status: string) => {
    switch (status) {
      case 'AGENDADO':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-700',
          border: 'border-yellow-400'
        };
      case 'SOLICITADO':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          border: 'border-blue-400'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          border: 'border-gray-400'
        };
    }
  };

  const handleLiberar = (agendamento: Agendamento, grupo?: AgendamentoAgrupado) => {
    setAgendamentoSelecionado(agendamento);
    
    if (grupo) {
      // Preparar dados do grupo para o modal
      setGrupoSelecionadoParaLiberacao(grupo);
    } else {
      setGrupoSelecionadoParaLiberacao(null);
    }
    
    setShowLiberarAgendamento(true);
  };

  const handleVerDetalhes = (agendamento: Agendamento) => {
    setAgendamentoDetalhes(agendamento);
    setShowDetalhesAgendamento(true);
  };

  const handleVerAgendamentosGrupo = (grupo: AgendamentoAgrupado) => {
    setGrupoSelecionado(grupo);
    setShowAgendamentosGrupo(true);
  };

  const handleWhatsApp = (agendamento: Agendamento) => {
    // Extrair apenas os números do WhatsApp
    const numeroLimpo = agendamento.pacienteWhatsapp?.replace(/\D/g, '') || '';
    
    if (!numeroLimpo) {
      AppToast.error("Erro", { 
        description: "Número do WhatsApp não encontrado para este paciente." 
      });
      return;
    }

    // Construir URL do WhatsApp Web
    const whatsappUrl = `https://api.whatsapp.com/send/?phone=${numeroLimpo}`;
    
    // Abrir em nova aba
    window.open(whatsappUrl, '_blank');
  };

  const handleSolicitarLiberacaoClick = (agendamento: Agendamento, grupoEspecifico?: AgendamentoAgrupado) => {
    if (agendamento.status === 'SOLICITADO') {
      // Mostrar modal de confirmação para reenvio
      setAgendamentoParaReenvio(agendamento);
      setGrupoParaReenvio(grupoEspecifico);
      setShowConfirmacaoReenvio(true);
    } else {
      // Prosseguir normalmente
      handleSolicitarLiberacao(agendamento, grupoEspecifico);
    }
  };

  const confirmarReenvio = () => {
    if (agendamentoParaReenvio) {
      handleSolicitarLiberacao(agendamentoParaReenvio, grupoParaReenvio || undefined);
    }
    setShowConfirmacaoReenvio(false);
    setAgendamentoParaReenvio(null);
    setGrupoParaReenvio(null);
  };

  const cancelarReenvio = () => {
    setShowConfirmacaoReenvio(false);
    setAgendamentoParaReenvio(null);
    setGrupoParaReenvio(null);
  };

  // Função para converter data UTC para horário local brasileiro 
  const converterParaHorarioLocal = (dataISO: string) => {
    if (!dataISO) return dataISO;
    
    const data = new Date(dataISO);
    if (isNaN(data.getTime())) return dataISO;
    
    // Converter para horário local brasileiro mantendo o formato ISO
    return new Date(data.getTime() - (data.getTimezoneOffset() * 60000)).toISOString();
  };

  // Função para construir payload do webhook
  const construirPayloadWebhook = (agendamento: Agendamento, grupo?: AgendamentoAgrupado) => {
    console.log('📦 Construindo payload webhook:', {
      agendamentoId: agendamento.id,
      temGrupo: !!grupo,
      grupoInfo: grupo ? {
        id: grupo.id,
        paciente: grupo.pacienteNome,
        servico: grupo.servicoNome,
        mesAno: grupo.mesAnoDisplay,
        quantidade: grupo.quantidadeAgendamentos
      } : null
    });
    
    if (grupo) {
      console.log('📜 Criando payload para GRUPO MENSAL');
      // Payload para grupo mensal
      const datas = grupo.agendamentos.map(ag => {
        const data = new Date(ag.dataHoraInicio);
        return data.toLocaleDateString('pt-BR');
      }).sort();

      return {
        tipo: 'GRUPO_MENSAL',
        paciente: {
          id: grupo.pacienteId,
          nome: grupo.pacienteNome,
          whatsapp: agendamento.pacienteWhatsapp
        },
        servico: {
          id: grupo.servicoId,
          nome: grupo.servicoNome
        },
        profissional: {
          id: grupo.profissionalId,
          nome: grupo.profissionalNome
        },
        resumoGrupo: {
          mesAno: grupo.mesAnoDisplay,
          quantidadeSessoes: grupo.quantidadeAgendamentos,
          datasAgendamentos: datas,
          valorUnitario: grupo.precoUnitario,
          valorTotal: grupo.precoTotal,
          tipoPagamento: grupo.tipoPagamento
        },
        agendamentosIndividuais: grupo.agendamentos.map(ag => ({
          id: ag.id,
          dataHoraInicio: converterParaHorarioLocal(ag.dataHoraInicio),
          status: ag.status
        }))
      };
    } else {
      console.log('📜 Criando payload para AGENDAMENTO INDIVIDUAL');
      
      // Buscar informações de preço particular para o agendamento
      const precoInfo = encontrarPreco(agendamento.pacienteId, agendamento.servicoId);
      
      // Payload para agendamento individual
      return {
        tipo: 'INDIVIDUAL',
        agendamento: {
          ...agendamento,
          // Converter as datas para horário local brasileiro
          dataHoraInicio: converterParaHorarioLocal(agendamento.dataHoraInicio),
          dataHoraFim: converterParaHorarioLocal(agendamento.dataHoraFim)
        },
        precoParticular: precoInfo ? {
          id: precoInfo.id,
          preco: precoInfo.preco,
          tipoPagamento: precoInfo.tipoPagamento,
          diaPagamento: precoInfo.diaPagamento,
          pagamentoAntecipado: precoInfo.pagamentoAntecipado,
          notaFiscal: precoInfo.notaFiscal,
          recibo: precoInfo.recibo
        } : null
      };
    }
  };

  // Função para executar o webhook efetivamente
  const executarWebhook = async (agendamento: Agendamento, grupo?: AgendamentoAgrupado) => {
    const webhookUrl = import.meta.env.VITE_WEBHOOK_SOLICITAR_LIBERACAO_PARTICULAR_URL;
    
    if (!webhookUrl) {
      AppToast.error("Erro de configuração", { 
        description: "URL do webhook para liberação particular não configurada. Verifique o arquivo .env" 
      });
      throw new Error("URL do webhook não configurada");
    }

    const payload = construirPayloadWebhook(agendamento, grupo);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    // Capturar a resposta do webhook
    const responseData = await response.json().catch(() => ({}));

    // Atualizar o status no banco de dados
    try {
      if (grupo) {
        // Para grupos mensais: atualizar TODOS os agendamentos do grupo
        console.log('🔄 Atualizando todos os agendamentos do grupo para SOLICITADO:', grupo.agendamentos.length);
        
        // Atualizar todos os agendamentos do grupo no banco
        await Promise.all(
          grupo.agendamentos.map(ag => 
            updateAgendamento(ag.id, { status: 'SOLICITADO' })
          )
        );

        // Atualizar todos os agendamentos do grupo localmente
        const idsDoGrupo = grupo.agendamentos.map(ag => ag.id);
        setAgendamentos(prev => 
          prev.map(a => 
            idsDoGrupo.includes(a.id)
              ? { ...a, status: 'SOLICITADO' }
              : a
          )
        );
        
        console.log('✅ Todos os agendamentos do grupo foram atualizados para SOLICITADO');
      } else {
        // Para agendamentos individuais: atualizar apenas o agendamento específico
        await updateAgendamento(agendamento.id, {
          status: 'SOLICITADO'
        });

        // Atualizar o status do agendamento localmente após sucesso no banco
        setAgendamentos(prev => 
          prev.map(a => 
            a.id === agendamento.id 
              ? { ...a, status: 'SOLICITADO' }
              : a
          )
        );
      }

      // Exibir o retorno do webhook no toast
      const mensagemWebhook = responseData.message || responseData.msg || responseData.description || JSON.stringify(responseData);
      
      AppToast.success("Sucesso", { 
        description: `Solicitação enviada para ${agendamento.pacienteNome}! Status atualizado no banco de dados. Retorno: ${mensagemWebhook}` 
      });

    } catch (dbError) {
      
      // Mesmo com erro no banco, o webhook foi enviado com sucesso
      const mensagemWebhook = responseData.message || responseData.msg || responseData.description || JSON.stringify(responseData);
      
      AppToast.error("Webhook enviado, mas erro no banco", { 
        description: `Solicitação enviada para ${agendamento.pacienteNome}, mas houve erro ao atualizar o status.` 
      });
    }
  };

  // Função para encontrar o grupo ao qual um agendamento pertence (usado apenas para agendamentos individuais)
  const encontrarGrupoDoAgendamento = (agendamento: Agendamento): AgendamentoAgrupado | undefined => {
    // Esta função agora é usada apenas como fallback para agendamentos individuais
    // Para grupos, o grupo específico é passado diretamente
    const precoInfo = encontrarPreco(agendamento.pacienteId, agendamento.servicoId);
    
    if (precoInfo?.tipoPagamento === 'Mensal') {
      const agendamentosRelacionados = agendamentos.filter(ag => 
        ag.pacienteId === agendamento.pacienteId && 
        ag.servicoId === agendamento.servicoId &&
        ag.profissionalId === agendamento.profissionalId
      );
      
      if (agendamentosRelacionados.length > 1) {
        const gruposEspecificos = agruparAgendamentos(agendamentosRelacionados);
        return gruposEspecificos.find(grupo => 
          isAgendamentoAgrupado(grupo) && 
          grupo.agendamentos.some(ag => ag.id === agendamento.id)
        ) as AgendamentoAgrupado | undefined;
      }
    }
    
    return undefined;
  };

  const handleSolicitarLiberacao = async (agendamento: Agendamento, grupoEspecifico?: AgendamentoAgrupado) => {
    // Adicionar na fila de webhooks em vez de executar imediatamente
    try {
      // Se um grupo específico foi passado, usar ele; senão tentar encontrar
      const grupo = grupoEspecifico || encontrarGrupoDoAgendamento(agendamento);
      console.log('🚀 Enviando para webhook:', {
        temGrupoEspecifico: !!grupoEspecifico,
        grupoFinal: grupo ? {
          id: grupo.id,
          paciente: grupo.pacienteNome,
          mesAno: grupo.mesAnoDisplay,
          quantidade: grupo.quantidadeAgendamentos
        } : null
      });
      adicionarNaFila(agendamento, grupo);
    } catch (error) {
      AppToast.error("Erro", { 
        description: `Erro ao adicionar solicitação para ${agendamento.pacienteNome} na fila. Tente novamente.` 
      });
      removerProcessamento(agendamento.id);
    }
  };



  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agendamentosPaginados.length === 0 ? (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
          <CheckCircle className="w-12 h-12 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            Nenhum agendamento encontrado
          </h3>
          <p className="text-sm">
            {(busca || temFiltrosAtivos) ? 'Tente alterar os filtros de busca.' : 'Nenhum agendamento particular pendente de liberação.'}
          </p>
        </div>
      ) : (
        agendamentosPaginados.map(item => {
          const isGrupado = isAgendamentoAgrupado(item);
          
          if (isGrupado) {
            // Renderizar card para grupo mensal
            const grupo = item as AgendamentoAgrupado;
            const precoInfo = encontrarPreco(grupo.pacienteId, grupo.servicoId);
            
            return (
              <Card key={grupo.id} className="hover:shadow-md transition-shadow border-blue-200">
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      <CardTitle className="text-lg text-blue-800">{grupo.pacienteNome}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                        {grupo.quantidadeAgendamentos}x
                      </Badge>
                      <Badge 
                        variant="outline"
                        className={`${getBadgeColors(grupo.status).bg} ${getBadgeColors(grupo.status).text} ${getBadgeColors(grupo.status).border}`}
                      >
                        {grupo.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{grupo.profissionalNome}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText className="w-4 h-4" />
                      <span>{grupo.servicoNome}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{grupo.mesAnoDisplay}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-blue-700 font-medium">Mensal ({grupo.quantidadeAgendamentos} sessões)</span>
                    </div>
                    
                    {/* Seção de preços - agrupado */}
                    {precoInfo && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1">
                          <span>💰</span>
                          Valor Total ({grupo.quantidadeAgendamentos} sessões)
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Unitário:</span>
                            <span className="font-semibold text-gray-700">
                              {grupo.precoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-blue-600 font-medium">Total:</span>
                            <span className="font-bold text-lg text-green-700">
                              {grupo.precoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>💳</span>
                            <span className="text-blue-600 font-medium">
                              {formatarPagamento(precoInfo)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="default"
                      className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleVerAgendamentosGrupo(grupo)}
                    >
                      Ver Detalhes
                    </Button>
                    <BotaoComValidacaoPreco
                      pacienteId={grupo.pacienteId}
                      servicoId={grupo.servicoId}
                      variant="outline"
                      onClick={() => handleSolicitarLiberacaoClick(grupo.agendamentos[0], grupo)}
                      disabled={grupo.agendamentos.some(ag => estaProcessando(ag.id))}
                      className="flex-1 h-7 text-xs border-yellow-400 text-yellow-700 hover:bg-yellow-600 hover:text-white"
                    >
                      {grupo.agendamentos.some(ag => estaProcessando(ag.id)) ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Solicitar Liberação'
                      )}
                    </BotaoComValidacaoPreco>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 h-7 text-xs border-green-300 text-green-600 hover:bg-green-600 hover:text-white"
                      onClick={() => handleWhatsApp(grupo.agendamentos[0])}
                    >
                      WhatsApp
                    </Button>
                    {canLiberar ? (
                      <BotaoComValidacaoPrecoLiberacao
                        pacienteId={grupo.pacienteId}
                        servicoId={grupo.servicoId}
                        variant="outline"
                        onClick={() => handleLiberar(grupo.agendamentos[0], grupo)}
                        className="flex-1 h-7 text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                        title="Liberar Grupo"
                      >
                        Liberar Grupo
                      </BotaoComValidacaoPrecoLiberacao>
                    ) : (
                      <Button 
                        size="sm" 
                        disabled={true}
                        className="flex-1 h-7 text-xs border-gray-300 text-gray-400 cursor-not-allowed"
                        title="Você não tem permissão para liberar agendamentos"
                      >
                        Liberar Grupo
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          } else {
            // Renderizar card para agendamento individual
            const agendamento = item as Agendamento;
            const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);
            const precoInfo = encontrarPreco(agendamento.pacienteId, agendamento.servicoId);
            
            return (
              <Card key={agendamento.id} className="hover:shadow-md transition-shadow border-yellow-200">
                <CardHeader className="pb-3 bg-gradient-to-r from-yellow-50 to-orange-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-yellow-600" />
                      <CardTitle className="text-lg text-yellow-800">{agendamento.pacienteNome}</CardTitle>
                    </div>
                    <Badge 
                      variant="outline"
                      className={`${getBadgeColors(agendamento.status).bg} ${getBadgeColors(agendamento.status).text} ${getBadgeColors(agendamento.status).border}`}
                    >
                      {agendamento.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{agendamento.profissionalNome}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText className="w-4 h-4" />
                      <span>{agendamento.servicoNome}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{data}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{hora}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-yellow-700 font-medium">Particular</span>
                    </div>
                    
                    {/* Seção de preços - individual */}
                    {precoInfo && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                        <h4 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                          <span>💰</span>
                          Informações de Preços
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-1">
                            <span>💵</span>
                            <span className="font-semibold text-green-700">
                              {precoInfo.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>💳</span>
                            <span className="text-blue-600 font-medium">
                              {formatarPagamento(precoInfo)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="default"
                      className="flex-1 h-7 text-xs bg-yellow-600 hover:bg-yellow-700"
                      onClick={() => handleVerDetalhes(agendamento)}
                    >
                      Visualizar
                    </Button>
                    <BotaoComValidacaoPreco
                      pacienteId={agendamento.pacienteId}
                      servicoId={agendamento.servicoId}
                      variant="outline"
                      onClick={() => handleSolicitarLiberacaoClick(agendamento)}
                      disabled={estaProcessando(agendamento.id)}
                      className="flex-1 h-7 text-xs border-yellow-400 text-yellow-700 hover:bg-yellow-600 hover:text-white"
                    >
                      {estaProcessando(agendamento.id) ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Solicitar Liberação'
                      )}
                    </BotaoComValidacaoPreco>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 h-7 text-xs border-green-300 text-green-600 hover:bg-green-600 hover:text-white"
                      onClick={() => handleWhatsApp(agendamento)}
                    >
                      WhatsApp
                    </Button>
                    {canLiberar ? (
                      <BotaoComValidacaoPrecoLiberacao
                        pacienteId={agendamento.pacienteId}
                        servicoId={agendamento.servicoId}
                        variant="outline"
                        onClick={() => handleLiberar(agendamento)}
                        className="flex-1 h-7 text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                        title="Liberado Atendimento"
                      >
                        Liberado Atendimento
                      </BotaoComValidacaoPrecoLiberacao>
                    ) : (
                      <Button 
                        size="sm" 
                        disabled={true}
                        className="flex-1 h-7 text-xs border-gray-300 text-gray-400 cursor-not-allowed"
                        title="Você não tem permissão para liberar agendamentos"
                      >
                        Liberado Atendimento
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          }
        })
      )}
    </div>
  );

  const renderTableView = () => (
    <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-100">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-gray-200">
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
                <span className="text-lg">💰</span>
                Preço
              </div>
            </TableHead>
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔢</span>
                Qtd
              </div>
            </TableHead>
            <TableHead className="py-3 text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">💳</span>
                Pag - Dia - Antec
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
              <TableCell colSpan={11} className="py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">💰</span>
                  </div>
                  <p className="text-gray-500 font-medium">
                    {(busca || temFiltrosAtivos) ? 'Nenhum resultado encontrado' : 'Nenhum agendamento particular pendente'}
                  </p>
                  <p className="text-gray-400 text-sm">Tente ajustar os filtros de busca</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            agendamentosPaginados.map((item) => {
              const isGrupado = isAgendamentoAgrupado(item);
              
              if (isGrupado) {
                // Renderizar grupo de agendamentos mensais
                const grupo = item as AgendamentoAgrupado;
                const precoInfo = encontrarPreco(grupo.pacienteId, grupo.servicoId);
                
                return (
                  <TableRow key={grupo.id} className="hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 transition-all duration-200 h-12 bg-blue-50">
                    <TableCell className="py-2">
                      <span className="text-sm font-mono bg-blue-100 px-2 py-1 rounded text-blue-700">
                        {grupo.mesAnoOtimizado}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm font-mono bg-blue-100 px-2 py-1 rounded text-blue-700">
                        Mensal
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {grupo.pacienteNome?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{grupo.pacienteNome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm text-blue-600 hover:text-blue-800 transition-colors">{grupo.profissionalNome}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm">{grupo.servicoNome}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-xs px-3 py-1 rounded-full font-medium bg-blue-100 text-blue-800">
                        {grupo.tipoAtendimento}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm font-semibold text-green-700">
                        {grupo.precoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">
                        {grupo.quantidadeAgendamentos}x
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                        {formatarPagamento(precoInfo)}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${getBadgeColors(grupo.status).bg} ${getBadgeColors(grupo.status).text}`}>
                        {grupo.status}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex gap-1.5">
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-purple-700 text-white hover:from-blue-700 hover:to-purple-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => handleVerAgendamentosGrupo(grupo)}
                          title="Visualizar Agendamentos do Grupo"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <BotaoComValidacaoPreco
                          pacienteId={grupo.pacienteId}
                          servicoId={grupo.servicoId}
                          variant="outline"
                          onClick={() => handleSolicitarLiberacaoClick(grupo.agendamentos[0], grupo)}
                          disabled={grupo.agendamentos.some(ag => estaProcessando(ag.id))}
                          className="group border-2 border-yellow-400 text-yellow-700 hover:bg-yellow-600 hover:text-white hover:border-yellow-600 focus:ring-4 focus:ring-yellow-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          title="Solicitar Liberação do Grupo"
                        >
                          {grupo.agendamentos.some(ag => estaProcessando(ag.id)) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Unlock className="w-4 h-4 text-yellow-700 group-hover:text-white transition-colors" />
                          )}
                        </BotaoComValidacaoPreco>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-green-300 text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600 focus:ring-4 focus:ring-green-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => handleWhatsApp(grupo.agendamentos[0])}
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4 text-green-600 group-hover:text-white transition-colors" />
                        </Button>
                        {canLiberar ? (
                          <BotaoComValidacaoPrecoLiberacao
                            pacienteId={grupo.pacienteId}
                            servicoId={grupo.servicoId}
                            variant="outline"
                            onClick={() => handleLiberar(grupo.agendamentos[0], grupo)}
                            className="group border-2 border-emerald-300 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 focus:ring-4 focus:ring-emerald-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                            title="Liberar Agendamentos do Grupo"
                          >
                            <CheckSquare className="w-4 h-4 text-emerald-600 group-hover:text-white transition-colors" />
                          </BotaoComValidacaoPrecoLiberacao>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={true}
                            className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                            title="Você não tem permissão para liberar agendamentos"
                          >
                            <CheckSquare className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              } else {
                // Renderizar agendamento individual
                const agendamento = item as Agendamento;
                const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);
                const precoInfo = encontrarPreco(agendamento.pacienteId, agendamento.servicoId);
                
                return (
                  <TableRow key={agendamento.id} className="hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 transition-all duration-200 h-12">
                  <TableCell className="py-2">
                    <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{data}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm font-mono bg-yellow-100 px-2 py-1 rounded text-yellow-700">{hora}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
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
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      agendamento.tipoAtendimento === 'presencial' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {agendamento.tipoAtendimento}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    {precoInfo ? (
                      <span className="text-sm font-semibold text-green-700">
                        {precoInfo.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm text-gray-500">
                      1x
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                      {formatarPagamento(precoInfo)}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${getBadgeColors(agendamento.status).bg} ${getBadgeColors(agendamento.status).text}`}>
                      {agendamento.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex gap-1.5">
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-gradient-to-r from-yellow-600 to-orange-700 text-white hover:from-yellow-700 hover:to-orange-800 focus:ring-4 focus:ring-yellow-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleVerDetalhes(agendamento)}
                        title="Visualizar Agendamento"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <BotaoComValidacaoPreco
                        pacienteId={agendamento.pacienteId}
                        servicoId={agendamento.servicoId}
                        variant="outline"
                        onClick={() => handleSolicitarLiberacaoClick(agendamento)}
                        disabled={estaProcessando(agendamento.id)}
                        className="group border-2 border-yellow-400 text-yellow-700 hover:bg-yellow-600 hover:text-white hover:border-yellow-600 focus:ring-4 focus:ring-yellow-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        title="Solicitar Liberação"
                      >
                        {estaProcessando(agendamento.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Unlock className="w-4 h-4 text-yellow-700 group-hover:text-white transition-colors" />
                        )}
                      </BotaoComValidacaoPreco>
                      <Button
                        variant="outline"
                        size="sm"
                        className="group border-2 border-green-300 text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600 focus:ring-4 focus:ring-green-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleWhatsApp(agendamento)}
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 text-green-600 group-hover:text-white transition-colors" />
                      </Button>
                      {canLiberar ? (
                        <BotaoComValidacaoPrecoLiberacao
                          pacienteId={agendamento.pacienteId}
                          servicoId={agendamento.servicoId}
                          variant="outline"
                          onClick={() => handleLiberar(agendamento)}
                          className="group border-2 border-emerald-300 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 focus:ring-4 focus:ring-emerald-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          title="Liberado Atendimento"
                        >
                          <CheckSquare className="w-4 h-4 text-emerald-600 group-hover:text-white transition-colors" />
                        </BotaoComValidacaoPrecoLiberacao>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={true}
                          className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                          title="Você não tem permissão para liberar agendamentos"
                        >
                          <CheckSquare className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
              }
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Carregando agendamentos particulares...</p>
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
          
          {routeInfo && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Informações da Rota:</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Nome:</span> {routeInfo.nome}</p>
                <p><span className="font-medium">Descrição:</span> {routeInfo.descricao}</p>
                <p><span className="font-medium">Módulo:</span> {routeInfo.modulo || 'N/A'}</p>
              </div>
            </div>
          )}
          
          <p className="text-sm text-gray-500">
            Entre em contato com o administrador do sistema para solicitar as devidas permissões.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2 pl-6 pr-6 h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white backdrop-blur border-b border-gray-200 flex justify-between items-center mb-6 px-6 py-4 rounded-lg gap-4 transition-shadow">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">💰</span>
            <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              Liberações Particulares
            </span>
          </h1>
          <div className="flex items-center gap-3">
            {agendamentosProcessando.size > 0 && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Processando {agendamentosProcessando.size}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar agendamentos particulares..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
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
            className={`${mostrarFiltros ? 'bg-yellow-50 border-yellow-300' : ''} ${temFiltrosAtivos ? 'border-yellow-500 bg-yellow-50' : ''}`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {temFiltrosAtivos && (
              <Badge variant="secondary" className="ml-2 h-4 px-1">
                {Object.values(filtrosAplicados).filter(f => f !== '').length}
              </Badge>
            )}
          </Button>

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
      <div className="flex-1 overflow-y-auto">
        {visualizacao === 'cards' ? renderCardView() : renderTableView()}
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
              className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-100 focus:border-yellow-500 transition-all duration-200 hover:border-yellow-300"
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
            Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, totalItensAgrupados)} de {totalItensAgrupados} resultados
          </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
            disabled={paginaAtual === 1 || totalPaginas === 1}
            className={(paginaAtual === 1 || totalPaginas === 1)
              ? "border-2 border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed font-medium shadow-none hover:bg-gray-50" 
              : "border-2 border-gray-200 text-gray-700 hover:border-yellow-500 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 hover:text-yellow-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
            }
          >
            <span className="mr-1 text-gray-600 group-hover:text-yellow-600 transition-colors">⬅️</span>
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
                  ? "bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg font-semibold" 
                  : totalPaginas === 1
                  ? "border-2 border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed font-medium shadow-none hover:bg-gray-50"
                  : "border-2 border-gray-200 text-gray-700 hover:border-yellow-500 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 hover:text-yellow-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
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
              : "border-2 border-gray-200 text-gray-700 hover:border-yellow-500 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 hover:text-yellow-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
            }
          >
            Próximo
            <span className="ml-1 text-gray-600 group-hover:text-yellow-600 transition-colors">➡️</span>
          </Button>
        </div>
        </div>
      )}

      {/* Modais */}
      {/* Modal de agendamentos do grupo */}
      <Dialog open={showAgendamentosGrupo} onOpenChange={setShowAgendamentosGrupo}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-purple-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-2xl">📅</span>
              Agendamentos do Grupo - {grupoSelecionado?.mesAnoDisplay}
            </DialogTitle>
            <div className="text-sm text-gray-600 mt-2">
              <div className="flex items-center gap-4">
                <span><strong>Paciente:</strong> {grupoSelecionado?.pacienteNome}</span>
                <span><strong>Serviço:</strong> {grupoSelecionado?.servicoNome}</span>
                <span><strong>Total:</strong> {grupoSelecionado?.quantidadeAgendamentos} sessões</span>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <span><strong>Valor Unitário:</strong> {grupoSelecionado?.precoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <span><strong>Valor Total:</strong> {grupoSelecionado?.precoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto p-4 -mx-6">
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-blue-50 to-purple-50">
                    <TableHead className="py-2 text-xs font-semibold text-gray-700">📅 Data</TableHead>
                    <TableHead className="py-2 text-xs font-semibold text-gray-700">⏰ Horário</TableHead>
                    <TableHead className="py-2 text-xs font-semibold text-gray-700">👨‍⚕️ Profissional</TableHead>
                    <TableHead className="py-2 text-xs font-semibold text-gray-700">🏷️ Tipo</TableHead>
                    <TableHead className="py-2 text-xs font-semibold text-gray-700">📊 Status</TableHead>
                    <TableHead className="py-2 text-xs font-semibold text-gray-700">⚙️ Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grupoSelecionado?.agendamentos.map((agendamento, index) => {
                    const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);
                    const precoInfo = encontrarPreco(agendamento.pacienteId, agendamento.servicoId);
                    return (
                      <TableRow key={agendamento.id} className="hover:bg-blue-50 transition-colors">
                        <TableCell className="py-2 text-sm">
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                            {data}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 text-sm">
                          <span className="font-mono bg-blue-100 px-2 py-1 rounded text-xs text-blue-700">
                            {hora}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 text-sm">
                          <span className="text-blue-600">{agendamento.profissionalNome}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            agendamento.tipoAtendimento === 'presencial' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {agendamento.tipoAtendimento}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getBadgeColors(agendamento.status).bg} ${getBadgeColors(agendamento.status).text}`}>
                            {agendamento.status}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0 border-blue-300 text-blue-600 hover:bg-blue-100"
                              onClick={() => handleVerDetalhes(agendamento)}
                              title="Ver Detalhes"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0 border-green-300 text-green-600 hover:bg-green-100"
                              onClick={() => handleWhatsApp(agendamento)}
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </Button>
                            {!precoInfo?.pagamentoAntecipado ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-block">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={true}
                                        className="h-6 w-6 p-0 border-yellow-300 text-yellow-600 opacity-50 cursor-not-allowed"
                                        title="Pagamento antecipado não habilitado"
                                      >
                                        <Unlock className="w-3 h-3" />
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Só é possível solicitar liberação para pagamentos antecipados</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0 border-yellow-300 text-yellow-600 hover:bg-yellow-100"
                                onClick={() => handleSolicitarLiberacaoClick(agendamento)}
                                disabled={estaProcessando(agendamento.id)}
                                title="Solicitar Liberação Individual"
                              >
                                {estaProcessando(agendamento.id) ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Unlock className="w-3 h-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="border-t bg-gray-50 -mx-6 -mb-6 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setShowAgendamentosGrupo(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Fechar
            </Button>
            {grupoSelecionado && (
              <BotaoComValidacaoPreco
                pacienteId={grupoSelecionado.pacienteId}
                servicoId={grupoSelecionado.servicoId}
                variant="default"
                onClick={() => {
                  if (grupoSelecionado) {
                    handleSolicitarLiberacaoClick(grupoSelecionado.agendamentos[0], grupoSelecionado);
                  }
                }}
                disabled={grupoSelecionado?.agendamentos.some(ag => estaProcessando(ag.id))}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {grupoSelecionado?.agendamentos.some(ag => estaProcessando(ag.id)) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando Grupo...
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 mr-2" />
                    Solicitar Liberação do Grupo
                  </>
                )}
              </BotaoComValidacaoPreco>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de reenvio */}
      <ConfirmacaoModal
        open={showConfirmacaoReenvio}
        onClose={cancelarReenvio}
        onConfirm={confirmarReenvio}
        title="Reenviar Solicitação"
        description={`A solicitação de liberação (token) já foi enviada para ${agendamentoParaReenvio?.pacienteNome}. Deseja realmente enviar a solicitação novamente?`}
        confirmText="Sim, Reenviar"
        cancelText="Cancelar"
        variant="warning"
        isLoading={agendamentoParaReenvio ? estaProcessando(agendamentoParaReenvio.id) : false}
        loadingText="Reenviando..."
      />

      <LiberarParticularModal
        isOpen={showLiberarAgendamento}
        agendamento={agendamentoSelecionado}
        grupo={grupoSelecionadoParaLiberacao ? {
          pacienteId: grupoSelecionadoParaLiberacao.pacienteId,
          profissionalId: grupoSelecionadoParaLiberacao.profissionalId,
          servicoId: grupoSelecionadoParaLiberacao.servicoId,
          mesAno: grupoSelecionadoParaLiberacao.mesAno,
          mesAnoDisplay: grupoSelecionadoParaLiberacao.mesAnoDisplay,
          quantidadeAgendamentos: grupoSelecionadoParaLiberacao.quantidadeAgendamentos,
          precoTotal: grupoSelecionadoParaLiberacao.precoTotal,
          pagamentoAntecipado: encontrarPreco(grupoSelecionadoParaLiberacao.pacienteId, grupoSelecionadoParaLiberacao.servicoId)?.pagamentoAntecipado ?? false
        } : null}
        pagamentoAntecipado={agendamentoSelecionado ? encontrarPreco(agendamentoSelecionado.pacienteId, agendamentoSelecionado.servicoId)?.pagamentoAntecipado ?? false : false}
        precoAvulso={agendamentoSelecionado ? encontrarPreco(agendamentoSelecionado.pacienteId, agendamentoSelecionado.servicoId)?.preco : undefined}
        onClose={() => {
          setShowLiberarAgendamento(false);
          setAgendamentoSelecionado(null);
          setGrupoSelecionadoParaLiberacao(null);
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
    </div>
  );
};