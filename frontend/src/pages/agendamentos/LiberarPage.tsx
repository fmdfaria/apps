import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
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
import type { Agendamento } from '@/types/Agendamento';
import { getAgendamentos, updateAgendamento } from '@/services/agendamentos';

import { LiberarAgendamentoModal, DetalhesAgendamentoModal } from '@/components/agendamentos';
import ConfirmacaoModal from '@/components/ConfirmacaoModal';
import api from '@/services/api';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import { AppToast } from '@/services/toast';
import { formatarDataHoraLocal } from '@/utils/dateUtils';

// Interface para item da fila de webhooks
interface WebhookQueueItem {
  agendamento: Agendamento;
  timestamp: number;
}

export const LiberarPage = () => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para controle de permissões RBAC
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [canLiberar, setCanLiberar] = useState(true);
  const [busca, setBusca] = useState('');
  const [buscaLocal, setBuscaLocal] = useState('');
  const buscaTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('tabela');

  const [showLiberarAgendamento, setShowLiberarAgendamento] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);
  const [showDetalhesAgendamento, setShowDetalhesAgendamento] = useState(false);
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState<Agendamento | null>(null);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalResultados, setTotalResultados] = useState(0); // filtrado
  const [totalGlobal, setTotalGlobal] = useState(0); // sem filtros adicionais
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [agendamentosProcessando, setAgendamentosProcessando] = useState<Set<string>>(new Set());
  
  // Estados para confirmação de reenvio
  const [showConfirmacaoReenvio, setShowConfirmacaoReenvio] = useState(false);
  const [agendamentoParaReenvio, setAgendamentoParaReenvio] = useState<Agendamento | null>(null);

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
  const adicionarNaFila = (agendamento: Agendamento) => {
    const novoItem: WebhookQueueItem = {
      agendamento,
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
      await executarWebhook(proximoItem.agendamento);
      
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

  // Filtros por coluna
  const [filtros, setFiltros] = useState({
    paciente: '',
    profissional: '',
    servico: '',
    convenio: '',
    tipoAtendimento: '',
    dataInicio: '',
    dataFim: ''
  });

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
  }, [paginaAtual, itensPorPagina, filtros, busca]);

  // Reset de página quando busca/filtros/limite mudarem
  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, itensPorPagina, filtros]);

  // Funções para busca global com debouncing
  const aplicarBusca = (valor: string) => {
    setBusca(valor);
  };

  const handleBuscaChange = (valor: string) => {
    setBuscaLocal(valor);
    
    // Limpar timeout anterior
    if (buscaTimeoutRef.current) {
      clearTimeout(buscaTimeoutRef.current);
    }
    
    // Definir novo timeout para aplicar busca após 600ms sem digitar
    buscaTimeoutRef.current = setTimeout(() => {
      aplicarBusca(valor);
    }, 600);
  };

  // Sincronizar busca local quando busca externa muda (apenas se diferente)
  useEffect(() => {
    if (buscaLocal !== busca) {
      setBuscaLocal(busca);
    }
  }, [busca]);

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

  // Cleanup do timeout de busca e webhook ao desmontar componente
  useEffect(() => {
    return () => {
      if (buscaTimeoutRef.current) {
        clearTimeout(buscaTimeoutRef.current);
      }
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

  const carregarAgendamentos = async () => {
    // Não verifica canRead aqui pois a verificação é apenas para a permissão de liberação
    setLoading(true);
    setAgendamentos([]); // Limpa agendamentos para evitar mostrar dados antigos
    try {
      // Buscar duas listas paginadas por status relevantes para liberação
      const [agendadosRes, solicitadosRes] = await Promise.all([
        getAgendamentos({ 
          page: paginaAtual, 
          limit: itensPorPagina, 
          status: 'AGENDADO',
          ...(filtros.dataInicio ? { dataInicio: filtros.dataInicio } : {}),
          ...(filtros.dataFim ? { dataFim: filtros.dataFim } : {}),
          ...(filtros.tipoAtendimento ? { tipoAtendimento: filtros.tipoAtendimento } : {}),
        }),
        getAgendamentos({ 
          page: paginaAtual, 
          limit: itensPorPagina, 
          status: 'SOLICITADO',
          ...(filtros.dataInicio ? { dataInicio: filtros.dataInicio } : {}),
          ...(filtros.dataFim ? { dataFim: filtros.dataFim } : {}),
          ...(filtros.tipoAtendimento ? { tipoAtendimento: filtros.tipoAtendimento } : {}),
        }),
      ]);
      const lista = [...agendadosRes.data, ...solicitadosRes.data];
      setAgendamentos(lista);
      const totalFiltrado = (agendadosRes.pagination?.total || 0) + (solicitadosRes.pagination?.total || 0);
      setTotalResultados(totalFiltrado);
      // Totais globais sem filtros adicionais
      const [agGlobal, solGlobal] = await Promise.all([
        getAgendamentos({ page: 1, limit: 1, status: 'AGENDADO' }),
        getAgendamentos({ page: 1, limit: 1, status: 'SOLICITADO' }),
      ]);
      setTotalGlobal((agGlobal.pagination?.total || 0) + (solGlobal.pagination?.total || 0));
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

  const updateFiltro = (campo: keyof typeof filtros, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
    setPaginaAtual(1);
  };

  const limparFiltro = (campo: keyof typeof filtros) => {
    setFiltros(prev => ({ ...prev, [campo]: '' }));
    setPaginaAtual(1);
  };

  const limparTodosFiltros = () => {
    setFiltros({
      paciente: '',
      profissional: '',
      servico: '',
      convenio: '',
      tipoAtendimento: '',
      dataInicio: '',
      dataFim: ''
    });
    setPaginaAtual(1);
  };

  const temFiltrosAtivos = Object.values(filtros).some(filtro => filtro !== '');

  // Função para formatar data no formato brasileiro
  const formatarDataBrasil = (dataISO: string) => {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // Extrair listas únicas para os selects
  const agendadosBase = agendamentos.filter(a => a.status === 'AGENDADO' || a.status === 'SOLICITADO');

  const agendamentosFiltrados = agendamentos
    .filter(a => a.status === 'AGENDADO' || a.status === 'SOLICITADO')
    .filter(a => 
      !busca || 
      a.pacienteNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.profissionalNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.servicoNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.convenioNome?.toLowerCase().includes(busca.toLowerCase())
    )
    // Filtros por coluna
    .filter(a => !filtros.paciente || a.pacienteNome?.toLowerCase().includes(filtros.paciente.toLowerCase()))
    .filter(a => !filtros.profissional || a.profissionalNome?.toLowerCase().includes(filtros.profissional.toLowerCase()))
    .filter(a => !filtros.servico || a.servicoNome?.toLowerCase().includes(filtros.servico.toLowerCase()))
    .filter(a => !filtros.convenio || a.convenioNome?.toLowerCase().includes(filtros.convenio.toLowerCase()))
    .filter(a => !filtros.tipoAtendimento || a.tipoAtendimento === filtros.tipoAtendimento)
    .filter(a => {
      if (!filtros.dataInicio && !filtros.dataFim) return true;
      
      // Extrair apenas a data (YYYY-MM-DD) do agendamento, ignorando horário e timezone
      const dataAgendamentoISO = a.dataHoraInicio.split('T')[0]; // '2024-02-12'
      
      // Comparar apenas as datas no formato YYYY-MM-DD
      if (filtros.dataInicio && dataAgendamentoISO < filtros.dataInicio) return false;
      if (filtros.dataFim && dataAgendamentoISO > filtros.dataFim) return false;
      
      return true;
    })
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

  const totalPaginas = Math.ceil(agendamentosFiltrados.length / itensPorPagina);
  const agendamentosPaginados = agendamentosFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  const formatarDataHora = formatarDataHoraLocal;

  const handleLiberar = (agendamento: Agendamento) => {
    setAgendamentoSelecionado(agendamento);
    setShowLiberarAgendamento(true);
  };

  const handleVerDetalhes = (agendamento: Agendamento) => {
    setAgendamentoDetalhes(agendamento);
    setShowDetalhesAgendamento(true);
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

  const handleSolicitarLiberacaoClick = (agendamento: Agendamento) => {
    if (agendamento.status === 'SOLICITADO') {
      // Mostrar modal de confirmação para reenvio
      setAgendamentoParaReenvio(agendamento);
      setShowConfirmacaoReenvio(true);
    } else {
      // Prosseguir normalmente
      handleSolicitarLiberacao(agendamento);
    }
  };

  const confirmarReenvio = () => {
    if (agendamentoParaReenvio) {
      handleSolicitarLiberacao(agendamentoParaReenvio);
    }
    setShowConfirmacaoReenvio(false);
    setAgendamentoParaReenvio(null);
  };

  const cancelarReenvio = () => {
    setShowConfirmacaoReenvio(false);
    setAgendamentoParaReenvio(null);
  };

  // Função para executar o webhook efetivamente
  const executarWebhook = async (agendamento: Agendamento) => {
    const webhookUrl = import.meta.env.VITE_WEBHOOK_SOLICITAR_LIBERACAO_URL;
    
    if (!webhookUrl) {
      AppToast.error("Erro de configuração", { 
        description: "URL do webhook não configurada. Verifique o arquivo .env" 
      });
      throw new Error("URL do webhook não configurada");
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agendamento)
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    // Capturar a resposta do webhook
    const responseData = await response.json().catch(() => ({}));

    // Atualizar o status no banco de dados
    try {
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

  const handleSolicitarLiberacao = async (agendamento: Agendamento) => {
    // Adicionar na fila de webhooks em vez de executar imediatamente
    try {
      adicionarNaFila(agendamento);
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
            {(busca || temFiltrosAtivos) ? 'Tente alterar os filtros de busca.' : 'Nenhum agendamento pendente de liberação.'}
          </p>
        </div>
      ) : (
        agendamentosPaginados.map(agendamento => {
          const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);
          
          return (
            <Card key={agendamento.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <CardTitle className="text-lg">{agendamento.pacienteNome}</CardTitle>
                  </div>
                  <Badge 
                    variant={agendamento.status === 'AGENDADO' ? 'outline' : 'default'}
                    className={agendamento.status === 'AGENDADO' 
                      ? 'border-blue-300 text-blue-700 bg-blue-50' 
                      : 'border-orange-300 text-orange-700 bg-orange-50'
                    }
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
                    <span>{agendamento.convenioNome}</span>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="default"
                    className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleVerDetalhes(agendamento)}
                  >
                    Visualizar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 h-7 text-xs border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white"
                    onClick={() => handleSolicitarLiberacaoClick(agendamento)}
                    disabled={estaProcessando(agendamento.id)}
                  >
                    {estaProcessando(agendamento.id) ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Solicitar Liberação'
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 h-7 text-xs border-green-300 text-green-600 hover:bg-green-600 hover:text-white"
                    onClick={() => handleWhatsApp(agendamento)}
                  >
                    WhatsApp
                  </Button>
                  {canLiberar ? (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 h-7 text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                      onClick={() => handleLiberar(agendamento)}
                      title="Liberado Atendimento"
                    >
                      Liberado Atendimento
                    </Button>
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
        })
      )}
    </div>
  );

  const renderTableView = () => (
    <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-100">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-gray-200">
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
                <span className="text-lg">🏥</span>
                Convênio
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
              <TableCell colSpan={9} className="py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🔓</span>
                  </div>
                  <p className="text-gray-500 font-medium">
                    {(busca || temFiltrosAtivos) ? 'Nenhum resultado encontrado' : 'Nenhum agendamento pendente de liberação'}
                  </p>
                  <p className="text-gray-400 text-sm">Tente ajustar os filtros de busca</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            agendamentosPaginados.map((agendamento) => {
              const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);
              
              return (
                <TableRow key={agendamento.id} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all duration-200 h-12">
                  <TableCell className="py-2">
                    <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{data}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm font-mono bg-orange-100 px-2 py-1 rounded text-orange-700">{hora}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
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
                    <span className="text-sm">{agendamento.convenioNome}</span>
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
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      agendamento.status === 'AGENDADO' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {agendamento.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex gap-1.5">
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleVerDetalhes(agendamento)}
                        title="Visualizar Agendamento"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="group border-2 border-orange-300 text-orange-600 hover:bg-orange-600 hover:text-white hover:border-orange-600 focus:ring-4 focus:ring-orange-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => handleSolicitarLiberacaoClick(agendamento)}
                        disabled={estaProcessando(agendamento.id)}
                        title="Solicitar Liberação"
                      >
                        {estaProcessando(agendamento.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Unlock className="w-4 h-4 text-orange-600 group-hover:text-white transition-colors" />
                        )}
                      </Button>
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-emerald-300 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 focus:ring-4 focus:ring-emerald-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => handleLiberar(agendamento)}
                          title="Liberado Atendimento"
                        >
                          <CheckSquare className="w-4 h-4 text-emerald-600 group-hover:text-white transition-colors" />
                        </Button>
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
            <span className="text-4xl">🔓</span>
            <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Liberações
            </span>
          </h1>
          <div className="flex items-center gap-3">
            {agendamentosProcessando.size > 0 && (
              <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-300">
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
              placeholder="Buscar agendamentos..."
              value={buscaLocal}
              onChange={e => handleBuscaChange(e.target.value)}
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

        </div>
      </div>

      {/* Painel de Filtros Avançados */}
      {mostrarFiltros && (
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filtros Avançados</h3>
            <div className="flex gap-2">
              {temFiltrosAtivos && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limparTodosFiltros}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <FilterX className="w-4 h-4 mr-1" />
                  Limpar Filtros
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMostrarFiltros(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Filtro Data Início */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Data Início</span>
              <Input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => updateFiltro('dataInicio', e.target.value)}
                className="h-8"
              />
            </div>

            {/* Filtro Data Fim */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Data Fim</span>
              <Input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => updateFiltro('dataFim', e.target.value)}
                className="h-8"
              />
            </div>

            {/* Filtro Convênio */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Convênio</span>
              <Input
                placeholder="Nome do convênio..."
                value={filtros.convenio}
                onChange={(e) => updateFiltro('convenio', e.target.value)}
                className="h-8"
              />
            </div>

            {/* Filtro Serviço */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Serviço</span>
              <Input
                placeholder="Nome do serviço..."
                value={filtros.servico}
                onChange={(e) => updateFiltro('servico', e.target.value)}
                className="h-8"
              />
            </div>

            {/* Filtro Tipo Atendimento */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Tipo Atendimento</span>
              <select
                value={filtros.tipoAtendimento}
                onChange={(e) => updateFiltro('tipoAtendimento', e.target.value)}
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os tipos</option>
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
              </select>
            </div>

            {/* Filtro Paciente */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Paciente</span>
              <Input
                placeholder="Nome do paciente..."
                value={filtros.paciente}
                onChange={(e) => updateFiltro('paciente', e.target.value)}
                className="h-8"
              />
            </div>

            {/* Filtro Profissional */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Profissional</span>
              <Input
                placeholder="Nome do profissional..."
                value={filtros.profissional}
                onChange={(e) => updateFiltro('profissional', e.target.value)}
                className="h-8"
              />
            </div>
          </div>

          {/* Resumo dos Filtros Ativos */}
          {temFiltrosAtivos && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-gray-600">Filtros ativos:</span>
                {Object.entries(filtros)
                  .filter(([_, valor]) => valor !== '')
                  .map(([campo, valor]) => {
                    const labels = {
                      paciente: 'Paciente',
                      profissional: 'Profissional', 
                      servico: 'Serviço',
                      convenio: 'Convênio',
                      tipoAtendimento: 'Tipo',
                      dataInicio: 'De',
                      dataFim: 'Até'
                    };
                    
                    // Formatar valor para datas no formato brasileiro
                    const valorFormatado = (campo === 'dataInicio' || campo === 'dataFim') 
                      ? formatarDataBrasil(valor) 
                      : valor;
                    
                    return (
                      <Badge key={campo} variant="secondary" className="text-xs inline-flex items-center gap-1">
                        {labels[campo as keyof typeof labels]}: {valorFormatado}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateFiltro(campo as keyof typeof filtros, '')}
                          className="h-4 w-4 p-0 hover:text-red-600 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

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
              className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200 hover:border-orange-300"
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
            <div>
              Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, totalResultados)} de {totalGlobal} resultados {(temFiltrosAtivos || busca) && (
                <span className="text-gray-500">
                  {' '}(filtrados de {totalResultados} total)
                </span>
              )}
            </div>
          </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
            disabled={paginaAtual === 1 || totalPaginas === 1}
            className={(paginaAtual === 1 || totalPaginas === 1)
              ? "border-2 border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed font-medium shadow-none hover:bg-gray-50" 
              : "border-2 border-gray-200 text-gray-700 hover:border-orange-500 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:text-orange-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
            }
          >
            <span className="mr-1 text-gray-600 group-hover:text-orange-600 transition-colors">⬅️</span>
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
                  ? "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg font-semibold" 
                  : totalPaginas === 1
                  ? "border-2 border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed font-medium shadow-none hover:bg-gray-50"
                  : "border-2 border-gray-200 text-gray-700 hover:border-orange-500 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:text-orange-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
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
              : "border-2 border-gray-200 text-gray-700 hover:border-orange-500 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:text-orange-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
            }
          >
            Próximo
            <span className="ml-1 text-gray-600 group-hover:text-orange-600 transition-colors">➡️</span>
          </Button>
        </div>
        </div>
      )}

      {/* Modais */}
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

      <LiberarAgendamentoModal
        isOpen={showLiberarAgendamento}
        agendamento={agendamentoSelecionado}
        onClose={() => {
          setShowLiberarAgendamento(false);
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
    </div>
  );
}; 