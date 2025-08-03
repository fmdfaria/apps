import { useState, useEffect, useCallback } from 'react';
import { 
  verificarHorariosProfissional,
  verificarProfissionaisDisponibilidade,
  type HorarioVerificado,
  type ProfissionalVerificado
} from '@/services/verificacao-disponibilidade';

export interface UseVerificacaoAgendamentoReturn {
  // Estados de loading
  carregandoHorarios: boolean;
  carregandoProfissionais: boolean;
  
  // Dados verificados
  horariosVerificados: HorarioVerificado[];
  profissionaisVerificados: ProfissionalVerificado[];
  
  // Funções
  verificarHorarios: (profissionalId: string, data: Date) => Promise<void>;
  verificarProfissionais: (profissionaisIds: string[], data: Date, horario: string, nomes: { [id: string]: string }) => Promise<void>;
  limparVerificacoes: () => void;
}

export const useVerificacaoAgendamento = (): UseVerificacaoAgendamentoReturn => {
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [carregandoProfissionais, setCarregandoProfissionais] = useState(false);
  const [horariosVerificados, setHorariosVerificados] = useState<HorarioVerificado[]>([]);
  const [profissionaisVerificados, setProfissionaisVerificados] = useState<ProfissionalVerificado[]>([]);

  // Função para verificar horários de um profissional
  const verificarHorarios = useCallback(async (profissionalId: string, data: Date) => {
    if (!profissionalId || !data) return;

    setCarregandoHorarios(true);
    try {
      const horarios = await verificarHorariosProfissional(profissionalId, data);
      setHorariosVerificados(horarios);
    } catch (error) {
      console.error('Erro ao verificar horários:', error);
      setHorariosVerificados([]);
    } finally {
      setCarregandoHorarios(false);
    }
  }, []);

  // Função para verificar profissionais disponíveis
  const verificarProfissionais = useCallback(async (
    profissionaisIds: string[], 
    data: Date, 
    horario: string,
    nomes: { [id: string]: string }
  ) => {
    if (!profissionaisIds.length || !data || !horario) return;

    setCarregandoProfissionais(true);
    try {
      const profissionais = await verificarProfissionaisDisponibilidade(profissionaisIds, data, horario, nomes);
      setProfissionaisVerificados(profissionais);
    } catch (error) {
      console.error('Erro ao verificar profissionais:', error);
      setProfissionaisVerificados([]);
    } finally {
      setCarregandoProfissionais(false);
    }
  }, []);

  // Função para limpar verificações
  const limparVerificacoes = useCallback(() => {
    setHorariosVerificados([]);
    setProfissionaisVerificados([]);
  }, []);

  return {
    carregandoHorarios,
    carregandoProfissionais,
    horariosVerificados,
    profissionaisVerificados,
    verificarHorarios,
    verificarProfissionais,
    limparVerificacoes
  };
};