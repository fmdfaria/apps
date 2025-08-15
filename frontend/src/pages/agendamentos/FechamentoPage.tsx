import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  FilterX,
  X,
  Calculator,
  TrendingUp,
  Building,
  Eye
} from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import { getAgendamentos } from '@/services/agendamentos';
import { ListarAgendamentosModal } from '@/components/agendamentos';
import api from '@/services/api';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import { AppToast } from '@/services/toast';

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
}

export const FechamentoPage = () => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para controle de permissões RBAC
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [busca, setBusca] = useState('');
  const [tipoVisualizacao, setTipoVisualizacao] = useState<'convenios' | 'particular'>('convenios');
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('tabela');
  
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [agendamentosDetalhes, setAgendamentosDetalhes] = useState<Agendamento[]>([]);
  const [tituloModal, setTituloModal] = useState('');

  // Filtros avançados por coluna
  const [filtros, setFiltros] = useState({
    convenio: '',
    paciente: '',
    profissional: '',
    servico: '',
    dataInicio: '',
    dataFim: ''
  });

  useEffect(() => {
    checkPermissions();
    carregarAgendamentos();
  }, []);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, itensPorPagina, filtros, tipoVisualizacao, visualizacao]);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Para fechamento, pode usar as mesmas permissões de agendamentos ou criar específicas
      const canViewAgendamentos = allowedRoutes.some((route: any) => {
        return route.path.includes('/agendamentos');
      });
      
      if (!canViewAgendamentos) {
        setAccessDenied(true);
      }
      
    } catch (error: any) {
      // Em caso de erro, verifica se é problema de permissão
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };

  const carregarAgendamentos = async () => {
    setLoading(true);
    setAgendamentos([]);
    try {
      const dados = await getAgendamentos();
      setAgendamentos(dados);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setAccessDenied(true);
        try {
          const info = await getRouteInfo('/agendamentos', 'GET');
          setRouteInfo(info);
        } catch (routeError) {
          // Erro ao buscar informações da rota
        }
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

  const limparFiltros = () => {
    setFiltros({
      convenio: '',
      paciente: '',
      profissional: '',
      servico: '',
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

  // Função para formatar valor monetário
  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
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

  // Filtrar agendamentos FINALIZADOS
  const agendamentosFiltrados = agendamentos
    .filter(a => a.status === 'FINALIZADO')
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
    .filter(a => {
      if (!filtros.dataInicio && !filtros.dataFim) return true;
      
      const dataAgendamentoISO = a.dataHoraInicio.split('T')[0];
      
      if (filtros.dataInicio && dataAgendamentoISO < filtros.dataInicio) return false;
      if (filtros.dataFim && dataAgendamentoISO > filtros.dataFim) return false;
      
      return true;
    });

  // Processar dados para visualização de convênios
  const processarDadosConvenios = (): FechamentoConvenio[] => {
    const conveniosMap = new Map<string, {
      agendamentos: Agendamento[],
      valorTotal: number
    }>();

    // Filtrar apenas convênios que não sejam particulares
    const agendamentosConvenios = agendamentosFiltrados.filter(a => 
      !a.convenioNome?.toLowerCase().includes('particular') && 
      !a.convenioNome?.toLowerCase().includes('privado') &&
      a.convenioNome !== 'Particular'
    );

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
      // Calcular valor a receber pela clínica
      const valorClinica = calcularValorClinica(agendamento);
      dados.valorTotal += valorClinica;
    });

    return Array.from(conveniosMap.entries()).map(([convenio, dados]) => {
      const datas = dados.agendamentos
        .map(a => a.dataHoraInicio?.split('T')[0])
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

      return {
        convenio: convenio || 'Não informado',
        dataInicio: new Date(dataInicio).toISOString().split('T')[0],
        dataFim: new Date(dataFim).toISOString().split('T')[0],
        qtdAgendamentos: dados.agendamentos.length,
        valorReceber: dados.valorTotal,
        agendamentos: dados.agendamentos
      };
    });
  };

  // Processar dados para visualização particular
  const processarDadosParticulares = (): FechamentoParticular[] => {
    const particularesMap = new Map<string, {
      agendamentos: Agendamento[],
      valorTotal: number
    }>();

    // Filtrar apenas atendimentos particulares (convenio 'Particular' ou similar)
    const agendamentosParticulares = agendamentosFiltrados.filter(a => 
      a.convenioNome?.toLowerCase().includes('particular') || 
      a.convenioNome?.toLowerCase().includes('privado') ||
      a.convenioNome === 'Particular'
    );

    agendamentosParticulares.forEach(agendamento => {
      const paciente = agendamento.pacienteNome || 'Não informado';
      
      if (!particularesMap.has(paciente)) {
        particularesMap.set(paciente, {
          agendamentos: [],
          valorTotal: 0
        });
      }

      const dados = particularesMap.get(paciente)!;
      dados.agendamentos.push(agendamento);
      // Calcular valor a receber pela clínica
      const valorClinica = calcularValorClinica(agendamento);
      dados.valorTotal += valorClinica;
    });

    return Array.from(particularesMap.entries()).map(([paciente, dados]) => {
      const datas = dados.agendamentos
        .map(a => a.dataHoraInicio?.split('T')[0])
        .filter(d => d); // Remove undefined/null values
      
      if (datas.length === 0) {
        const hoje = new Date().toISOString().split('T')[0];
        return {
          paciente: paciente || 'Não informado',
          dataInicio: hoje,
          dataFim: hoje,
          qtdAgendamentos: dados.agendamentos.length,
          valorReceber: dados.valorTotal,
          agendamentos: dados.agendamentos
        };
      }

      const dataInicio = Math.min(...datas.map(d => new Date(d).getTime()));
      const dataFim = Math.max(...datas.map(d => new Date(d).getTime()));

      return {
        paciente: paciente || 'Não informado',
        dataInicio: new Date(dataInicio).toISOString().split('T')[0],
        dataFim: new Date(dataFim).toISOString().split('T')[0],
        qtdAgendamentos: dados.agendamentos.length,
        valorReceber: dados.valorTotal,
        agendamentos: dados.agendamentos
      };
    });
  };

  const dadosConvenios = processarDadosConvenios();
  const dadosParticulares = processarDadosParticulares();

  const dadosAtivos = tipoVisualizacao === 'convenios' ? dadosConvenios : dadosParticulares;
  
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
                      dataInicio: 'De',
                      dataFim: 'Até'
                    };
                    
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

      {/* Conteúdo com scroll independente */}
      <div className="flex-1 overflow-y-auto">
        {/* Toggle grande para separar Convênios | Particular */}
        <div className="mb-6">
          <Tabs 
            value={tipoVisualizacao} 
            onValueChange={(value) => setTipoVisualizacao(value as 'convenios' | 'particular')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger 
                value="convenios" 
                className="flex items-center gap-2 transition-colors duration-200 text-base font-medium data-[state=active]:bg-green-100 data-[state=active]:text-green-700 data-[state=active]:border-green-300"
              >
                <Building className="w-5 h-5" />
                Convênios
                {dadosConvenios.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {dadosConvenios.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="particular" 
                className="flex items-center gap-2 transition-colors duration-200 text-base font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300"
              >
                <Users className="w-5 h-5" />
                Particular
                {dadosParticulares.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {dadosParticulares.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="convenios" className="mt-6">
              <div className="rounded-lg bg-white shadow-sm border border-gray-100">
                {visualizacao === 'tabela' ? renderConveniosView() : renderConveniosCardView()}
              </div>
            </TabsContent>

            <TabsContent value="particular" className="mt-6">
              <div className="rounded-lg bg-white shadow-sm border border-gray-100">
                {visualizacao === 'tabela' ? renderParticularView() : renderParticularCardView()}
              </div>
            </TabsContent>
          </Tabs>
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
      />
    </div>
  );
};