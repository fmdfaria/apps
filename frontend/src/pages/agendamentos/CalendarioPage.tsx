import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { SchedulerGrid } from '@/components/calendar/SchedulerGrid';
import { NovoAgendamentoModal, DetalhesAgendamentoModal } from '@/components/agendamentos';
import { 
  Calendar as CalendarIcon, 
  Plus,
  Menu
} from 'lucide-react';
import { getAgendamentos } from '@/services/agendamentos';
import { getProfissionais } from '@/services/profissionais';
import { getConvenios } from '@/services/convenios';
import type { Agendamento, StatusAgendamento } from '@/types/Agendamento';
import type { Profissional } from '@/types/Profissional';
import type { Convenio } from '@/types/Convenio';

interface CalendarProfissional {
  id: string;
  nome: string;
  avatar: string;
  horarioInicio: string;
  horarioFim: string;
  cor: string;
}

interface CalendarAgendamento {
  id: string;
  profissionalId: string;
  paciente: string;
  servico: string;
  convenio: string;
  tipo: string;
  horarioInicio: string;
  horarioFim: string;
  status: string;
  data: Date;
}

export const CalendarioPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovoAgendamento, setShowNovoAgendamento] = useState(false);
  const [showDetalhesAgendamento, setShowDetalhesAgendamento] = useState(false);
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState<Agendamento | null>(null);
  const [preenchimentoNovoAgendamento, setPreenchimentoNovoAgendamento] = useState<{
    profissionalId?: string;
    dataHoraInicio?: string;
  } | undefined>(undefined);
  
  // Filtro lateral colapsível
  const [filtroLateralAberto, setFiltroLateralAberto] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [agendamentosData, profissionaisData, conveniosData] = await Promise.all([
        getAgendamentos(),
        getProfissionais(),
        getConvenios()
      ]);
      
      setAgendamentos(agendamentosData);
      setProfissionais(profissionaisData);
      setConvenios(conveniosData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Converter profissionais para o formato do calendário
  const calendarProfissionais: CalendarProfissional[] = profissionais.map((prof, index) => {
    const cores = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];
    const cor = cores[index % cores.length];
    
    return {
      id: prof.id,
      nome: prof.nome,
      avatar: prof.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      horarioInicio: '08:00',
      horarioFim: '18:00',
      cor
    };
  });

  // Converter agendamentos para o formato do calendário com filtro de data da visualização
  const calendarAgendamentos: CalendarAgendamento[] = agendamentos
    .filter(agendamento => {
      const agendamentoDate = new Date(agendamento.dataHoraInicio);
      const currentDateStart = new Date(currentDate);
      currentDateStart.setHours(0, 0, 0, 0);
      
      const currentDateEnd = new Date(currentDate);
      currentDateEnd.setHours(23, 59, 59, 999);
      
      return agendamentoDate >= currentDateStart && agendamentoDate <= currentDateEnd;
    })
    .map(agendamento => {
      const dataHora = new Date(agendamento.dataHoraInicio);
      const horarioInicio = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      // Estimar duração baseada no tipo de serviço (padrão 60 minutos)
      const duracaoMinutos = 60;
      const dataHoraFim = new Date(dataHora.getTime() + duracaoMinutos * 60000);
      const horarioFim = dataHoraFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      return {
        id: agendamento.id,
        profissionalId: agendamento.profissionalId,
        paciente: agendamento.pacienteNome,
        servico: agendamento.servicoNome,
        convenio: agendamento.convenioNome,
        tipo: agendamento.tipoAtendimento,
        horarioInicio,
        horarioFim,
        status: agendamento.status.toLowerCase(),
        data: dataHora
      };
    });

  const handleVerDetalhes = (agendamento: CalendarAgendamento) => {
    const agendamentoCompleto = agendamentos.find(a => a.id === agendamento.id);
    if (agendamentoCompleto) {
      setAgendamentoDetalhes(agendamentoCompleto);
      setShowDetalhesAgendamento(true);
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

  return (
    <div className="pt-2 pl-6 pr-6 h-screen flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white backdrop-blur border-b border-gray-200 flex justify-between items-center mb-6 px-6 py-4 rounded-lg gap-4 transition-shadow">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendário</h1>
          <p className="text-gray-600">Visualização em agenda dos agendamentos</p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              setPreenchimentoNovoAgendamento(undefined);
              setShowNovoAgendamento(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Layout Principal com Filtro Lateral */}
      <div className="flex flex-1 gap-6 min-h-0">
        {/* Filtro Lateral Colapsível */}
        {filtroLateralAberto && (
          <div className="w-80 flex-shrink-0 flex flex-col">
            <Card className="flex flex-col h-full">
              <CardHeader className="pb-4 flex-shrink-0">
                <CardTitle className="text-lg font-semibold">Filtros</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-6 overflow-y-auto">
                {/* Mini Calendário */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Selecionar Data</h4>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      if (date) {
                        setCurrentDate(date);
                      }
                    }}
                    className="rounded-md border w-full"
                    classNames={{
                      months: "flex w-full flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4 w-full",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-medium",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "h-8 w-8 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100",
                      day_range_end: "day-range-end",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      day_hidden: "invisible",
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Área Principal do Calendário */}
        <div className="flex-1 min-w-0">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                {/* Botão Menu para recolher painel lateral */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiltroLateralAberto(!filtroLateralAberto)}
                  className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Menu className="w-4 h-4" />
                </Button>
                
                <div className="flex-1">
                  <CalendarHeader
                    currentDate={currentDate}
                    viewMode={viewMode}
                    onDateChange={setCurrentDate}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0">
              <SchedulerGrid
                profissionais={calendarProfissionais}
                agendamentos={calendarAgendamentos}
                currentDate={currentDate}
                filters={{
                  professionals: [],
                  appointmentType: 'all',
                  insurance: 'all',
                  resource: 'all'
                }}
                onAppointmentClick={(appointmentId) => {
                  const agendamento = agendamentos.find(a => a.id === appointmentId);
                  if (agendamento) {
                    setAgendamentoDetalhes(agendamento);
                    setShowDetalhesAgendamento(true);
                  }
                }}
                onDoubleClick={(profissionalId, horario) => {
                  // Criar data/hora combinando a data atual com o horário clicado
                  const dataHoraCombinada = new Date(currentDate);
                  const [hora, minuto] = horario.split(':').map(Number);
                  dataHoraCombinada.setHours(hora, minuto, 0, 0);
                  
                  // Formatar para datetime-local sem conversão de timezone
                  const ano = dataHoraCombinada.getFullYear();
                  const mes = (dataHoraCombinada.getMonth() + 1).toString().padStart(2, '0');
                  const dia = dataHoraCombinada.getDate().toString().padStart(2, '0');
                  const horaFormatada = dataHoraCombinada.getHours().toString().padStart(2, '0');
                  const minutoFormatado = dataHoraCombinada.getMinutes().toString().padStart(2, '0');
                  
                  const dataHoraLocal = `${ano}-${mes}-${dia}T${horaFormatada}:${minutoFormatado}`;
                  
                  setPreenchimentoNovoAgendamento({
                    profissionalId,
                    dataHoraInicio: dataHoraLocal
                  });
                  setShowNovoAgendamento(true);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modais */}
      <NovoAgendamentoModal
        isOpen={showNovoAgendamento}
        onClose={() => {
          setShowNovoAgendamento(false);
          setPreenchimentoNovoAgendamento(undefined);
        }}
        onSuccess={carregarDados}
        preenchimentoInicial={preenchimentoNovoAgendamento}
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
