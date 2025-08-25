import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, UserCheck, Calendar, TrendingUp, Clock, 
  DollarSign, AlertCircle, 
  ArrowUpRight, ArrowDownRight, CalendarX, AlertTriangle
} from 'lucide-react';
import { getModuleTheme } from '@/types/theme';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, type DashboardData } from '@/services/dashboard';
import { getDadosOcupacao, type DadosOcupacao } from '@/services/ocupacao';
import { getPacientes } from '@/services/pacientes';
import { getAgendamentos } from '@/services/agendamentos';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupacaoData, setOcupacaoData] = useState<DadosOcupacao | null>(null);
  const [pedidosStats, setPedidosStats] = useState({ total: 0, vencendo: 0, vencidos: 0, vigentes: 0 });
  const [agendaStats, setAgendaStats] = useState({ hoje: 0, proximos7: 0 });

  // Carregar dados do dashboard
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true);
        setError(null);
        const [data, ocupacao, pacientes, agendamentosResult] = await Promise.all([
          getDashboardStats(),
          getDadosOcupacao(),
          getPacientes(),
          getAgendamentos() // Buscar agendamentos recentes (limitado pela API)
        ]);
        
        const agendamentos = agendamentosResult.data;
        setDashboardData(data);
        setOcupacaoData(ocupacao);
        // Pedidos Médicos agora estão em 'pacientes_pedidos'. Mantemos zero até endpoint agregado ser usado.
        setPedidosStats({ total: 0, vencendo: 0, vencidos: 0, vigentes: 0 });

        // Calcular agendamentos reais (hoje e próximos 7 dias)
        const inicioHoje = new Date();
        inicioHoje.setHours(0, 0, 0, 0);
        const fimHoje = new Date(inicioHoje);
        fimHoje.setDate(fimHoje.getDate() + 1);
        const seteDias = new Date(inicioHoje);
        seteDias.setDate(seteDias.getDate() + 7);

        const isBetween = (d: Date, start: Date, end: Date) => d >= start && d < end;

        const hojeCount = agendamentos.filter((a: any) => {
          const d = new Date(a.dataHoraInicio);
          return isBetween(d, inicioHoje, fimHoje);
        }).length;

        const proximos7Count = agendamentos.filter((a: any) => {
          const d = new Date(a.dataHoraInicio);
          return isBetween(d, inicioHoje, seteDias);
        }).length;

        setAgendaStats({ hoje: hojeCount, proximos7: proximos7Count });
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
        setError('Erro ao carregar dados do dashboard');
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  // Criar stats com dados reais ou padrão
  const stats = dashboardData ? [
    { 
      title: 'Pacientes Cadastrados', 
      value: dashboardData.stats.totalPacientes.toLocaleString('pt-BR'), 
      change: dashboardData.stats.pacientesAtivos > 0 ? 
        `${Math.round((dashboardData.stats.pacientesAtivos / dashboardData.stats.totalPacientes) * 100)}% ativos` : 
        'Sem dados', 
      trend: 'up' as const,
      icon: Users, 
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      module: 'pacientes'
    },
    { 
      title: 'Profissionais', 
      value: `${dashboardData.stats.totalProfissionais}`, 
      change: 'Total', 
      trend: 'up' as const,
      icon: UserCheck, 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      module: 'profissionais'
    },
    { 
      title: 'Agendamentos Hoje', 
      value: agendaStats.hoje.toString(), 
      change: `${agendaStats.proximos7} em 7 dias`, 
      trend: 'up' as const,
      icon: Calendar, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      module: 'agendamentos'
    },
    { 
      title: 'Receita Estimada', 
      value: `R$ ${(dashboardData.stats.receitaMensal / 1000).toFixed(1)}K`, 
      change: 'Próximos 7 dias', 
      trend: 'up' as const,
      icon: DollarSign, 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      module: 'servicos'
    },
  ] : [
    { 
      title: 'Pacientes Cadastrados', 
      value: '-', 
      change: 'Carregando...', 
      trend: 'up' as const,
      icon: Users, 
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      module: 'pacientes'
    },
    { 
      title: 'Profissionais', 
      value: '-', 
      change: 'Carregando...', 
      trend: 'up' as const,
      icon: UserCheck, 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      module: 'profissionais'
    },
    { 
      title: 'Agendamentos Hoje', 
      value: '-', 
      change: 'Carregando...', 
      trend: 'up' as const,
      icon: Calendar, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      module: 'agendamentos'
    },
    { 
      title: 'Receita Estimada', 
      value: '-', 
      change: 'Carregando...', 
      trend: 'up' as const,
      icon: DollarSign, 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      module: 'servicos'
    },
  ];

  // Agregados de ocupação para o card simplificado
  const ocupacaoAggregates = (() => {
    if (!ocupacaoData || !ocupacaoData.ocupacoesProfissionais?.length) {
      return { ocupados: 0, total: 0, percentual: 0, hoje: 0, seteDias: 0 };
    }
    const ocupados = ocupacaoData.ocupacoesProfissionais.reduce((acc, p) => acc + (p.ocupados || 0), 0);
    const total = ocupacaoData.ocupacoesProfissionais.reduce((acc, p) => acc + (p.total || 0), 0);
    const percentual = total > 0 ? Math.round((ocupados / total) * 100) : 0;
    const hoje = ocupacaoData.ocupacoesProfissionais.reduce((acc, p) => acc + (p.agendamentosHoje || 0), 0);
    const seteDias = ocupacaoData.estatisticas?.agendamentosProximosSete || 0;
    return { ocupados, total, percentual, hoje, seteDias };
  })();

  // Card de Atividades Recentes foi substituído por Pedidos Médicos (vencendo/vencidos)

  const upcomingAppointments = dashboardData?.upcomingAppointments || [];

  // Ações rápidas removidas conforme solicitação

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'bg-green-100 text-green-700',
      warning: 'bg-yellow-100 text-yellow-700',
      info: 'bg-blue-100 text-blue-700',
      error: 'bg-red-100 text-red-700'
    };
    return variants[status as keyof typeof variants] || variants.info;
  };

  const getAppointmentBadge = (status: string) => {
    return status === 'confirmed' 
      ? 'bg-green-100 text-green-700' 
      : 'bg-yellow-100 text-yellow-700';
  };

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Erro ao carregar dashboard</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-3 bg-red-600 hover:bg-red-700"
                size="sm"
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Olá, {user?.nome.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-600 mt-1">Aqui está o que está acontecendo na sua clínica hoje</p>
        </div>
        {/* Botões do header removidos */}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          return (
            <Card
              key={index}
              className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer"
              onClick={
                stat.module === 'pacientes'
                  ? () => navigate('/pacientes')
                  : stat.module === 'profissionais'
                  ? () => navigate('/profissionais')
                  : stat.module === 'agendamentos'
                  ? () => navigate('/agendamentos')
                  : undefined
              }
            >
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} />
                  </div>
                  <div className={`flex items-center text-xs font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <TrendIcon className="w-3 h-3 mr-1" />
                    {stat.change}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ocupação (dados simplificados da OcupacaoPage) */}
        <Card 
          className="lg:col-span-1 hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer"
          onClick={() => navigate('/dashboard/ocupacao')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Ocupação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="text-sm text-gray-600">Ocupação Total (7 dias)</div>
                <div className="text-sm font-bold text-gray-900">
                  {ocupacaoAggregates.ocupados}/{ocupacaoAggregates.total} ({ocupacaoAggregates.percentual}%)
                </div>
              </div>
              <Progress value={ocupacaoAggregates.percentual} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{ocupacaoAggregates.hoje}</div>
                <div className="text-xs text-gray-600">Agendamentos hoje</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{ocupacaoAggregates.seteDias}</div>
                <div className="text-xs text-gray-600">Agendamentos (7 dias)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pedidos Médicos (dados simplificados) */}
        <Card 
          className="lg:col-span-1 hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer"
          onClick={() => navigate('/dashboard/pedidos-medicos')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Pedidos Médicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-center justify-center gap-2 text-yellow-700 text-sm font-medium">
                  <AlertTriangle className="w-4 h-4" /> Vencendo (30 dias)
                </div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{pedidosStats.vencendo}</div>
              </div>
              <div className="text-center p-3 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center justify-center gap-2 text-red-700 text-sm font-medium">
                  <CalendarX className="w-4 h-4" /> Vencidos
                </div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{pedidosStats.vencidos}</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-600 text-center">
              Total: <span className="font-semibold text-gray-900">{pedidosStats.total}</span> — Vigentes: <span className="font-semibold text-gray-900">{pedidosStats.vigentes}</span>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Próximos Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appointment, index) => (
                  <div key={appointment.id || index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="text-center">
                      <div className="text-sm font-bold text-gray-900">{appointment.time}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{appointment.patient}</p>
                      <p className="text-xs text-gray-600 truncate">{appointment.professional}</p>
                      <p className="text-xs text-gray-500">{appointment.service}</p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getAppointmentBadge(appointment.status)}`}
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nenhum agendamento próximo</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Agendamentos Próximos 7 Dias</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.stats.agendamentosProximosSete || '-'}
                </p>
                <p className="text-sm text-blue-600 flex items-center mt-2">
                  <Calendar className="w-4 h-4 mr-1" />
                  {dashboardData?.stats.agendamentosHoje || 0} agendamentos hoje
                </p>
              </div>
              <Calendar className="w-12 h-12 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Pacientes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.stats.totalPacientes.toLocaleString('pt-BR') || '-'}
                </p>
                <p className="text-sm text-green-600 flex items-center mt-2">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  {dashboardData?.stats.pacientesAtivos || 0} pacientes ativos
                </p>
              </div>
              <Users className="w-12 h-12 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Receita Estimada</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {dashboardData ? (dashboardData.stats.receitaMensal / 1000).toFixed(1) + 'K' : '-'}
                </p>
                <p className="text-sm text-green-600 flex items-center mt-2">
                  <DollarSign className="w-4 h-4 mr-1" />
                  Próximos 7 dias
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-purple-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
