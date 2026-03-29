import { api } from '@/services/api/client';

type ApiDataResponse<T> = {
  success?: boolean;
  data: T;
  message?: string;
};

function unwrapData<T>(payload: T | ApiDataResponse<T>) {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiDataResponse<T>).data;
  }
  return payload as T;
}

export type StatusContaReceber = 'PENDENTE' | 'PARCIAL' | 'RECEBIDO' | 'VENCIDO' | 'CANCELADO' | 'SOLICITADO';
export type FormaRecebimento =
  | 'DINHEIRO'
  | 'PIX'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'TRANSFERENCIA'
  | 'CHEQUE'
  | 'BOLETO';

export type EmpresaFinanceiro = {
  id: string;
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  ativo?: boolean;
};

export type CategoriaFinanceira = {
  id: string;
  nome: string;
  tipo?: 'RECEITA' | 'DESPESA';
  ativo?: boolean;
};

export type ContaBancariaFinanceiro = {
  id: string;
  empresaId: string;
  nome: string;
  banco?: string | null;
  ativo?: boolean;
};

export type ConvenioFinanceiro = {
  id: string;
  nome: string;
};

export type PacienteFinanceiro = {
  id: string;
  nomeCompleto: string;
  ativo?: boolean;
};

export type ContaReceber = {
  id: string;
  empresaId: string;
  contaBancariaId?: string;
  convenioId?: string;
  pacienteId?: string;
  categoriaId: string;
  descricao: string;
  valorOriginal: number;
  dataEmissao: string;
  dataVencimento: string;
  status: StatusContaReceber;
};

export type CreateContaReceberData = {
  empresaId: string;
  contaBancariaId?: string;
  convenioId?: string;
  pacienteId?: string;
  categoriaId: string;
  numeroDocumento?: string;
  descricao: string;
  valorOriginal: number;
  valorDesconto?: number;
  valorJuros?: number;
  valorMulta?: number;
  dataEmissao: string;
  dataVencimento: string;
  observacoes?: string;
  status?: StatusContaReceber;
  formaRecebimento?: FormaRecebimento;
  userCreatedId?: string;
  userUpdatedId?: string;
};

export type ReceberContaData = {
  valorRecebido: number;
  dataRecebimento: string;
  formaRecebimento: FormaRecebimento;
  contaBancariaId: string;
  observacoes?: string;
};

export type AgendamentoConta = {
  id: string;
  agendamentoId: string;
  contaReceberId?: string;
  contaPagarId?: string;
};

export async function getEmpresasAtivas() {
  const response = await api.get<ApiDataResponse<EmpresaFinanceiro[]>>('/empresas', {
    params: { ativo: true },
  });
  return unwrapData(response.data);
}

export async function getCategoriasReceita() {
  const response = await api.get<ApiDataResponse<CategoriaFinanceira[]>>('/categorias-financeiras/tipo/RECEITA');
  return unwrapData(response.data);
}

export async function getContasBancariasByEmpresa(empresaId: string) {
  const response = await api.get<ApiDataResponse<ContaBancariaFinanceiro[]>>('/contas-bancarias', {
    params: { empresaId, ativo: true },
  });
  return unwrapData(response.data);
}

export async function getConveniosAtivos() {
  const response = await api.get<ConvenioFinanceiro[]>('/convenios', {
    params: { ativo: true },
  });
  return unwrapData(response.data);
}

export async function getPacientesAtivos() {
  const response = await api.get<PacienteFinanceiro[]>('/pacientes', {
    params: { ativo: true },
  });
  return unwrapData(response.data);
}

export async function createContaReceber(payload: CreateContaReceberData) {
  const response = await api.post<ApiDataResponse<ContaReceber>>('/contas-receber', payload);
  return unwrapData(response.data);
}

export async function receberConta(contaId: string, payload: ReceberContaData) {
  const response = await api.post<ApiDataResponse<ContaReceber>>(`/contas-receber/${contaId}/receber`, payload);
  return unwrapData(response.data);
}

export async function createAgendamentoConta(payload: { agendamentoId: string; contaReceberId: string }) {
  const response = await api.post<ApiDataResponse<AgendamentoConta>>('/agendamentos-contas', payload);
  return unwrapData(response.data);
}
