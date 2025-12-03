import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, UserCheck, Calendar, TrendingUp, Clock,
  DollarSign, AlertCircle, Activity, Heart,
  ArrowUpRight, ArrowDownRight, CalendarX, AlertTriangle,
  Stethoscope, Building2, CreditCard, Target, PieChart,
  BarChart3, LineChart, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getPacientesAtivos } from '@/services/pacientes';
import { getServicosAtivos } from '@/services/servicos';
import { getAgendamentos } from '@/services/agendamentos';
import { getProfissionais } from '@/services/profissionais';
import { getRouteInfo, type RouteInfo } from '@/services/routes-info';
import { getPacientesComFaltasConsecutivas, type PacienteComFaltas } from '@/services/faltas-consecutivas';
import api from '@/services/api';
import type { Paciente } from '@/types/Paciente';
import type { Servico } from '@/types/Servico';
import type { Agendamento } from '@/types/Agendamento';
import type { Profissional } from '@/types/Profissional';

// Mock Data Expandido para BI - Dados realísticos da clínica
const MOCK_BI_DATA = {
  // KPIs Principais
  overview: {
    totalRevenue: 342580.75,
    monthlyGrowth: 12.3,
    totalPatients: 1247,
    activePatients: 892,
    totalProfessionals: 15,
    activeProfessionals: 13,
    appointmentsToday: 23,
    appointmentsWeek: 145,
    occupancyRate: 74,
    noShowRate: 8.2,
    collectionRate: 94.5,
    avgRevenuePerAppointment: 285.50,
  },

  // Receita por fonte
  revenueBySource: [
    { name: 'Convênios', value: 212450.25, percentage: 62, color: '#3B82F6' },
    { name: 'Particular', value: 98140.30, percentage: 28.6, color: '#10B981' },
    { name: 'Exames', value: 31990.20, percentage: 9.4, color: '#F59E0B' }
  ],

  // Tendência de receita (últimos 6 meses)
  revenueTrend: [
    { month: 'Jul', value: 298450, appointments: 1050 },
    { month: 'Aug', value: 312800, appointments: 1125 },
    { month: 'Sep', value: 289650, appointments: 995 },
    { month: 'Out', value: 324750, appointments: 1180 },
    { month: 'Nov', value: 331200, appointments: 1205 },
    { month: 'Dez', value: 342580, appointments: 1247 }
  ],

  // Especialidades mais procuradas
  topSpecialties: [
    { name: 'Cardiologia', appointments: 285, revenue: 82450.00, growth: 15.2 },
    { name: 'Ortopedia', appointments: 245, revenue: 71820.50, growth: 8.7 },
    { name: 'Neurologia', appointments: 198, revenue: 69340.25, growth: 12.1 },
    { name: 'Fisioterapia', appointments: 320, revenue: 54680.00, growth: 6.3 },
    { name: 'Psicologia', appointments: 156, revenue: 28920.00, growth: 22.1 }
  ],

  // Performance dos profissionais (top 5)
  topProfessionals: [
    { name: 'Dr. João Carvalho', specialty: 'Cardiologia', occupancy: 87, revenue: 45280.50, patients: 89 },
    { name: 'Dra. Ana Costa', specialty: 'Fisioterapia', occupancy: 92, revenue: 38420.30, patients: 124 },
    { name: 'Dr. Carlos Lima', specialty: 'Ortopedia', occupancy: 79, revenue: 41850.75, patients: 76 },
    { name: 'Dra. Lucia Rocha', specialty: 'Neurologia', occupancy: 85, revenue: 38690.00, patients: 68 },
    { name: 'Dr. Roberto Silva', specialty: 'Psicologia', occupancy: 76, revenue: 25480.25, patients: 92 }
  ],

  // Métricas operacionais
  operationalMetrics: {
    avgWaitTime: 12.5,
    appointmentDuration: 45,
    authorizationTime: 24,
    documentationRate: 96.8,
    patientSatisfaction: 4.7,
    resourceUtilization: 82.3
  },

  // Agendamentos por status
  appointmentStatus: [
    { status: 'Confirmado', count: 18, color: '#10B981' },
    { status: 'Pendente', count: 5, color: '#F59E0B' },
    { status: 'Em Atendimento', count: 3, color: '#3B82F6' },
    { status: 'Finalizado', count: 156, color: '#6B7280' }
  ],


};

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [showCurrencyValues, setShowCurrencyValues] = useState(false);

  // Estados para controle de acesso RBAC
  const [accessDenied, setAccessDenied] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  // Estados para dados reais da API
  const [pacientesAtivos, setPacientesAtivos] = useState<Paciente[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(true);
  const [errorPacientes, setErrorPacientes] = useState<string | null>(null);

  // Estados para serviços, agendamentos e profissionais
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [agendamentosProximos7, setAgendamentosProximos7] = useState<Agendamento[]>([]);
  const [loadingServicos, setLoadingServicos] = useState(true);
  const [errorServicos, setErrorServicos] = useState<string | null>(null);

  // Estado para pacientes com faltas consecutivas
  const [pacientesFaltasConsecutivas, setPacientesFaltasConsecutivas] = useState<PacienteComFaltas[]>([]);

  // Função para verificar permissões RBAC
  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;

      // Verificar permissão de leitura do dashboard
      const canRead = allowedRoutes.some((route: any) => {
        return route.path === '/dashboard' && route.method.toLowerCase() === 'get';
      });

      // Se não tem permissão de leitura, marca como access denied
      if (!canRead) {
        setAccessDenied(true);
      }

    } catch (error: any) {
      // Em caso de erro, desabilita por segurança

      // Se retornar 401/403 no endpoint de permissões, considera acesso negado
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAccessDenied(true);
      }
    }
  };

  // Função para carregar dados da API
  const carregarDados = async () => {
    setAccessDenied(false);

    // Carregar pacientes
    try {
      setLoadingPacientes(true);
      setErrorPacientes(null);
      setPacientesAtivos([]); // Limpa dados para evitar mostrar dados antigos
      const pacientesAtivosData = await getPacientesAtivos();
      setPacientesAtivos(pacientesAtivosData);
    } catch (error: any) {
      console.error('Erro ao carregar pacientes ativos:', error);
      if (error?.response?.status === 403) {
        setAccessDenied(true);
        // Buscar informações da rota para mensagem mais específica
        try {
          const info = await getRouteInfo('/dashboard', 'GET');
          setRouteInfo(info);
        } catch (routeError) {
          // Erro ao buscar informações da rota
        }
        // Não mostra toast aqui pois o interceptor já cuida disso
      } else {
        setErrorPacientes('Erro ao carregar pacientes ativos');
      }
    } finally {
      setLoadingPacientes(false);
    }
    
    // Carregar serviços, agendamentos e profissionais
    try {
      setLoadingServicos(true);
      setErrorServicos(null);
      setServicos([]); // Limpa dados para evitar mostrar dados antigos
      setAgendamentos([]);
      setAgendamentosProximos7([]);
      setProfissionais([]);

      const hoje = new Date();

      // Para receita (últimos 30 dias)
      const trintaDiasAtras = new Date(hoje);
      trintaDiasAtras.setDate(hoje.getDate() - 30);
      const dataInicio30 = trintaDiasAtras.toISOString().split('T')[0];
      const dataFim30 = hoje.toISOString().split('T')[0];

      // Para ocupação (próximos 7 dias)
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      const proximosSete = new Date(inicioHoje);
      proximosSete.setDate(proximosSete.getDate() + 7);
      const dataInicioOcup = inicioHoje.toISOString().split('T')[0];
      const dataFimOcup = proximosSete.toISOString().split('T')[0];

      const [servicosData, agendamentosResult, agendamentosOcupResult, profissionaisData] = await Promise.all([
        getServicosAtivos(),
        getAgendamentos({
          dataInicio: dataInicio30,
          dataFim: dataFim30
        }),
        getAgendamentos({
          dataInicio: dataInicioOcup,
          dataFim: dataFimOcup
        }),
        getProfissionais({ ativo: true })
      ]);

      setServicos(servicosData);
      setAgendamentos(agendamentosResult.data);
      setAgendamentosProximos7(agendamentosOcupResult.data);
      setProfissionais(profissionaisData);

      // Carregar pacientes com faltas consecutivas
      try {
        const faltasData = await getPacientesComFaltasConsecutivas();
        setPacientesFaltasConsecutivas(faltasData);
      } catch (error) {
        console.error('Erro ao carregar pacientes com faltas consecutivas:', error);
        setPacientesFaltasConsecutivas([]);
      }

    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      if (error?.response?.status === 403) {
        setAccessDenied(true);
        // Buscar informações da rota para mensagem mais específica
        try {
          const info = await getRouteInfo('/dashboard', 'GET');
          setRouteInfo(info);
        } catch (routeError) {
          // Erro ao buscar informações da rota
        }
        // Não mostra toast aqui pois o interceptor já cuida disso
      } else {
        setErrorServicos('Erro ao carregar dados');
      }
    } finally {
      setLoadingServicos(false);
    }
  };

  // Carregar dados da API na inicialização
  useEffect(() => {
    checkPermissions();
    carregarDados();
  }, []);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatCurrencyHidden = (value: number) => 
    showCurrencyValues ? formatCurrency(value) : 'R$ •••,••';

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  // Calcular métricas simples dos pacientes ativos (usando tipoServico)
  const pacientesMetrics = {
    pacientesAtivos: pacientesAtivos.length,
    pacientesConvenio: pacientesAtivos.filter(p => p.tipoServico === 'Convênio').length,
    pacientesParticulares: pacientesAtivos.filter(p => p.tipoServico === 'Particular').length,
    percentualConvenio: pacientesAtivos.length > 0 ? (pacientesAtivos.filter(p => p.tipoServico === 'Convênio').length / pacientesAtivos.length) * 100 : 0
  };

  // Análise por tipo de serviço (convênio vs particular) - dados reais
  const tipoServicoAnalysis = [
    { 
      name: 'Convênios', 
      value: pacientesMetrics.pacientesConvenio,
      percentage: pacientesMetrics.percentualConvenio, 
      color: '#3B82F6' 
    },
    { 
      name: 'Particular', 
      value: pacientesMetrics.pacientesParticulares,
      percentage: 100 - pacientesMetrics.percentualConvenio, 
      color: '#10B981' 
    }
  ];

  // Análise dos convênios específicos - dados reais
  const conveniosAnalysis = () => {
    const pacientesConvenio = pacientesAtivos.filter(p => p.tipoServico === 'Convênio' && p.convenio?.nome);
    
    // Agrupar por nome do convênio
    const conveniosMap = new Map<string, number>();
    pacientesConvenio.forEach(p => {
      const nomeConvenio = p.convenio?.nome || 'Sem nome';
      conveniosMap.set(nomeConvenio, (conveniosMap.get(nomeConvenio) || 0) + 1);
    });
    
    // Converter para array ordenado por quantidade
    const conveniosArray = Array.from(conveniosMap.entries())
      .map(([nome, quantidade]) => ({
        name: nome,
        value: `${quantidade} pacientes`,
        count: quantidade,
        percentage: pacientesConvenio.length > 0 ? (quantidade / pacientesConvenio.length) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
    
    return conveniosArray;
  };

  // Calcular receita total real dos últimos 30 dias
  const receitaTotal30Dias = () => {
    if (loadingServicos || servicos.length === 0 || agendamentos.length === 0) {
      return 0;
    }
    
    let receita = 0;
    agendamentos.forEach(agendamento => {
      const servicoId = agendamento.servicoId;
      const servico = servicos.find(s => s.id === servicoId);
      if (servico) {
        receita += servico.preco;
      }
    });
    
    return receita;
  };

  // Calcular taxa de ocupação média (próximos 7 dias) - igual ao /dashboard/ocupacao
  const taxaOcupacaoMedia = () => {
    if (loadingServicos || profissionais.length === 0) {
      return 0;
    }
    
    // Processar ocupações dos profissionais com estimativa de slots
    const ocupacoesProfissionais = profissionais.map(prof => {
      // Calcular agendamentos do profissional nos próximos 7 dias
      const agendamentosProfProx7 = agendamentosProximos7.filter((ag: Agendamento) => ag.profissionalId === prof.id);

      // Estimar total de slots disponíveis (8 slots/dia × 7 dias = 56 slots)
      const totalSlots = 56;
      const ocupadosReais = agendamentosProfProx7.length;
      const percentualReal = totalSlots > 0 ? Math.round((ocupadosReais / totalSlots) * 100) : 0;

      return {
        profissionalId: prof.id,
        nome: prof.nome,
        ocupados: ocupadosReais,
        total: totalSlots,
        percentual: percentualReal
      };
    }).filter(prof => prof.total > 0);

    // Calcular média de ocupação
    const mediaOcupacao = ocupacoesProfissionais.length > 0 
      ? ocupacoesProfissionais.reduce((acc, prof) => acc + prof.percentual, 0) / ocupacoesProfissionais.length 
      : 0;
    
    return Math.round(mediaOcupacao);
  };

  // Calcular serviços em alta - dados reais
  const servicosEmAlta = () => {
    if (loadingServicos || servicos.length === 0 || agendamentos.length === 0) {
      return [];
    }
    
    // Agrupar agendamentos por serviço e calcular receita
    const servicosMap = new Map<string, {
      nome: string;
      quantidade: number;
      receita: number;
      preco: number;
    }>();
    
    agendamentos.forEach(agendamento => {
      const servicoId = agendamento.servicoId;
      const servico = servicos.find(s => s.id === servicoId);
      
      if (servico) {
        const key = servico.id;
        
        if (!servicosMap.has(key)) {
          servicosMap.set(key, {
            nome: servico.nome,
            quantidade: 0,
            receita: 0,
            preco: servico.preco
          });
        }
        
        const dados = servicosMap.get(key)!;
        dados.quantidade += 1;
        dados.receita += servico.preco;
      }
    });
    
    // Converter para array ordenado por receita (todos os serviços)
    const servicosSorted = Array.from(servicosMap.values())
      .sort((a, b) => b.receita - a.receita); // Remover slice para mostrar todos
    
    const maxReceita = servicosSorted.length > 0 ? servicosSorted[0].receita : 1;
    
    const servicosArray = servicosSorted.map((servico, index) => ({
      name: servico.nome,
      value: `${formatCurrency(servico.receita)} (${servico.quantidade})`,
      count: servico.quantidade,
      revenue: servico.receita,
      percentage: maxReceita > 0 ? (servico.receita / maxReceita) * 100 : 100,
      color: ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'][index % 10] || '#6B7280'
    }));
    
    return servicosArray;
  };

  // Calcular top profissionais - dados reais
  const topProfissionais = () => {
    if (loadingServicos || servicos.length === 0 || agendamentos.length === 0) {
      return [];
    }
    
    // Agrupar agendamentos por profissional e calcular receita
    const profissionaisMap = new Map<string, {
      nome: string;
      quantidade: number;
      receita: number;
    }>();
    
    agendamentos.forEach(agendamento => {
      const profissionalNome = agendamento.profissionalNome || 'Profissional não informado';
      const servicoId = agendamento.servicoId;
      const servico = servicos.find(s => s.id === servicoId);
      
      if (servico) {
        if (!profissionaisMap.has(profissionalNome)) {
          profissionaisMap.set(profissionalNome, {
            nome: profissionalNome,
            quantidade: 0,
            receita: 0
          });
        }
        
        const dados = profissionaisMap.get(profissionalNome)!;
        dados.quantidade += 1;
        dados.receita += servico.preco;
      }
    });
    
    // Converter para array ordenado por receita (todos os profissionais)
    const profissionaisSorted = Array.from(profissionaisMap.values())
      .sort((a, b) => b.receita - a.receita);
    
    const maxReceita = profissionaisSorted.length > 0 ? profissionaisSorted[0].receita : 1;
    
    const profissionaisArray = profissionaisSorted.map((profissional, index) => ({
      name: profissional.nome,
      value: `${formatCurrency(profissional.receita)} (${profissional.quantidade})`,
      count: profissional.quantidade,
      revenue: profissional.receita,
      percentage: maxReceita > 0 ? (profissional.receita / maxReceita) * 100 : 100,
      color: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'][index % 10] || '#6B7280'
    }));
    
    return profissionaisArray;
  };

  // Componente para métricas principais
  const MetricCard = ({ title, value, change, trend, icon: Icon, color, bgColor, onClick, hasCurrency = false }: any) => (
    <Card className={`hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer ${bgColor} border-l-4 ${color}`} onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${bgColor}`}>
            <Icon className={`w-8 h-8 ${color.replace('border-l-', 'text-')}`} />
          </div>
          <div className="flex items-center gap-2">
            {hasCurrency && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCurrencyValues(!showCurrencyValues);
                }}
                className="p-1 h-8 w-8 hover:bg-gray-100"
              >
                {showCurrencyValues ? (
                  <EyeOff className="w-4 h-4 text-gray-600" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-600" />
                )}
              </Button>
            )}
            <div className={`flex items-center text-sm font-medium ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trend === 'up' ? <ArrowUpRight className="w-4 h-4 mr-1" /> : 
               trend === 'down' ? <ArrowDownRight className="w-4 h-4 mr-1" /> : 
               <Activity className="w-4 h-4 mr-1" />}
              {change}
            </div>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  // Componente para gráfico de barras simples
  const SimpleBarChart = ({ data, title, color = '#3B82F6', showRanking = false, hasCurrency = false }: any) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {hasCurrency && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowCurrencyValues(!showCurrencyValues)}
            className="p-1 h-8 w-8 hover:bg-gray-100"
          >
            {showCurrencyValues ? (
              <EyeOff className="w-4 h-4 text-gray-600" />
            ) : (
              <Eye className="w-4 h-4 text-gray-600" />
            )}
          </Button>
        )}
      </div>
      {data.map((item: any, index: number) => (
        <div key={index} className="space-y-2">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {showRanking && (
                <Badge 
                  variant="outline" 
                  className={`text-xs font-bold min-w-[24px] h-5 flex items-center justify-center flex-shrink-0 ${
                    index === 0 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                    index === 1 ? 'bg-gray-100 text-gray-800 border-gray-300' :
                    index === 2 ? 'bg-orange-100 text-orange-800 border-orange-300' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {index + 1}
                </Badge>
              )}
              <span className="text-sm font-medium text-gray-700 truncate" title={item.name}>
                {item.name}
              </span>
            </div>
            <span className="text-sm font-bold text-gray-900 flex-shrink-0">
              {hasCurrency && item.revenue ? 
                (showCurrencyValues ? formatCurrency(item.revenue) + ` (${item.count})` : 'R$ •••,•• (' + item.count + ')') : 
                (item.value || item.revenue || item.count)
              }
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${item.percentage || (item.count / 200 * 100) || (item.occupancy || 50)}%`,
                backgroundColor: item.color || color 
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );

  // Se acesso negado, mostrar mensagem
  if (accessDenied) {
    return (
      <div className="p-6 space-y-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
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
              <p>Você não tem permissão para acessar o dashboard</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      {/* Header Moderno */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Olá, {user?.nome.split(' ')[0]} 👋 Insights estratégicos da sua clínica
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 lg:mt-0">
          <Button
            variant="outline"
            className="gap-2"
            onClick={carregarDados}
            disabled={loadingPacientes || loadingServicos}
          >
            <RefreshCw className={`w-4 h-4 ${(loadingPacientes || loadingServicos) ? 'animate-spin' : ''}`} />
            {(loadingPacientes || loadingServicos) ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Pacientes Ativos"
          value={loadingPacientes ? '-' : pacientesMetrics.pacientesAtivos.toLocaleString()}
          change={loadingPacientes ? 'Carregando...' : `${pacientesMetrics.pacientesConvenio} convênios + ${pacientesMetrics.pacientesParticulares} particulares`}
          trend="up"
          icon={Users}
          color="border-l-blue-500 text-blue-600"
          bgColor="bg-blue-50"
          onClick={() => navigate('/pacientes')}
        />
        
        <MetricCard
          title="Serviços Ativos"
          value={loadingServicos ? '-' : servicos.length.toLocaleString()}
          change={loadingServicos ? 'Carregando...' : `${servicos.length} serviços disponíveis`}
          trend="up"
          icon={Stethoscope}
          color="border-l-green-500 text-green-600"
          bgColor="bg-green-50"
          onClick={() => navigate('/servicos')}
        />
        
        <MetricCard
          title="Taxa de Ocupação"
          value={loadingServicos ? '-' : `${taxaOcupacaoMedia()}%`}
          change={loadingServicos ? 'Carregando...' : `${agendamentosProximos7.length} agendamentos (7 dias)`}
          trend={taxaOcupacaoMedia() >= 80 ? "up" : taxaOcupacaoMedia() >= 60 ? "up" : "down"}
          icon={Target}
          color="border-l-purple-500 text-purple-600"
          bgColor="bg-purple-50"
          onClick={() => navigate('/dashboard/ocupacao')}
        />
        
        <MetricCard
          title="Receita Total"
          value={loadingServicos ? '-' : formatCurrencyHidden(receitaTotal30Dias())}
          change={loadingServicos ? 'Carregando...' : `${agendamentos.length} agendamentos (30 dias)`}
          trend="up"
          icon={DollarSign}
          color="border-l-emerald-500 text-emerald-600"
          bgColor="bg-emerald-50"
          onClick={() => navigate('/agendamentos/fechamento')}
          hasCurrency={true}
        />
      </div>

      {/* Widget de Alerta - Faltas Consecutivas */}
      {pacientesFaltasConsecutivas.length > 0 && (
        <Card
          className="border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-orange-50 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          onClick={() => navigate('/pacientes/faltas-consecutivas')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-red-700">
              <AlertTriangle className="w-6 h-6" />
              <div className="flex-1">
                Alerta: Pacientes com Faltas Consecutivas
              </div>
              <Badge variant="destructive" className="bg-red-500 text-lg px-3 py-1">
                {pacientesFaltasConsecutivas.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {pacientesFaltasConsecutivas.length} {pacientesFaltasConsecutivas.length === 1 ? 'paciente apresenta' : 'pacientes apresentam'} 2 ou mais faltas seguidas
              </p>

              {/* Preview dos top 3 */}
              <div className="space-y-2">
                {pacientesFaltasConsecutivas.slice(0, 3).map((paciente) => (
                  <div
                    key={paciente.pacienteId}
                    className="flex items-center justify-between p-2 bg-white/60 rounded-md"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{paciente.pacienteNome}</p>
                      <p className="text-xs text-muted-foreground">{paciente.servicoNome}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="destructive" className="bg-red-500">
                        {paciente.faltasConsecutivas} consecutivas
                      </Badge>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        {paciente.totalFaltas} total
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {pacientesFaltasConsecutivas.length > 3 && (
                <div className="text-center pt-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Ver todos os {pacientesFaltasConsecutivas.length} pacientes
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Pacientes por Tipo (Dados Reais) */}
        <Card className="lg:col-span-1 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-600" />
              Pacientes por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPacientes ? (
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : errorPacientes ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-600">{errorPacientes}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {tipoServicoAnalysis.map((tipo, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tipo.color }}
                        />
                        <span className="font-medium text-gray-800">{tipo.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{tipo.value} pacientes</div>
                        <div className="text-sm text-gray-500">{formatPercentage(tipo.percentage)}</div>
                      </div>
                    </div>
                    <Progress value={tipo.percentage} className="h-3" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Convênios Ativos (Dados Reais) */}
        <Card className="lg:col-span-1 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-indigo-600" />
              Convênios Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPacientes ? (
              <div className="space-y-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : errorPacientes ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-600">Erro ao carregar</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto pr-2">
                <SimpleBarChart 
                  data={conveniosAnalysis().map((convenio, index) => ({
                    name: convenio.name,
                    value: convenio.value,
                    percentage: convenio.percentage,
                    color: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'][index % 10] || '#6B7280'
                  }))}
                  title=""
                  showRanking={true}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Serviços em Alta (Dados Reais) */}
        <Card className="lg:col-span-1 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Stethoscope className="w-6 h-6 text-green-600" />
              Serviços em Alta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingServicos ? (
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : errorServicos ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-600">{errorServicos}</p>
              </div>
            ) : servicosEmAlta().length > 0 ? (
              <div className="max-h-80 overflow-y-auto pr-2">
                <SimpleBarChart 
                  data={servicosEmAlta()}
                  title=""
                  showRanking={true}
                  hasCurrency={true}
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Nenhum serviço encontrado</p>
                <p className="text-xs text-gray-500">Últimos 30 dias</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Profissionais (Dados Reais) */}
        <Card className="lg:col-span-1 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <UserCheck className="w-6 h-6 text-purple-600" />
              Top Profissionais
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingServicos ? (
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : errorServicos ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-600">{errorServicos}</p>
              </div>
            ) : topProfissionais().length > 0 ? (
              <div className="max-h-80 overflow-y-auto pr-2">
                <SimpleBarChart 
                  data={topProfissionais()}
                  title=""
                  showRanking={true}
                  hasCurrency={true}
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Nenhum profissional encontrado</p>
                <p className="text-xs text-gray-500">Últimos 30 dias</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Métricas Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg">
          <Clock className="w-8 h-8 mx-auto text-blue-600 mb-2" />
          <div className="text-2xl font-bold text-blue-900">{MOCK_BI_DATA.operationalMetrics.avgWaitTime}min</div>
          <div className="text-xs text-blue-700">Tempo Médio Espera</div>
        </Card>

        <Card className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg">
          <CreditCard className="w-8 h-8 mx-auto text-green-600 mb-2" />
          <div className="text-2xl font-bold text-green-900">{MOCK_BI_DATA.overview.collectionRate}%</div>
          <div className="text-xs text-green-700">Taxa Cobrança</div>
        </Card>

        <Card className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg relative">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowCurrencyValues(!showCurrencyValues)}
            className="absolute top-1 right-1 p-1 h-6 w-6 hover:bg-purple-200"
          >
            {showCurrencyValues ? (
              <EyeOff className="w-3 h-3 text-purple-600" />
            ) : (
              <Eye className="w-3 h-3 text-purple-600" />
            )}
          </Button>
          <Activity className="w-8 h-8 mx-auto text-purple-600 mb-2" />
          <div className="text-2xl font-bold text-purple-900">{formatCurrencyHidden(MOCK_BI_DATA.overview.avgRevenuePerAppointment)}</div>
          <div className="text-xs text-purple-700">Receita/Consulta</div>
        </Card>

        <Card className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-0 shadow-lg">
          <CalendarX className="w-8 h-8 mx-auto text-orange-600 mb-2" />
          <div className="text-2xl font-bold text-orange-900">{MOCK_BI_DATA.overview.noShowRate}%</div>
          <div className="text-xs text-orange-700">Taxa No-Show</div>
        </Card>

        <Card className="text-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 border-0 shadow-lg">
          <BarChart3 className="w-8 h-8 mx-auto text-indigo-600 mb-2" />
          <div className="text-2xl font-bold text-indigo-900">{MOCK_BI_DATA.operationalMetrics.resourceUtilization}%</div>
          <div className="text-xs text-indigo-700">Uso Recursos</div>
        </Card>

        <Card className="text-center p-4 bg-gradient-to-br from-rose-50 to-rose-100 border-0 shadow-lg">
          <Heart className="w-8 h-8 mx-auto text-rose-600 mb-2" />
          <div className="text-2xl font-bold text-rose-900">{MOCK_BI_DATA.operationalMetrics.patientSatisfaction}/5</div>
          <div className="text-xs text-rose-700">Satisfação</div>
        </Card>
      </div>
    </div>
  );
};