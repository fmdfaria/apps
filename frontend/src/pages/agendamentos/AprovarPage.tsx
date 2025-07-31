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
  CreditCard,
  Search,
  LayoutGrid,
  List,
  CheckCircle2,
  Stethoscope,
  Filter,
  FilterX,
  X
} from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import { getAgendamentos } from '@/services/agendamentos';
import { AprovarAgendamentoModal, DetalhesAgendamentoModal } from '@/components/agendamentos';

export const AprovarPage = () => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('tabela');
  const [showAprovarAgendamento, setShowAprovarAgendamento] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);
  const [showDetalhesAgendamento, setShowDetalhesAgendamento] = useState(false);
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState<Agendamento | null>(null);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Filtros avançados por coluna
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

  const limparFiltros = () => {
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

  const agendamentosFiltrados = agendamentos
    .filter(a => a.status === 'ATENDIDO')
    .filter(a => 
      !busca || 
      a.pacienteNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.profissionalNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.servicoNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.convenioNome?.toLowerCase().includes(busca.toLowerCase())
    )
    // Filtros avançados por coluna
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

  const handleAprovar = (agendamento: Agendamento) => {
    setAgendamentoSelecionado(agendamento);
    setShowAprovarAgendamento(true);
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
          <h3 className="text-lg font-medium mb-2">
            Nenhum agendamento atendido para aprovação
          </h3>
          <p className="text-sm">
            {(busca || temFiltrosAtivos) ? 'Tente alterar os filtros de busca.' : 'Aguardando agendamentos atendidos.'}
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
                    <ClipboardCheck className="w-5 h-5" />
                    <CardTitle className="text-lg">{agendamento.pacienteNome}</CardTitle>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-700">
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
                  {agendamento.codLiberacao && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="font-mono bg-green-50 px-2 py-1 rounded text-xs">
                        {agendamento.codLiberacao}
                      </span>
                    </div>
                  )}
                  {agendamento.dataAtendimento && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Stethoscope className="w-4 h-4 text-blue-500" />
                      <span className="text-xs">
                        Atendido em {new Date(agendamento.dataAtendimento).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
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
                  <Button 
                    size="sm" 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleAprovar(agendamento)}
                  >
                    Avaliar
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
            <TableRow className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
              <TableHead className="text-center py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">📅</span>
                  Data Agendamento
                </div>
              </TableHead>
              <TableHead className="text-center py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">⏰</span>
                  Horário
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
                  <span className="text-lg">🩺</span>
                  Serviço
                </div>
              </TableHead>
              <TableHead className="text-center py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">🏷️</span>
                  Tipo
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
              <TableHead className="text-center py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">📅</span>
                  Data Atendimento
                </div>
              </TableHead>
              <TableHead className="text-center py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center justify-center gap-2">
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
                    <span className="text-3xl">🔍</span>
                  </div>
                  <p className="text-gray-500 font-medium">
                    {(busca || temFiltrosAtivos) ? 'Nenhum resultado encontrado' : 'Nenhum agendamento para aprovação'}
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
                    <span className="text-sm">
                      {agendamento.dataAtendimento 
                        ? new Date(agendamento.dataAtendimento).toLocaleDateString('pt-BR')
                        : '-'
                      }
                    </span>
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
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAprovar(agendamento)}
                        className="bg-green-600 text-white hover:bg-green-700 h-7 px-3"
                      >
                        Avaliar
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
          <h1 className="text-3xl font-bold text-gray-900">Conclusão de Agendamentos</h1>
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
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro Data Fim */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Data Fim</span>
              <input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => updateFiltro('dataFim', e.target.value)}
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro Convênio */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Convênio</span>
              <input
                type="text"
                placeholder="Nome do convênio..."
                value={filtros.convenio}
                onChange={(e) => updateFiltro('convenio', e.target.value)}
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <input
                type="text"
                placeholder="Nome do paciente..."
                value={filtros.paciente}
                onChange={(e) => updateFiltro('paciente', e.target.value)}
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, agendamentosFiltrados.length)} de {agendamentosFiltrados.length} resultados
            {(temFiltrosAtivos || busca) && (
              <span className="text-gray-500">
                {' '}(filtrados de {agendamentos.filter(a => a.status === 'ATENDIDO').length} total)
              </span>
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
      <AprovarAgendamentoModal
        isOpen={showAprovarAgendamento}
        agendamento={agendamentoSelecionado}
        onClose={() => {
          setShowAprovarAgendamento(false);
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