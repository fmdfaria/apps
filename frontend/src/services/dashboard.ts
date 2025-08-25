import api from './api';
import type { Agendamento } from '@/types/Agendamento';
import type { Paciente } from '@/types/Paciente';
import type { Profissional } from '@/types/Profissional';
import type { Recurso } from '@/types/Recurso';

export interface DashboardStats {
  totalPacientes: number;
  pacientesAtivos: number;
  totalProfissionais: number;
  profissionaisAtivos: number;
  agendamentosHoje: number;
  agendamentosProximosSete: number;
  mediaOcupacaoProfissionais: number;
  receitaMensal: number;
  taxaOcupacao: number;
  satisfacaoPacientes: number;
  agendaPreenchida: number;
  profissionaisDisponiveis: number;
}

export interface AtividadeRecente {
  id: string;
  action: string;
  patient: string;
  time: string;
  type: 'patient' | 'appointment' | 'professional' | 'payment' | 'convenio';
  status: 'success' | 'warning' | 'info' | 'error';
}

export interface ProximoAgendamento {
  id: string;
  time: string;
  patient: string;
  professional: string;
  service: string;
  status: 'confirmed' | 'pending';
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivities: AtividadeRecente[];
  upcomingAppointments: ProximoAgendamento[];
}

/**
 * Busca todas as estatísticas do dashboard usando as APIs individuais
 */
