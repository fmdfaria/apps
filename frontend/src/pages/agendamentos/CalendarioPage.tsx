import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { SchedulerGrid } from '@/components/calendar/SchedulerGrid';
import { CriarAgendamentoModal, DetalhesAgendamentoModal } from '@/components/agendamentos';
import { 
  Calendar as CalendarIcon, 
  Plus,
  Menu,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  Building2
} from 'lucide-react';
import { getAgendamentos } from '@/services/agendamentos';
import { getProfissionais } from '@/services/profissionais';
import { getConvenios } from '@/services/convenios';
import { getRecursos } from '@/services/recursos';
import { getAllDisponibilidades } from '@/services/disponibilidades';
import type { Agendamento, StatusAgendamento } from '@/types/Agendamento';
import type { Profissional } from '@/types/Profissional';
import type { Convenio } from '@/types/Convenio';
import type { Recurso } from '@/types/Recurso';
import type { DisponibilidadeProfissional } from '@/types/DisponibilidadeProfissional';

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
  recursoId: string;
  paciente: string;
  servico: string;
  convenio: string;
  tipo: string;
  horarioInicio: string;
  horarioFim: string;
  status: string;
  data: Date;
  profissionalNome?: string;
  recursoNome?: string;
}

export const CalendarioPage = () => {
  // Estados básicos
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [gridViewType, setGridViewType] = useState<'profissionais' | 'recursos'>('profissionais');
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<DisponibilidadeProfissional[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para modais
  const [showCriarAgendamento, setShowCriarAgendamento] = useState(false);
  const [showDetalhesAgendamento, setShowDetalhesAgendamento] = useState(false);
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState<Agendamento | null>(null);
  const [preenchimentoCriarAgendamento, setPreenchimentoCriarAgendamento] = useState<{
    profissionalId?: string;
    dataHoraInicio?: string;
  } | undefined>(undefined);
  
  // Filtro lateral colapsível
  const [filtroLateralAberto, setFiltroLateralAberto] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [profissionaisSelecionados, setProfissionaisSelecionados] = useState<string[]>([]);
  const [recursosSelecionados, setRecursosSelecionados] = useState<string[]>([]);
  
  // Estados para controlar collapse/expand dos filtros
  const [filtroCalendarioAberto, setFiltroCalendarioAberto] = useState(true);
  const [filtroProfissionaisAberto, setFiltroProfissionaisAberto] = useState(false);
  const [filtroRecursosAberto, setFiltroRecursosAberto] = useState(false);

  // Carregamento de dados
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [agendamentosData, profissionaisData, conveniosData, recursosData, disponibilidadesData] = await Promise.all([
        getAgendamentos(),
        getProfissionais(),
        getConvenios(),
        getRecursos(),
        getAllDisponibilidades()
      ]);
      
      setAgendamentos(agendamentosData);
      setProfissionais(profissionaisData);
      setConvenios(conveniosData);
      setRecursos(recursosData);
      setDisponibilidades(disponibilidadesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funções para manipular filtros de profissionais
  const handleProfissionalToggle = (profissionalId: string) => {
    setProfissionaisSelecionados(prev => 
      prev.includes(profissionalId)
        ? prev.filter(id => id !== profissionalId)
        : [...prev, profissionalId]
    );
  };

  const handleSelectAllProfissionais = () => {
    if (profissionaisSelecionados.length === profissionais.length) {
      setProfissionaisSelecionados([]);
    } else {
      setProfissionaisSelecionados(profissionais.map(p => p.id));
    }
  };

  const handleClearProfissionais = () => {
    setProfissionaisSelecionados([]);
  };

  // Funções para manipular filtros de recursos
  const handleRecursoToggle = (recursoId: string) => {
    setRecursosSelecionados(prev => 
      prev.includes(recursoId)
        ? prev.filter(id => id !== recursoId)
        : [...prev, recursoId]
    );
  };

  const handleSelectAllRecursos = () => {
    if (recursosSelecionados.length === recursos.length) {
      setRecursosSelecionados([]);
    } else {
      setRecursosSelecionados(recursos.map(r => r.id));
    }
  };

  const handleClearRecursos = () => {
    setRecursosSelecionados([]);
  };

  // Função para verificar o status de disponibilidade de um horário para um profissional
  // Considera tanto horários semanais (diaSemana) quanto datas específicas (dataEspecifica)
  // REGRA: dataEspecifica e diaSemana são ACUMULATIVOS - dataEspecifica complementa diaSemana
  const verificarStatusDisponibilidade = (profissionalId: string, data: Date, horario: string): 'disponivel' | 'folga' | 'nao_configurado' => {
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
  
  /* 
   * FLUXO DA VERIFICAÇÃO DE DISPONIBILIDADE (LÓGICA ACUMULATIVA):
   * 1. Primeiro: Verifica se existe dataEspecifica que cobre o horário específico consultado
   * 2. Se NÃO há dataEspecifica para aquele horário: usa configuração semanal (diaSemana) como fallback
   * 3. Se nenhuma configuração cobre o horário: retorna 'nao_configurado'
   * 
   * EXEMPLOS DE USO:
   * - Segunda-feira normal: usa configuração de diaSemana=1 (08:00-17:00 disponível)
   * - Segunda-feira com plantão matinal: dataEspecifica (06:00-08:00 disponível) + diaSemana (08:00-17:00 disponível)
   * - Segunda-feira com folga almoço especial: diaSemana (08:00-12:00 disponível) + dataEspecifica (12:00-14:00 folga) + diaSemana (14:00-17:00 disponível)
   * - Domingo com plantão: apenas dataEspecifica (08:00-14:00 disponível), resto 'nao_configurado'
   */

  // Função para verificar se um horário está disponível para um profissional (mantida para compatibilidade)
  const verificarDisponibilidade = (profissionalId: string, data: Date, horario: string): boolean => {
    const status = verificarStatusDisponibilidade(profissionalId, data, horario);
    return status === 'disponivel';
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

  // Converter recursos para o formato do calendário
  const calendarRecursos: CalendarProfissional[] = recursos.map((recurso, index) => {
    const cores = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    const cor = cores[index % cores.length];
    
    return {
      id: recurso.id,
      nome: recurso.nome,
      avatar: recurso.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      horarioInicio: '08:00',
      horarioFim: '18:00',
      cor
    };
  });

  // Converter agendamentos para o formato do calendário com filtro de data da visualização
  const calendarAgendamentos: CalendarAgendamento[] = agendamentos
    .filter(agendamento => {
      // Parse da string de data sem conversão de timezone
      const agendamentoDateStr = agendamento.dataHoraInicio.split('T')[0]; // "2025-08-04"
      
      // Formatar currentDate sem conversão UTC
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const day = currentDate.getDate().toString().padStart(2, '0');
      const currentDateStr = `${year}-${month}-${day}`; // "2025-08-04"
      
      return agendamentoDateStr === currentDateStr;
    })
    .map(agendamento => {
      // Parse manual sem conversão de timezone
      const [datePart, timePart] = agendamento.dataHoraInicio.split('T');
      const [hora, minuto] = timePart.split(':');
      const horarioInicio = `${hora}:${minuto}`;
      
      // Calcular horário fim baseado na duração do serviço ou usar dataHoraFim se disponível
      let horarioFim: string;
      if (agendamento.dataHoraFim) {
        const [, timePartFim] = agendamento.dataHoraFim.split('T');
        const [horaFim, minutoFim] = timePartFim.split(':');
        horarioFim = `${horaFim}:${minutoFim}`;
      } else {
        // Estimar duração baseada no tipo de serviço (padrão 60 minutos)
        const duracaoMinutos = 60;
        const totalMinutos = parseInt(hora) * 60 + parseInt(minuto) + duracaoMinutos;
        const horaFim = Math.floor(totalMinutos / 60);
        const minutoFim = totalMinutos % 60;
        horarioFim = `${horaFim.toString().padStart(2, '0')}:${minutoFim.toString().padStart(2, '0')}`;
      }

      // Para compatibilidade, criar um Date object (mas sem usar para exibição)
      const dataHora = new Date(agendamento.dataHoraInicio);

      return {
        id: agendamento.id,
        profissionalId: agendamento.profissionalId,
        recursoId: agendamento.recursoId,
        paciente: agendamento.pacienteNome,
        servico: agendamento.servicoNome,
        convenio: agendamento.convenioNome,
        tipo: agendamento.tipoAtendimento,
        horarioInicio,
        horarioFim,
        status: agendamento.status.toLowerCase(),
        data: dataHora,
        profissionalNome: agendamento.profissionalNome,
        recursoNome: agendamento.recursoNome
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
    <div className="pt-2 pl-6 pr-6 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex justify-between items-center mb-6 px-6 py-4 rounded-lg gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendário</h1>
          <p className="text-gray-600">Visualização em agenda dos agendamentos</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Toggle de Visualização */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              variant="ghost"
              onClick={() => setGridViewType('profissionais')}
              className={`${gridViewType === 'profissionais' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'hover:bg-blue-700'}`}
            >
              <Users className="w-4 h-4 mr-2" />
              Profissionais
            </Button>
            <Button
              variant="ghost"
              onClick={() => setGridViewType('recursos')}
              className={`${gridViewType === 'recursos' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'hover:bg-blue-700'}`}
            >
              <Building2 className="w-4 h-4 mr-2" />
              Recursos
            </Button>
          </div>
          
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              setPreenchimentoCriarAgendamento(undefined);
              setShowCriarAgendamento(true);
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
                  <div 
                    className="flex items-center justify-between mb-3 cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded-md transition-colors"
                    onClick={() => setFiltroCalendarioAberto(!filtroCalendarioAberto)}
                  >
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      Selecionar Data
                    </h4>
                    {filtroCalendarioAberto ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  {filtroCalendarioAberto && (
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
                  )}
                </div>

                {/* Filtro de Profissionais */}
                <div>
                  <div 
                    className="flex items-center justify-between mb-3 cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded-md transition-colors"
                    onClick={() => setFiltroProfissionaisAberto(!filtroProfissionaisAberto)}
                  >
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Profissionais
                      {profissionaisSelecionados.length > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-2 text-xs">
                          {profissionaisSelecionados.length}
                        </Badge>
                      )}
                    </h4>
                    <div className="flex items-center gap-1">
                      {filtroProfissionaisAberto && (
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectAllProfissionais}
                            className="h-6 px-2 text-xs"
                          >
                            {profissionaisSelecionados.length === profissionais.length ? 'Desmarcar' : 'Todos'}
                          </Button>
                          {profissionaisSelecionados.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleClearProfissionais}
                              className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      )}
                      {filtroProfissionaisAberto ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </div>

                  {/* Lista de profissionais com checkbox */}
                  {filtroProfissionaisAberto && (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {profissionais
                        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
                        .map((profissional, index) => {
                          const cores = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];
                          const cor = cores[index % cores.length];
                          const isSelected = profissionaisSelecionados.includes(profissional.id);
                          
                          return (
                            <div
                              key={profissional.id}
                              className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                              }`}
                              onClick={() => handleProfissionalToggle(profissional.id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onChange={() => handleProfissionalToggle(profissional.id)}
                                className="flex-shrink-0"
                              />
                              <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                style={{ backgroundColor: cor }}
                              >
                                {profissional.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                              </div>
                              <span className="text-sm text-gray-700 truncate flex-1">
                                {profissional.nome}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Resumo dos profissionais selecionados */}
                  {profissionaisSelecionados.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex flex-wrap gap-1">
                        {profissionaisSelecionados.slice(0, 3).map(profissionalId => {
                          const profissional = profissionais.find(p => p.id === profissionalId);
                          if (!profissional) return null;
                          
                          return (
                            <Badge
                              key={profissionalId}
                              variant="secondary"
                              className="text-xs px-2 py-1"
                            >
                              {profissional.nome.split(' ')[0]}
                            </Badge>
                          );
                        })}
                        {profissionaisSelecionados.length > 3 && (
                          <Badge variant="secondary" className="text-xs px-2 py-1">
                            +{profissionaisSelecionados.length - 3}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {profissionaisSelecionados.length} de {profissionais.length} selecionados
                      </p>
                    </div>
                  )}
                </div>

                {/* Filtro de Recursos */}
                <div>
                  <div 
                    className="flex items-center justify-between mb-3 cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded-md transition-colors"
                    onClick={() => setFiltroRecursosAberto(!filtroRecursosAberto)}
                  >
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Recursos
                      {recursosSelecionados.length > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-2 text-xs">
                          {recursosSelecionados.length}
                        </Badge>
                      )}
                    </h4>
                    <div className="flex items-center gap-1">
                      {filtroRecursosAberto && (
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectAllRecursos}
                            className="h-6 px-2 text-xs"
                          >
                            {recursosSelecionados.length === recursos.length ? 'Desmarcar' : 'Todos'}
                          </Button>
                          {recursosSelecionados.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleClearRecursos}
                              className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      )}
                      {filtroRecursosAberto ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </div>

                  {/* Lista de recursos com checkbox */}
                  {filtroRecursosAberto && (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {recursos
                        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
                        .map((recurso, index) => {
                          const cores = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
                          const cor = cores[index % cores.length];
                          const isSelected = recursosSelecionados.includes(recurso.id);
                          
                          return (
                            <div
                              key={recurso.id}
                              className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors ${
                                isSelected ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'
                              }`}
                              onClick={() => handleRecursoToggle(recurso.id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onChange={() => handleRecursoToggle(recurso.id)}
                                className="flex-shrink-0"
                              />
                              <div 
                                className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                style={{ backgroundColor: cor }}
                              >
                                <Building2 className="w-3 h-3" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm text-gray-700 block">
                                  {recurso.nome}
                                </span>
                                {recurso.descricao && (
                                  <span className="text-xs text-gray-500">
                                    {recurso.descricao}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Resumo dos recursos selecionados */}
                  {recursosSelecionados.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex flex-wrap gap-1">
                        {recursosSelecionados.slice(0, 3).map(recursoId => {
                          const recurso = recursos.find(r => r.id === recursoId);
                          if (!recurso) return null;
                          
                          return (
                            <Badge
                              key={recursoId}
                              variant="secondary"
                              className="text-xs px-2 py-1"
                            >
                              {recurso.nome}
                            </Badge>
                          );
                        })}
                        {recursosSelecionados.length > 3 && (
                          <Badge variant="secondary" className="text-xs px-2 py-1">
                            +{recursosSelecionados.length - 3}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {recursosSelecionados.length} de {recursos.length} selecionados
                      </p>
                    </div>
                  )}
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
                
                <div className="flex-1 flex justify-center">
                  <CalendarHeader
                    currentDate={currentDate}
                    viewMode={viewMode}
                    onDateChange={setCurrentDate}
                  />
                </div>
                
                <Button 
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setCurrentDate(new Date())}
                >
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  Hoje
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0">
              <SchedulerGrid
                profissionais={gridViewType === 'profissionais' ? calendarProfissionais : calendarRecursos}
                agendamentos={calendarAgendamentos}
                currentDate={currentDate}
                viewType={gridViewType}
                filters={{
                  professionals: gridViewType === 'profissionais' ? profissionaisSelecionados : [],
                  resources: gridViewType === 'recursos' ? recursosSelecionados : [],
                  appointmentType: 'all',
                  insurance: 'all',
                  resource: recursosSelecionados.length > 0 ? recursosSelecionados.join(',') : 'all'
                }}
                verificarDisponibilidade={verificarDisponibilidade}
                verificarStatusDisponibilidade={verificarStatusDisponibilidade}
                onAppointmentClick={(appointmentId) => {
                  const agendamento = agendamentos.find(a => a.id === appointmentId);
                  if (agendamento) {
                    setAgendamentoDetalhes(agendamento);
                    setShowDetalhesAgendamento(true);
                  }
                }}
                onDoubleClick={(entityId, horario) => {
                  // Verificar se o horário está disponível antes de permitir criar agendamento
                  if (gridViewType === 'profissionais') {
                    const status = verificarStatusDisponibilidade(entityId, currentDate, horario);
                    if (status === 'folga' || status === 'nao_configurado') {
                      return; // Não permitir criar agendamento em horário indisponível ou não configurado
                    }
                  }
                  
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
                  
                  // Para profissionais, usar como profissionalId, para recursos, deixar vazio
                  setPreenchimentoCriarAgendamento({
                    profissionalId: gridViewType === 'profissionais' ? entityId : undefined,
                    dataHoraInicio: dataHoraLocal
                  });
                  setShowCriarAgendamento(true);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modais */}
      <CriarAgendamentoModal
        isOpen={showCriarAgendamento}
        onClose={() => {
          setShowCriarAgendamento(false);
          setPreenchimentoCriarAgendamento(undefined);
        }}
        onSuccess={carregarDados}
        preenchimentoInicial={preenchimentoCriarAgendamento}
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