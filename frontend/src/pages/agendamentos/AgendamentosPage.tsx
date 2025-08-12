import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Plus,
  Search,
  Users,
  Stethoscope,
  ClipboardCheck,
  Archive,
  LayoutGrid,
  List,
  CreditCard,
  Activity,
  X,
  Filter,
  FilterX,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import type { Agendamento, StatusAgendamento } from '@/types/Agendamento';
import { getAgendamentos, deleteAgendamento } from '@/services/agendamentos';
import { 
  AgendamentoModal,
  DetalhesAgendamentoModal,
  EditAgendamentoModal
} from '@/components/agendamentos';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import api from '@/services/api';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import { AppToast } from '@/services/toast';

export const AgendamentosPage = () => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('tabela');
  const [filtroStatus, setFiltroStatus] = useState<StatusAgendamento | 'TODOS'>('TODOS');
  
  // Estados para controle de permissões RBAC
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [canRead, setCanRead] = useState(true);
  const [canCreate, setCanCreate] = useState(true);
  const [canUpdate, setCanUpdate] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  // Estados para modais de agendamento
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  
  const [showDetalhesAgendamento, setShowDetalhesAgendamento] = useState(false);
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState<Agendamento | null>(null);

  // Estados para modal de edição
  const [showEditAgendamento, setShowEditAgendamento] = useState(false);
  const [agendamentoEditando, setAgendamentoEditando] = useState<string | null>(null);
  const [itensPorPagina, setItensPorPagina] = useState(12);
  const [paginaAtual, setPaginaAtual] = useState(1);
  
  // Filtros avançados por coluna
  const [filtros, setFiltros] = useState({
    paciente: '',
    profissional: '',
    servico: '',
    convenio: '',
    tipoAtendimento: '',
    status: '',
    dataInicio: '',
    dataFim: ''
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Estados para exclusão
  const [agendamentoExcluindo, setAgendamentoExcluindo] = useState<Agendamento | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);


  // Funções de controle do modal unificado
  const handleFecharAgendamentoModal = () => {
    setShowAgendamentoModal(false);
  };

  const handleSuccessAgendamento = () => {
    carregarAgendamentos();
    setShowAgendamentoModal(false);
  };

  const handleAbrirNovoAgendamento = () => {
    setShowAgendamentoModal(true);
  };

  // Handlers para modal de edição
  const handleAbrirEditarAgendamento = (agendamentoId: string) => {
    setAgendamentoEditando(agendamentoId);
    setShowEditAgendamento(true);
  };

  const handleFecharEditAgendamento = () => {
    setShowEditAgendamento(false);
    setAgendamentoEditando(null);
  };

  const handleSuccessEditAgendamento = () => {
    carregarAgendamentos();
    setShowEditAgendamento(false);
    setAgendamentoEditando(null);
  };


  useEffect(() => {
    checkPermissions();
    carregarAgendamentos();
  }, []);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, itensPorPagina, filtroStatus, filtros]);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Verificar cada permissão específica para agendamentos
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/agendamentos' && route.method.toLowerCase() === 'get';
      });
      
      const canCreate = allowedRoutes.some((route: any) => {
        return route.path === '/agendamentos' && route.method.toLowerCase() === 'post';
      });
      
      const canUpdate = allowedRoutes.some((route: any) => {
        return route.path === '/agendamentos/:id' && route.method.toLowerCase() === 'put';
      });
      
      const canDelete = allowedRoutes.some((route: any) => {
        return route.path === '/agendamentos/:id' && route.method.toLowerCase() === 'delete';
      });
      
      setCanRead(canRead);
      setCanCreate(canCreate);
      setCanUpdate(canUpdate);
      setCanDelete(canDelete);
      
      // Se não tem nem permissão de leitura, marca como access denied
      if (!canRead) {
        setAccessDenied(true);
      }
      
    } catch (error: any) {
      // Em caso de erro, desabilita tudo por segurança
      setCanRead(false);
      setCanCreate(false);
      setCanUpdate(false);
      setCanDelete(false);
      
      // Se retornar 401/403 no endpoint de permissões, considera acesso negado
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };

  const carregarAgendamentos = async () => {
    if (!canRead) {
      setAccessDenied(true);
      return;
    }
    
    setLoading(true);
    setAccessDenied(false);
    setAgendamentos([]); // Limpa agendamentos para evitar mostrar dados antigos
    try {
      const dados = await getAgendamentos();
      setAgendamentos(dados);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setAccessDenied(true);
        // Buscar informações da rota para mensagem mais específica
        try {
          const info = await getRouteInfo('/agendamentos', 'GET');
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

  const agendamentosFiltrados = agendamentos
    .filter(a => filtroStatus === 'TODOS' || a.status === filtroStatus)
    .filter(a => 
      !busca || 
      a.pacienteNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.profissionalNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.servicoNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.convenioNome?.toLowerCase().includes(busca.toLowerCase()) ||
      a.status?.toLowerCase().includes(busca.toLowerCase())
    )
    // Filtros avançados por coluna
    .filter(a => !filtros.paciente || a.pacienteNome?.toLowerCase().includes(filtros.paciente.toLowerCase()))
    .filter(a => !filtros.profissional || a.profissionalNome?.toLowerCase().includes(filtros.profissional.toLowerCase()))
    .filter(a => !filtros.servico || a.servicoNome?.toLowerCase().includes(filtros.servico.toLowerCase()))
    .filter(a => !filtros.convenio || a.convenioNome?.toLowerCase().includes(filtros.convenio.toLowerCase()))
    .filter(a => !filtros.tipoAtendimento || a.tipoAtendimento === filtros.tipoAtendimento)
    .filter(a => !filtros.status || a.status === filtros.status)
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

  const formatarDataHora = (dataHoraISO: string) => {
    // Parse da string sem conversão de timezone
    // Formato esperado: "2025-08-04T10:00:00.000Z" 
    const [datePart, timePart] = dataHoraISO.split('T');
    const [ano, mes, dia] = datePart.split('-');
    const [hora, minuto] = timePart.split(':');
    
    return {
      data: `${dia}/${mes}/${ano}`,
      hora: `${hora}:${minuto}`
    };
  };

  const getStatusColor = (status: StatusAgendamento) => {
    const cores = {
      'AGENDADO': 'bg-blue-100 text-blue-700',
      'SOLICITADO': 'bg-orange-100 text-orange-700',
      'LIBERADO': 'bg-green-100 text-green-700',
      'ATENDIDO': 'bg-yellow-100 text-yellow-700',
      'FINALIZADO': 'bg-emerald-100 text-emerald-700',
      'CANCELADO': 'bg-red-100 text-red-700',
      'ARQUIVADO': 'bg-gray-100 text-gray-700'
    };
    return cores[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status: StatusAgendamento) => {
    const icons = {
      'AGENDADO': Calendar,
      'SOLICITADO': Clock,
      'LIBERADO': CheckCircle,
      'ATENDIDO': Stethoscope,
      'FINALIZADO': ClipboardCheck,
      'CANCELADO': XCircle,
      'ARQUIVADO': Archive
    };
    return icons[status] || Calendar;
  };

  const contarPorStatus = (status: StatusAgendamento) => {
    return agendamentos.filter(a => a.status === status).length;
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
      status: '',
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

  const handleVerDetalhes = (agendamento: Agendamento) => {
    setAgendamentoDetalhes(agendamento);
    setShowDetalhesAgendamento(true);
  };

  // Funções de exclusão
  const confirmarExclusao = (agendamento: Agendamento) => {
    setAgendamentoExcluindo(agendamento);
  };

  const cancelarExclusao = () => {
    setAgendamentoExcluindo(null);
  };

  const handleDelete = async () => {
    if (!agendamentoExcluindo) return;
    
    setDeleteLoading(true);
    try {
      await deleteAgendamento(agendamentoExcluindo.id);
      setAgendamentoExcluindo(null);
      carregarAgendamentos(); // Recarregar a lista após exclusão
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      // Aqui você pode adicionar um toast de erro se desejar
    } finally {
      setDeleteLoading(false);
    }
  };

  const estatisticas = [
    { label: 'Agendados', valor: contarPorStatus('AGENDADO'), icon: Calendar, cor: 'bg-blue-500', status: 'AGENDADO' as StatusAgendamento },
    { label: 'Solicitados', valor: contarPorStatus('SOLICITADO'), icon: Clock, cor: 'bg-orange-500', status: 'SOLICITADO' as StatusAgendamento },
    { label: 'Liberados', valor: contarPorStatus('LIBERADO'), icon: CheckCircle, cor: 'bg-green-500', status: 'LIBERADO' as StatusAgendamento },
    { label: 'Atendidos', valor: contarPorStatus('ATENDIDO'), icon: Stethoscope, cor: 'bg-yellow-500', status: 'ATENDIDO' as StatusAgendamento },
    { label: 'Finalizados', valor: contarPorStatus('FINALIZADO'), icon: ClipboardCheck, cor: 'bg-emerald-500', status: 'FINALIZADO' as StatusAgendamento },
  ];

  const renderCardView = () => (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {estatisticas.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${stat.cor}`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600">{stat.label}</p>
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stat.cor}`}>
                    <span className="text-sm font-bold text-white">{stat.valor}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cards dos Agendamentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {agendamentosPaginados.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
            <Activity className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhum agendamento encontrado
            </h3>
            <p className="text-sm">
              {busca || temFiltrosAtivos || filtroStatus !== 'TODOS' 
                ? 'Tente alterar os filtros de busca.' 
                : 'Comece criando um novo agendamento.'
              }
            </p>
          </div>
        ) : (
          agendamentosPaginados.map(agendamento => {
            const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);
            const StatusIcon = getStatusIcon(agendamento.status);
            
            return (
              <Card key={agendamento.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusIcon className="w-4 h-4 flex-shrink-0" />
                      <CardTitle className="text-sm font-medium truncate">{agendamento.pacienteNome}</CardTitle>
                    </div>
                    <Badge className={`text-xs flex-shrink-0 ml-2 ${getStatusColor(agendamento.status)}`}>
                      {agendamento.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-3">
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Users className="w-3 h-3" />
                      <span className="truncate">{agendamento.profissionalNome}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <FileText className="w-3 h-3" />
                      <span className="truncate">{agendamento.servicoNome}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{data}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{hora}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <CreditCard className="w-3 h-3" />
                      <span className="truncate">{agendamento.convenioNome}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {agendamento.tipoAtendimento}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    {canRead ? (
                      <Button 
                        size="sm" 
                        variant="default"
                        className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleVerDetalhes(agendamento)}
                        title="Visualizar Agendamento"
                      >
                        Visualizar
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        disabled={true}
                        className="flex-1 h-7 text-xs bg-gray-400 cursor-not-allowed"
                        title="Você não tem permissão para visualizar agendamentos"
                      >
                        Visualizar
                      </Button>
                    )}
                    {canUpdate ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1 h-7 text-xs border-green-300 text-green-600 hover:bg-green-600 hover:text-white"
                        onClick={() => handleAbrirEditarAgendamento(agendamento.id)}
                        title="Editar Agendamento"
                      >
                        Editar
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        disabled={true}
                        className="flex-1 h-7 text-xs border-gray-300 text-gray-400 cursor-not-allowed"
                        title="Você não tem permissão para editar agendamentos"
                      >
                        Editar
                      </Button>
                    )}
                    {canDelete ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1 h-7 text-xs border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
                        onClick={() => confirmarExclusao(agendamento)}
                        title="Excluir Agendamento"
                      >
                        Excluir
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        disabled={true}
                        className="flex-1 h-7 text-xs border-gray-300 text-gray-400 cursor-not-allowed"
                        title="Você não tem permissão para excluir agendamentos"
                      >
                        Excluir
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );

  const renderTableView = () => (
    <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-100">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
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
                    <span className="text-3xl">📅</span>
                  </div>
                  <p className="text-gray-500 font-medium">
                    {busca || temFiltrosAtivos || filtroStatus !== 'TODOS' 
                      ? 'Nenhum resultado encontrado' 
                      : 'Nenhum agendamento cadastrado'
                    }
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
                    <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{data}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm font-mono bg-blue-100 px-2 py-1 rounded text-blue-700">{hora}</span>
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
                    <span className="text-sm text-blue-600 hover:text-blue-800 transition-colors">{agendamento.profissionalNome}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm">{agendamento.servicoNome}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm">{agendamento.convenioNome}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                      agendamento.tipoAtendimento === 'presencial' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {agendamento.tipoAtendimento}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge className={`text-xs ${getStatusColor(agendamento.status)}`}>
                      {agendamento.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex gap-1.5">
                      {canRead ? (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => handleVerDetalhes(agendamento)}
                          title="Visualizar Agendamento"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          disabled={true}
                          className="bg-gray-400 cursor-not-allowed h-8 w-8 p-0"
                          title="Você não tem permissão para visualizar agendamentos"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {canUpdate ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-green-300 text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600 focus:ring-4 focus:ring-green-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => handleAbrirEditarAgendamento(agendamento.id)}
                          title="Editar Agendamento"
                        >
                          <Edit className="w-4 h-4 text-green-600 group-hover:text-white transition-colors" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={true}
                          className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                          title="Você não tem permissão para editar agendamentos"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 focus:ring-4 focus:ring-red-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => confirmarExclusao(agendamento)}
                          title="Excluir Agendamento"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 group-hover:text-white transition-colors" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={true}
                          className="border-2 border-gray-300 text-gray-400 cursor-not-allowed h-8 w-8 p-0"
                          title="Você não tem permissão para excluir agendamentos"
                        >
                          <Trash2 className="w-4 h-4" />
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
            <span className="text-4xl">📅</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Agendamentos
            </span>
          </h1>
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
          
          {canCreate ? (
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleAbrirNovoAgendamento}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Agendamento
            </Button>
          ) : (
            <Button 
              disabled={true}
              className="bg-gray-400 cursor-not-allowed"
              title="Você não tem permissão para criar agendamentos"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Agendamento
            </Button>
          )}
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

            {/* Filtro Status */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Status</span>
              <select
                value={filtros.status}
                onChange={(e) => updateFiltro('status', e.target.value)}
                className="h-8 w-full px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os status</option>
                <option value="AGENDADO">Agendado</option>
                <option value="SOLICITADO">Solicitado</option>
                <option value="LIBERADO">Liberado</option>
                <option value="ATENDIDO">Atendido</option>
                <option value="FINALIZADO">Finalizado</option>
                <option value="CANCELADO">Cancelado</option>
                <option value="ARQUIVADO">Arquivado</option>
              </select>
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
                      status: 'Status',
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

      {/* Cards de Estatísticas para visualização de cards */}
      {visualizacao === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {estatisticas.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${stat.cor}`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600">{stat.label}</p>
                      </div>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stat.cor}`}>
                      <span className="text-sm font-bold text-white">{stat.valor}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Conteúdo */}
      {visualizacao === 'cards' ? renderCardView() : renderTableView()}

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
          Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, agendamentosFiltrados.length)} de {agendamentosFiltrados.length} resultados
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
      {/* Modal de confirmação de exclusão */}
      <ConfirmDeleteModal
        open={agendamentoExcluindo !== null}
        onClose={cancelarExclusao}
        onConfirm={handleDelete}
        entityName={agendamentoExcluindo?.pacienteNome || ''}
        entityType="agendamento"
        isLoading={deleteLoading}
        loadingText="Excluindo..."
        confirmText="Excluir Agendamento"
      />

      {/* Modal unificado de agendamento */}
      <AgendamentoModal
        isOpen={showAgendamentoModal}
        onClose={handleFecharAgendamentoModal}
        onSuccess={handleSuccessAgendamento}
      />

      <DetalhesAgendamentoModal
        isOpen={showDetalhesAgendamento}
        agendamento={agendamentoDetalhes}
        onClose={() => {
          setShowDetalhesAgendamento(false);
          setAgendamentoDetalhes(null);
        }}
      />

      {/* Modal de edição de agendamento */}
      <EditAgendamentoModal
        isOpen={showEditAgendamento}
        agendamentoId={agendamentoEditando}
        onClose={handleFecharEditAgendamento}
        onSuccess={handleSuccessEditAgendamento}
      />
    </div>
  );
}; 