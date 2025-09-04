import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  DollarSign,
  Clock,
  Users,
  Calendar,
  FileText,
  Search,
  LayoutGrid,
  List,
  Filter,
  FilterX,
  X,
  Calculator,
  Building,
  Eye
} from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import { getAgendamentos } from '@/services/agendamentos';
import { ListarAgendamentosModal } from '@/components/agendamentos';
import api from '@/services/api';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import { AppToast } from '@/services/toast';

interface PagamentoProfissional {
  profissional: string;
  profissionalId: string;
  dataInicio: string;
  dataFim: string;
  qtdAgendamentos: number;
  valorPagar: number;
  agendamentos: Agendamento[];
}

interface PrecoServicoProfissional {
  id: string;
  profissionalId: string;
  servicoId: string;
  precoProfissional: number;
}

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

  // Filtros avançados
  const [filtros, setFiltros] = useState({
    profissional: '',
    servico: '',
    dataInicio: '',
    dataFim: ''
  });

  // Estado para controle de inicialização (mesmo padrão da AgendamentosPage)
  const [initialized, setInitialized] = useState(false);

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
  }, [busca, itensPorPagina, filtros]);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/agendamentos' && route.method.toLowerCase() === 'get';
      });
      
      if (!canRead) {
        setAccessDenied(true);
        try {
          const info = await getRouteInfo('/agendamentos', 'GET');
          setRouteInfo(info);
        } catch (routeError) {
          console.error('Erro ao buscar informações da rota:', routeError);
        }
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
    setAgendamentos([]); // Inicializar como array vazio
    try {
      const [agendamentosData, precosData] = await Promise.all([
        getAgendamentos({ 
          status: 'FINALIZADO',
          page: 1,
          // Removido limit para usar padrão da API (dados serão agrupados)
          ...(filtros.dataInicio ? { dataInicio: filtros.dataInicio } : {}),
          ...(filtros.dataFim ? { dataFim: filtros.dataFim } : {}),
        }),
        carregarPrecosServicoProfissional()
      ]);
      
      // A nova API retorna { data: [], pagination: {} }
      setAgendamentos(agendamentosData.data || []);
      setPrecosServicoProfissional(precosData);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setAccessDenied(true);
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
    setPaginaAtual(1);
  };

  const limparFiltros = () => {
    setFiltros({
      profissional: '',
      servico: '',
      dataInicio: '',
      dataFim: ''
    });
    setPaginaAtual(1);
  };

  const temFiltrosAtivos = Object.values(filtros).some(filtro => filtro !== '');

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

  // Função para verificar status geral de pagamento
  const verificarStatusPagamento = (agendamentos: Agendamento[]) => {
    if (agendamentos.length === 0) return null;
    const pagos = (Array.isArray(agendamentos) ? agendamentos : []).filter(a => a.pagamento === true).length;
    if (pagos === agendamentos.length) return true; // Todos pagos
    if (pagos === 0) return false; // Nenhum pago
    return null; // Parcial
  };

  // Filtrar agendamentos FINALIZADOS (com proteção para array)
  const agendamentosFiltrados = (Array.isArray(agendamentos) ? agendamentos : [])
    .filter(a => a.status === 'FINALIZADO')
    .filter(a => 
      !busca || 
      a.pacienteNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.profissionalNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.servicoNome?.toLowerCase().includes(busca.toLowerCase())
    )
    // Filtros avançados por coluna
    .filter(a => !filtros.profissional || a.profissionalNome?.toLowerCase().includes(filtros.profissional.toLowerCase()))
    .filter(a => !filtros.servico || a.servicoNome?.toLowerCase().includes(filtros.servico.toLowerCase()))
    .filter(a => {
      if (!filtros.dataInicio && !filtros.dataFim) return true;
      
      const dataAgendamentoBrasil = extrairDataBrasil(a.dataHoraInicio);
      
      if (filtros.dataInicio && dataAgendamentoBrasil < filtros.dataInicio) return false;
      if (filtros.dataFim && dataAgendamentoBrasil > filtros.dataFim) return false;
      
      return true;
    });

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
        return {
          profissional: profissional || 'Não informado',
          profissionalId,
          dataInicio: hojeStr,
          dataFim: hojeStr,
          qtdAgendamentos: dados.agendamentos.length,
          valorPagar: dados.valorTotal,
          agendamentos: dados.agendamentos
        };
      }

      // As datas já estão no formato brasileiro, então apenas encontramos min/max
      const dataInicio = datas.sort()[0]; // Menor data
      const dataFim = datas.sort().reverse()[0]; // Maior data

      return {
        profissional: profissional || 'Não informado',
        profissionalId,
        dataInicio,
        dataFim,
        qtdAgendamentos: dados.agendamentos.length,
        valorPagar: dados.valorTotal,
        agendamentos: dados.agendamentos
      };
    });
  };

  // Função para calcular valor a pagar para o profissional
  const calcularValorProfissional = (agendamento: Agendamento): number => {
    // Prioridade 1: valor direto da tabela precos_servicos_profissional
    const precoEspecifico = precosServicoProfissional.find(p => 
      p.profissionalId === agendamento.profissionalId && 
      p.servicoId === agendamento.servicoId
    );

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

  const dadosProfissionais = processarDadosProfissionais();
  const totalPaginas = Math.ceil(dadosProfissionais.length / itensPorPagina);
  const dadosPaginados = dadosProfissionais.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  const handleVerDetalhes = (item: PagamentoProfissional) => {
    setAgendamentosModal(item.agendamentos);
    setTituloModal(`Atendimentos de ${item.profissional}`);
    setShowListarModal(true);
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
          <TableHead className="py-3 text-sm font-semibold text-gray-700 text-center">
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              Pagamento
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
                  Nenhum pagamento encontrado
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
              <TableCell className="py-3 text-center">
                {(() => {
                  const status = verificarStatusPagamento(item.agendamentos);
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
        dadosPaginados.map((item, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
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
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-center pt-2 border-t">
                <Button 
                  size="sm" 
                  variant="default"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                  onClick={() => handleVerDetalhes(item)}
                  title="Ver Agendamentos"
                >
                  <Eye className="w-4 h-4" />
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
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">
            {routeInfo?.descricao || 'Você não tem permissão para acessar esta funcionalidade.'}
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
                  onClick={limparFiltros}
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
              <input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => updateFiltro('dataInicio', e.target.value)}
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Filtro Data Fim */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Data Fim</span>
              <input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => updateFiltro('dataFim', e.target.value)}
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Filtro Serviço */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Serviço</span>
              <input
                type="text"
                placeholder="Nome do serviço..."
                value={filtros.servico}
                onChange={(e) => updateFiltro('servico', e.target.value)}
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Filtro Profissional */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Profissional</span>
              <input
                type="text"
                placeholder="Nome do profissional..."
                value={filtros.profissional}
                onChange={(e) => updateFiltro('profissional', e.target.value)}
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                      profissional: 'Profissional',
                      servico: 'Serviço',
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
    </div>
  );
};