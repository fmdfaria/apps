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

export const getPacientesComFaltasConsecutivas = async (): Promise<PacienteComFaltas[]> => {
  const response = await api.get('/pacientes/faltas-consecutivas');
  return response.data;
};
