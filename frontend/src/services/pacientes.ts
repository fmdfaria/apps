import api from './api';
import type { Paciente } from '@/types/Paciente';

export const getPacientes = async (): Promise<Paciente[]> => {
  const { data } = await api.get('/pacientes');
  return data;
};

export const getPacientesAtivos = async (): Promise<Paciente[]> => {
  const { data } = await api.get('/pacientes/ativos');
  return data;
};

export const createPaciente = async (paciente: Omit<Paciente, 'id'>): Promise<Paciente> => {
  const { data } = await api.post('/pacientes', paciente);
  return data;
};

export const updatePaciente = async (id: string, paciente: Omit<Paciente, 'id'>): Promise<Paciente> => {
  const { data } = await api.put(`/pacientes/${id}`, paciente);
  return data;
};

export const deletePaciente = async (id: string): Promise<void> => {
  await api.delete(`/pacientes/${id}`);
};

export const togglePacienteStatus = async (id: string, ativo: boolean): Promise<Paciente> => {
  const { data } = await api.patch(`/pacientes/${id}/status`, { ativo });
  return data;
}; 