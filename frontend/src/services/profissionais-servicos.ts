import api from './api';

export interface ProfissionalServico {
  id: string;
  profissionalId: string;
  servicoId: string;
  profissional: {
    id: string;
    nome: string;
    cpf: string;
    email: string;
  };
  servico: {
    id: string;
    nome: string;
    duracaoMinutos: number;
    preco: number;
  };
}

export const getProfissionaisServicos = async (): Promise<ProfissionalServico[]> => {
  const response = await api.get('/profissionais-servicos');
  return response.data;
};

export const getProfissionaisByServico = async (servicoId: string): Promise<ProfissionalServico[]> => {
  const response = await api.get(`/profissionais-servicos/${servicoId}`);
  return response.data;
};

export interface ServicoConvenioProfissional {
  profissionalId: string;
  servicos: {
    id: string;
    nome: string;
    duracaoMinutos: number;
    valor: number;
    convenio: {
      id: string;
      nome: string;
    };
  }[];
  convenios: {
    id: string;
    nome: string;
  }[];
}

export const getServicosConveniosByProfissional = async (profissionalId: string): Promise<ServicoConvenioProfissional> => {
  const response = await api.get(`/profissionais/${profissionalId}/servicos-convenios`);
  return response.data;
};