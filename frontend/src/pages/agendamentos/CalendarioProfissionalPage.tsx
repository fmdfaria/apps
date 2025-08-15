import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  FileText,
  Building2,
  Monitor,
  X,
  Edit,
  Eye
} from 'lucide-react';
import { 
  AgendamentoModal,
  DetalhesAgendamentoModal
} from '@/components/agendamentos';
import { EditarAgendamentoModal } from '@/components/agendamentos/components/EditarAgendamentoModal';
import { getAgendamentos } from '@/services/agendamentos';
import { getProfissionais } from '@/services/profissionais';
import { getRecursos } from '@/services/recursos';
import { getAllDisponibilidades } from '@/services/disponibilidades';
import type { Agendamento } from '@/types/Agendamento';
import type { Profissional } from '@/types/Profissional';
import type { Recurso } from '@/types/Recurso';
import type { DisponibilidadeProfissional } from '@/types/DisponibilidadeProfissional';
import { AppToast } from '@/services/toast';
import api from '@/services/api';
import { getModuleTheme } from '@/types/theme';

interface WeekDay {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isCurrentMonth: boolean;
}

interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
}

interface WeeklyAgendamento {
  id: string;
  title: string;
  time: string;
  duration: number; // em minutos
  paciente: string;
  servico: string;
  recurso: string;
  tipo: 'presencial' | 'online';
  status: string;
  color: string;
  position: number; // posição dentro do slot de tempo
  agendamento: Agendamento;
}

