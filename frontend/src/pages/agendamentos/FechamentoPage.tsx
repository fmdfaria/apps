import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdvancedFilter, type FilterField } from '@/components/ui/advanced-filter';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign,
  Clock,
  Users,
  Calendar,
  FileText,
  CreditCard,
  Search,
  LayoutGrid,
  List,
  Filter,
  Calculator,
  TrendingUp,
  Building,
  Eye,
  MessageCircle,
  DollarSign as PaymentIcon,
  CheckCircle,
  Loader2
} from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import type { PrecoParticular } from '@/types/PrecoParticular';
import { getAgendamentos, efetuarFechamentoRecebimento, type FechamentoRecebimentoData } from '@/services/agendamentos';
import { getPrecosParticulares } from '@/services/precos-particulares';
import { ListarAgendamentosModal, FechamentoRecebimentoModal } from '@/components/agendamentos';
import api from '@/services/api';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import { AppToast } from '@/services/toast';
import { getConvenios } from '@/services/convenios';
import { getServicos } from '@/services/servicos';
import { getPacientes } from '@/services/pacientes';
import { getProfissionais } from '@/services/profissionais';
import ContaReceberModal from '@/pages/financeiro/ContaReceberModal';
import { createContaReceber, receberConta } from '@/services/contas-receber';
import { createAgendamentoConta } from '@/services/agendamentos-contas';

// Configuração dos campos de filtro para o AdvancedFilter
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

interface FechamentoConvenio {
  convenio: string;
  dataInicio: string;
  dataFim: string;
  qtdAgendamentos: number;
  valorReceber: number;
  agendamentos: Agendamento[];
}

interface FechamentoParticular {
  paciente: string;
  dataInicio: string;
  dataFim: string;
  qtdAgendamentos: number;
  valorReceber: number;
  agendamentos: Agendamento[];
  tipoPagamento?: string;
  pagamentoAntecipado?: boolean;
}

