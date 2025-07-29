import api from './api';
import { parseDataLocal } from '@/lib/utils';
import type { 
  DisponibilidadeProfissional, 
  CreateDisponibilidadeDto, 
  UpdateDisponibilidadeDto 
} from '@/types/DisponibilidadeProfissional';

export const getDisponibilidadesProfissional = async (profissionalId: string): Promise<DisponibilidadeProfissional[]> => {
  const { data } = await api.get(`/disponibilidades-profissionais?profissionalId=${profissionalId}`);
  return data.map((item: any) => ({
    ...item,
    horaInicio: new Date(item.horaInicio),
    horaFim: new Date(item.horaFim),
    dataEspecifica: item.dataEspecifica ? parseDataLocal(item.dataEspecifica) : null,
    createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
  }));
};

export const getAllDisponibilidades = async (): Promise<DisponibilidadeProfissional[]> => {
  const { data } = await api.get('/disponibilidades-profissionais');
  return data.map((item: any) => ({
    ...item,
    horaInicio: new Date(item.horaInicio),
    horaFim: new Date(item.horaFim),
    dataEspecifica: item.dataEspecifica ? parseDataLocal(item.dataEspecifica) : null,
    createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
  }));
};

export const createDisponibilidade = async (data: CreateDisponibilidadeDto): Promise<DisponibilidadeProfissional> => {
  const response = await api.post('/disponibilidades-profissionais', data);
  return {
    ...response.data,
    horaInicio: new Date(response.data.horaInicio),
    horaFim: new Date(response.data.horaFim),
    dataEspecifica: response.data.dataEspecifica ? parseDataLocal(response.data.dataEspecifica) : null,
    createdAt: response.data.createdAt ? new Date(response.data.createdAt) : undefined,
    updatedAt: response.data.updatedAt ? new Date(response.data.updatedAt) : undefined,
  };
};

export const updateDisponibilidade = async (id: string, data: UpdateDisponibilidadeDto): Promise<DisponibilidadeProfissional> => {
  const response = await api.put(`/disponibilidades-profissionais/${id}`, data);
  return {
    ...response.data,
    horaInicio: new Date(response.data.horaInicio),
    horaFim: new Date(response.data.horaFim),
    dataEspecifica: response.data.dataEspecifica ? parseDataLocal(response.data.dataEspecifica) : null,
    createdAt: response.data.createdAt ? new Date(response.data.createdAt) : undefined,
    updatedAt: response.data.updatedAt ? new Date(response.data.updatedAt) : undefined,
  };
};

export const deleteDisponibilidade = async (id: string): Promise<void> => {
  await api.delete(`/disponibilidades-profissionais/${id}`);
}; 