export const CalendarioProfissionalPage = () => {
  // Tema do módulo
  const theme = getModuleTheme('calendario');
  
  // Estados básicos
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<DisponibilidadeProfissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfissional, setUserProfissional] = useState<Profissional | null>(null);

  // Estados para modais de agendamento (apenas duplo clique)
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  const [preenchimentoInicialModal, setPreenchimentoInicialModal] = useState<any>(undefined);
  const [showDetalhesAgendamento, setShowDetalhesAgendamento] = useState(false);
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState<Agendamento | null>(null);
  
  // Estados para edição de agendamento
  const [showEditarAgendamento, setShowEditarAgendamento] = useState(false);
  const [agendamentoEdicao, setAgendamentoEdicao] = useState<Agendamento | null>(null);

  // Horários de trabalho (8h às 18h em intervalos de 30 minutos)
  const timeSlots: TimeSlot[] = [];
  for (let hour = 8; hour < 18; hour++) {
    timeSlots.push({ time: `${hour.toString().padStart(2, '0')}:00`, hour, minute: 0 });
    timeSlots.push({ time: `${hour.toString().padStart(2, '0')}:30`, hour, minute: 30 });
  }

  // Função para obter os dias da semana atual (Segunda a Sábado)
  const getWeekDays = (date: Date): WeekDay[] => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Segunda-feira como primeiro dia
    startOfWeek.setDate(diff);

    const days: WeekDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Apenas 6 dias: Segunda a Sábado (i < 6 ao invés de i < 7)
    for (let i = 0; i < 6; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      
      const isToday = currentDay.getTime() === today.getTime();
      const isCurrentMonth = currentDay.getMonth() === date.getMonth();

      days.push({
        date: currentDay,
        dayName: currentDay.toLocaleDateString('pt-BR', { weekday: 'short' }),
        dayNumber: currentDay.getDate(),
        isToday,
        isCurrentMonth
      });
    }

    return days;
  };

  const weekDays = getWeekDays(currentWeek);

  // Funções de navegação da semana
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  // Funções de controle do modal unificado
  const handleFecharAgendamentoModal = () => {
    setShowAgendamentoModal(false);
    setPreenchimentoInicialModal(undefined);
  };

  const handleSuccessAgendamento = () => {
    carregarDados();
    handleFecharAgendamentoModal();
  };


  // Função para abrir modal com preenchimento direto (duplo clique)
  const handleAbrirFormularioDireto = (dados?: { 
    profissionalId?: string; 
    dataHoraInicio?: string;
    tipoFluxo?: 'por-profissional' | 'por-data';
  }) => {
    // Sempre usar o profissional logado e fluxo por profissional
    const dadosComFluxo = {
      ...dados,
      profissionalId: userProfissional?.id,
      tipoFluxo: 'por-profissional' as const
    };
    setPreenchimentoInicialModal(dadosComFluxo);
    setShowAgendamentoModal(true);
  };

  // Handlers para edição de agendamento
  const handleEditarAgendamento = (agendamentoId: string) => {
    const agendamento = agendamentos.find(ag => ag.id === agendamentoId);
    if (agendamento) {
      setAgendamentoEdicao(agendamento);
      setShowEditarAgendamento(true);
    }
  };

  const handleSuccessEdicao = () => {
    carregarDados();
    setShowEditarAgendamento(false);
    setAgendamentoEdicao(null);
  };

  const handleFecharEdicao = () => {
    setShowEditarAgendamento(false);
    setAgendamentoEdicao(null);
  };

  const handleVerDetalhes = (agendamento: Agendamento) => {
    setAgendamentoDetalhes(agendamento);
    setShowDetalhesAgendamento(true);
  };

  // Carregamento de dados
  useEffect(() => {
    carregarDados();
    carregarUsuarioProfissional();
  }, []);

  // Recarregar dados quando a semana mudar
  useEffect(() => {
    if (userProfissional) {
      carregarDados();
    }
  }, [currentWeek, userProfissional]);


  const carregarUsuarioProfissional = async () => {
    try {
      const response = await api.get('/users/me');
      const userData = response.data;
      
      if (userData.profissionalId) {
        const profissionaisData = await getProfissionais();
        const profissional = profissionaisData.find(p => p.id === userData.profissionalId);
        setUserProfissional(profissional || null);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário profissional:', error);
    }
  };

  const carregarDados = async () => {
    if (!userProfissional) return;
    
    setLoading(true);
    try {
      // Definir período da semana para buscar agendamentos
      const startDate = new Date(weekDays[0].date);
      startDate.setHours(0, 0, 0, 0); // Início do primeiro dia
      const endDate = new Date(weekDays[5].date); // Último dia é agora índice 5 (sábado)
      endDate.setHours(23, 59, 59, 999); // Final do último dia

      const [agendamentosData, recursosData, disponibilidadesData] = await Promise.all([
        getAgendamentos({
          profissionalId: userProfissional.id,
          dataInicio: startDate.toISOString(),
          dataFim: endDate.toISOString()
        }),
        getRecursos(),
        getAllDisponibilidades()
      ]);
      
      setAgendamentos(agendamentosData);
      setRecursos(recursosData);
      setDisponibilidades(disponibilidadesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      AppToast.error('Erro ao carregar dados', {
        description: 'Não foi possível carregar os agendamentos da semana.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para processar agendamentos da semana
  const getAgendamentosForDay = (date: Date): WeeklyAgendamento[] => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return agendamentos
      .filter(agendamento => {
        const agendamentoDate = new Date(agendamento.dataHoraInicio);
        return agendamentoDate >= dayStart && agendamentoDate <= dayEnd;
      })
      .map((agendamento, index) => {
        const startTime = new Date(agendamento.dataHoraInicio);
        const endTime = agendamento.dataHoraFim ? new Date(agendamento.dataHoraFim) : new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hora default
        const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutos

        const recurso = recursos.find(r => r.id === agendamento.recursoId);
        
        // Cores baseadas no status
        const statusColors = {
          'AGENDADO': '#3B82F6',
          'CONFIRMADO': '#10B981', 
          'ATENDIDO': '#8B5CF6',
          'FINALIZADO': '#059669',
          'CANCELADO': '#EF4444',
          'FALTOU': '#F59E0B'
        };

        return {
          id: agendamento.id,
          title: agendamento.pacienteNome,
          time: startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          duration,
          paciente: agendamento.pacienteNome,
          servico: agendamento.servicoNome,
          recurso: recurso?.nome || 'Não definido',
          tipo: agendamento.tipoAtendimento,
          status: agendamento.status,
          color: statusColors[agendamento.status as keyof typeof statusColors] || '#6B7280',
          position: index,
          agendamento
        };
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  // Função para verificar disponibilidade em um horário
  const verificarDisponibilidade = (date: Date, timeSlot: TimeSlot): 'disponivel' | 'ocupado' | 'folga' | 'nao_configurado' => {
    if (!userProfissional) return 'nao_configurado';

    const diaSemana = date.getDay();
    const horarioMinutos = timeSlot.hour * 60 + timeSlot.minute;
    
    // Verificar se há agendamento neste horário
    const temAgendamento = agendamentos.some(agendamento => {
      const agendamentoDate = new Date(agendamento.dataHoraInicio);
      const agendamentoHour = agendamentoDate.getHours();
      const agendamentoMinute = agendamentoDate.getMinutes();
      const agendamentoMinutos = agendamentoHour * 60 + agendamentoMinute;
      
      return agendamentoDate.toDateString() === date.toDateString() &&
             Math.abs(agendamentoMinutos - horarioMinutos) < 30; // Tolerância de 30 minutos
    });

    if (temAgendamento) return 'ocupado';
    
    // Verificar disponibilidade configurada
    const disponibilidadesProfissional = disponibilidades.filter(d => d.profissionalId === userProfissional.id);
    
    for (const disponibilidade of disponibilidadesProfissional) {
      // Verificar data específica primeiro
      if (disponibilidade.dataEspecifica) {
        const dataDisp = new Date(disponibilidade.dataEspecifica);
        if (dataDisp.toDateString() === date.toDateString()) {
          const inicioDisp = disponibilidade.horaInicio.getHours() * 60 + disponibilidade.horaInicio.getMinutes();
          const fimDisp = disponibilidade.horaFim.getHours() * 60 + disponibilidade.horaFim.getMinutes();
          
          if (horarioMinutos >= inicioDisp && horarioMinutos < fimDisp) {
            return disponibilidade.tipo === 'folga' ? 'folga' : 'disponivel';
          }
        }
      }
      
      // Verificar disponibilidade semanal
      if (disponibilidade.diaSemana === diaSemana && !disponibilidade.dataEspecifica) {
        const inicioDisp = disponibilidade.horaInicio.getHours() * 60 + disponibilidade.horaInicio.getMinutes();
        const fimDisp = disponibilidade.horaFim.getHours() * 60 + disponibilidade.horaFim.getMinutes();
        
        if (horarioMinutos >= inicioDisp && horarioMinutos < fimDisp) {
          return disponibilidade.tipo === 'folga' ? 'folga' : 'disponivel';
        }
      }
    }
    
    return 'nao_configurado';
  };

  // Função para obter cor do slot baseado na disponibilidade
  const getSlotColor = (date: Date, timeSlot: TimeSlot): string => {
    const status = verificarDisponibilidade(date, timeSlot);
    
    switch (status) {
      case 'disponivel':
        return 'bg-green-50 hover:bg-green-100 border-green-200';
      case 'ocupado':
        return 'bg-blue-50 border-blue-200';
      case 'folga':
        return 'bg-red-50 border-red-200';
      case 'nao_configurado':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="pt-2 pl-6 pr-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Carregando calendário...</p>
        </div>
      </div>
    );
  }

  if (!userProfissional) {
    return (
      <div className="pt-2 pl-6 pr-6 h-full flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Acesso Restrito</h2>
          <p className="text-gray-500">Esta página é exclusiva para profissionais.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2 pl-6 pr-6 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${theme.headerBg} border border-gray-200 flex items-center mb-6 px-6 py-4 rounded-lg gap-4 flex-shrink-0 shadow-sm`}>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <span>👨‍⚕️</span>
            <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent`}>
              Minha Agenda
            </span>
          </h1>
        </div>
      </div>

      {/* Navegação da Semana */}
      <Card className="mb-6 flex-shrink-0">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <h2 className="text-lg font-semibold">
                {weekDays[0].date.toLocaleDateString('pt-BR', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </h2>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Nome do profissional no centro */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {userProfissional.nome}
                </span>
              </div>
            </div>

            <Button 
              variant="outline"
              size="sm"
              className={`!h-10 px-3 bg-gradient-to-r ${theme.primaryButton} ${theme.primaryButtonHover} text-white shadow-md transition-all duration-200`}
              onClick={goToCurrentWeek}
            >
              <CalendarIcon className="w-4 h-4 mr-1" />
              Esta Semana
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Grid do Calendário Semanal */}
      <Card className="flex-1 min-h-0">
        <CardContent className="p-0 h-full">
          <div className="flex h-full border rounded-lg overflow-hidden bg-white">
            {/* Time Column */}
            <div className="w-20 bg-gray-50 border-r flex flex-col flex-shrink-0">
              {/* Fixed Time Header */}
              <div className="h-16 border-b bg-white flex items-center justify-center text-sm font-semibold text-gray-700 sticky top-0 z-40 shadow-sm">
                Hora
              </div>
              
              {/* Scrollable Time Content */}
              <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="relative">
                  {timeSlots.map((timeSlot, index) => (
                    <div
                      key={timeSlot.time}
                      className={`h-[60px] border-b border-gray-100 flex items-center justify-center text-sm text-gray-600 font-medium flex-shrink-0 ${
                        index % 2 === 0 ? "bg-gray-50" : "bg-white"
                      }`}
                    >
                      {timeSlot.time}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Day Columns */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Fixed Headers */}
              <div className="bg-white border-b h-16 flex-shrink-0 z-30 shadow-sm flex pr-3">
                {weekDays.map((day, index) => (
                  <div
                    key={index}
                    className="flex-1 border-r border-gray-200 p-3 flex flex-col items-center justify-center gap-1 min-w-0"
                  >
                    <div className="text-sm font-medium text-gray-600">{day.dayName}</div>
                    <div className={`text-lg font-bold ${
                      day.isToday 
                        ? `text-white bg-gradient-to-r ${theme.primaryButton} rounded-full w-8 h-8 flex items-center justify-center` 
                        : 'text-gray-800'
                    }`}>
                      {day.dayNumber}
                    </div>
                  </div>
                ))}
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin', scrollBehavior: 'smooth' }}>
                {/* Grid */}
                <div className="flex min-h-full h-full min-w-full">
                  {weekDays.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className="flex-1 border-r border-gray-200 relative bg-white min-w-0"
                    >
                      {/* Time grid background */}
                      {timeSlots.map((timeSlot, timeIndex) => {
                        const status = verificarDisponibilidade(day.date, timeSlot);
                        const agendamentosDay = getAgendamentosForDay(day.date);
                        const agendamentosSlot = agendamentosDay.filter(ag => 
                          ag.time <= timeSlot.time && 
                          new Date(`1970-01-01T${ag.time}`).getTime() + (ag.duration * 60 * 1000) > 
                          new Date(`1970-01-01T${timeSlot.time}`).getTime()
                        );
                        
                        return (
                          <div
                            key={timeIndex}
                            className={`h-[60px] border-b border-gray-100 transition-colors relative ${
                              timeIndex % 2 === 0 ? "bg-gray-50/30" : "bg-white"
                            } ${getSlotColor(day.date, timeSlot)} cursor-pointer`}
                            onDoubleClick={() => handleSlotDoubleClick(day.date, timeSlot)}
                          >
                            {agendamentosSlot.map((agendamento, agIndex) => (
                              <div
                                key={agendamento.id}
                                className="absolute inset-1 z-10"
                                style={{ 
                                  backgroundColor: agendamento.color + '20',
                                  borderLeft: `4px solid ${agendamento.color}`
                                }}
                              >
                                <div className="p-2 rounded-r text-xs h-full overflow-hidden">
                                  <div className="flex items-start justify-between h-full">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-800 truncate">
                                        {agendamento.paciente}
                                      </p>
                                      <p className="text-gray-600 truncate">
                                        {agendamento.time} - {agendamento.servico}
                                      </p>
                                      <div className="flex items-center gap-1 mt-1">
                                        {agendamento.tipo === 'online' ? (
                                          <Monitor className="w-3 h-3 text-blue-600" />
                                        ) : (
                                          <Building2 className="w-3 h-3 text-green-600" />
                                        )}
                                        <span className="text-xs text-gray-500 truncate">
                                          {agendamento.recurso}
                                        </span>
                                      </div>
                                      <Badge 
                                        variant="outline" 
                                        className="mt-1 text-xs"
                                        style={{ 
                                          borderColor: agendamento.color,
                                          color: agendamento.color
                                        }}
                                      >
                                        {agendamento.status}
                                      </Badge>
                                    </div>
                                    
                                    <div className="flex flex-col gap-1 ml-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 hover:bg-white"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleVerDetalhes(agendamento.agendamento);
                                        }}
                                      >
                                        <Eye className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 hover:bg-white"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditarAgendamento(agendamento.id);
                                        }}
                                      >
                                        <Edit className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Agendamento */}
      <AgendamentoModal
        isOpen={showAgendamentoModal}
        onClose={handleFecharAgendamentoModal}
        onSuccess={handleSuccessAgendamento}
        preenchimentoInicial={preenchimentoInicialModal}
      />

      {/* Modal de Detalhes */}
      <DetalhesAgendamentoModal
        isOpen={showDetalhesAgendamento}
        agendamento={agendamentoDetalhes}
        onClose={() => {
          setShowDetalhesAgendamento(false);
          setAgendamentoDetalhes(null);
        }}
      />

      {/* Modal de Edição */}
      <EditarAgendamentoModal
        isOpen={showEditarAgendamento}
        agendamento={agendamentoEdicao}
        onClose={handleFecharEdicao}
        onSuccess={handleSuccessEdicao}
      />
    </div>
  );
};