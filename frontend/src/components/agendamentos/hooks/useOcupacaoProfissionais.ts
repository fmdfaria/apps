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
  buscarOcupacoes: (profissionalId?: string, data?: string) => Promise<void>;
  limparOcupacoes: () => void;
}

/**
 * Hook centralizado para gerenciar cálculos de ocupação semanal dos profissionais.
 * 
 * Regra atualizada: só envia a "data" para a API quando o usuário selecioná-la no formulário.
 * Antes disso, busca sem parâmetro de data (evita chamada precoce com data padrão).
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
  const buscarOcupacoes = useCallback(async (profissionalId?: string, data?: string) => {
    setCarregandoOcupacoes(true);
    
    try {
      // Enviar parâmetros apenas quando necessário
      const parametros: { data?: string; profissionalId?: string } = {};
      if (data) parametros.data = data;
      if (profissionalId) parametros.profissionalId = profissionalId;
      
      const formData = await getAgendamentoFormData(Object.keys(parametros).length ? parametros : undefined);
      
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