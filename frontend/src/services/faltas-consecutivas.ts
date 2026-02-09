import api from './api';

export interface FaltaData {
  agendamentoId: string;
  dataHoraInicio: string;
  servicoNome: string;
  profissionalNome: string;
  convenioNome: string;
}

export interface PacienteComFaltas {
  pacienteId: string;
  pacienteNome: string;
  pacienteWhatsapp: string;
  faltasConsecutivas: number;
  totalFaltas: number;
  ultimaFalta: string;
  faltas: FaltaData[];
  profissionalNome: string;
  convenioNome: string;
  servicoNome: string;
}

interface GetPacientesComFaltasConsecutivasParams {
  dataInicio?: string;
  dataFim?: string;
}

export const getPacientesComFaltasConsecutivas = async (
  params?: GetPacientesComFaltasConsecutivasParams
): Promise<PacienteComFaltas[]> => {
  const dataFim = params?.dataFim ?? new Date().toISOString();
  const dataInicio = params?.dataInicio ?? (() => {
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 30);
    return inicio.toISOString();
  })();

  const response = await api.get('/pacientes/faltas-consecutivas', {
    params: { dataInicio, dataFim }
  });
  return response.data;
};
