import api from './api';
import { getAgendamentos } from './agendamentos';
import { getProfissionais } from './profissionais';
import { getRecursos } from './recursos';
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
 * Busca dados completos de ocupação usando endpoint otimizado do backend
 */
export const getDadosOcupacao = async (): Promise<DadosOcupacao> => {
  try {
    // Usar novo endpoint que calcula os slots baseados nas disponibilidades reais
    const response = await api.get('/dashboard/ocupacao');
    const { ocupacoesProfissionais, ocupacoesRecursos } = response.data;

    // Calcular estatísticas gerais baseadas nos dados retornados
    const totalProfissionais = ocupacoesProfissionais.length;
    const profissionaisAtivos = ocupacoesProfissionais.length;
    const totalRecursos = ocupacoesRecursos.length;
    const recursosDisponiveis = ocupacoesRecursos.filter((r: OcupacaoRecurso) => r.disponivel).length;
    const agendamentosProximosSete = ocupacoesProfissionais.reduce((acc: number, prof: OcupacaoProfissional) => acc + prof.agendamentosProximos7, 0);
    const mediaOcupacao = ocupacoesProfissionais.length > 0 
      ? ocupacoesProfissionais.reduce((acc: number, prof: OcupacaoProfissional) => acc + prof.percentual, 0) / ocupacoesProfissionais.length 
      : 0;

    const estatisticas: EstatisticasOcupacao = {
      totalProfissionais,
      profissionaisAtivos,
      totalRecursos,
      recursosDisponiveis,
      agendamentosProximosSete,
      mediaOcupacaoProfissionais: Math.round(mediaOcupacao)
    };

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