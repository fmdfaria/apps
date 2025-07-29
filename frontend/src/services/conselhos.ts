import api from './api';
export interface ConselhoProfissional {
  id: string;
  sigla: string;
  nome: string;
}

export const getConselhos = async (): Promise<ConselhoProfissional[]> => {
  const { data } = await api.get('/conselhos');
  return data;
};

export const createConselho = async (conselho: Omit<ConselhoProfissional, 'id'>): Promise<ConselhoProfissional> => {
  const { data } = await api.post('/conselhos', conselho);
  return data;
};

export const updateConselho = async (id: string, conselho: Omit<ConselhoProfissional, 'id'>): Promise<ConselhoProfissional> => {
  const { data } = await api.put(`/conselhos/${id}`, conselho);
  return data;
};

export const deleteConselho = async (id: string): Promise<void> => {
  await api.delete(`/conselhos/${id}`);
}; 