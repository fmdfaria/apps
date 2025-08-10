import { useState, useEffect, useCallback } from 'react';
import { getAgendamentoFormData } from '@/services/agendamentos';

export interface OcupacaoProfissional {
  ocupados: number;
  total: number;
  percentual: number;
}

export interface UseOcupacaoProfissionaisResult {
  ocupacoesSemana: { [profissionalId: string]: OcupacaoProfissional };
  carregandoOcupacoes: boolean;
  buscarOcupacoes: (profissionalId?: string) => Promise<void>;
  limparOcupacoes: () => void;
}

/**
 * Hook centralizado para gerenciar cálculos de ocupação semanal dos profissionais.
 * 
 * Nova regra simplificada: Sempre calcula ocupação com base em "hoje + 7 dias".
 * Isso garante consistência total e informações mais úteis independente da data selecionada.
 * 
 * @returns {UseOcupacaoProfissionaisResult} Objeto com dados e funções para ocupação
 */
export const useOcupacaoProfissionais = (): UseOcupacaoProfissionaisResult => {
  const [ocupacoesSemana, setOcupacoesSemana] = useState<{ [profissionalId: string]: OcupacaoProfissional }>({});
  const [carregandoOcupacoes, setCarregandoOcupacoes] = useState(false);

  /**
   * Busca dados de ocupação semanal usando período fixo: hoje + 7 dias.
   * Regra unificada para toda a aplicação, independente da data selecionada pelo usuário.
   * Opcionalmente pode filtrar por um profissional específico.
   */
  const buscarOcupacoes = useCallback(async (profissionalId?: string) => {
    setCarregandoOcupacoes(true);
    
    try {
      // Usar sempre "hoje + 7 dias" como período de referência
      const hoje = new Date();
      const dataReferencia = hoje.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const parametros = profissionalId ? { data: dataReferencia, profissionalId } : { data: dataReferencia };
      const formData = await getAgendamentoFormData(parametros);
      
      // Converter ocupações para o formato do hook
      const ocupacoesMap = formData.ocupacoesSemana.reduce((acc, ocupacao) => {
        acc[ocupacao.profissionalId] = {
          ocupados: ocupacao.ocupados,
          total: ocupacao.total,
          percentual: ocupacao.percentual
        };
        return acc;
      }, {} as { [profissionalId: string]: OcupacaoProfissional });
      
      setOcupacoesSemana(ocupacoesMap);
    } catch (error) {
      console.error('Erro ao buscar ocupações dos profissionais:', error);
      setOcupacoesSemana({});
    } finally {
      setCarregandoOcupacoes(false);
    }
  }, []);

  /**
   * Limpa os dados de ocupação
   */
  const limparOcupacoes = useCallback(() => {
    setOcupacoesSemana({});
  }, []);

  return {
    ocupacoesSemana,
    carregandoOcupacoes,
    buscarOcupacoes,
    limparOcupacoes
  };
};