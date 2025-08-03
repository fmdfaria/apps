import api from './api';
import type { Recurso } from '@/types/Recurso';

// Dados mock para fallback em caso de erro na API
const recursosMock: Recurso[] = [
  {
    id: 'rec1',
    nome: 'Sala 1 - Cardiologia',
    descricao: 'Sala de atendimento cardiológico com equipamentos especializados'
  },
  {
    id: 'rec2',
    nome: 'Telemedicina - Sala Virtual 2',
    descricao: 'Sala virtual para atendimentos online'
  },
  {
    id: 'rec3',
    nome: 'Sala 3 - Ortopedia',
    descricao: 'Sala de atendimento ortopédico com equipamentos de imagem'
  }
];

export const getRecursos = async (): Promise<Recurso[]> => {
  try {
    const { data } = await api.get('/recursos');
    return data;
  } catch (error) {
    console.warn('⚠️ Erro ao carregar recursos da API, usando dados mock como fallback:', error);
    return recursosMock;
  }
};

export const createRecurso = async (recurso: Omit<Recurso, 'id'>): Promise<Recurso> => {
  const { data } = await api.post('/recursos', recurso);
  return data;
};

export const updateRecurso = async (id: string, recurso: Omit<Recurso, 'id'>): Promise<Recurso> => {
  const { data } = await api.put(`/recursos/${id}`, recurso);
  return data;
};

export const deleteRecurso = async (id: string): Promise<void> => {
  await api.delete(`/recursos/${id}`);
}; 