import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  ClipboardCheck,
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
  Eye,
  CheckSquare
} from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import { getAgendamentos, resolverPendencia, IPaginatedAgendamentos } from '@/services/agendamentos';
import { DetalhesAgendamentoModal } from '@/components/agendamentos';
import ConfirmacaoModal from '@/components/ConfirmacaoModal';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import { AppToast } from '@/services/toast';

export const PendenciaPage = () => {
  const { user } = useAuth();
  const [paginatedData, setPaginatedData] = useState<IPaginatedAgendamentos>({
    data: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [canConcluir, setCanConcluir] = useState(true);
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('tabela');
  const [showConfirmacaoModal, setShowConfirmacaoModal] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);
  const [showDetalhesAgendamento, setShowDetalhesAgendamento] = useState(false);
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState<Agendamento | null>(null);
  const [resolvendoPendencia, setResolvendoPendencia] = useState(false);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const [filtros, setFiltros] = useState({
    paciente: '',
    profissional: '',
    servico: '',
    convenio: '',
    tipoAtendimento: '',
    dataInicio: '',
    dataFim: ''
  });
  // Estados separados para filtros aplicados vs editados
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    paciente: '',
    profissional: '',
    servico: '',
    convenio: '',
    tipoAtendimento: '',
    dataInicio: '',
    dataFim: ''
  });

  const [initialized, setInitialized] = useState(false);

  // Inicialização única
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

  useEffect(() => {
    setPaginaAtual(1);
  }, [buscaDebounced, itensPorPagina, filtrosAplicados]);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      const canResolverPendencia = allowedRoutes.some((route: any) => {
        return route.path === '/agendamentos-pendencias/:id' && route.method.toLowerCase() === 'put';
      });
      setCanConcluir(canResolverPendencia);
      if (!canResolverPendencia) {
        setAccessDenied(true);
      }
    } catch (error: any) {
      setCanConcluir(false);
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };

  const carregarAgendamentos = async () => {
    setLoading(true);
    try {
      // Montar filtros para a API
      const filtrosAPI: any = {
        status: 'PENDENTE',
        page: paginaAtual,
        limit: itensPorPagina,
      };

      // Aplicar busca debounced
      if (buscaDebounced) {
        filtrosAPI.search = buscaDebounced;
      }

      // Filtros específicos (usando filtrosAplicados)
      if (filtrosAplicados.paciente) filtrosAPI.pacienteNome = filtrosAplicados.paciente;
      if (filtrosAplicados.profissional) filtrosAPI.profissionalNome = filtrosAplicados.profissional;
      if (filtrosAplicados.servico) filtrosAPI.servicoNome = filtrosAplicados.servico;
      if (filtrosAplicados.convenio) filtrosAPI.convenioNome = filtrosAplicados.convenio;
      if (filtrosAplicados.tipoAtendimento) filtrosAPI.tipoAtendimento = filtrosAplicados.tipoAtendimento;
      if (filtrosAplicados.dataInicio) filtrosAPI.dataInicio = filtrosAplicados.dataInicio;
      if (filtrosAplicados.dataFim) filtrosAPI.dataFim = filtrosAplicados.dataFim;

      // Se o usuário for PROFISSIONAL, filtra apenas seus agendamentos
      if (user?.roles?.includes('PROFISSIONAL')) {
        try {
          const profissionalResponse = await api.get('/profissionais/me');
          filtrosAPI.profissionalId = profissionalResponse.data.id;
        } catch (profissionalError) {
          console.error('Erro ao buscar dados do profissional:', profissionalError);
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
        try {
          const info = await getRouteInfo('/agendamentos-pendencias/:id', 'PUT');
          setRouteInfo(info);
        } catch {}
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
  };

  const aplicarFiltros = () => {
    setFiltrosAplicados(filtros);
    setPaginaAtual(1);
  };

  const limparFiltros = () => {
    const filtrosLimpos = {
      paciente: '',
      profissional: '',
      servico: '',
      convenio: '',
      tipoAtendimento: '',
      dataInicio: '',
      dataFim: ''
    };
    setFiltros(filtrosLimpos);
    setFiltrosAplicados(filtrosLimpos);
    setPaginaAtual(1);
  };

  const temFiltrosAtivos = Object.values(filtrosAplicados).some(filtro => filtro !== '');
  const temFiltrosNaoAplicados = JSON.stringify(filtros) !== JSON.stringify(filtrosAplicados);

  const formatarDataBrasil = (dataISO: string) => {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // Com a busca via API, apenas ordenamos os dados recebidos
  const agendamentosFiltrados = paginatedData.data
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

  // Usar paginação da API igual à AgendamentosPage
  const totalPaginas = Math.ceil(paginatedData.pagination.total / itensPorPagina);
  const agendamentosPaginados = agendamentosFiltrados;

  const formatarDataHora = (dataISO: string) => {
    if (!dataISO) return { data: '-', hora: '-' };
    const data = new Date(dataISO);
    return {
      data: data.toLocaleDateString('pt-BR'),
      hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handleAvaliar = (agendamento: Agendamento) => {
    setAgendamentoSelecionado(agendamento);
    setShowConfirmacaoModal(true);
  };

  const handleConfirmarResolucao = async () => {
    if (!agendamentoSelecionado) return;
    
    setResolvendoPendencia(true);
    try {
      await resolverPendencia(agendamentoSelecionado.id, {
        avaliadoPorId: user?.id
      });
      
      AppToast.success('Pendência resolvida com sucesso!');
      setShowConfirmacaoModal(false);
      setAgendamentoSelecionado(null);
      await carregarAgendamentos();
    } catch (error) {
      console.error('Erro ao resolver pendência:', error);
      AppToast.error('Erro ao resolver pendência', {
        description: 'Não foi possível resolver a pendência. Tente novamente.'
      });
    } finally {
      setResolvendoPendencia(false);
    }
  };

  const handleVerDetalhes = (agendamento: Agendamento) => {
    setAgendamentoDetalhes(agendamento);
    setShowDetalhesAgendamento(true);
  };

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agendamentosPaginados.length === 0 ? (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
          <ClipboardCheck className="w-12 h-12 mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum agendamento pendente</h3>
          <p className="text-sm">{(buscaDebounced || temFiltrosAtivos) ? 'Tente alterar os filtros de busca.' : 'Aguardando pendências.'}</p>
        </div>
      ) : (
        agendamentosPaginados.map(agendamento => {
          const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);
          return (
            <Card key={agendamento.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5" />
                    <CardTitle className="text-lg">{agendamento.pacienteNome}</CardTitle>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-700">{agendamento.status}</Badge>
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
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1">
                    <Button size="sm" variant="default" className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => handleVerDetalhes(agendamento)}>
                      Visualizar
                    </Button>
                  </div>
                  {canConcluir ? (
                    <Button size="sm" variant="outline" className="w-full h-7 text-xs border-green-300 text-green-600 hover:bg-green-600 hover:text-white" onClick={() => handleAvaliar(agendamento)} title="Pendência Resolvida">
                      Pendência Resolvida
                    </Button>
                  ) : (
                    <Button size="sm" disabled className="w-full h-7 text-xs border-gray-300 text-gray-400 cursor-not-allowed" title="Você não tem permissão para resolver">
                      Pendência Resolvida
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
        <TableRow className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-gray-200">
          <TableHead className="py-3 text-sm font-semibold text-gray-700"><div className="flex items-center gap-2"><span className="text-lg">📅</span>Data</div></TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700"><div className="flex items-center gap-2"><span className="text-lg">⏰</span>Horário</div></TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700"><div className="flex items-center gap-2"><span className="text-lg">👤</span>Paciente</div></TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700"><div className="flex items-center gap-2"><span className="text-lg">👨‍⚕️</span>Profissional</div></TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700"><div className="flex items-center gap-2"><span className="text-lg">🩺</span>Serviço</div></TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700"><div className="flex items-center gap-2"><span className="text-lg">🏷️</span>Tipo</div></TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700"><div className="flex items-center gap-2"><span className="text-lg">📊</span>Status</div></TableHead>
          <TableHead className="py-3 text-sm font-semibold text-gray-700"><div className="flex items-center gap-2"><span className="text-lg">⚙️</span>Ações</div></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agendamentosPaginados.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="py-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center"><span className="text-3xl">🔍</span></div>
                <p className="text-gray-500 font-medium">{(buscaDebounced || temFiltrosAtivos) ? 'Nenhum resultado encontrado' : 'Nenhum agendamento pendente'}</p>
                <p className="text-gray-400 text-sm">Tente ajustar os filtros de busca</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          agendamentosPaginados.map((agendamento) => {
            const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);
            return (
              <TableRow key={agendamento.id} className="hover:bg-gradient-to-r hover:from-yellow-50 hover:to-amber-50 transition-all duration-200 h-12">
                <TableCell className="py-2"><span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{data}</span></TableCell>
                <TableCell className="py-2"><span className="text-sm font-mono bg-yellow-100 px-2 py-1 rounded text-yellow-700">{hora}</span></TableCell>
                <TableCell className="py-2"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full flex items-center justify-center text-white text-sm font-bold">{agendamento.pacienteNome?.charAt(0).toUpperCase()}</div><span className="text-sm font-medium">{agendamento.pacienteNome}</span></div></TableCell>
                <TableCell className="py-2"><span className="text-sm">{agendamento.profissionalNome}</span></TableCell>
                <TableCell className="py-2"><span className="text-sm">{agendamento.servicoNome}</span></TableCell>
                <TableCell className="py-2"><span className={`text-xs px-3 py-1 rounded-full font-medium ${agendamento.tipoAtendimento === 'online' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{agendamento.tipoAtendimento}</span></TableCell>
                <TableCell className="py-2"><span className={`text-xs px-3 py-1 rounded-full font-medium bg-yellow-100 text-yellow-800`}>{agendamento.status}</span></TableCell>
                <TableCell className="text-right py-2">
                  <div className="flex justify-end gap-1.5">
                    <Button variant="default" size="sm" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform" onClick={() => handleVerDetalhes(agendamento)} title="Visualizar Agendamento">
                      <Eye className="w-4 h-4" />
                    </Button>
                    {canConcluir ? (
                      <Button variant="outline" size="sm" className="group border-2 border-green-300 text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600 focus:ring-4 focus:ring-green-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform" onClick={() => handleAvaliar(agendamento)} title="Pendência Resolvida">
                        <CheckSquare className="w-4 h-4 text-green-600 group-hover:text-white transition-colors" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0" title="Você não tem permissão para resolver">
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

  if (accessDenied) {
    return (
      <div className="pt-2 pl-6 pr-6 h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-3xl">🚫</span></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">Você não tem permissão para acessar esta funcionalidade.</p>
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
          <p className="text-sm text-gray-500">Entre em contato com o administrador do sistema para solicitar as devidas permissões.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2 pl-6 pr-6 h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-white backdrop-blur border-b border-gray-200 flex justify-between items-center mb-6 px-6 py-4 rounded-lg gap-4 transition-shadow">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">⏳</span>
            <span className="bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">Pendências</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar agendamentos..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-500 transition-all duration-200 hover:border-yellow-300" />
          </div>
          <div className="flex border rounded-lg p-1 bg-gray-100">
            <Button variant="ghost" size="sm" onClick={() => setVisualizacao('tabela')} className={`h-7 px-3 ${visualizacao === 'tabela' ? 'bg-white shadow-sm' : ''}`}>
              <List className="w-4 h-4 mr-1" /> Tabela
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setVisualizacao('cards')} className={`h-7 px-3 ${visualizacao === 'cards' ? 'bg-white shadow-sm' : ''}`}>
              <LayoutGrid className="w-4 h-4 mr-1" /> Cards
            </Button>
          </div>
          <Button variant="outline" onClick={() => setMostrarFiltros(!mostrarFiltros)} className={`${mostrarFiltros ? 'bg-yellow-50 border-yellow-300' : ''} ${temFiltrosAtivos ? 'border-yellow-500 bg-yellow-50' : ''}`}>
            <Filter className="w-4 h-4 mr-2" /> Filtros
            {temFiltrosAtivos && (<Badge variant="secondary" className="ml-2 h-4 px-1">{Object.values(filtros).filter(f => f !== '').length}</Badge>)}
          </Button>
        </div>
      </div>

      {mostrarFiltros && (
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filtros Avançados</h3>
            <div className="flex gap-2">
              {temFiltrosNaoAplicados && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={aplicarFiltros}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Filter className="w-4 h-4 mr-1" />
                  Aplicar Filtro
                </Button>
              )}
              {temFiltrosAtivos && (
                <Button variant="ghost" size="sm" onClick={limparFiltros} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <FilterX className="w-4 h-4 mr-1" /> Limpar Filtros
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setMostrarFiltros(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="space-y-2"><span className="text-sm font-medium text-gray-700">Data Início</span><input type="date" value={filtros.dataInicio} onChange={(e) => updateFiltro('dataInicio', e.target.value)} className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500" /></div>
            <div className="space-y-2"><span className="text-sm font-medium text-gray-700">Data Fim</span><input type="date" value={filtros.dataFim} onChange={(e) => updateFiltro('dataFim', e.target.value)} className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500" /></div>
            <div className="space-y-2"><span className="text-sm font-medium text-gray-700">Convênio</span><input type="text" placeholder="Nome do convênio..." value={filtros.convenio} onChange={(e) => updateFiltro('convenio', e.target.value)} className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500" /></div>
            <div className="space-y-2"><span className="text-sm font-medium text-gray-700">Serviço</span><input type="text" placeholder="Nome do serviço..." value={filtros.servico} onChange={(e) => updateFiltro('servico', e.target.value)} className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500" /></div>
            <div className="space-y-2"><span className="text-sm font-medium text-gray-700">Tipo Atendimento</span><select value={filtros.tipoAtendimento} onChange={(e) => updateFiltro('tipoAtendimento', e.target.value)} className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500"><option value="">Todos os tipos</option><option value="presencial">Presencial</option><option value="online">Online</option></select></div>
            <div className="space-y-2"><span className="text-sm font-medium text-gray-700">Paciente</span><input type="text" placeholder="Nome do paciente..." value={filtros.paciente} onChange={(e) => updateFiltro('paciente', e.target.value)} className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500" /></div>
            <div className="space-y-2"><span className="text-sm font-medium text-gray-700">Profissional</span><input type="text" placeholder="Nome do profissional..." value={filtros.profissional} onChange={(e) => updateFiltro('profissional', e.target.value)} className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500" /></div>
          </div>
          {temFiltrosAtivos && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-gray-600">Filtros ativos:</span>
                {Object.entries(filtrosAplicados).filter(([_, valor]) => valor !== '').map(([campo, valor]) => {
                  const labels = { paciente: 'Paciente', profissional: 'Profissional', servico: 'Serviço', convenio: 'Convênio', tipoAtendimento: 'Tipo', dataInicio: 'De', dataFim: 'Até' } as const;
                  const valorFormatado = (campo === 'dataInicio' || campo === 'dataFim') ? formatarDataBrasil(valor) : valor;
                  return (
                    <Badge key={campo} variant="secondary" className="text-xs inline-flex items-center gap-1">
                      {labels[campo as keyof typeof labels]}: {valorFormatado}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const novosFiltros = { ...filtros };
                          const novosFiltrosAplicados = { ...filtrosAplicados };
                          novosFiltros[campo as keyof typeof filtros] = '';
                          novosFiltrosAplicados[campo as keyof typeof filtrosAplicados] = '';
                          setFiltros(novosFiltros);
                          setFiltrosAplicados(novosFiltrosAplicados);
                        }}
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

      <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-100">
        {visualizacao === 'cards' ? renderCardView() : renderTableView()}
      </div>

      {paginatedData.pagination.total > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-6 z-10 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 flex items-center gap-2"><span className="text-lg">📊</span>Exibir</span>
            <select className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-100 focus:border-yellow-500 transition-all duration-200 hover:border-yellow-300" value={itensPorPagina} onChange={e => {
              setItensPorPagina(Number(e.target.value));
              setPaginaAtual(1); // Resetar para primeira página
            }}>
              {[10, 25, 50, 100].map(qtd => (<option key={qtd} value={qtd}>{qtd}</option>))}
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
                : "border-2 border-gray-200 text-gray-700 hover:border-yellow-500 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-amber-50 hover:text-yellow-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
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
                    ? "bg-gradient-to-r from-yellow-600 to-amber-600 text-white shadow-lg font-semibold" 
                    : totalPaginas === 1
                    ? "border-2 border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed font-medium shadow-none hover:bg-gray-50"
                    : "border-2 border-gray-200 text-gray-700 hover:border-yellow-500 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-amber-50 hover:text-yellow-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
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
                : "border-2 border-gray-200 text-gray-700 hover:border-yellow-500 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-amber-50 hover:text-yellow-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
              }
            >
              Próximo
              <span className="ml-1 text-gray-600 group-hover:text-yellow-600 transition-colors">➡️</span>
            </Button>
          </div>
        </div>
      )}

      <ConfirmacaoModal
        open={showConfirmacaoModal}
        onClose={() => {
          setShowConfirmacaoModal(false);
          setAgendamentoSelecionado(null);
        }}
        onConfirm={handleConfirmarResolucao}
        title="Resolver Pendência"
        description={
          agendamentoSelecionado 
            ? `Foi corrigido o erro "${agendamentoSelecionado.motivoReprovacao || 'N/A'}"?`
            : "Confirma a resolução desta pendência?"
        }
        confirmText="Sim"
        cancelText="Não"
        isLoading={resolvendoPendencia}
        loadingText="Resolvendo..."
        variant="default"
      />
      <DetalhesAgendamentoModal
        isOpen={showDetalhesAgendamento}
        agendamento={agendamentoDetalhes}
        onClose={() => { setShowDetalhesAgendamento(false); setAgendamentoDetalhes(null); }}
      />
    </div>
  );
};

export default PendenciaPage;


