import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, UserCheck, Calendar, Building, TrendingUp, Clock, 
  Activity, DollarSign, AlertCircle, CheckCircle, 
  ArrowUpRight, ArrowDownRight, Plus, Eye, BarChart3
} from 'lucide-react';
import { getModuleTheme } from '@/types/theme';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const defaultTheme = getModuleTheme('default');
  const agendamentosTheme = getModuleTheme('agendamentos');
  const pacientesTheme = getModuleTheme('pacientes');
  const profissionaisTheme = getModuleTheme('profissionais');
  const servicosTheme = getModuleTheme('servicos');

  useEffect(() => {
    // Simular carregamento inicial
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const stats = [
    { 
      title: 'Pacientes Cadastrados', 
      value: '1,284', 
      change: '+12%', 
      trend: 'up',
      icon: Users, 
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      module: 'pacientes'
    },
    { 
      title: 'Profissionais Ativos', 
      value: '24', 
      change: '+2', 
      trend: 'up',
      icon: UserCheck, 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      module: 'profissionais'
    },
    { 
      title: 'Agendamentos Hoje', 
      value: '47', 
      change: '+15%', 
      trend: 'up',
      icon: Calendar, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      module: 'agendamentos'
    },
    { 
      title: 'Receita Mensal', 
      value: 'R$ 89.4K', 
      change: '+8.2%', 
      trend: 'up',
      icon: DollarSign, 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      module: 'servicos'
    },
  ];

  const quickStats = [
    { label: 'Taxa de Ocupação', value: '87%', progress: 87, color: 'blue' },
    { label: 'Satisfação dos Pacientes', value: '4.8/5', progress: 96, color: 'green' },
    { label: 'Agenda Preenchida', value: '73%', progress: 73, color: 'purple' },
    { label: 'Profissionais Disponíveis', value: '18/24', progress: 75, color: 'orange' }
  ];

  const recentActivities = [
    { 
      action: 'Novo paciente cadastrado', 
      patient: 'Maria Silva Santos', 
      time: '2 min atrás',
      type: 'patient',
      status: 'success'
    },
    { 
      action: 'Agendamento confirmado', 
      patient: 'João Pedro Santos', 
      time: '5 min atrás',
      type: 'appointment',
      status: 'success'
    },
    { 
      action: 'Consulta cancelada', 
      patient: 'Ana Costa Lima', 
      time: '8 min atrás',
      type: 'appointment',
      status: 'warning'
    },
    { 
      action: 'Profissional atualizado', 
      patient: 'Dr. Carlos Lima', 
      time: '12 min atrás',
      type: 'professional',
      status: 'info'
    },
    { 
      action: 'Pagamento recebido', 
      patient: 'Clínica ABC', 
      time: '15 min atrás',
      type: 'payment',
      status: 'success'
    },
    { 
      action: 'Convênio renovado', 
      patient: 'Unimed Regional', 
      time: '1 hora atrás',
      type: 'convenio',
      status: 'success'
    },
  ];

  const upcomingAppointments = [
    { 
      time: '09:00', 
      patient: 'Maria Silva', 
      professional: 'Dr. João Santos',
      service: 'Consulta Geral',
      status: 'confirmed'
    },
    { 
      time: '10:30', 
      patient: 'Pedro Lima', 
      professional: 'Dra. Ana Costa',
      service: 'Cardiologia',
      status: 'pending'
    },
    { 
      time: '14:00', 
      patient: 'Carlos Souza', 
      professional: 'Dr. Luis Silva',
      service: 'Ortopedia',
      status: 'confirmed'
    },
    { 
      time: '15:30', 
      patient: 'Julia Santos', 
      professional: 'Dra. Maria Lima',
      service: 'Pediatria',
      status: 'pending'
    }
  ];

  const quickActions = [
    { label: 'Novo Agendamento', icon: Plus, action: () => navigate('agendamentos'), color: 'blue' },
    { label: 'Ver Calendário', icon: Eye, action: () => navigate('calendario'), color: 'green' },
    { label: 'Relatórios', icon: BarChart3, action: () => {}, color: 'purple' },
    { label: 'Configurações', icon: Activity, action: () => {}, color: 'orange' }
  ];

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
        <div className="flex gap-2 mt-4 sm:mt-0">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={action.action}
                className="flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:block">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          return (
            <Card key={index} className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer">
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
        {/* Quick Stats */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Métricas Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {quickStats.map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                  <span className="text-sm font-bold text-gray-900">{metric.value}</span>
                </div>
                <Progress 
                  value={metric.progress} 
                  className="h-2" 
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 ${getStatusBadge(activity.status)}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-600 truncate">{activity.patient}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStatusBadge(activity.status)}`}
                  >
                    {activity.status}
                  </Badge>
                </div>
              ))}
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
              {upcomingAppointments.map((appointment, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Agendamentos Esta Semana</p>
                <p className="text-2xl font-bold text-gray-900">156</p>
                <p className="text-sm text-green-600 flex items-center mt-2">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  +12% vs semana anterior
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
                <p className="text-sm font-medium text-gray-600">Novos Pacientes</p>
                <p className="text-2xl font-bold text-gray-900">23</p>
                <p className="text-sm text-green-600 flex items-center mt-2">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  +8% vs mês anterior
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
                <p className="text-2xl font-bold text-gray-900">R$ 12.4K</p>
                <p className="text-sm text-green-600 flex items-center mt-2">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  +15% vs meta mensal
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
