import api from './api';
import { parseDataLocal, parseHoraLocalFromISOTime } from '@/lib/utils';
import type { 
  DisponibilidadeProfissional, 
  CreateDisponibilidadeDto, 
  UpdateDisponibilidadeDto 
} from '@/types/DisponibilidadeProfissional';

// Dados mock para fallback em caso de erro na API
const disponibilidadesMock: DisponibilidadeProfissional[] = [
  // Dr. João Cardiologista - Folga às segundas-feiras
  {
    id: 'disp1',
    profissionalId: 'prof1',
    horaInicio: new Date('2024-01-01T08:00:00'),
    horaFim: new Date('2024-01-01T12:00:00'),
    tipo: 'folga',
    diaSemana: 1, // Segunda-feira
    observacao: 'Folga semanal',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  // Dr. João Cardiologista - Disponibilidade às terças-feiras
  {
    id: 'disp2',
    profissionalId: 'prof1',
    horaInicio: new Date('2024-01-01T14:00:00'),
    horaFim: new Date('2024-01-01T18:00:00'),
    tipo: 'disponivel',
    diaSemana: 2, // Terça-feira
    observacao: 'Atendimento à tarde',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  // Dra. Ana Neurologia - Folga às sextas-feiras
  {
    id: 'disp3',
    profissionalId: 'prof2',
    horaInicio: new Date('2024-01-01T09:00:00'),
    horaFim: new Date('2024-01-01T17:00:00'),
    tipo: 'folga',
    diaSemana: 5, // Sexta-feira
    observacao: 'Folga semanal',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  // Dr. Carlos Ortopedia - Disponibilidade específica
  {
    id: 'disp4',
    profissionalId: 'prof3',
    horaInicio: new Date('2024-01-01T10:00:00'),
    horaFim: new Date('2024-01-01T16:00:00'),
    tipo: 'disponivel',
    dataEspecifica: new Date('2024-01-15'), // Data específica
    observacao: 'Atendimento especial',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

export const getDisponibilidadesProfissional = async (profissionalId: string): Promise<DisponibilidadeProfissional[]> => {
  const { data } = await api.get(`/disponibilidades-profissionais?profissionalId=${profissionalId}`);
  return data.map((item: any) => ({
    ...item,
    // Interpretar hora como local, ignorando timezone
    horaInicio: parseHoraLocalFromISOTime(item.horaInicio),
    horaFim: parseHoraLocalFromISOTime(item.horaFim),
    dataEspecifica: item.dataEspecifica ? parseDataLocal(item.dataEspecifica) : null,
    createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
  }));
};

export const getAllDisponibilidades = async (): Promise<DisponibilidadeProfissional[]> => {
  try {
    const { data } = await api.get('/disponibilidades-profissionais');
    return data.map((item: any) => ({
      ...item,
      // Interpretar hora como local, ignorando timezone
      horaInicio: parseHoraLocalFromISOTime(item.horaInicio),
      horaFim: parseHoraLocalFromISOTime(item.horaFim),
      dataEspecifica: item.dataEspecifica ? parseDataLocal(item.dataEspecifica) : null,
      createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
    }));
  } catch (error) {
    console.warn('⚠️ Erro ao carregar disponibilidades da API, usando dados mock como fallback:', error);
    return disponibilidadesMock;
  }
};

export const createDisponibilidade = async (data: CreateDisponibilidadeDto): Promise<DisponibilidadeProfissional> => {
  const response = await api.post('/disponibilidades-profissionais', data);
  return {
    ...response.data,
    // Interpretar hora como local, ignorando timezone
    horaInicio: parseHoraLocalFromISOTime(response.data.horaInicio),
    horaFim: parseHoraLocalFromISOTime(response.data.horaFim),
    dataEspecifica: response.data.dataEspecifica ? parseDataLocal(response.data.dataEspecifica) : null,
    createdAt: response.data.createdAt ? new Date(response.data.createdAt) : undefined,
    updatedAt: response.data.updatedAt ? new Date(response.data.updatedAt) : undefined,
  };
};

export const updateDisponibilidade = async (id: string, data: UpdateDisponibilidadeDto): Promise<DisponibilidadeProfissional> => {
  const response = await api.put(`/disponibilidades-profissionais/${id}`, data);
  return {
    ...response.data,
    // Interpretar hora como local, ignorando timezone
    horaInicio: parseHoraLocalFromISOTime(response.data.horaInicio),
    horaFim: parseHoraLocalFromISOTime(response.data.horaFim),
    dataEspecifica: response.data.dataEspecifica ? parseDataLocal(response.data.dataEspecifica) : null,
    createdAt: response.data.createdAt ? new Date(response.data.createdAt) : undefined,
    updatedAt: response.data.updatedAt ? new Date(response.data.updatedAt) : undefined,
  };
};

export const deleteDisponibilidade = async (id: string): Promise<void> => {
  await api.delete(`/disponibilidades-profissionais/${id}`);
}; 