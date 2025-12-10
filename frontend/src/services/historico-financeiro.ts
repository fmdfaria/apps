import api from './api';

export interface AgendamentoHistorico {
  id: string;
  dataHoraInicio: string;
  dataHoraFim: string | null;
  status: string;
  tipoAtendimento: string;
  numeroSessao: number | null;
  pacienteNome: string | null;
  pacienteCpf: string | null;
  servicoNome: string | null;
  convenioNome: string | null;
  recursoNome: string | null;
  observacoes: string | null;
}

export interface ContaPagarHistorico {
  id: string;
  descricao: string;
  valorOriginal: number;
  valorLiquido: number;
  valorPago: number;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento: string | null;
  status: string;
  formaPagamento: string | null;
  tipoConta: string;
  empresaNome: string | null;
  categoriaNome: string | null;
  observacoes: string | null;
  agendamentos: AgendamentoHistorico[];
}

export interface HistoricoFinanceiroProfissional {
  profissional: {
    id: string;
    nome: string;
    cpf: string;
  };
  contas: ContaPagarHistorico[];
}

export const getHistoricoFinanceiroProfissional = async (): Promise<HistoricoFinanceiroProfissional> => {
  const response = await api.get('/profissionais/historico-financeiro/me', {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  return response.data;
};

export const validatePassword = async (senha: string): Promise<boolean> => {
  try {
    const response = await api.post('/auth/password/validate', { senha });
    return response.data.valid;
  } catch (error: any) {
    if (error.response?.status === 401) {
      return false;
    }
    throw error;
  }
};
