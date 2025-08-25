import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
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
import { AppointmentCard } from '@/components/calendar/AppointmentCard';
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
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Estados para modais de agendamento (apenas duplo clique)
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  const [preenchimentoInicialModal, setPreenchimentoInicialModal] = useState<any>(undefined);
  const [showDetalhesAgendamento, setShowDetalhesAgendamento] = useState(false);
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState<Agendamento | null>(null);
  
  // Estados para edição de agendamento
  const [showEditarAgendamento, setShowEditarAgendamento] = useState(false);
  const [agendamentoEdicao, setAgendamentoEdicao] = useState<Agendamento | null>(null);
  // Refs para sincronizar scroll entre coluna de horas e conteúdo
  const timeColumnRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

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

  // Usar horários fixos por enquanto (como era antes, funcionando)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 7; hour <= 19; hour++) {
      slots.push({ time: `${hour.toString().padStart(2, '0')}:00`, hour, minute: 0 });
      slots.push({ time: `${hour.toString().padStart(2, '0')}:30`, hour, minute: 30 });
    }
    return slots;
  }, []);

  const minHour = 7;
  const maxHour = 19;

  // Função para calcular posição do agendamento (baseado no SchedulerGrid)
  const getAppointmentPosition = (horarioInicio: string, horarioFim: string) => {
    const startMinutes = parseInt(horarioInicio.split(':')[0]) * 60 + parseInt(horarioInicio.split(':')[1]);
    const endMinutes = parseInt(horarioFim.split(':')[0]) * 60 + parseInt(horarioFim.split(':')[1]);
    const baseMinutes = minHour * 60; // Usar minHour dinâmico como base

    const top = ((startMinutes - baseMinutes) / 30) * 60; // 60px per 30-minute slot
    const height = ((endMinutes - startMinutes) / 30) * 60;

    return { top, height };
  };

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

  // Carregamento inicial do usuário profissional
  useEffect(() => {
    let timeoutCleared = false;
    
    const loadProfissional = async () => {
      await carregarUsuarioProfissional();
      timeoutCleared = true; // Marca que o carregamento foi concluído
    };
    
    loadProfissional();
    
    // Timeout de 15 segundos para evitar loading infinito
    const timeout = setTimeout(() => {
      if (!timeoutCleared) {
        console.error('⏰ Timeout atingido - 15 segundos sem concluir o carregamento');
        setLoadingError('Timeout: Não foi possível carregar os dados do profissional dentro do tempo esperado.');
      }
    }, 15000);
    
    return () => clearTimeout(timeout);
  }, []);

  // Recarregar dados quando o profissional for carregado ou a semana mudar
  useEffect(() => {
    if (userProfissional) {
      carregarDados();
    }
  }, [currentWeek, userProfissional]);

  // Sincronizar scroll vertical
  useLayoutEffect(() => {
    // Pequeno delay para garantir que os elementos estejam renderizados
    const timer = setTimeout(() => {
      const timeCol = timeColumnRef.current;
      const contentCol = contentScrollRef.current;
      
      if (!timeCol || !contentCol) return;

      let isScrolling = false;

      const handleTimeScroll = () => {
        if (isScrolling) return;
        isScrolling = true;
        contentCol.scrollTop = timeCol.scrollTop;
        requestAnimationFrame(() => {
          isScrolling = false;
        });
      };

      const handleContentScroll = () => {
        if (isScrolling) return;
        isScrolling = true;
        timeCol.scrollTop = contentCol.scrollTop;
        requestAnimationFrame(() => {
          isScrolling = false;
        });
      };

      timeCol.addEventListener('scroll', handleTimeScroll, { passive: true });
      contentCol.addEventListener('scroll', handleContentScroll, { passive: true });

      return () => {
        timeCol.removeEventListener('scroll', handleTimeScroll);
        contentCol.removeEventListener('scroll', handleContentScroll);
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [loading, userProfissional]);


  const carregarUsuarioProfissional = async () => {
    try {
      setLoadingError(null);
      const response = await api.get('/users/me');
      const userData = response.data;
      
      if (userData.profissionalId) {
        const profissionaisData = await getProfissionais();
        
        // Buscar o profissional correspondente
        const profissional = profissionaisData.find(p => p.id === userData.profissionalId);
        
        if (profissional) {
          setUserProfissional(profissional);
        } else {
          const errorMsg = `Profissional não encontrado na base de dados. ID procurado: ${userData.profissionalId}`;
          console.error('❌', errorMsg);
          setLoadingError(errorMsg);
          setUserProfissional(null);
        }
      } else {
        const errorMsg = 'Usuário não está vinculado a um profissional (profissionalId não encontrado).';
        console.error('❌', errorMsg);
        setLoadingError(errorMsg);
        setUserProfissional(null);
      }
    } catch (error: any) {
      const errorMsg = `Erro ao carregar dados do profissional: ${error.message || error}`;
      console.error('❌ Erro ao carregar dados do usuário profissional:', error);
      setLoadingError(errorMsg);
      setUserProfissional(null);
    }
  };

  const carregarDados = async () => {
    if (!userProfissional) {
      return;
    }
    
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
      
      setAgendamentos(agendamentosData.data);
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
        // Parse manual sem conversão de timezone (como no CalendarioPage)
        const [datePart, timePart] = agendamento.dataHoraInicio.split('T');
        const [hora, minuto] = timePart.split(':');
        const horarioInicio = `${hora}:${minuto}`;
        
        // Calcular horário fim baseado na duração ou usar dataHoraFim
        let duration: number;
        let horarioFim: string;
        
        if (agendamento.dataHoraFim) {
          const [, timePartFim] = agendamento.dataHoraFim.split('T');
          const [horaFim, minutoFim] = timePartFim.split(':');
          horarioFim = `${horaFim}:${minutoFim}`;
          
          // Calcular duração em minutos
          const startMinutes = parseInt(hora) * 60 + parseInt(minuto);
          const endMinutes = parseInt(horaFim) * 60 + parseInt(minutoFim);
          duration = endMinutes - startMinutes;
        } else {
          // Estimar duração padrão de 60 minutos
          duration = 60;
          const totalMinutos = parseInt(hora) * 60 + parseInt(minuto) + duration;
          const horaFim = Math.floor(totalMinutos / 60);
          const minutoFim = totalMinutos % 60;
          horarioFim = `${horaFim.toString().padStart(2, '0')}:${minutoFim.toString().padStart(2, '0')}`;
        }

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
          time: horarioInicio,
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

  // Função para verificar o status de disponibilidade de um horário para um profissional
  const verificarStatusDisponibilidade = (profissionalId: string, data: Date, horario: string): 'presencial' | 'online' | 'folga' | 'nao_configurado' => {
    const diaSemana = data.getDay(); // 0 = domingo, 1 = segunda, etc.
    const [hora, minuto] = horario.split(':').map(Number);
    const horarioMinutos = hora * 60 + minuto;
    
    // Filtrar disponibilidades do profissional
    const disponibilidadesProfissional = disponibilidades.filter(d => d.profissionalId === profissionalId);
    
    // PASSO 1: Verificar se há uma dataEspecifica que cobre este horário específico
    const datasEspecificas = disponibilidadesProfissional.filter(d => {
      if (!d.dataEspecifica) return false;
      
      // Comparar datas sem considerar timezone - usar apenas ano, mês e dia
      const dataDisponibilidade = new Date(d.dataEspecifica);
      const dataParametro = new Date(data);
      
      return dataDisponibilidade.getFullYear() === dataParametro.getFullYear() &&
             dataDisponibilidade.getMonth() === dataParametro.getMonth() &&
             dataDisponibilidade.getDate() === dataParametro.getDate();
    });
    
    // Verificar se alguma dataEspecifica cobre este horário específico
    for (const disponibilidade of datasEspecificas) {
      const inicioDisponibilidade = disponibilidade.horaInicio.getHours() * 60 + disponibilidade.horaInicio.getMinutes();
      const fimDisponibilidade = disponibilidade.horaFim.getHours() * 60 + disponibilidade.horaFim.getMinutes();
      
      // Se o horário está dentro do intervalo da disponibilidade específica
      if (horarioMinutos >= inicioDisponibilidade && horarioMinutos < fimDisponibilidade) {
        return disponibilidade.tipo; // dataEspecifica tem precedência para este horário específico
      }
    }
    
    // PASSO 2: Se nenhuma dataEspecifica cobre este horário, verificar horários semanais (diaSemana)
    const horariosSemanais = disponibilidadesProfissional.filter(d => 
      d.diaSemana !== null && d.diaSemana === diaSemana && !d.dataEspecifica
    );
    
    for (const disponibilidade of horariosSemanais) {
      const inicioDisponibilidade = disponibilidade.horaInicio.getHours() * 60 + disponibilidade.horaInicio.getMinutes();
      const fimDisponibilidade = disponibilidade.horaFim.getHours() * 60 + disponibilidade.horaFim.getMinutes();
      
      // Se o horário está dentro do intervalo da disponibilidade semanal
      if (horarioMinutos >= inicioDisponibilidade && horarioMinutos < fimDisponibilidade) {
        return disponibilidade.tipo; // Usar configuração semanal como fallback
      }
    }
    
    // PASSO 3: Se não há configuração específica nem semanal para este horário
    return 'nao_configurado';
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
    if (!userProfissional) return 'bg-gray-50 border-gray-200';
    
    // Verificar se há agendamento neste horário
    const diaSemana = date.getDay();
    const horarioMinutos = timeSlot.hour * 60 + timeSlot.minute;
    
    const temAgendamento = agendamentos.some(agendamento => {
      // Parse manual para evitar problemas de timezone
      const [datePart, timePart] = agendamento.dataHoraInicio.split('T');
      const [ano, mes, dia] = datePart.split('-').map(Number);
      const [hora, minuto] = timePart.split(':').map(Number);
      
      // Criar data no fuso local
      const agendamentoDate = new Date(ano, mes - 1, dia);
      const agendamentoMinutos = hora * 60 + minuto;
      
      const isSameDay = agendamentoDate.toDateString() === date.toDateString();
      const isWithinTimeSlot = Math.abs(agendamentoMinutos - horarioMinutos) < 30;
      
      return isSameDay && isWithinTimeSlot;
    });

    if (temAgendamento) {
      return 'bg-white'; // Ocupado sem cor de fundo específica
    }

    // Usar verificarStatusDisponibilidade para obter o tipo correto
    const status = verificarStatusDisponibilidade(userProfissional.id, date, timeSlot.time);
    
    
    switch (status) {
      case 'presencial':
        return 'bg-green-100'; // Verde para presencial
      case 'online':
        return 'bg-blue-100'; // Azul para online
      case 'folga':
        return 'bg-red-50'; // Vermelho para folga
      case 'nao_configurado':
        return 'bg-gray-100'; // Cinza para não configurado
      default:
        return 'bg-gray-100';
    }
  };

  if (loadingError) {
    return (
      <div className="pt-2 pl-6 pr-6 h-full flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Acesso Restrito</h2>
          <p className="text-gray-500 mb-4">{loadingError}</p>
          <p className="text-sm text-gray-400">Esta página é exclusiva para profissionais.</p>
        </div>
      </div>
    );
  }

  if (loading || !userProfissional) {
    return (
      <div className="pt-2 pl-6 pr-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">
            {!userProfissional ? 'Carregando dados do profissional...' : 'Carregando calendário...'}
          </p>
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
              <div 
                ref={timeColumnRef}
                className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden"
                style={{ 
                  scrollbarWidth: 'none', 
                  msOverflowStyle: 'none'
                }}
              >
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
              <div 
                ref={contentScrollRef} 
                className="flex-1 overflow-auto" 
                style={{ 
                  scrollbarWidth: 'thin',
                  scrollBehavior: 'smooth'
                }}
              >
                {/* Grid */}
                <div className="flex min-w-full" style={{ height: `${timeSlots.length * 60}px`, minHeight: '600px' }}>
                  {weekDays.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className="flex-1 border-r border-gray-200 relative bg-white min-w-0"
                    >
                      {/* Time grid background */}
                      {timeSlots.map((timeSlot, timeIndex) => {
                        const status = verificarDisponibilidade(day.date, timeSlot);
                        
                        return (
                          <div
                            key={timeIndex}
                            className={`h-[60px] border-b border-gray-100 transition-colors relative ${getSlotColor(day.date, timeSlot)} ${
                              verificarStatusDisponibilidade(userProfissional?.id || '', day.date, timeSlot.time) === 'presencial' ||
                              verificarStatusDisponibilidade(userProfissional?.id || '', day.date, timeSlot.time) === 'online'
                                ? 'cursor-pointer hover:bg-opacity-80' 
                                : 'cursor-default'
                            }`}
                          >
                          </div>
                        );
                      })}

                      {/* Agendamentos posicionados absolutamente */}
                      {getAgendamentosForDay(day.date).map((agendamento) => {
                        // Calcular horário fim baseado na duração
                        const [startHour, startMinute] = agendamento.time.split(':').map(Number);
                        const endTotalMinutes = startHour * 60 + startMinute + agendamento.duration;
                        const endHour = Math.floor(endTotalMinutes / 60) % 24;
                        const endMinute = endTotalMinutes % 60;
                        const horarioFim = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
                        
                        const { top, height } = getAppointmentPosition(agendamento.time, horarioFim);
                        
                        return (
                          <div
                            key={agendamento.id}
                            className="absolute left-1 right-1 z-10"
                            style={{ top: `${top}px`, height: `${height}px` }}
                          >
                            <AppointmentCard
                              appointment={{
                                id: agendamento.id,
                                profissionalId: agendamento.agendamento.profissionalId,
                                paciente: agendamento.paciente,
                                servico: agendamento.servico,
                                convenio: agendamento.agendamento.convenioNome || '',
                                tipo: agendamento.tipo,
                                horarioInicio: agendamento.time,
                                horarioFim,
                                status: (agendamento.status || '').toLowerCase(),
                                data: new Date(agendamento.agendamento.dataHoraInicio),
                                profissionalNome: userProfissional?.nome,
                                recursoNome: agendamento.recurso,
                              }}
                              viewType="profissionais"
                              className="w-full h-full border-l-4 rounded-md shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md"
                              style={{ borderLeftColor: agendamento.color, backgroundColor: agendamento.color + '20' }}
                              onDetailsClick={() => handleVerDetalhes(agendamento.agendamento)}
                              onEditClick={() => handleEditarAgendamento(agendamento.id)}
                            />
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