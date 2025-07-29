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
  Loader2
} from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import { getAgendamentos } from '@/services/agendamentos';

import { LiberarAgendamentoModal, DetalhesAgendamentoModal } from '@/components/agendamentos';
import { useToast } from "@/hooks/use-toast";

export const LiberarPage = () => {
  const { toast } = useToast();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [agendamentosProcessando, setAgendamentosProcessando] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    carregarAgendamentos();
  }, []);

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



  // Sincronizar busca local quando busca externa muda
  useEffect(() => {
    setBuscaLocal(busca);
  }, [busca]);

  // Cleanup do timeout de busca ao desmontar componente
  useEffect(() => {
    return () => {
      if (buscaTimeoutRef.current) {
        clearTimeout(buscaTimeoutRef.current);
      }
    };
  }, []);

  const carregarAgendamentos = async () => {
    setLoading(true);
    try {
      const dados = await getAgendamentos();
      setAgendamentos(dados);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
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
    .sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime());

  const totalPaginas = Math.ceil(agendamentosFiltrados.length / itensPorPagina);
  const agendamentosPaginados = agendamentosFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  const formatarDataHora = (dataISO: string) => {
    const data = new Date(dataISO);
    return {
      data: data.toLocaleDateString('pt-BR'),
      hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handleLiberar = (agendamento: Agendamento) => {
    setAgendamentoSelecionado(agendamento);
    setShowLiberarAgendamento(true);
  };

  const handleVerDetalhes = (agendamento: Agendamento) => {
    setAgendamentoDetalhes(agendamento);
    setShowDetalhesAgendamento(true);
  };

  const handleSolicitarLiberacao = async (agendamento: Agendamento) => {
    // Definir o agendamento como processando
    adicionarProcessamento(agendamento.id);
    
    try {
      const webhookUrl = import.meta.env.VITE_WEBHOOK_SOLICITAR_LIBERACAO_URL;
      
      if (!webhookUrl) {
        toast({
          variant: "destructive",
          title: "Erro de configuração",
          description: "URL do webhook não configurada. Verifique o arquivo .env"
        });
        return;
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

      // Atualizar o status do agendamento localmente
      setAgendamentos(prev => 
        prev.map(a => 
          a.id === agendamento.id 
            ? { ...a, status: 'SOLICITADO' }
            : a
        )
      );

      // Exibir o retorno do webhook no toast
      const mensagemWebhook = responseData.message || responseData.msg || responseData.description || JSON.stringify(responseData);
      
      toast({
        title: "Sucesso",
        description: `Solicitação enviada para ${agendamento.pacienteNome}! Retorno: ${mensagemWebhook}`
      });

    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao enviar solicitação para ${agendamento.pacienteNome}. Tente novamente.`
      });
    } finally {
      // Limpar o estado de processamento
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
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleVerDetalhes(agendamento)}
                  >
                    Ver Detalhes
                  </Button>
                  {agendamento.status === 'AGENDADO' && (
                    <Button 
                      size="sm" 
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleSolicitarLiberacao(agendamento)}
                      disabled={estaProcessando(agendamento.id)}
                    >
                      {estaProcessando(agendamento.id) ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Solicitar Liberação'
                      )}
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleLiberar(agendamento)}
                  >
                    Confirmar Liberação
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );

  const renderTableView = () => (
    <div className="rounded-lg bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted">
              <TableHead className="text-center py-2 text-sm">Data</TableHead>
            <TableHead className="text-center py-2 text-sm">Horário</TableHead>
              <TableHead className="py-2 text-sm">Convênio</TableHead>
              <TableHead className="py-2 text-sm">Serviço</TableHead>
              <TableHead className="text-center py-2 text-sm">Tipo</TableHead>
              <TableHead className="py-2 text-sm">Paciente</TableHead>
              <TableHead className="py-2 text-sm">Profissional</TableHead>
              <TableHead className="text-center py-2 text-sm">Status</TableHead>
            <TableHead className="text-right py-2 text-sm">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agendamentosPaginados.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-6 text-gray-500 text-sm">
                {(busca || temFiltrosAtivos) ? 'Nenhum resultado encontrado com os filtros aplicados.' : 'Nenhum agendamento pendente de liberação.'}
              </TableCell>
            </TableRow>
          ) : (
            agendamentosPaginados.map((agendamento) => {
              const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);
              
              return (
                <TableRow key={agendamento.id} className="hover:bg-gray-50 h-12">
                  <TableCell className="text-center py-2">
                    <span className="text-sm">{data}</span>
                  </TableCell>
                  <TableCell className="text-center py-2">
                    <span className="text-sm">{hora}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm">{agendamento.convenioNome}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm">{agendamento.servicoNome}</span>
                  </TableCell>
                  <TableCell className="text-center py-2">
                    <Badge variant="outline" className="text-xs">
                      {agendamento.tipoAtendimento}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="font-medium text-sm">{agendamento.pacienteNome}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm">{agendamento.profissionalNome}</span>
                  </TableCell>
                  <TableCell className="text-center py-2">
                    <Badge 
                      variant={agendamento.status === 'AGENDADO' ? 'outline' : 'default'}
                      className={`text-xs ${
                        agendamento.status === 'AGENDADO' 
                          ? 'border-blue-300 text-blue-700 bg-blue-50' 
                          : 'border-orange-300 text-orange-700 bg-orange-50'
                      }`}
                    >
                      {agendamento.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleVerDetalhes(agendamento)}
                        title="Ver Detalhes"
                      >
                        <FileText className="w-3 h-3" />
                      </Button>
                      {agendamento.status === 'AGENDADO' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSolicitarLiberacao(agendamento)}
                          disabled={estaProcessando(agendamento.id)}
                          className="bg-blue-600 text-white hover:bg-blue-700 h-7 px-3"
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
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleLiberar(agendamento)}
                        className="bg-green-600 text-white hover:bg-green-700 h-7 px-3"
                      >
                        Confirmar Liberação
                      </Button>
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

  return (
    <div className="pt-2 pl-6 pr-6 h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white backdrop-blur border-b border-gray-200 flex justify-between items-center mb-6 px-6 py-4 rounded-lg gap-4 transition-shadow">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Liberação de Agendamentos</h1>
          <div className="flex items-center gap-3">
            <p className="text-gray-600">Gerencie a liberação de agendamentos pendentes</p>
            {agendamentosProcessando.size > 0 && (
              <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-300">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {agendamentosProcessando.size} {agendamentosProcessando.size > 1 ? 'solicitações' : 'solicitação'} em andamento, por favor aguarde...
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
      {totalPaginas > 1 && (
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 py-3 px-6 z-10">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Exibir</span>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={itensPorPagina}
              onChange={e => setItensPorPagina(Number(e.target.value))}
            >
              {[10, 25, 50, 100].map(qtd => (
                <option key={qtd} value={qtd}>{qtd}</option>
              ))}
            </select>
            <span className="text-sm text-gray-600">itens por página</span>
          </div>
          
          <div className="text-sm text-gray-600">
            <div>
              Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, agendamentosFiltrados.length)} de {agendamentosFiltrados.length} resultados
              {(temFiltrosAtivos || busca) && (
                <span className="text-gray-500">
                  {' '}(filtrados de {agendadosBase.length} total)
                </span>
              )}
            </div>
            {agendamentosProcessando.size > 0 && (
              <div className="flex items-center gap-2 mt-1 text-blue-600">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-xs">
                  {agendamentosProcessando.size} {agendamentosProcessando.size > 1 ? 'webhooks' : 'webhook'} em processamento
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
            >
              Anterior
            </Button>
            
            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
              const pageNumber = Math.max(1, Math.min(totalPaginas - 4, paginaAtual - 2)) + i;
              return (
                <Button
                  key={pageNumber}
                  variant={paginaAtual === pageNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaginaAtual(pageNumber)}
                  className="w-8"
                >
                  {pageNumber}
                </Button>
              );
            })}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual === totalPaginas}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Modais */}
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