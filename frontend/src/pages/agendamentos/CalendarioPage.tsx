import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { SchedulerGrid } from '@/components/calendar/SchedulerGrid';
import { 
  AgendamentoModal,
  DetalhesAgendamentoModal
} from '@/components/agendamentos';
import { EditarAgendamentoModal } from '@/components/agendamentos/components/EditarAgendamentoModal';
import { 
  Calendar as CalendarIcon, 
  Plus,
  Menu,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  Building2,
  Monitor,
  Search
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
import { AppToast } from '@/services/toast';
import api from '@/services/api';
import { getModuleTheme } from '@/types/theme';
import { useNavigate } from 'react-router-dom';
import { formatarDataHoraLocal } from '@/utils/dateUtils';

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
  // Navegação
  const navigate = useNavigate();
  
  // Tema do módulo
  const theme = getModuleTheme('calendario');
  
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
  const [initialized, setInitialized] = useState(false);

  // Estados para modais de agendamento  
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  const [preenchimentoInicialModal, setPreenchimentoInicialModal] = useState<any>(undefined);
  const [showDetalhesAgendamento, setShowDetalhesAgendamento] = useState(false);
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState<Agendamento | null>(null);
  
  // Estados para edição de agendamento
  const [showEditarAgendamento, setShowEditarAgendamento] = useState(false);
  const [agendamentoEdicao, setAgendamentoEdicao] = useState<Agendamento | null>(null);
  
  // Filtro lateral colapsível
  const [filtroLateralAberto, setFiltroLateralAberto] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [profissionaisSelecionados, setProfissionaisSelecionados] = useState<string[]>([]);
  const [recursosSelecionados, setRecursosSelecionados] = useState<string[]>([]);
  
  // Estados para controlar collapse/expand dos filtros
  const [filtroCalendarioAberto, setFiltroCalendarioAberto] = useState(true);
  const [filtroProfissionaisAberto, setFiltroProfissionaisAberto] = useState(false);
  const [filtroRecursosAberto, setFiltroRecursosAberto] = useState(false);
  
  // Estados para filtro de funcionários ativos
  const [filtrarFuncionariosAtivos, setFiltrarFuncionariosAtivos] = useState(false);
  
  // Estados para controle de permissões
  const [canCreate, setCanCreate] = useState(true);

  // Funções de controle do modal unificado
  const handleFecharAgendamentoModal = () => {
    setShowAgendamentoModal(false);
    setPreenchimentoInicialModal(undefined);
  };

  const handleSuccessAgendamento = () => {
    carregarDados();
    handleFecharAgendamentoModal();
  };

  const handleAbrirNovoAgendamento = () => {
    setShowAgendamentoModal(true);
    setPreenchimentoInicialModal(undefined);
  };

  // Função para abrir modal com preenchimento direto (ex: duplo clique no grid)
  function handleAbrirFormularioDireto(dados?: { 
    profissionalId?: string; 
    dataHoraInicio?: string;
    recursoId?: string;
    tipoFluxo?: 'por-profissional' | 'por-data';
  }) {
    // Usar o tipoFluxo fornecido nos dados, senão usar "Por Profissional" como padrão
    const dadosComFluxo = {
      ...dados,
      tipoFluxo: dados?.tipoFluxo || 'por-profissional' as const
    };
    setPreenchimentoInicialModal(dadosComFluxo);
    setShowAgendamentoModal(true);
  }

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


  // Carregamento inicial
  useEffect(() => {
    checkPermissions();
    carregarDados();
    setInitialized(true);
  }, []);

  // Recarregar dados quando a data muda
  useEffect(() => {
    if (initialized) {
      carregarDados();
    }
  }, [currentDate, initialized]);

  const checkPermissions = async () => {
    try {
      const response = await api.get('/users/me/permissions');
      const allowedRoutes = response.data;
      
      // Verificar permissão para criar agendamentos
      const canCreate = allowedRoutes.some((route: any) => {
        return route.path === '/agendamentos' && route.method.toLowerCase() === 'post';
      });
      
      setCanCreate(canCreate);
      
    } catch (error: any) {
      // Em caso de erro, desabilita criação por segurança
      setCanCreate(false);
      console.error('Erro ao verificar permissões:', error);
    }
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Format current date for API call (YYYY-MM-DD)
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const day = currentDate.getDate().toString().padStart(2, '0');
      const dataFormatada = `${year}-${month}-${day}`;

      const [agendamentosData, profissionaisData, conveniosData, recursosData, disponibilidadesData] = await Promise.all([
        getAgendamentos({ dataInicio: dataFormatada, dataFim: dataFormatada }),
        getProfissionais({ ativo: true }),
        getConvenios(),
        getRecursos(),
        getAllDisponibilidades()
      ]);
      
      console.log('🔍 CalendarioPage - Agendamentos recebidos da API:', {
        total: agendamentosData.data.length,
        pagination: agendamentosData.pagination,
        agendamentos: agendamentosData.data
      });
      setAgendamentos(agendamentosData.data);
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

  // Função para verificar se um horário está disponível para um profissional (mantida para compatibilidade)
  const verificarDisponibilidade = (profissionalId: string, data: Date, horario: string): boolean => {
    const status = verificarStatusDisponibilidade(profissionalId, data, horario);
    return status === 'presencial' || status === 'online';
  };

  // Função para verificar se um profissional tem disponibilidade configurada para uma data específica
  const profissionalTemDisponibilidade = (profissionalId: string, data: Date): boolean => {
    const diaSemana = data.getDay(); // 0 = domingo, 1 = segunda, etc.
    
    // Filtrar disponibilidades do profissional
    const disponibilidadesProfissional = disponibilidades.filter(d => d.profissionalId === profissionalId);
    
    // Verificar se há dataEspecifica para esta data
    const temDataEspecifica = disponibilidadesProfissional.some(d => {
      if (!d.dataEspecifica) return false;
      
      const dataDisponibilidade = new Date(d.dataEspecifica);
      const dataParametro = new Date(data);
      
      return dataDisponibilidade.getFullYear() === dataParametro.getFullYear() &&
             dataDisponibilidade.getMonth() === dataParametro.getMonth() &&
             dataDisponibilidade.getDate() === dataParametro.getDate();
    });
    
    // Verificar se há horário semanal para este dia
    const temHorarioSemanal = disponibilidadesProfissional.some(d => 
      d.diaSemana !== null && d.diaSemana === diaSemana && !d.dataEspecifica
    );
    
    return temDataEspecifica || temHorarioSemanal;
  };

  // Função para verificar se um profissional tem disponibilidade presencial
  const profissionalTemDisponibilidadePresencial = (profissionalId: string, data: Date): boolean => {
    const diaSemana = data.getDay();
    const disponibilidadesProfissional = disponibilidades.filter(d => d.profissionalId === profissionalId);
    
    // Verificar dataEspecifica presencial
    const temDataEspecificaPresencial = disponibilidadesProfissional.some(d => {
      if (!d.dataEspecifica || d.tipo !== 'presencial') return false;
      
      const dataDisponibilidade = new Date(d.dataEspecifica);
      const dataParametro = new Date(data);
      
      return dataDisponibilidade.getFullYear() === dataParametro.getFullYear() &&
             dataDisponibilidade.getMonth() === dataParametro.getMonth() &&
             dataDisponibilidade.getDate() === dataParametro.getDate();
    });
    
    // Verificar horário semanal presencial
    const temHorarioSemanalPresencial = disponibilidadesProfissional.some(d => 
      d.diaSemana !== null && d.diaSemana === diaSemana && !d.dataEspecifica && d.tipo === 'presencial'
    );
    
    return temDataEspecificaPresencial || temHorarioSemanalPresencial;
  };

  // Função para verificar se um profissional tem disponibilidade online
  const profissionalTemDisponibilidadeOnline = (profissionalId: string, data: Date): boolean => {
    const diaSemana = data.getDay();
    const disponibilidadesProfissional = disponibilidades.filter(d => d.profissionalId === profissionalId);
    
    // Verificar dataEspecifica online
    const temDataEspecificaOnline = disponibilidadesProfissional.some(d => {
      if (!d.dataEspecifica || d.tipo !== 'online') return false;
      
      const dataDisponibilidade = new Date(d.dataEspecifica);
      const dataParametro = new Date(data);
      
      return dataDisponibilidade.getFullYear() === dataParametro.getFullYear() &&
             dataDisponibilidade.getMonth() === dataParametro.getMonth() &&
             dataDisponibilidade.getDate() === dataParametro.getDate();
    });
    
    // Verificar horário semanal online
    const temHorarioSemanalOnline = disponibilidadesProfissional.some(d => 
      d.diaSemana !== null && d.diaSemana === diaSemana && !d.dataEspecifica && d.tipo === 'online'
    );
    
    return temDataEspecificaOnline || temHorarioSemanalOnline;
  };

  // Converter profissionais para o formato do calendário
  const calendarProfissionais: CalendarProfissional[] = profissionais
    .filter(prof => {
      // Se filtro de ativos está ativo, mostrar profissionais que têm qualquer disponibilidade (presencial OU online)
      if (filtrarFuncionariosAtivos) {
        return profissionalTemDisponibilidadePresencial(prof.id, currentDate) || 
               profissionalTemDisponibilidadeOnline(prof.id, currentDate);
      }
      // Se nenhum filtro está ativo, mostrar todos
      return true;
    })
    .map((prof, index) => {
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
      // Usar formatarDataHoraLocal para respeitar timezone
      const { hora: horarioInicio } = formatarDataHoraLocal(agendamento.dataHoraInicio);
      
      // Calcular horário fim baseado na duração do serviço ou usar dataHoraFim se disponível
      let horarioFim: string;
      if (agendamento.dataHoraFim) {
        const { hora: horaFimFormatada } = formatarDataHoraLocal(agendamento.dataHoraFim);
        horarioFim = horaFimFormatada;
      } else {
        // Estimar duração baseada no tipo de serviço (padrão 60 minutos)
        const dataInicio = new Date(agendamento.dataHoraInicio);
        const dataFim = new Date(dataInicio.getTime() + 60 * 60 * 1000); // 60 minutos
        horarioFim = dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }

      // Para compatibilidade, criar um Date object
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

  console.log('🔍 CalendarioPage - Agendamentos após filtro para o grid:', calendarAgendamentos.length);
  
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
      <div className={`bg-gradient-to-r ${theme.headerBg} border border-gray-200 flex justify-between items-center mb-6 px-6 py-4 rounded-lg gap-4 flex-shrink-0 shadow-sm`}>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <span>📅</span>
            <span className={`bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent`}>Calendário</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Toggle de Visualização */}
          <div className="flex items-center !h-10 border-2 border-gray-200 rounded-lg bg-gray-50 overflow-hidden" style={{ minHeight: '40px' }}>
            <Button
              variant="ghost"
              size="default"
              onClick={() => setGridViewType('profissionais')}
              className={gridViewType === 'profissionais' 
                ? `!h-10 !px-4 !bg-gradient-to-r ${theme.primaryButton} !text-white !shadow-lg font-semibold !border-0 !rounded-none !m-0 flex-1` 
                : `!h-10 !px-4 !bg-transparent !text-gray-600 hover:!bg-gradient-to-r ${theme.hoverBg} ${theme.hoverTextColor} !transition-all !duration-200 !rounded-none !m-0 flex-1`
              }
            >
              <Users className="w-4 h-4 mr-2" />
              Profissionais
            </Button>
            <div className="w-px h-6 bg-gray-300"></div>
            <Button
              variant="ghost"
              size="default"
              onClick={() => setGridViewType('recursos')}
              className={gridViewType === 'recursos' 
                ? `!h-10 !px-4 !bg-gradient-to-r ${theme.primaryButton} !text-white !shadow-lg font-semibold !border-0 !rounded-none !m-0 flex-1` 
                : `!h-10 !px-4 !bg-transparent !text-gray-600 hover:!bg-gradient-to-r ${theme.hoverBg} ${theme.hoverTextColor} !transition-all !duration-200 !rounded-none !m-0 flex-1`
              }
            >
              <Building2 className="w-4 h-4 mr-2" />
              Recursos
            </Button>
          </div>

          
          <Button 
            className={canCreate 
              ? `!h-10 bg-gradient-to-r ${theme.primaryButton} ${theme.primaryButtonHover} shadow-lg hover:shadow-xl transition-all duration-200 font-semibold` 
              : "!h-10 bg-gray-400 cursor-not-allowed shadow-lg disabled:opacity-50"
            }
            onClick={canCreate ? handleAbrirNovoAgendamento : undefined}
            disabled={!canCreate}
            title={!canCreate ? "Você não tem permissão para criar agendamentos" : ""}
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
              <CardContent className="flex-1 space-y-6 overflow-y-auto max-h-full">

                {/* Filtro de Profissionais - Apenas na visão de Profissionais */}
                {gridViewType === 'profissionais' && (
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
                      <div className="space-y-2 h-[calc(100vh-32rem)] min-h-96 overflow-y-auto pr-2">
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
                )}

                {/* Filtro de Recursos - Apenas na visão de Recursos */}
                {gridViewType === 'recursos' && (
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
                      <div className="space-y-2 h-[calc(100vh-32rem)] min-h-96 overflow-y-auto pr-2">
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
                                <span className="text-sm text-gray-700 truncate flex-1">
                                  {recurso.nome}
                                </span>
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
                )}
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
                  className={`h-8 w-8 p-0 bg-gradient-to-r ${theme.primaryButton} ${theme.primaryButtonHover} text-white shadow-md`}
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
                
                <div className="flex items-center gap-2">
                  {/* Botão Verificar Agenda */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="!h-10 px-3 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                    onClick={() => navigate('/agendamentos/verificar-agenda')}
                  >
                    <Search className="w-4 h-4 mr-1" />
                    Verificar Agenda
                  </Button>
                  
                  {/* Botões Ativos - apenas para visualização de profissionais */}
                  {gridViewType === 'profissionais' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className={filtrarFuncionariosAtivos 
                          ? "!h-10 px-3 bg-green-600 hover:bg-green-700 text-white shadow-md" 
                          : "!h-10 px-3 border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition-colors"
                        }
                        onClick={() => setFiltrarFuncionariosAtivos(!filtrarFuncionariosAtivos)}
                      >
                        <Users className="w-4 h-4 mr-1" />
                        Ativos
                        {filtrarFuncionariosAtivos && (
                          <span className="ml-1 bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full text-xs font-semibold">
                            {profissionais.filter(p => 
                              profissionalTemDisponibilidadePresencial(p.id, currentDate) || 
                              profissionalTemDisponibilidadeOnline(p.id, currentDate)
                            ).length}
                          </span>
                        )}
                      </Button>
                    </>
                  )}
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    className={`!h-10 px-3 bg-gradient-to-r ${theme.primaryButton} ${theme.primaryButtonHover} text-white shadow-md transition-all duration-200`}
                    onClick={() => setCurrentDate(new Date())}
                  >
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    Hoje
                  </Button>
                </div>
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
                availabilities={disponibilidades.map(disp => ({
                  id: disp.id,
                  profissionalId: disp.profissionalId,
                  recursoId: disp.recursoId,
                  horaInicio: new Date(disp.horaInicio),
                  horaFim: new Date(disp.horaFim),
                  tipo: disp.tipo,
                  diaSemana: disp.diaSemana,
                  dataEspecifica: disp.dataEspecifica ? new Date(disp.dataEspecifica) : null
                }))}
                verificarDisponibilidade={verificarDisponibilidade}
                verificarStatusDisponibilidade={verificarStatusDisponibilidade}
                onAppointmentClick={(appointmentId) => {
                  const agendamento = agendamentos.find(a => a.id === appointmentId);
                  if (agendamento) {
                    setAgendamentoDetalhes(agendamento);
                    setShowDetalhesAgendamento(true);
                  }
                }}
                onEditClick={handleEditarAgendamento}
                onDoubleClick={(entityId, horario) => {
                  // Verificar permissão para criar agendamento
                  if (!canCreate) {
                    AppToast.error('Acesso negado', {
                      description: 'Você não tem permissão para criar agendamentos.'
                    });
                    return;
                  }
                  
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
                  
                  // Escolher fluxo baseado na visualização atual
                  const dadosFormulario = {
                    dataHoraInicio: dataHoraLocal,
                    profissionalId: gridViewType === 'profissionais' ? entityId : undefined,
                    recursoId: gridViewType === 'recursos' ? entityId : undefined,
                    tipoFluxo: gridViewType === 'recursos' ? 'por-data' as const : 'por-profissional' as const
                  };
                  
                  handleAbrirFormularioDireto(dadosFormulario);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Unificado de Agendamento */}
      <AgendamentoModal
        isOpen={showAgendamentoModal}
        onClose={handleFecharAgendamentoModal}
        onSuccess={handleSuccessAgendamento}
        preenchimentoInicial={preenchimentoInicialModal}
      />

      <DetalhesAgendamentoModal
        isOpen={showDetalhesAgendamento}
        agendamento={agendamentoDetalhes}
        onClose={() => {
          setShowDetalhesAgendamento(false);
          setAgendamentoDetalhes(null);
        }}
      />

      <EditarAgendamentoModal
        isOpen={showEditarAgendamento}
        agendamento={agendamentoEdicao}
        onClose={handleFecharEdicao}
        onSuccess={handleSuccessEdicao}
      />
    </div>
  );
};