export const getDashboardStats = async (): Promise<DashboardData> => {
  try {
    // Buscar dados de diferentes APIs
    const hoje = new Date().toISOString().split('T')[0];
    const proximosSete = new Date();
    proximosSete.setDate(proximosSete.getDate() + 7);
    
    const [
      { data: pacientesResult },
      { data: profissionaisResult }, 
      agendamentosResult,
      { data: formData }
    ] = await Promise.all([
      api.get('/pacientes'),
      api.get('/profissionais'),
      // Usar nova API paginada para buscar agendamentos dos próximos 7 dias
      import('./agendamentos').then(service => service.getAgendamentos({
        dataInicio: hoje,
        dataFim: proximosSete.toISOString().split('T')[0]
      })),
      api.get(`/agendamentos/form-data?data=${hoje}`)
    ]);

    const pacientes = pacientesResult;
    const profissionais = profissionaisResult;
    const agendamentos = agendamentosResult.data;
    const ocupacoesSemana = formData.ocupacoesSemana || [];

    // Calcular estatísticas gerais
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const fimHoje = new Date(inicioHoje);
    fimHoje.setDate(fimHoje.getDate() + 1);
    
    const proximosSeteDate = new Date(inicioHoje);
    proximosSeteDate.setDate(proximosSeteDate.getDate() + 7);

    // Filtrar agendamentos de hoje
    const agendamentosHoje = agendamentos.filter(ag => {
      const dataAg = new Date(ag.dataHoraInicio);
      return dataAg >= inicioHoje && dataAg < fimHoje;
    });

    // Filtrar agendamentos dos próximos 7 dias
    const agendamentosProximosSete = agendamentos.filter(ag => {
      const dataAg = new Date(ag.dataHoraInicio);
      return dataAg >= inicioHoje && dataAg < proximosSeteDate;
    });

    // Calcular média de ocupação dos profissionais
    const mediaOcupacao = ocupacoesSemana.length > 0 
      ? ocupacoesSemana.reduce((acc, ocp) => acc + ocp.percentual, 0) / ocupacoesSemana.length 
      : 0;

    // Simular receita mensal (baseada nos agendamentos)
    const receitaEstimada = agendamentosProximosSete.length * 150; // R$ 150 por consulta em média

    // Calcular profissionais disponíveis (ativos)
    const profissionaisAtivos = profissionais.filter(p => p.ativo);

    const stats: DashboardStats = {
      totalPacientes: pacientes.length,
      pacientesAtivos: pacientes.filter(p => p.ativo !== false).length,
      totalProfissionais: profissionais.length,
      profissionaisAtivos: profissionaisAtivos.length,
      agendamentosHoje: agendamentosHoje.length,
      agendamentosProximosSete: agendamentosProximosSete.length,
      mediaOcupacaoProfissionais: Math.round(mediaOcupacao),
      receitaMensal: receitaEstimada,
      taxaOcupacao: Math.round(mediaOcupacao),
      satisfacaoPacientes: 96, // Simulado - poderia vir de uma pesquisa de satisfação
      agendaPreenchida: Math.round(mediaOcupacao * 0.85), // Aproximação baseada na ocupação
      profissionaisDisponiveis: Math.round((profissionaisAtivos.length / profissionais.length) * 100)
    };

    // Gerar atividades recentes baseadas nos agendamentos mais recentes
    const recentActivities: AtividadeRecente[] = agendamentos
      .sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime())
      .slice(0, 6)
      .map((ag, index) => {
        const tempoDecorrido = Math.floor((agora.getTime() - new Date(ag.atualizadoEm).getTime()) / (1000 * 60));
        let timeText = '';
        
        if (tempoDecorrido < 60) {
          timeText = `${tempoDecorrido} min atrás`;
        } else if (tempoDecorrido < 1440) {
          timeText = `${Math.floor(tempoDecorrido / 60)} hora${Math.floor(tempoDecorrido / 60) > 1 ? 's' : ''} atrás`;
        } else {
          timeText = `${Math.floor(tempoDecorrido / 1440)} dia${Math.floor(tempoDecorrido / 1440) > 1 ? 's' : ''} atrás`;
        }

        let action = '';
        let type: AtividadeRecente['type'] = 'appointment';
        let status: AtividadeRecente['status'] = 'success';

        switch (ag.status) {
          case 'AGENDADO':
            action = 'Agendamento confirmado';
            status = 'success';
            break;
          case 'CANCELADO':
            action = 'Consulta cancelada';
            status = 'warning';
            break;
          case 'LIBERADO':
            action = 'Agendamento liberado';
            status = 'info';
            break;
          case 'ATENDIDO':
            action = 'Consulta iniciada';
            status = 'info';
            break;
          case 'FINALIZADO':
            action = 'Consulta concluída';
            status = 'success';
            break;
          default:
            action = 'Agendamento atualizado';
            status = 'info';
        }

        return {
          id: ag.id,
          action,
          patient: ag.pacienteNome || 'Paciente não identificado',
          time: timeText,
          type,
          status
        };
      });

    // Gerar próximos agendamentos baseados nos agendamentos futuros
    const upcomingAppointments: ProximoAgendamento[] = agendamentos
      .filter(ag => {
        const dataAg = new Date(ag.dataHoraInicio);
        return dataAg >= agora && ag.status === 'AGENDADO';
      })
      .sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime())
      .slice(0, 4)
      .map(ag => {
        const dataAg = new Date(ag.dataHoraInicio);
        const timeFormatted = dataAg.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        return {
          id: ag.id,
          time: timeFormatted,
          patient: ag.pacienteNome || 'Paciente não identificado',
          professional: ag.profissionalNome || 'Profissional não identificado',
          service: ag.servicoNome || 'Serviço não identificado',
          status: 'confirmed' as const
        };
      });

    return {
      stats,
      recentActivities,
      upcomingAppointments
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    
    // Retornar dados padrão em caso de erro
    return {
      stats: {
        totalPacientes: 0,
        pacientesAtivos: 0,
        totalProfissionais: 0,
        profissionaisAtivos: 0,
        agendamentosHoje: 0,
        agendamentosProximosSete: 0,
        mediaOcupacaoProfissionais: 0,
        receitaMensal: 0,
        taxaOcupacao: 0,
        satisfacaoPacientes: 0,
        agendaPreenchida: 0,
        profissionaisDisponiveis: 0
      },
      recentActivities: [],
      upcomingAppointments: []
    };
  }
};

/**
 * Busca atividades recentes do paciente específico
 */
export const getRecentActivities = async (limit: number = 10): Promise<AtividadeRecente[]> => {
  try {
    const dashboardData = await getDashboardStats();
    return dashboardData.recentActivities.slice(0, limit);
  } catch (error) {
    console.error('Erro ao buscar atividades recentes:', error);
    return [];
  }
};

/**
 * Busca próximos agendamentos
 */
export const getUpcomingAppointments = async (limit: number = 5): Promise<ProximoAgendamento[]> => {
  try {
    const dashboardData = await getDashboardStats();
    return dashboardData.upcomingAppointments.slice(0, limit);
  } catch (error) {
    console.error('Erro ao buscar próximos agendamentos:', error);
    return [];
  }
};