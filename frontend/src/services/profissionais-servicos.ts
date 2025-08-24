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

export const getProfissionaisServicos = async (params?: { servicoId?: string }): Promise<ProfissionalServico[]> => {
  const searchParams = new URLSearchParams();
  
  if (params?.servicoId) {
    searchParams.append('servico', params.servicoId);
  }
  
  const url = `/profissionais-servicos${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

export const getProfissionaisByServico = async (servicoId: string): Promise<ProfissionalServico[]> => {
  // Usar o novo filtro query param em vez da rota específica
  return getProfissionaisServicos({ servicoId });
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