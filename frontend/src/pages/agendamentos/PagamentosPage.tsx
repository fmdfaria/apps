import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { AdvancedFilter, type FilterField } from '@/components/ui/advanced-filter';
import {
  DollarSign,
  Clock,
  Users,
  Calendar,
  Search,
  LayoutGrid,
  List,
  Filter,
  Calculator,
  Building,
  Eye,
  CreditCard,
  MessageCircle
} from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import { getAgendamentos, efetuarFechamentoPagamento, marcarWhatsappPagamentoEnviado, type FechamentoPagamentoData } from '@/services/agendamentos';
import { ListarAgendamentosModal, FechamentoPagamentoModal } from '@/components/agendamentos';
import ConfirmacaoModal from '@/components/ConfirmacaoModal';
import api from '@/services/api';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import { AppToast } from '@/services/toast';
import { getProfissionais } from '@/services/profissionais';
import { getServicos } from '@/services/servicos';

interface PagamentoProfissional {
  profissional: string;
  profissionalId: string;
  dataInicio: string;
  dataFim: string;
  qtdAgendamentos: number;
  valorPagar: number;
  agendamentos: Agendamento[];
  whatsappJaEnviado: boolean; // Indica se algum agendamento já teve WhatsApp enviado
}

interface PrecoServicoProfissional {
  id: string;
  profissionalId: string;
  servicoId: string;
  precoProfissional: number;
}

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
    key: 'profissionalId', 
    type: 'api-select', 
    label: 'Profissional',
    apiService: getProfissionais,
    placeholder: 'Selecione um profissional...',
    searchFields: ['nome']
  },
  { 
    key: 'servicoId', 
    type: 'api-select', 
    label: 'Serviço',
    apiService: getServicos,
    placeholder: 'Selecione um serviço...',
    searchFields: ['nome']
  }
];