export const FechamentoPage = () => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [precosParticulares, setPrecosParticulares] = useState<PrecoParticular[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para controle de permissões RBAC
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [busca, setBusca] = useState('');
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('tabela');
  
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [agendamentosDetalhes, setAgendamentosDetalhes] = useState<Agendamento[]>([]);
  const [tituloModal, setTituloModal] = useState('');

  // Estados para registrar pagamento (particular)
  const [showContaReceberModal, setShowContaReceberModal] = useState(false);
  const [contaReceberData, setContaReceberData] = useState<any>(null);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);
  const [grupoMensalSelecionado, setGrupoMensalSelecionado] = useState<any>(null);

  // Estados para fechamento de convênio
  const [showFechamentoConvenioModal, setShowFechamentoConvenioModal] = useState(false);
  const [fechamentoConvenioData, setFechamentoConvenioData] = useState<{
    convenio: FechamentoConvenio | null;
  }>({ convenio: null });

  // Estados para os filtros do AdvancedFilter
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [filtrosAplicados, setFiltrosAplicados] = useState<Record<string, string>>({});

  // Estado para controle de inicialização (mesmo padrão da AgendamentosPage)
  const [initialized, setInitialized] = useState(false);

  // Estados para webhook de pagamento
  interface WebhookQueueItem {
    agendamento: Agendamento;
    timestamp: number;
  }

  const [webhookQueue, setWebhookQueue] = useState<WebhookQueueItem[]>([]);
  const [isProcessingWebhook, setIsProcessingWebhook] = useState(false);
  const [processandoPagamentos, setProcessandoPagamentos] = useState<Set<string>>(new Set());
  const webhookTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Inicialização única (mesmo padrão da AgendamentosPage)
  useEffect(() => {
    checkPermissions();
    carregarAgendamentos();
    carregarPrecosParticulares();
    setInitialized(true);
  }, []);

  // Reset de página quando filtros mudarem
  useEffect(() => {
    if (initialized) {
      setPaginaAtual(1);
      carregarAgendamentos(); // Recarregar quando filtros mudarem
    }
  }, [busca, itensPorPagina, filtrosAplicados, visualizacao]);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;

      // Verificar permissão de leitura de fechamento
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/agendamentos-fechamento' && route.method.toLowerCase() === 'get';
      });

      // Se não tem permissão de leitura, marca como access denied
      if (!canRead) {
        setAccessDenied(true);
      }

    } catch (error: any) {
      // Se retornar 401/403 no endpoint de permissões, considera acesso negado
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };

  const carregarAgendamentos = async () => {
    setLoading(true);
    setAccessDenied(false);
    setAgendamentos([]); // Limpa dados para evitar mostrar dados antigos

    try {
      // Buscar agendamentos que ainda não tiveram recebimento registrado
      // Backend filtra automaticamente: exclui status CANCELADO e AGENDADO
      // Agendamentos futuros são sempre AGENDADO, então não precisam de filtro dataFim
      const dados = await getAgendamentos({
        recebimento: false, // Apenas agendamentos sem recebimento registrado
        convenioIdExcluir: 'f4af6586-8b56-4cf3-8b87-d18605cea381', // Excluir convênio "Particular"
        page: 1,
        // Removido limit para usar padrão da API (dados serão agrupados)
        ...(filtrosAplicados.dataInicio ? { dataInicio: filtrosAplicados.dataInicio } : {}),
        ...(filtrosAplicados.dataFim ? { dataFim: filtrosAplicados.dataFim } : {}),
        ...(filtrosAplicados.convenioId ? { convenioId: filtrosAplicados.convenioId } : {}),
        ...(filtrosAplicados.servicoId ? { servicoId: filtrosAplicados.servicoId } : {}),
        ...(filtrosAplicados.pacienteId ? { pacienteId: filtrosAplicados.pacienteId } : {}),
        ...(filtrosAplicados.profissionalId ? { profissionalId: filtrosAplicados.profissionalId } : {}),
      });

      // A nova API retorna { data: [], pagination: {} }
      setAgendamentos(dados.data || []);
    } catch (e: any) {
      console.error('Erro ao carregar agendamentos:', e);
      if (e?.response?.status === 403) {
        setAccessDenied(true);
        // Buscar informações da rota para mensagem mais específica
        try {
          const info = await getRouteInfo('/agendamentos-fechamento', 'GET');
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
      // Garantir que agendamentos sempre seja um array
      setAgendamentos([]);
    } finally {
      setLoading(false);
    }
  };

  const carregarPrecosParticulares = async () => {
    try {
      const dados = await getPrecosParticulares();
      setPrecosParticulares(dados);
    } catch (e: any) {
      console.error('Erro ao carregar preços particulares:', e);
      // Não exibir erro para o usuário, pois é opcional
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

  // Função para formatar valor monetário
  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Função para verificar status geral de recebimento
  const verificarStatusRecebimento = (agendamentos: Agendamento[]) => {
    if (agendamentos.length === 0) return null;
    const recebidos = (Array.isArray(agendamentos) ? agendamentos : []).filter(a => a.recebimento === true).length;
    if (recebidos === agendamentos.length) return true; // Todos recebidos
    if (recebidos === 0) return false; // Nenhum recebido
    return null; // Parcial
  };

  // Função para verificar status geral de pagamento
  const verificarStatusPagamento = (agendamentos: Agendamento[]) => {
    if (agendamentos.length === 0) return null;
    const pagos = (Array.isArray(agendamentos) ? agendamentos : []).filter(a => a.pagamento === true).length;
    if (pagos === agendamentos.length) return true; // Todos pagos
    if (pagos === 0) return false; // Nenhum pago
    return null; // Parcial
  };

  // Função para calcular valor total do serviço (como no modal)
  const calcularValorTotal = (agendamento: Agendamento): number => {
    // Primeiro, tentar buscar o preço particular específico para este paciente/serviço
    const precoParticular = precosParticulares.find(p => 
      p.pacienteId === agendamento.pacienteId && 
      p.servicoId === agendamento.servicoId
    );
    
    if (precoParticular) {
      // Usar preço da tabela precos_particulares
      return precoParticular.preco;
    }
    
    // Fallback: usar preço da tabela servico se não tiver preço particular
    const preco = parseFloat((agendamento as any).servico?.preco || '0');
    return preco;
  };

  // Função para formatar informações de pagamento (igual à página Liberação Particulares)
  const formatarPagamento = (agendamento: Agendamento): string => {
    const precoParticular = precosParticulares.find(p => 
      p.pacienteId === agendamento.pacienteId && 
      p.servicoId === agendamento.servicoId
    );
    
    if (!precoParticular) return '-';
    
    const parts: string[] = [];
    
    // Tipo de pagamento
    if (precoParticular.tipoPagamento) {
      parts.push(precoParticular.tipoPagamento);
    }
    
    // Dia do pagamento
    if (precoParticular.diaPagamento) {
      parts.push(precoParticular.diaPagamento.toString());
    }
    
    // Antecipado
    const antecipado = precoParticular.pagamentoAntecipado ? 'SIM' : 'NÃO';
    parts.push(antecipado);
    
    return parts.length > 0 ? parts.join(' - ') : '-';
  };

  // ===== FUNÇÕES DE WEBHOOK DE PAGAMENTO =====

  // Função para verificar se um agendamento está sendo processado
  const estaProcessandoPagamento = (agendamentoId: string) => {
    return processandoPagamentos.has(agendamentoId);
  };

  // Função para adicionar agendamento ao processamento
  const adicionarProcessamento = (agendamentoId: string) => {
    setProcessandoPagamentos(prev => new Set([...prev, agendamentoId]));
  };

  // Função para remover agendamento do processamento
  const removerProcessamento = (agendamentoId: string) => {
    setProcessandoPagamentos(prev => {
      const newSet = new Set(prev);
      newSet.delete(agendamentoId);
      return newSet;
    });
  };

  // Função para adicionar na fila de webhooks
  const adicionarNaFilaPagamento = (agendamento: Agendamento) => {
    adicionarProcessamento(agendamento.id);
    setWebhookQueue(prev => [...prev, {
      agendamento,
      timestamp: Date.now()
    }]);
  };

  // Função para encontrar preço particular
  const encontrarPreco = (pacienteId: string, servicoId: string) => {
    return precosParticulares.find(
      preco => preco.pacienteId === pacienteId && preco.servicoId === servicoId
    ) || null;
  };

  // Função para verificar se um agendamento pertence a um grupo mensal
  const encontrarGrupoMensalDoAgendamento = (agendamento: Agendamento, todosAgendamentos: Agendamento[]) => {
    const precoInfo = encontrarPreco(agendamento.pacienteId, agendamento.servicoId);
    
    if (precoInfo?.tipoPagamento === 'Mensal') {
      // Buscar todos os agendamentos finalizados do mesmo paciente, serviço e profissional
      const agendamentosRelacionados = todosAgendamentos.filter(ag => 
        ag.pacienteId === agendamento.pacienteId && 
        ag.servicoId === agendamento.servicoId &&
        ag.profissionalId === agendamento.profissionalId
      );
      
      if (agendamentosRelacionados.length > 1) {
        // Para pagamentos mensais, considerar TODOS os agendamentos relacionados
        // independente do mês, para calcular o valor total correto
        
        // Extrair mês/ano da data do agendamento para display (apenas para referência)
        const dataAgendamento = new Date(agendamento.dataHoraInicio);
        const mesAno = `${dataAgendamento.getFullYear()}-${String(dataAgendamento.getMonth() + 1).padStart(2, '0')}`;
        
        // Formatação para display do mês/ano
        const formatarMesAno = (mesAno: string): string => {
          const [ano, mes] = mesAno.split('-');
          const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
          ];
          return `${meses[parseInt(mes) - 1]} ${ano}`;
        };

        // Usar a mesma lógica de calcularValorTotal para o preço unitário
        const precoUnitario = calcularValorTotal(agendamento);

        return {
          mesAno,
          mesAnoDisplay: formatarMesAno(mesAno),
          agendamentos: agendamentosRelacionados, // TODOS os agendamentos relacionados
          quantidadeAgendamentos: agendamentosRelacionados.length, // Quantidade total
          precoUnitario: precoUnitario,
          precoTotal: precoUnitario * agendamentosRelacionados.length, // Preço total correto
          tipoPagamento: precoInfo.tipoPagamento
        };
      }
    }
    
    return null;
  };

  // Função para construir payload do webhook de pagamento
  const construirPayloadWebhookPagamento = (agendamento: Agendamento, todosAgendamentos: Agendamento[]) => {
    // Buscar informações de preço particular para o agendamento
    const precoParticular = encontrarPreco(agendamento.pacienteId, agendamento.servicoId);
    
    // Verificar se é um agendamento mensal
    const grupoMensal = encontrarGrupoMensalDoAgendamento(agendamento, todosAgendamentos);

    if (grupoMensal) {
      // Construir datas dos agendamentos do grupo
      const datas = grupoMensal.agendamentos.map(ag => {
        const data = new Date(ag.dataHoraInicio);
        return data.toLocaleDateString('pt-BR');
      }).sort();

      return {
        tipo: 'GRUPO_MENSAL',
        acao: 'SOLICITAR_PAGAMENTO',
        paciente: {
          id: agendamento.pacienteId,
          nome: agendamento.pacienteNome,
          whatsapp: agendamento.paciente?.whatsapp
        },
        servico: {
          id: agendamento.servicoId,
          nome: agendamento.servicoNome
        },
        profissional: {
          id: agendamento.profissionalId,
          nome: agendamento.profissionalNome
        },
        resumoGrupo: {
          mesAno: grupoMensal.mesAnoDisplay,
          quantidadeSessoes: grupoMensal.quantidadeAgendamentos,
          datasAgendamentos: datas,
          valorUnitario: grupoMensal.precoUnitario,
          valorTotal: grupoMensal.precoTotal,
          tipoPagamento: grupoMensal.tipoPagamento,
          diaPagamento: precoParticular?.diaPagamento,
          pagamentoAntecipado: precoParticular?.pagamentoAntecipado
        },
        agendamentos: grupoMensal.agendamentos.map(ag => ({
          ...ag,
          dataHoraInicio: ag.dataHoraInicio,
          dataHoraFim: ag.dataHoraFim
        })),
        precoParticular: precoParticular ? {
          id: precoParticular.id,
          preco: precoParticular.preco,
          tipoPagamento: precoParticular.tipoPagamento,
          diaPagamento: precoParticular.diaPagamento,
          pagamentoAntecipado: precoParticular.pagamentoAntecipado,
          notaFiscal: precoParticular.notaFiscal,
          recibo: precoParticular.recibo
        } : null
      };
    } else {
      // Payload para agendamento individual
      return {
        tipo: 'INDIVIDUAL',
        acao: 'SOLICITAR_PAGAMENTO',
        agendamento: {
          ...agendamento,
          // Manter datas no formato original
          dataHoraInicio: agendamento.dataHoraInicio,
          dataHoraFim: agendamento.dataHoraFim
        },
        precoParticular: precoParticular ? {
          id: precoParticular.id,
          preco: precoParticular.preco,
          tipoPagamento: precoParticular.tipoPagamento,
          diaPagamento: precoParticular.diaPagamento,
          pagamentoAntecipado: precoParticular.pagamentoAntecipado,
          notaFiscal: precoParticular.notaFiscal,
          recibo: precoParticular.recibo
        } : null
      };
    }
  };

  // Função para executar o webhook de pagamento
  const executarWebhookPagamento = async (agendamento: Agendamento) => {
    const webhookUrl = import.meta.env.VITE_WEBHOOK_SOLICITAR_PAGAMENTO_PARTICULAR;
    
    if (!webhookUrl) {
      AppToast.error("Erro de configuração", { 
        description: "URL do webhook para solicitação de pagamento não configurada. Verifique o arquivo .env" 
      });
      throw new Error("URL do webhook não configurada");
    }

    const payload = construirPayloadWebhookPagamento(agendamento, agendamentos);

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

    // Determinar a mensagem baseada no tipo de pagamento
    const precoInfo = encontrarPreco(agendamento.pacienteId, agendamento.servicoId);
    const isMensal = precoInfo?.tipoPagamento === 'Mensal';
    const tipoMensagem = isMensal ? 'mensal' : 'individual';

    // Exibir toast de sucesso
    AppToast.success("Solicitação enviada", { 
      description: `Solicitação de pagamento ${tipoMensagem} enviada para ${agendamento.pacienteNome} via WhatsApp.` 
    });

    // Atualizar a lista local se necessário
    carregarAgendamentos();
  };

  // Função para processar o próximo webhook na fila
  const processarProximoWebhookPagamento = async () => {
    if (isProcessingWebhook || webhookQueue.length === 0) {
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
      await executarWebhookPagamento(proximoItem.agendamento);
      
      // Sucesso: remover da fila e do processamento
      setWebhookQueue(prev => prev.slice(1));
      removerProcessamento(proximoItem.agendamento.id);
      
    } catch (error) {
      console.error('Erro ao processar webhook de pagamento:', error);
      AppToast.error("Erro", { 
        description: `Erro ao enviar solicitação de pagamento para ${proximoItem.agendamento.pacienteNome}. Tente novamente.` 
      });
      
      // Erro: também remover da fila
      setWebhookQueue(prev => prev.slice(1));
      removerProcessamento(proximoItem.agendamento.id);
    } finally {
      setIsProcessingWebhook(false);
    }
  };

  // Effect para processar a fila de webhooks de pagamento
  useEffect(() => {
    if (webhookQueue.length > 0 && !isProcessingWebhook) {
      processarProximoWebhookPagamento();
    }
  }, [webhookQueue, isProcessingWebhook]);

  // Cleanup do timeout ao desmontar componente
  useEffect(() => {
    return () => {
      if (webhookTimeoutRef.current) {
        clearTimeout(webhookTimeoutRef.current);
      }
    };
  }, []);

  // Função principal para solicitar pagamento
  const handleSolicitarPagamento = async (agendamento: Agendamento) => {
    try {
      adicionarNaFilaPagamento(agendamento);
    } catch (error) {
      AppToast.error("Erro", { 
        description: `Erro ao adicionar solicitação de pagamento para ${agendamento.pacienteNome} na fila. Tente novamente.` 
      });
      removerProcessamento(agendamento.id);
    }
  };

  // Função para abrir WhatsApp
  const handleWhatsApp = (agendamento: Agendamento) => {
    const paciente = agendamento.paciente;
    if (!paciente?.whatsapp) {
      AppToast.warning("Número não encontrado", { 
        description: "Número do WhatsApp não encontrado para este paciente." 
      });
      return;
    }

    // Limpar e validar número de WhatsApp
    const numeroLimpo = paciente.whatsapp.replace(/\D/g, '');
    
    if (numeroLimpo.length < 10) {
      AppToast.warning("Número inválido", { 
        description: "Número do WhatsApp não encontrado para este paciente." 
      });
      return;
    }

    // Construir URL do WhatsApp Web
    const whatsappUrl = `https://api.whatsapp.com/send/?phone=${numeroLimpo}`;
    
    // Abrir em nova aba
    window.open(whatsappUrl, '_blank');
  };

  // Função para preparar dados da conta a receber
  const prepararDadosContaReceber = (agendamento: Agendamento) => {
    // Verificar se faz parte de um grupo mensal
    const grupoMensal = encontrarGrupoMensalDoAgendamento(agendamento, agendamentos);
    
    let descricao = '';
    let valorTotal = 0;
    let observacoes = '';

    if (grupoMensal) {
      // Para grupo mensal
      descricao = `Pagamento particular mensal - ${agendamento.servicoNome} - ${agendamento.pacienteNome} - ${grupoMensal.mesAnoDisplay} (${grupoMensal.quantidadeAgendamentos}x)`;
      valorTotal = grupoMensal.precoTotal;
      observacoes = `Gerado automaticamente pelo fechamento mensal de ${grupoMensal.quantidadeAgendamentos} agendamentos particulares`;
      
      // Salvar dados do grupo para usar no fechamento
      setGrupoMensalSelecionado(grupoMensal);
    } else {
      // Para agendamento avulso
      descricao = `Pagamento particular - ${agendamento.servicoNome} - ${agendamento.pacienteNome}`;
      valorTotal = calcularValorTotal(agendamento);
      observacoes = 'Gerado automaticamente pelo fechamento de agendamento particular';
      
      // Limpar grupo mensal
      setGrupoMensalSelecionado(null);
    }
    
    const dadosPreenchidos = {
      descricao,
      pacienteId: agendamento.pacienteId,
      convenioId: agendamento.convenioId || '',
      numeroDocumento: '', // Deixar vazio para o usuário preencher
      valorOriginal: valorTotal.toString(),
      dataEmissao: new Date().toISOString().split('T')[0],
      dataVencimento: new Date().toISOString().split('T')[0],
      observacoes,
      // Dados extras para controlar o fluxo de recebimento
      _autoReceived: true, // Flag para indicar que deve ser marcado como recebido automaticamente
      _dataRecebimento: new Date().toISOString().split('T')[0],
      _formaRecebimento: 'PIX', // Padrão, mas será editável
      _valorRecebido: valorTotal,
      _showFormaRecebimento: true, // Flag para mostrar o campo de forma de recebimento
      // Pré-preenchimentos dos novos campos
      _empresaNome: 'CELEBRAMENTE', // Nome da empresa para buscar
      _contaBancariaNome: 'Banco Inter da Celebramente', // Nome da conta bancária para buscar
      _categoriaNome: 'RECEITA SERVIÇOS' // Nome da categoria para buscar
    };

    setContaReceberData(dadosPreenchidos);
    setAgendamentoSelecionado(agendamento);
    setShowContaReceberModal(true);
  };

  // Função para executar o fechamento de recebimento (marca recebimento = true, mantém status FINALIZADO)
  const executarFechamentoPagamento = async () => {
    if (!agendamentoSelecionado) return;

    try {
      if (grupoMensalSelecionado) {
        // Para grupo mensal: atualizar todos os agendamentos do grupo
        console.log('Atualizando grupo mensal:', grupoMensalSelecionado.agendamentos.length, 'agendamentos');

        const updatePromises = grupoMensalSelecionado.agendamentos.map((agendamento: Agendamento) =>
          api.put(`/agendamentos/${agendamento.id}`, {
            recebimento: true  // Marca como recebido do paciente, NÃO muda o status
          })
        );

        await Promise.all(updatePromises);
        console.log('Todos os agendamentos do grupo foram atualizados');
      } else {
        // Para agendamento individual
        console.log('Atualizando agendamento individual:', agendamentoSelecionado.id);
        await api.put(`/agendamentos/${agendamentoSelecionado.id}`, {
          recebimento: true  // Marca como recebido do paciente, NÃO muda o status
        });
      }
    } catch (error) {
      console.error('Erro no fechamento de recebimento:', error);
      throw error; // Re-throw para ser tratado na função chamadora
    }
  };

  // Função para salvar conta a receber e executar fechamento
  const handleSaveContaReceber = async (dadosConta: any) => {
    if (!agendamentoSelecionado) return;
    
    try {
      console.log('Iniciando registro de pagamento para agendamento:', agendamentoSelecionado.id);
      
      // Extrair dados especiais do controle de fluxo
      const { _autoReceived, _dataRecebimento, _formaRecebimento, _valorRecebido, ...contaData } = dadosConta;
      
      console.log('Dados da conta a receber:', contaData);
      
      // 1. Criar a conta a receber como PENDENTE
      console.log('Passo 1: Criando conta a receber...');
      const contaCriada = await createContaReceber(contaData);
      console.log('Conta a receber criada:', contaCriada);
      
      // 2. Criar relacionamento(s) agendamento-conta
      if (contaCriada?.id) {
        try {
          console.log('Passo 2: Criando relacionamento(s) agendamento-conta...');
          
          if (grupoMensalSelecionado) {
            // Para grupo mensal: criar relacionamento para todos os agendamentos
            const relationPromises = grupoMensalSelecionado.agendamentos.map((agendamento: Agendamento) =>
              createAgendamentoConta({
                agendamentoId: agendamento.id,
                contaReceberId: contaCriada.id
              })
            );
            await Promise.all(relationPromises);
            console.log(`Relacionamentos criados para ${grupoMensalSelecionado.agendamentos.length} agendamentos`);
          } else {
            // Para agendamento individual
            await createAgendamentoConta({
              agendamentoId: agendamentoSelecionado.id,
              contaReceberId: contaCriada.id
            });
            console.log('Relacionamento criado com sucesso');
          }
        } catch (relationError) {
          console.warn('Erro ao criar relacionamento agendamento-conta:', relationError);
          // Não interrompe o fluxo se falhar ao criar o relacionamento
        }
      }
      
      // 3. Se deve marcar como recebido automaticamente (cria fluxo_caixa)
      if (_autoReceived && contaCriada?.id) {
        try {
          console.log('Passo 3: Marcando conta como recebida...');
          await receberConta(contaCriada.id, {
            valorRecebido: _valorRecebido || parseFloat(contaData.valorOriginal),
            dataRecebimento: _dataRecebimento,
            formaRecebimento: _formaRecebimento as any,
            contaBancariaId: contaData.contaBancariaId || '',
            observacoes: 'Recebimento automático pelo fechamento de agendamento particular'
          });
          console.log('Conta marcada como recebida com sucesso');
        } catch (receiveError: any) {
          console.error('Erro ao marcar conta como recebida:', receiveError);
          AppToast.warning('Conta criada', 'Conta a receber criada, mas houve problema ao marcar como recebida. Marque manualmente na tela de contas a receber.');
          setShowContaReceberModal(false);
          setContaReceberData(null);
          setAgendamentoSelecionado(null);
          return;
        }
      }
      
      // 4. Executar fechamento (marca recebimento = true, mantém status FINALIZADO)
      console.log('Passo 4: Executando fechamento de recebimento...');
      await executarFechamentoPagamento();
      console.log('Fechamento executado com sucesso');

      // 5. Sucesso: fechar modal e recarregar dados
      setShowContaReceberModal(false);
      setContaReceberData(null);
      setAgendamentoSelecionado(null);
      setGrupoMensalSelecionado(null);
      carregarAgendamentos();

      const mensagemSucesso = grupoMensalSelecionado
        ? `Recebimento registrado para ${grupoMensalSelecionado.agendamentos.length} agendamentos com sucesso!`
        : 'Recebimento registrado com sucesso!';

      AppToast.success('Recebimento registrado', mensagemSucesso);
      
    } catch (error: any) {
      console.error('Erro completo ao registrar pagamento:', error);
      
      let errorMessage = 'Erro inesperado ao registrar pagamento';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      AppToast.error('Erro ao registrar pagamento', {
        description: errorMessage
      });
    }
  };

  // Função para fechar modal de conta a receber
  const handleCloseContaReceberModal = () => {
    setShowContaReceberModal(false);
    setContaReceberData(null);
    setAgendamentoSelecionado(null);
    setGrupoMensalSelecionado(null);
  };

  // Função para registrar pagamento manualmente
  const handleRegistrarPagamento = async (agendamento: Agendamento) => {
    try {
      prepararDadosContaReceber(agendamento);
    } catch (error) {
      AppToast.error("Erro", {
        description: "Erro ao preparar dados para pagamento. Tente novamente."
      });
    }
  };

  // ===== FUNÇÕES PARA FECHAMENTO DE CONVÊNIO =====

  // Função para abrir modal de fechamento de convênio
  const handleEfetuarFechamentoConvenio = (item: FechamentoConvenio) => {
    setFechamentoConvenioData({ convenio: item });
    setShowFechamentoConvenioModal(true);
  };

  // Função para confirmar fechamento de convênio
  const handleConfirmFechamentoConvenio = async (agendamentos: Agendamento[], contaReceberData: any) => {
    try {
      // Função para limpar valores nulos/undefined dos campos opcionais
      const cleanOptionalField = (value: any) => {
        if (value === null || value === undefined || value === '') {
          return undefined;
        }
        return value;
      };

      const fechamentoData: FechamentoRecebimentoData = {
        agendamentoIds: agendamentos.map(a => a.id),
        contaReceber: {
          descricao: contaReceberData.descricao,
          valorOriginal: parseFloat(contaReceberData.valorOriginal),
          dataVencimento: contaReceberData.dataVencimento,
          dataEmissao: contaReceberData.dataEmissao,
          empresaId: cleanOptionalField(contaReceberData.empresaId),
          contaBancariaId: cleanOptionalField(contaReceberData.contaBancariaId),
          categoriaId: cleanOptionalField(contaReceberData.categoriaId),
          convenioId: cleanOptionalField(contaReceberData.convenioId),
          numeroDocumento: cleanOptionalField(contaReceberData.numeroDocumento),
          tipoConta: 'RECEITA',
          recorrente: cleanOptionalField(contaReceberData.recorrente),
          observacoes: cleanOptionalField(contaReceberData.observacoes),
        }
      };

      await efetuarFechamentoRecebimento(fechamentoData);

      AppToast.success('Fechamento realizado com sucesso', {
        description: 'A conta a receber foi criada e os agendamentos foram marcados como recebidos.'
      });

      // Recarregar dados para refletir as mudanças
      carregarAgendamentos();
      
    } catch (error: any) {
      console.error('Erro ao efetuar fechamento:', error);
      AppToast.error('Erro ao efetuar fechamento', {
        description: error?.response?.data?.message || 'Ocorreu um erro inesperado.'
      });
      throw error;
    }
  };

  // Função para calcular valor a receber pela clínica
  const calcularValorClinica = (agendamento: Agendamento): number => {
    // Prioridade 1: valor_clinica direto do serviço
    const valorClinicaDireto = parseFloat((agendamento as any).servico?.valorClinica || '0');
    if (valorClinicaDireto > 0) {
      return valorClinicaDireto;
    }

    // Prioridade 2: valor direto da tabela precos_servicos_profissional (se existir)
    // (para casos onde há preços personalizados por profissional)
    
    // Prioridade 3: cálculo baseado no percentual padrão do serviço
    const precoServico = parseFloat((agendamento as any).servico?.preco || '0');
    const percentualClinica = parseFloat((agendamento as any).servico?.percentualClinica || '0');
    
    if (percentualClinica > 0 && precoServico > 0) {
      return (precoServico * percentualClinica) / 100;
    }

    // Fallback: usar preço total se não há divisão definida
    return precoServico;
  };

  // Filtrar agendamentos apenas por busca textual
  // Note: Todos os filtros (status, convênio, data, etc.) já são aplicados pela API/backend
  const agendamentosFiltrados = (Array.isArray(agendamentos) ? agendamentos : [])
    .filter(a =>
      !busca ||
      a.pacienteNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.profissionalNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.servicoNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.convenioNome?.toLowerCase().includes(busca.toLowerCase())
    );

  // Processar dados para visualização de convênios
  const processarDadosConvenios = (): FechamentoConvenio[] => {
    const conveniosMap = new Map<string, {
      agendamentos: Agendamento[],
      valorTotal: number
    }>();

    // Backend já filtra Particular via convenioIdExcluir, não precisa filtrar novamente
    const agendamentosConvenios = agendamentosFiltrados;

    agendamentosConvenios.forEach(agendamento => {
      const convenio = agendamento.convenioNome || 'Não informado';
      
      if (!conveniosMap.has(convenio)) {
        conveniosMap.set(convenio, {
          agendamentos: [],
          valorTotal: 0
        });
      }

      const dados = conveniosMap.get(convenio)!;
      dados.agendamentos.push(agendamento);
      // Calcular valor total do serviço (igual ao modal)
      const valorTotal = calcularValorTotal(agendamento);
      dados.valorTotal += valorTotal;
    });

    return Array.from(conveniosMap.entries()).map(([convenio, dados]) => {
      
      const datas = dados.agendamentos
        .map(a => {
          if (!a.dataHoraInicio) return null;
          // Ajustar para timezone do Brasil (-3 horas) antes de extrair a data
          const date = new Date(a.dataHoraInicio);
          const brasilDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
          return brasilDate.toISOString().split('T')[0];
        })
        .filter(d => d); // Remove undefined/null values
      
      if (datas.length === 0) {
        const hoje = new Date().toISOString().split('T')[0];
        return {
          convenio: convenio || 'Não informado',
          dataInicio: hoje,
          dataFim: hoje,
          qtdAgendamentos: dados.agendamentos.length,
          valorReceber: dados.valorTotal,
          agendamentos: dados.agendamentos
        };
      }

      const dataInicio = Math.min(...datas.map(d => new Date(d).getTime()));
      const dataFim = Math.max(...datas.map(d => new Date(d).getTime()));
      
      const finalDataInicio = new Date(dataInicio).toISOString().split('T')[0];
      const finalDataFim = new Date(dataFim).toISOString().split('T')[0];

      return {
        convenio: convenio || 'Não informado',
        dataInicio: finalDataInicio,
        dataFim: finalDataFim,
        qtdAgendamentos: dados.agendamentos.length,
        valorReceber: dados.valorTotal,
        agendamentos: dados.agendamentos
      };
    });
  };

  // Processar dados para visualização particular
  const processarDadosParticulares = (): FechamentoParticular[] => {
    // Para fechamentos particulares, aplicar filtros diferentes baseado no pagamento antecipado
    const agendamentosParticulares = agendamentos
      .filter(a => 
        // Aplicar os mesmos filtros da interface (busca e filtros avançados), exceto status
        (!busca || 
         a.pacienteNome?.toLowerCase().includes(busca.toLowerCase()) ||
         a.profissionalNome?.toLowerCase().includes(busca.toLowerCase()) ||
         a.servicoNome?.toLowerCase().includes(busca.toLowerCase()) ||
         a.convenioNome?.toLowerCase().includes(busca.toLowerCase())
        )
      )
      .filter(a => !filtrosAplicados.paciente || a.pacienteNome?.toLowerCase().includes(filtrosAplicados.paciente.toLowerCase()))
      .filter(a => !filtrosAplicados.profissional || a.profissionalNome?.toLowerCase().includes(filtrosAplicados.profissional.toLowerCase()))
      .filter(a => !filtrosAplicados.servico || a.servicoNome?.toLowerCase().includes(filtrosAplicados.servico.toLowerCase()))
      .filter(a => !filtrosAplicados.convenio || a.convenioNome?.toLowerCase().includes(filtrosAplicados.convenio.toLowerCase()))
      .filter(a => {
        if (!filtrosAplicados.dataInicio && !filtrosAplicados.dataFim) return true;
        
        // Ajustar para timezone do Brasil (-3 horas) antes de extrair a data
        const date = new Date(a.dataHoraInicio);
        const brasilDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
        const dataAgendamentoISO = brasilDate.toISOString().split('T')[0];
        
        if (filtrosAplicados.dataInicio && dataAgendamentoISO < filtrosAplicados.dataInicio) return false;
        if (filtrosAplicados.dataFim && dataAgendamentoISO > filtrosAplicados.dataFim) return false;
        
        return true;
      })
      .filter(a => 
        // Filtrar apenas atendimentos particulares
        a.convenioNome?.toLowerCase().includes('particular') || 
        a.convenioNome?.toLowerCase().includes('privado') ||
        a.convenioNome === 'Particular'
      )
      .filter(a => {
        // Buscar configuração de preço particular para este agendamento
        const precoParticular = precosParticulares.find(p => 
          p.pacienteId === a.pacienteId && 
          p.servicoId === a.servicoId
        );

        const pagamentoAntecipado = precoParticular?.pagamentoAntecipado ?? false;

        // Se pagamento é antecipado, incluir todos os status
        // Se não é antecipado, incluir apenas status FINALIZADO
        return pagamentoAntecipado ? true : a.status === 'FINALIZADO';
      });

    const resultados: FechamentoParticular[] = [];

    agendamentosParticulares.forEach(agendamento => {
      const paciente = agendamento.pacienteNome || 'Não informado';
      
      // Buscar configuração de preço particular para este paciente/serviço
      const precoParticular = precosParticulares.find(p => 
        p.pacienteId === agendamento.pacienteId && 
        p.servicoId === agendamento.servicoId
      );

      const tipoPagamento = precoParticular?.tipoPagamento || 'Mensal';
      const pagamentoAntecipado = precoParticular?.pagamentoAntecipado ?? false;
      const valorTotal = calcularValorTotal(agendamento);

      if (tipoPagamento === 'Avulso') {
        // Para pagamentos avulsos, cada agendamento é uma linha separada
        let dataAgendamento;
        if (agendamento.dataHoraInicio) {
          const date = new Date(agendamento.dataHoraInicio);
          const brasilDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
          dataAgendamento = brasilDate.toISOString().split('T')[0];
        } else {
          dataAgendamento = new Date().toISOString().split('T')[0];
        }
        
        resultados.push({
          paciente: paciente,
          dataInicio: dataAgendamento,
          dataFim: dataAgendamento,
          qtdAgendamentos: 1,
          valorReceber: valorTotal,
          agendamentos: [agendamento],
          tipoPagamento: tipoPagamento,
          pagamentoAntecipado: pagamentoAntecipado
        });
      } else {
        // Para pagamentos mensais, agrupar por paciente
        const existingEntry = resultados.find(r => 
          r.paciente === paciente && r.tipoPagamento === 'Mensal'
        );

        if (existingEntry) {
          existingEntry.agendamentos.push(agendamento);
          existingEntry.qtdAgendamentos += 1;
          existingEntry.valorReceber += valorTotal;
          
          // Atualizar datas para incluir este agendamento
          let dataAgendamento;
          if (agendamento.dataHoraInicio) {
            const date = new Date(agendamento.dataHoraInicio);
            const brasilDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
            dataAgendamento = brasilDate.toISOString().split('T')[0];
            
            if (dataAgendamento < existingEntry.dataInicio) {
              existingEntry.dataInicio = dataAgendamento;
            }
            if (dataAgendamento > existingEntry.dataFim) {
              existingEntry.dataFim = dataAgendamento;
            }
          }
        } else {
          let dataAgendamento;
          if (agendamento.dataHoraInicio) {
            const date = new Date(agendamento.dataHoraInicio);
            const brasilDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
            dataAgendamento = brasilDate.toISOString().split('T')[0];
          } else {
            dataAgendamento = new Date().toISOString().split('T')[0];
          }
          
          resultados.push({
            paciente: paciente,
            dataInicio: dataAgendamento,
            dataFim: dataAgendamento,
            qtdAgendamentos: 1,
            valorReceber: valorTotal,
            agendamentos: [agendamento],
            tipoPagamento: tipoPagamento,
            pagamentoAntecipado: pagamentoAntecipado
          });
        }
      }
    });

    return resultados;
  };

  const dadosConvenios = processarDadosConvenios();
  const dadosParticulares = processarDadosParticulares().filter(item => {
    // Filtrar apenas registros com recebimento pendente (não completo)
    const status = verificarStatusRecebimento(item.agendamentos);
    return status !== true; // Remove registros com status "Completo" (true)
  });

  const dadosAtivos = dadosConvenios; // Apenas convênios agora
  
  const totalPaginas = Math.ceil(dadosAtivos.length / itensPorPagina);
  const dadosPaginados = dadosAtivos.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  // Função para abrir modal com detalhes dos agendamentos
  const handleVerDetalhes = (item: FechamentoConvenio | FechamentoParticular) => {
    setAgendamentosDetalhes(item.agendamentos);
    
    if ('convenio' in item) {
      setTituloModal(`Agendamentos - ${item.convenio}`);
    } else {
      setTituloModal(`Agendamentos - ${item.paciente}`);
    }
    
    setShowDetalhesModal(true);
  };

  const renderConveniosView = () => (
    <Table>
      <TableHeader>
        <TableRow className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
          <TableHead className="py-3 text-sm font-semibold text-gray-700">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Convênios
            </div>
          </TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700 text-center">
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              Data Início
            </div>
          </TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700 text-center">
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              Data Fim
            </div>
          </TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700 text-center">
            <div className="flex items-center justify-center gap-2">
              <Calculator className="w-4 h-4" />
              Qtd
            </div>
          </TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700 text-center">
            <div className="flex items-center justify-center gap-2">
              <DollarSign className="w-4 h-4" />
              Valor a Receber
            </div>
          </TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700 text-center">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Recebimento
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
        {dadosPaginados.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="py-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">
                  Nenhum fechamento encontrado
                </p>
                <p className="text-gray-400 text-sm">Tente ajustar os filtros de busca</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          dadosPaginados.map((item, index) => (
            <TableRow key={index} className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200">
              <TableCell className="py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {(item.convenio || 'C').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{item.convenio || 'Não informado'}</span>
                </div>
              </TableCell>
              <TableCell className="py-3 text-center">
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                  {formatarDataBrasil(item.dataInicio)}
                </span>
              </TableCell>
              <TableCell className="py-3 text-center">
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                  {formatarDataBrasil(item.dataFim)}
                </span>
              </TableCell>
              <TableCell className="py-3 text-center">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {item.qtdAgendamentos}
                </Badge>
              </TableCell>
              <TableCell className="py-3 text-center">
                <span className="text-sm font-semibold text-green-700 bg-green-50 px-2 py-1 rounded">
                  {formatarValor(item.valorReceber)}
                </span>
              </TableCell>
              <TableCell className="py-3 text-center">
                {(() => {
                  const status = verificarStatusRecebimento(item.agendamentos);
                  if (status === true) {
                    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completo</Badge>;
                  } else if (status === false) {
                    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Pendente</Badge>;
                  } else {
                    return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Parcial</Badge>;
                  }
                })()}
              </TableCell>
              <TableCell className="text-left py-3">
                <div className="flex justify-start gap-1.5">
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                    onClick={() => handleVerDetalhes(item)}
                    title="Ver Agendamentos"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800 focus:ring-4 focus:ring-green-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                    onClick={() => handleEfetuarFechamentoConvenio(item)}
                    title="Efetuar Fechamento"
                  >
                    <TrendingUp className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const renderConveniosCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {dadosPaginados.length === 0 ? (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
          <DollarSign className="w-12 h-12 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            Nenhum fechamento encontrado
          </h3>
          <p className="text-sm">
            {(busca || temFiltrosAtivos) ? 'Tente alterar os filtros de busca.' : 'Aguardando fechamentos de convênios.'}
          </p>
        </div>
      ) : (
        dadosPaginados.map((item, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {(item.convenio || 'C').charAt(0).toUpperCase()}
                  </div>
                  <CardTitle className="text-lg">{item.convenio || 'Não informado'}</CardTitle>
                </div>
                <Badge className="bg-green-100 text-green-700">
                  {item.qtdAgendamentos} atendimentos
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Período: {formatarDataBrasil(item.dataInicio)} a {formatarDataBrasil(item.dataFim)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calculator className="w-4 h-4" />
                  <span>Quantidade: {item.qtdAgendamentos} agendamentos</span>
                </div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-semibold text-green-700">
                  {formatarValor(item.valorReceber)}
                </div>
                <div className="text-xs text-green-600">Valor a receber</div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const renderParticularCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {dadosPaginados.length === 0 ? (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
          <Users className="w-12 h-12 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            Nenhum paciente particular encontrado
          </h3>
          <p className="text-sm">
            Verifique se há agendamentos particulares finalizados
          </p>
        </div>
      ) : (
        dadosPaginados.map((item, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {(item.paciente || 'P').charAt(0).toUpperCase()}
                  </div>
                  <CardTitle className="text-lg">{item.paciente || 'Não informado'}</CardTitle>
                </div>
                <Badge className="bg-blue-100 text-blue-700">
                  {item.qtdAgendamentos} atendimentos
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Período: {formatarDataBrasil(item.dataInicio)} a {formatarDataBrasil(item.dataFim)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calculator className="w-4 h-4" />
                  <span>Quantidade: {item.qtdAgendamentos} agendamentos</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                    {formatarPagamento(item.agendamentos[0])}
                  </span>
                </div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-semibold text-green-700">
                  {formatarValor(item.valorReceber)}
                </div>
                <div className="text-xs text-green-600">Valor a receber</div>
              </div>

              {/* Botões de pagamento - só exibir se há agendamentos não recebidos */}
              {(() => {
                const status = verificarStatusRecebimento(item.agendamentos);
                const temPendente = status === false || status === null;
                
                if (!temPendente) return null;
                
                return (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-yellow-400 text-yellow-700 hover:bg-yellow-600 hover:text-white text-xs h-8"
                          onClick={() => {
                            const agendamentoRef = item.agendamentos[0];
                            handleSolicitarPagamento(agendamentoRef);
                          }}
                          disabled={item.agendamentos.some(ag => estaProcessandoPagamento(ag.id))}
                        >
                          {item.agendamentos.some(ag => estaProcessandoPagamento(ag.id)) ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <PaymentIcon className="w-3 h-3 mr-1" />
                              Solicitar Pagamento
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-400 text-green-700 hover:bg-green-600 hover:text-white h-8 w-8 p-0"
                          onClick={() => {
                            const agendamentoRef = item.agendamentos[0];
                            handleWhatsApp(agendamentoRef);
                          }}
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-blue-400 text-blue-700 hover:bg-blue-600 hover:text-white text-xs h-8"
                        onClick={() => {
                          const agendamentoRef = item.agendamentos[0];
                          handleRegistrarPagamento(agendamentoRef);
                        }}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Registrar Pagamento
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const renderParticularView = () => (
    <Table>
      <TableHeader>
        <TableRow className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
          <TableHead className="py-3 text-sm font-semibold text-gray-700">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Pacientes
            </div>
          </TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700 text-center">
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              Data Início
            </div>
          </TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700 text-center">
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              Data Fim
            </div>
          </TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700 text-center">
            <div className="flex items-center justify-center gap-2">
              <Calculator className="w-4 h-4" />
              Qtd
            </div>
          </TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700 text-center">
            <div className="flex items-center justify-center gap-2">
              <DollarSign className="w-4 h-4" />
              Valor a Receber
            </div>
          </TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700 text-center">
            <div className="flex items-center justify-center gap-2">
              <CreditCard className="w-4 h-4" />
              Pag - Dia - Antec
            </div>
          </TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700 text-center">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Recebimento
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
        {dadosPaginados.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="py-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">
                  Nenhum paciente particular encontrado
                </p>
                <p className="text-gray-400 text-sm">Verifique se há agendamentos particulares finalizados</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          dadosPaginados.map((item, index) => (
            <TableRow key={index} className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200">
              <TableCell className="py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {(item.paciente || 'P').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{item.paciente || 'Não informado'}</span>
                </div>
              </TableCell>
              <TableCell className="py-3 text-center">
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                  {formatarDataBrasil(item.dataInicio)}
                </span>
              </TableCell>
              <TableCell className="py-3 text-center">
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                  {formatarDataBrasil(item.dataFim)}
                </span>
              </TableCell>
              <TableCell className="py-3 text-center">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {item.qtdAgendamentos}
                </Badge>
              </TableCell>
              <TableCell className="py-3 text-center">
                <span className="text-sm font-semibold text-green-700 bg-green-50 px-2 py-1 rounded">
                  {formatarValor(item.valorReceber)}
                </span>
              </TableCell>
              <TableCell className="py-3 text-center">
                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                  {formatarPagamento(item.agendamentos[0])}
                </span>
              </TableCell>
              <TableCell className="py-3 text-center">
                {(() => {
                  const status = verificarStatusRecebimento(item.agendamentos);
                  if (status === true) {
                    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completo</Badge>;
                  } else if (status === false) {
                    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Pendente</Badge>;
                  } else {
                    return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Parcial</Badge>;
                  }
                })()}
              </TableCell>
              <TableCell className="text-left py-3">
                <div className="flex justify-start gap-1.5">
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                    onClick={() => handleVerDetalhes(item)}
                    title="Ver Agendamentos"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  
                  {/* Botões de pagamento - só exibir se há agendamentos não recebidos */}
                  {(() => {
                    const status = verificarStatusRecebimento(item.agendamentos);
                    const temPendente = status === false || status === null;
                    
                    if (!temPendente) return null;
                    
                    return (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-yellow-400 text-yellow-700 hover:bg-yellow-600 hover:text-white hover:border-yellow-600 focus:ring-4 focus:ring-yellow-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => {
                            // Para agendamentos agrupados, usar o primeiro agendamento como referência
                            const agendamentoRef = item.agendamentos[0];
                            handleSolicitarPagamento(agendamentoRef);
                          }}
                          disabled={item.agendamentos.some(ag => estaProcessandoPagamento(ag.id))}
                          title="Solicitar Pagamento"
                        >
                          {item.agendamentos.some(ag => estaProcessandoPagamento(ag.id)) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <PaymentIcon className="w-4 h-4 text-yellow-700 group-hover:text-white transition-colors" />
                          )}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-green-400 text-green-700 hover:bg-green-600 hover:text-white hover:border-green-600 focus:ring-4 focus:ring-green-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => {
                            const agendamentoRef = item.agendamentos[0];
                            handleWhatsApp(agendamentoRef);
                          }}
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4 text-green-700 group-hover:text-white transition-colors" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-blue-400 text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => {
                            const agendamentoRef = item.agendamentos[0];
                            handleRegistrarPagamento(agendamentoRef);
                          }}
                          title="Registrar Pagamento"
                        >
                          <CheckCircle className="w-4 h-4 text-blue-700 group-hover:text-white transition-colors" />
                        </Button>
                      </>
                    );
                  })()}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  if (loading) {
    return (
      <div className="pt-2 pl-6 pr-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Carregando fechamentos...</p>
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
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Fechamento
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar fechamentos..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 hover:border-green-300"
            />
          </div>

          {/* Toggle de visualização Tabela/Cards */}
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

      {/* Conteúdo com scroll independente */}
      <div className="flex-1 overflow-y-auto">
        {/* Toggle grande para separar Convênios | Particular */}
        <div className="mb-6">
          {/* Removido tabs - mostra apenas Convênios */}
          <div className="rounded-lg bg-white shadow-sm border border-gray-100">
            {visualizacao === 'tabela' ? renderConveniosView() : renderConveniosCardView()}
          </div>
        </div>
      </div>

      {/* Footer fixo na parte de baixo */}
      {dadosAtivos.length > 0 && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 py-4 px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <span className="text-lg">📊</span>
                Exibir
              </span>
              <select
                className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-100 focus:border-green-500 transition-all duration-200 hover:border-green-300"
                value={itensPorPagina}
                onChange={e => setItensPorPagina(Number(e.target.value))}
              >
                {[10, 25, 50, 100].map(qtd => (
                  <option key={qtd} value={qtd}>{qtd}</option>
                ))}
              </select>
              <span className="text-sm text-gray-600">itens por página</span>
            </div>
            
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <span className="text-lg">📈</span>
              Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, dadosAtivos.length)} de {dadosAtivos.length} resultados
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                disabled={paginaAtual === 1 || totalPaginas === 1}
                className={(paginaAtual === 1 || totalPaginas === 1)
                  ? "border-2 border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed font-medium shadow-none hover:bg-gray-50" 
                  : "border-2 border-gray-200 text-gray-700 hover:border-green-500 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:text-green-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
                }
              >
                <span className="mr-1 text-gray-600 group-hover:text-green-600 transition-colors">⬅️</span>
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
                      ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg font-semibold" 
                      : totalPaginas === 1
                      ? "border-2 border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed font-medium shadow-none hover:bg-gray-50"
                      : "border-2 border-gray-200 text-gray-700 hover:border-green-500 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:text-green-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
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
                  : "border-2 border-gray-200 text-gray-700 hover:border-green-500 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:text-green-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
                }
              >
                Próximo
                <span className="ml-1 text-gray-600 group-hover:text-green-600 transition-colors">➡️</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Listagem de Agendamentos */}
      <ListarAgendamentosModal
        isOpen={showDetalhesModal}
        agendamentos={agendamentosDetalhes}
        titulo={tituloModal}
        onClose={() => {
          setShowDetalhesModal(false);
          setAgendamentosDetalhes([]);
          setTituloModal('');
        }}
        calcularValor={calcularValorTotal}
      />

      {/* Modal de criação de conta a receber para registrar pagamento */}
      <ContaReceberModal
        isOpen={showContaReceberModal}
        conta={contaReceberData}
        onClose={handleCloseContaReceberModal}
        onSave={handleSaveContaReceber}
      />

      {/* Modal de fechamento de recebimento para convênios */}
      {fechamentoConvenioData.convenio && (
        <FechamentoRecebimentoModal
          isOpen={showFechamentoConvenioModal}
          agendamentos={fechamentoConvenioData.convenio.agendamentos}
          convenioNome={fechamentoConvenioData.convenio.convenio}
          convenioId={fechamentoConvenioData.convenio.agendamentos[0]?.convenioId}
          valorTotal={fechamentoConvenioData.convenio.valorReceber}
          onClose={() => setShowFechamentoConvenioModal(false)}
          onConfirmFechamento={handleConfirmFechamentoConvenio}
          calcularValor={calcularValorTotal}
        />
      )}
    </div>
  );
};