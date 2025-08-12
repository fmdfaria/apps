import api from './api';
import type { Agendamento } from '@/types/Agendamento';
import type { Paciente } from '@/types/Paciente';
import type { Profissional } from '@/types/Profissional';
import type { Recurso } from '@/types/Recurso';

export interface EstatisticasOcupacao {
  totalProfissionais: number;
  profissionaisAtivos: number;
  totalRecursos: number;
  recursosDisponiveis: number;
  agendamentosProximosSete: number;
  mediaOcupacaoProfissionais: number;
}

export interface OcupacaoProfissional {
  profissionalId: string;
  nome: string;
  ocupados: number;
  total: number;
  percentual: number;
  agendamentosHoje: number;
  agendamentosProximos7: number;
}

export interface OcupacaoRecurso {
  id: string;
  nome: string;
  tipo: string;
  agendamentosHoje: number;
  agendamentosProximos7: number;
  percentualOcupacao: number;
  disponivel: boolean;
}

export interface DadosOcupacao {
  estatisticas: EstatisticasOcupacao;
  ocupacoesProfissionais: OcupacaoProfissional[];
  ocupacoesRecursos: OcupacaoRecurso[];
}

/**
 * Busca dados completos de ocupação usando a API /agendamentos/form-data
 */
export const getDadosOcupacao = async (): Promise<DadosOcupacao> => {
  try {
    // Usar a API existente que já retorna dados completos
    const hoje = new Date().toISOString().split('T')[0];
    const { data: formData } = await api.get(`/agendamentos/form-data?data=${hoje}`);
    
    const { 
      pacientes, 
      profissionais, 
      agendamentos, 
      recursos,
      ocupacoesSemana 
    }: {
      pacientes: Paciente[];
      profissionais: Profissional[];
      agendamentos: Agendamento[];
      recursos: Recurso[];
      ocupacoesSemana: Array<{
        profissionalId: string;
        ocupados: number;
        total: number;
        percentual: number;
      }>;
    } = formData;

    // Calcular período de análise (próximos 7 dias)
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const fimHoje = new Date(inicioHoje);
    fimHoje.setDate(fimHoje.getDate() + 1);
    
    const proximosSete = new Date(inicioHoje);
    proximosSete.setDate(proximosSete.getDate() + 7);

    // Buscar todos os agendamentos para calcular corretamente os agendamentos por profissional/recurso
    const { data: todosAgendamentos } = await api.get('/agendamentos');

    // Filtrar agendamentos do período
    const agendamentosHoje = todosAgendamentos.filter((ag: Agendamento) => {
      const dataAg = new Date(ag.dataHoraInicio);
      return dataAg >= inicioHoje && dataAg < fimHoje;
    });

    const agendamentosProximosSete = todosAgendamentos.filter((ag: Agendamento) => {
      const dataAg = new Date(ag.dataHoraInicio);
      return dataAg >= inicioHoje && dataAg < proximosSete;
    });

    // Calcular estatísticas gerais - todos os profissionais são considerados ativos
    const recursosDisponiveis = recursos;

    // Processar ocupações dos profissionais com dados enriquecidos
    const ocupacoesProfissionais: OcupacaoProfissional[] = profissionais.map(prof => {
      const ocupacao = ocupacoesSemana.find(ocp => ocp.profissionalId === prof.id);
      
      // Calcular agendamentos do profissional
      const agendamentosProfHoje = agendamentosHoje.filter((ag: Agendamento) => ag.profissionalId === prof.id);
      const agendamentosProfProx7 = agendamentosProximosSete.filter((ag: Agendamento) => ag.profissionalId === prof.id);

      // Usar os agendamentos reais calculados no frontend
      const totalSlots = ocupacao?.total || 0;
      const ocupadosReais = agendamentosProfProx7.length;
      const percentualReal = totalSlots > 0 ? Math.round((ocupadosReais / totalSlots) * 100) : 0;

      return {
        profissionalId: prof.id,
        nome: prof.nome,
        ocupados: ocupadosReais,
        total: totalSlots,
        percentual: percentualReal,
        agendamentosHoje: agendamentosProfHoje.length,
        agendamentosProximos7: agendamentosProfProx7.length
      };
    }).filter(prof => prof.total > 0);

    // Calcular média de ocupação
    const mediaOcupacao = ocupacoesProfissionais.length > 0 
      ? ocupacoesProfissionais.reduce((acc, prof) => acc + prof.percentual, 0) / ocupacoesProfissionais.length 
      : 0;

    const estatisticas: EstatisticasOcupacao = {
      totalProfissionais: profissionais.length,
      profissionaisAtivos: profissionais.length, // Todos os profissionais são considerados ativos
      totalRecursos: recursos.length,
      recursosDisponiveis: recursosDisponiveis.length,
      agendamentosProximosSete: agendamentosProximosSete.length,
      mediaOcupacaoProfissionais: Math.round(mediaOcupacao)
    };

    // Processar ocupações dos recursos com dados reais
    const ocupacoesRecursos: OcupacaoRecurso[] = recursos.map(recurso => {
      // Calcular agendamentos do recurso
      const agendamentosRecursoHoje = agendamentosHoje.filter((ag: Agendamento) => ag.recursoId === recurso.id);
      const agendamentosRecursoProx7 = agendamentosProximosSete.filter((ag: Agendamento) => ag.recursoId === recurso.id);
      
      // Estimar ocupação baseada nos agendamentos (assumindo 8 slots por dia)
      const slotsDisponiveis = 7 * 8; // 7 dias × 8 slots por dia
      const percentualOcupacao = slotsDisponiveis > 0 
        ? Math.min(100, Math.round((agendamentosRecursoProx7.length / slotsDisponiveis) * 100))
        : 0;

      return {
        id: recurso.id,
        nome: recurso.nome,
        tipo: recurso.tipo || 'Consultório',
        agendamentosHoje: agendamentosRecursoHoje.length,
        agendamentosProximos7: agendamentosRecursoProx7.length,
        percentualOcupacao,
        disponivel: true // Todos os recursos são considerados disponíveis
      };
    });

    return {
      estatisticas,
      ocupacoesProfissionais,
      ocupacoesRecursos
    };
  } catch (error) {
    console.error('Erro ao buscar dados de ocupação:', error);
    throw error;
  }
};

/**
 * Busca ocupação específica de um profissional
 */
export const getOcupacaoProfissional = async (profissionalId: string): Promise<OcupacaoProfissional | null> => {
  try {
    const dados = await getDadosOcupacao();
    return dados.ocupacoesProfissionais.find(op => op.profissionalId === profissionalId) || null;
  } catch (error) {
    console.error('Erro ao buscar ocupação do profissional:', error);
    return null;
  }
};

/**
 * Busca ocupação específica de um recurso
 */
export const getOcupacaoRecurso = async (recursoId: string): Promise<OcupacaoRecurso | null> => {
  try {
    const dados = await getDadosOcupacao();
    return dados.ocupacoesRecursos.find(or => or.id === recursoId) || null;
  } catch (error) {
    console.error('Erro ao buscar ocupação do recurso:', error);
    return null;
  }
};