export const PagamentosPage = () => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [busca, setBusca] = useState('');
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('tabela');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [precosServicoProfissional, setPrecosServicoProfissional] = useState<PrecoServicoProfissional[]>([]);

  // Modal para listar agendamentos
  const [showListarModal, setShowListarModal] = useState(false);
  const [agendamentosModal, setAgendamentosModal] = useState<Agendamento[]>([]);
  const [tituloModal, setTituloModal] = useState('');

  // Modal para fechamento de pagamento
  const [showFechamentoModal, setShowFechamentoModal] = useState(false);
  const [fechamentoData, setFechamentoData] = useState<{
    profissional: PagamentoProfissional | null;
  }>({ profissional: null });

  // Estado para loading do WhatsApp
  const [whatsappLoadingIds, setWhatsappLoadingIds] = useState<Set<string>>(new Set());

  // Modal de confirmação WhatsApp
  const [showConfirmacaoWhatsApp, setShowConfirmacaoWhatsApp] = useState(false);
  const [profissionalParaWhatsApp, setProfissionalParaWhatsApp] = useState<PagamentoProfissional | null>(null);

  // Filtros avançados (seguindo padrão do AgendamentosPage)
  const [filtros, setFiltros] = useState({
    profissionalId: '',
    servicoId: '',
    dataInicio: '',
    dataFim: ''
  });
  // Estados separados para filtros aplicados vs editados
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    profissionalId: '',
    servicoId: '',
    dataInicio: '',
    dataFim: ''
  });

  // Estado para controle de inicialização (mesmo padrão da AgendamentosPage)
  const [initialized, setInitialized] = useState(false);

  // OTIMIZAÇÃO #1: Create price lookup map for O(1) access instead of O(n) find()
  const precosMap = useMemo(() => {
    const map = new Map<string, PrecoServicoProfissional>();
    precosServicoProfissional.forEach(preco => {
      const key = `${preco.profissionalId}-${preco.servicoId}`;
      map.set(key, preco);
    });
    return map;
  }, [precosServicoProfissional]);

  // OTIMIZAÇÃO #7: Load prices once on mount (they are static)
  useEffect(() => {
    const carregarPrecos = async () => {
      try {
        const precosData = await carregarPrecosServicoProfissional();
        setPrecosServicoProfissional(precosData);
      } catch (error) {
        console.error('Erro ao carregar preços:', error);
      }
    };

    carregarPrecos();
  }, []); // Empty deps - run only on mount

  // Inicialização única (mesmo padrão da AgendamentosPage)
  useEffect(() => {
    checkPermissions();
    carregarDados();
    setInitialized(true);
  }, []);

  // Reset de página quando filtros mudarem
  useEffect(() => {
    if (initialized) {
      setPaginaAtual(1);
      carregarDados(); // Recarregar quando filtros mudarem
    }
  }, [busca, itensPorPagina, filtrosAplicados]);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;

      // Verificar permissão de leitura de pagamentos
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/agendamentos-pagamentos' && route.method.toLowerCase() === 'get';
      });

      // Se não tem permissão de leitura, marca como access denied
      if (!canRead) {
        setAccessDenied(true);
      }
      
    } catch (error: any) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };

  const carregarDados = async () => {
    if (accessDenied) return;

    setLoading(true);
    setAccessDenied(false);
    setAgendamentos([]); // Limpa dados para evitar mostrar dados antigos

    try {
      // OTIMIZAÇÃO #7: Removed price fetching (now loaded once on mount)
      const agendamentosData = await getAgendamentos({
        status: 'FINALIZADO',
        page: 1,
        // Removido limit para usar padrão da API (dados serão agrupados)
        ...(filtrosAplicados.dataInicio ? { dataInicio: filtrosAplicados.dataInicio } : {}),
        ...(filtrosAplicados.dataFim ? { dataFim: filtrosAplicados.dataFim } : {}),
        ...(filtrosAplicados.profissionalId ? { profissionalId: filtrosAplicados.profissionalId } : {}),
        ...(filtrosAplicados.servicoId ? { servicoId: filtrosAplicados.servicoId } : {}),
      });

      // A nova API retorna { data: [], pagination: {} }
      setAgendamentos(agendamentosData.data || []);
    } catch (e: any) {
      console.error('Erro ao carregar dados:', e);
      if (e?.response?.status === 403) {
        setAccessDenied(true);
        // Buscar informações da rota para mensagem mais específica
        try {
          const info = await getRouteInfo('/agendamentos-pagamentos', 'GET');
          setRouteInfo(info);
        } catch (routeError) {
          // Erro ao buscar informações da rota
        }
        // Não mostra toast aqui pois o interceptor já cuida disso
      } else {
        AppToast.error('Erro ao carregar dados', {
          description: 'Ocorreu um problema ao carregar os dados. Tente novamente.'
        });
      }
      // Garantir que agendamentos sempre seja um array
      setAgendamentos([]);
    } finally {
      setLoading(false);
    }
  };

  const carregarPrecosServicoProfissional = async (): Promise<PrecoServicoProfissional[]> => {
    try {
      const response = await api.get('/precos-servicos-profissionais');
      return response.data;
    } catch (error) {
      console.error('Erro ao carregar preços por profissional:', error);
      return [];
    }
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
      profissionalId: '',
      servicoId: '',
      dataInicio: '',
      dataFim: ''
    };
    setFiltros(filtrosLimpos);
    setFiltrosAplicados(filtrosLimpos);
    setPaginaAtual(1);
  };

  const temFiltrosAtivos = Object.values(filtrosAplicados).some(filtro => filtro !== '');

  // OTIMIZAÇÃO #6: Direct field comparison instead of JSON.stringify
  const temFiltrosNaoAplicados =
    filtros.profissionalId !== filtrosAplicados.profissionalId ||
    filtros.servicoId !== filtrosAplicados.servicoId ||
    filtros.dataInicio !== filtrosAplicados.dataInicio ||
    filtros.dataFim !== filtrosAplicados.dataFim;

  // Função para converter data UTC para timezone brasileiro e extrair apenas a data
  const extrairDataBrasil = (dataISO: string) => {
    if (!dataISO) return '';
    // Criar objeto Date e converter para timezone brasileiro
    const data = new Date(dataISO);
    // Converter para timezone brasileiro (UTC-3)
    const dataBrasil = new Date(data.getTime() - (3 * 60 * 60 * 1000));
    return dataBrasil.toISOString().split('T')[0];
  };

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


  // OTIMIZAÇÃO #5: Memoize filter with single pass and pre-lowercased search term
  const agendamentosFiltrados = useMemo(() => {
    const agendamentosArray = Array.isArray(agendamentos) ? agendamentos : [];

    if (!busca) {
      return agendamentosArray.filter(a => a.status === 'FINALIZADO');
    }

    const buscaLower = busca.toLowerCase();
    return agendamentosArray.filter(a =>
      a.status === 'FINALIZADO' && (
        a.pacienteNome?.toLowerCase().includes(buscaLower) ||
        a.profissionalNome?.toLowerCase().includes(buscaLower) ||
        a.servicoNome?.toLowerCase().includes(buscaLower)
      )
    );
  }, [agendamentos, busca]);

  // Processar dados para visualização por profissional
  const processarDadosProfissionais = (): PagamentoProfissional[] => {
    const profissionaisMap = new Map<string, {
      agendamentos: Agendamento[],
      valorTotal: number
    }>();

    agendamentosFiltrados.forEach(agendamento => {
      const profissional = agendamento.profissionalNome || 'Não informado';
      const profissionalId = agendamento.profissionalId || '';
      
      if (!profissionaisMap.has(profissional)) {
        profissionaisMap.set(profissional, {
          agendamentos: [],
          valorTotal: 0
        });
      }

      const dados = profissionaisMap.get(profissional)!;
      dados.agendamentos.push(agendamento);
      
      // Calcular valor a pagar para o profissional
      const valorProfissional = calcularValorProfissional(agendamento);
      dados.valorTotal += valorProfissional;
    });

    return Array.from(profissionaisMap.entries()).map(([profissional, dados]) => {
      // Pegar o profissionalId do primeiro agendamento (todos do mesmo profissional)
      const profissionalId = dados.agendamentos[0]?.profissionalId || '';
      const datas = dados.agendamentos
        .map(a => a.dataHoraInicio ? extrairDataBrasil(a.dataHoraInicio) : '')
        .filter(d => d); // Remove undefined/null values
      
      if (datas.length === 0) {
        // Para fallback, usar data atual no timezone brasileiro
        const hoje = new Date();
        const hojeBrasil = new Date(hoje.getTime() - (3 * 60 * 60 * 1000));
        const hojeStr = hojeBrasil.toISOString().split('T')[0];

        // Verificar se algum agendamento já teve WhatsApp enviado
        const whatsappJaEnviado = dados.agendamentos.some(
          ag => ag.whatsappPagamentoEnviado === true
        );

        return {
          profissional: profissional || 'Não informado',
          profissionalId,
          dataInicio: hojeStr,
          dataFim: hojeStr,
          qtdAgendamentos: dados.agendamentos.length,
          valorPagar: dados.valorTotal,
          agendamentos: dados.agendamentos,
          whatsappJaEnviado
        };
      }

      // OTIMIZAÇÃO #3: Use Math.min/max instead of double sort - O(n) instead of O(2n log n)
      // Dates are in 'YYYY-MM-DD' format, so we can compare them directly
      const dataInicio = datas.reduce((min, data) => data < min ? data : min, datas[0]);
      const dataFim = datas.reduce((max, data) => data > max ? data : max, datas[0]);

      // Verificar se algum agendamento já teve WhatsApp enviado
      const whatsappJaEnviado = dados.agendamentos.some(
        ag => ag.whatsappPagamentoEnviado === true
      );

      return {
        profissional: profissional || 'Não informado',
        profissionalId,
        dataInicio,
        dataFim,
        qtdAgendamentos: dados.agendamentos.length,
        valorPagar: dados.valorTotal,
        agendamentos: dados.agendamentos,
        whatsappJaEnviado
      };
    });
  };

  // Função para calcular valor a pagar para o profissional
  const calcularValorProfissional = (agendamento: Agendamento): number => {
    // Prioridade 1: valor direto da tabela precos_servicos_profissional
    // OTIMIZAÇÃO #1: Use Map lookup O(1) instead of array.find() O(n)
    const key = `${agendamento.profissionalId}-${agendamento.servicoId}`;
    const precoEspecifico = precosMap.get(key);

    if (precoEspecifico?.precoProfissional && precoEspecifico.precoProfissional > 0) {
      return precoEspecifico.precoProfissional; // Valor direto em R$
    }

    // Prioridade 3: valor_profissional direto do serviço
    const valorProfissionalDireto = parseFloat((agendamento as any).servico?.valorProfissional || '0');
    if (valorProfissionalDireto > 0) {
      return valorProfissionalDireto;
    }

    // Fallback para valor padrão
    return 0;
  };

  // OTIMIZAÇÃO #2: Memoize processarDadosProfissionais to prevent recalculation on every render
  const dadosProfissionais = useMemo(() => {
    return processarDadosProfissionais();
  }, [agendamentosFiltrados, precosMap]);

  // OTIMIZAÇÃO #9: Memoize pagination calculations
  const totalPaginas = useMemo(() =>
    Math.ceil(dadosProfissionais.length / itensPorPagina),
    [dadosProfissionais.length, itensPorPagina]
  );

  const dadosPaginados = useMemo(() =>
    dadosProfissionais.slice(
      (paginaAtual - 1) * itensPorPagina,
      paginaAtual * itensPorPagina
    ),
    [dadosProfissionais, paginaAtual, itensPorPagina]
  );

  const handleVerDetalhes = (item: PagamentoProfissional) => {
    setAgendamentosModal(item.agendamentos);
    setTituloModal(`Atendimentos de ${item.profissional}`);
    setShowListarModal(true);
  };

  const handleEfetuarFechamento = (item: PagamentoProfissional) => {
    setFechamentoData({ profissional: item });
    setShowFechamentoModal(true);
  };

  const handleConfirmFechamento = async (agendamentos: Agendamento[], contaPagarData: any) => {
    try {
      // Função para limpar valores nulos/undefined dos campos opcionais
      const cleanOptionalField = (value: any) => {
        if (value === null || value === undefined || value === '') {
          return undefined;
        }
        return value;
      };

      const fechamentoData: FechamentoPagamentoData = {
        agendamentoIds: agendamentos.map(a => a.id),
        contaPagar: {
          descricao: contaPagarData.descricao,
          valorOriginal: parseFloat(contaPagarData.valorOriginal),
          dataVencimento: contaPagarData.dataVencimento,
          dataEmissao: contaPagarData.dataEmissao,
          profissionalId: contaPagarData.profissionalId,
          tipoConta: 'DESPESA' as const,
          // Campos opcionais - limpar valores nulos
          empresaId: cleanOptionalField(contaPagarData.empresaId),
          contaBancariaId: cleanOptionalField(contaPagarData.contaBancariaId),
          categoriaId: cleanOptionalField(contaPagarData.categoriaId),
          numeroDocumento: cleanOptionalField(contaPagarData.numeroDocumento),
          recorrente: cleanOptionalField(contaPagarData.recorrente),
          observacoes: cleanOptionalField(contaPagarData.observacoes),
        }
      };

      await efetuarFechamentoPagamento(fechamentoData);
      
      AppToast.success('Fechamento realizado com sucesso', {
        description: 'A conta a pagar foi criada e os agendamentos foram arquivados.'
      });

      // Recarregar dados para refletir as mudanças
      carregarDados();
      
    } catch (error: any) {
      console.error('Erro ao efetuar fechamento:', error);
      AppToast.error('Erro ao efetuar fechamento', {
        description: error?.response?.data?.message || 'Ocorreu um erro inesperado.'
      });
      throw error;
    }
  };

  const handleEnviarWhatsAppClick = (item: PagamentoProfissional) => {
    setProfissionalParaWhatsApp(item);
    setShowConfirmacaoWhatsApp(true);
  };

  const cancelarEnvioWhatsApp = () => {
    setShowConfirmacaoWhatsApp(false);
    setProfissionalParaWhatsApp(null);
  };

  const confirmarEnvioWhatsApp = async () => {
    if (!profissionalParaWhatsApp) return;

    setShowConfirmacaoWhatsApp(false);
    setWhatsappLoadingIds(prev => new Set(prev).add(profissionalParaWhatsApp.profissionalId));

    try {
      AppToast.info('Enviando WhatsApp', {
        description: 'Preparando dados para envio...'
      });

      // Fetch webhook data from backend
      const response = await api.get(
        `/agendamentos-pagamentos/${profissionalParaWhatsApp.profissionalId}/webhook-data`,
        {
          params: {
            dataInicio: profissionalParaWhatsApp.dataInicio,
            dataFim: profissionalParaWhatsApp.dataFim
          }
        }
      );

      const dadosWebhook = response.data.data;

      // Get webhook URL from environment
      const webhookUrl = import.meta.env.VITE_WEBHOOK_AGENDAMENTOS_PAGAMENTOS;

      if (!webhookUrl) {
        AppToast.error('Erro de configuração', {
          description: 'URL do webhook não configurada.'
        });
        return;
      }

      // Send to webhook
      AppToast.info('Enviando WhatsApp', {
        description: 'Enviando dados via webhook...'
      });

      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'DADOS_PAGAMENTO_PROFISSIONAL',
          pagamento: dadosWebhook,
          timestamp: new Date().toISOString(),
          origem: 'sistema-clinica'
        })
      });

      if (!webhookResponse.ok) {
        throw new Error(`Erro ao enviar webhook: ${webhookResponse.status}`);
      }

      // Marcar agendamentos como WhatsApp enviado
      try {
        // Extrair IDs dos agendamentos
        const agendamentosIds = profissionalParaWhatsApp.agendamentos.map(ag => ag.id);

        const resultado = await marcarWhatsappPagamentoEnviado(agendamentosIds);
        console.log('Agendamentos marcados com sucesso:', resultado);

        // Atualizar estado local imediatamente para feedback visual rápido
        setAgendamentos(prevAgendamentos =>
          prevAgendamentos.map(ag =>
            agendamentosIds.includes(ag.id)
              ? { ...ag, whatsappPagamentoEnviado: true }
              : ag
          )
        );

        // Também recarregar do servidor para garantir consistência
        await new Promise(resolve => setTimeout(resolve, 500));
        await carregarAgendamentos();
      } catch (marcarError) {
        console.error('Erro ao marcar WhatsApp como enviado:', marcarError);
        // Não falha o processo principal se a marcação falhar
      }

      AppToast.success('WhatsApp Enviado', {
        description: `Dados de pagamento de ${profissionalParaWhatsApp.profissional} enviados com sucesso.`
      });

    } catch (error: any) {
      console.error('Erro ao enviar WhatsApp:', error);
      AppToast.error('Erro ao enviar WhatsApp', {
        description: error?.response?.data?.message || error?.message || 'Tente novamente.'
      });
    } finally {
      setWhatsappLoadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(profissionalParaWhatsApp.profissionalId);
        return newSet;
      });
      setProfissionalParaWhatsApp(null);
    }
  };

  const renderTableView = () => (
    <Table>
      <TableHeader>
        <TableRow className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
          <TableHead className="py-3 text-sm font-semibold text-gray-700">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Profissional
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
              Valor a Pagar
            </div>
          </TableHead>
          {/* Coluna "Status" removida */}
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
            <TableCell colSpan={6} className="py-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">
                  Nenhum pagamento encontrado
                </p>
                <p className="text-gray-400 text-sm">Tente ajustar os filtros de busca</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          dadosPaginados.map((item) => (
            <TableRow key={item.profissionalId} className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200">
              <TableCell className="py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {(item.profissional || 'P').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{item.profissional || 'Não informado'}</span>
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
                  {formatarValor(item.valorPagar)}
                </span>
              </TableCell>
              {/* Coluna "Status" removida */}
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
                  {/* Botão "Enviar WhatsApp" oculto */}
                  {/* <Button
                    variant="default"
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 focus:ring-4 focus:ring-green-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                    onClick={() => handleEnviarWhatsAppClick(item)}
                    disabled={whatsappLoadingIds.has(item.profissionalId)}
                    title="Enviar WhatsApp"
                  >
                    {whatsappLoadingIds.has(item.profissionalId) ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <MessageCircle className="w-4 h-4" />
                    )}
                  </Button> */}
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 focus:ring-4 focus:ring-red-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                    onClick={() => handleEfetuarFechamento(item)}
                    title="Efetuar Fechamento"
                  >
                    <CreditCard className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {dadosPaginados.length === 0 ? (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
          <DollarSign className="w-12 h-12 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            Nenhum pagamento encontrado
          </h3>
          <p className="text-sm">
            {(busca || temFiltrosAtivos) ? 'Tente alterar os filtros de busca.' : 'Aguardando agendamentos finalizados.'}
          </p>
        </div>
      ) : (
        dadosPaginados.map((item) => (
          <Card key={item.profissionalId} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {(item.profissional || 'P').charAt(0).toUpperCase()}
                  </div>
                  <CardTitle className="text-lg">{item.profissional}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Período */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                    {formatarDataBrasil(item.dataInicio)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                    {formatarDataBrasil(item.dataFim)}
                  </span>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Quantidade:</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {item.qtdAgendamentos} atendimentos
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Valor a Pagar:</span>
                  <span className="font-semibold text-green-700 bg-green-50 px-2 py-1 rounded">
                    {formatarValor(item.valorPagar)}
                  </span>
                </div>
                {/* Seção "Status" removida */}
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-center gap-1.5 pt-2 border-t">
                <Button
                  size="sm"
                  variant="default"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                  onClick={() => handleVerDetalhes(item)}
                  title="Ver Agendamentos"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                {/* Botão "Enviar WhatsApp" oculto */}
                {/* <Button
                  size="sm"
                  variant="default"
                  className="bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 focus:ring-4 focus:ring-green-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                  onClick={() => handleEnviarWhatsAppClick(item)}
                  disabled={whatsappLoadingIds.has(item.profissionalId)}
                  title="Enviar WhatsApp"
                >
                  {whatsappLoadingIds.has(item.profissionalId) ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                </Button> */}
                <Button
                  size="sm"
                  variant="default"
                  className="bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 focus:ring-4 focus:ring-red-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                  onClick={() => handleEfetuarFechamento(item)}
                  title="Efetuar Fechamento"
                >
                  <CreditCard className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="pt-2 pl-6 pr-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Carregando pagamentos...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="pt-2 pl-6 pr-6 h-full flex items-center justify-center">
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
              <p>Você não tem permissão para acessar pagamentos de profissionais</p>
            )}
          </div>
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
              Pagamentos
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar profissionais..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 hover:border-green-300"
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
            className={`${mostrarFiltros ? 'bg-green-50 border-green-300' : ''} ${temFiltrosAtivos ? 'border-green-500 bg-green-50' : ''}`}
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
      <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-100">
        {visualizacao === 'cards' ? renderCardView() : renderTableView()}
      </div>

      {/* Paginação */}
      {dadosProfissionais.length > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-6 z-10 shadow-lg">
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
          Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, dadosProfissionais.length)} de {dadosProfissionais.length} resultados
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
      )}

      {/* Modal para listar agendamentos */}
      <ListarAgendamentosModal
        isOpen={showListarModal}
        agendamentos={agendamentosModal}
        titulo={tituloModal}
        calcularValor={calcularValorProfissional} // Passa a função de cálculo
        onClose={() => {
          setShowListarModal(false);
          setAgendamentosModal([]);
          setTituloModal('');
        }}
      />

      {/* Modal para fechamento de pagamento */}
      {fechamentoData.profissional && (
        <FechamentoPagamentoModal
          isOpen={showFechamentoModal}
          agendamentos={fechamentoData.profissional.agendamentos}
          profissionalNome={fechamentoData.profissional.profissional}
          profissionalId={fechamentoData.profissional.profissionalId}
          valorTotal={fechamentoData.profissional.valorPagar}
          calcularValor={calcularValorProfissional}
          onClose={() => {
            setShowFechamentoModal(false);
            setFechamentoData({ profissional: null });
          }}
          onConfirmFechamento={handleConfirmFechamento}
        />
      )}

      {/* Modal de confirmação para envio de WhatsApp */}
      <ConfirmacaoModal
        open={showConfirmacaoWhatsApp}
        onClose={cancelarEnvioWhatsApp}
        onConfirm={confirmarEnvioWhatsApp}
        title={profissionalParaWhatsApp?.whatsappJaEnviado ? 'Reenviar WhatsApp' : 'Enviar WhatsApp'}
        description={
          profissionalParaWhatsApp
            ? `${profissionalParaWhatsApp.whatsappJaEnviado ? 'ATENÇÃO: WhatsApp já foi enviado anteriormente para este profissional.\n\n' : ''}Deseja ${profissionalParaWhatsApp.whatsappJaEnviado ? 'reenviar' : 'enviar'} os dados de pagamento de ${profissionalParaWhatsApp.profissional} via WhatsApp? \n\nPeríodo: ${formatarDataBrasil(profissionalParaWhatsApp.dataInicio)} a ${formatarDataBrasil(profissionalParaWhatsApp.dataFim)}\nQuantidade de atendimentos: ${profissionalParaWhatsApp.qtdAgendamentos}\nValor total: ${formatarValor(profissionalParaWhatsApp.valorPagar)}`
            : ''
        }
        confirmText={profissionalParaWhatsApp?.whatsappJaEnviado ? 'Reenviar' : 'Enviar'}
        cancelText="Cancelar"
        variant={profissionalParaWhatsApp?.whatsappJaEnviado ? 'warning' : 'default'}
      />
    </div>
  );
};