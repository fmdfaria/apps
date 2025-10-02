import type { Empresa } from './Empresa';
import type { ContaBancaria } from './ContaBancaria';
import type { CategoriaFinanceira } from './CategoriaFinanceira';
import type { Convenio } from './Convenio';
import type { Paciente } from './Paciente';

export type StatusContaReceber = 'PENDENTE' | 'PARCIAL' | 'RECEBIDO' | 'VENCIDO' | 'CANCELADO';
export type FormaRecebimento = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'TRANSFERENCIA' | 'CHEQUE' | 'BOLETO';

export interface ContaReceber {
  id: string;
  empresaId: string;
  contaBancariaId?: string;
  convenioId?: string;
  pacienteId?: string;
  categoriaId: string;
  
  // Dados Financeiros
  numeroDocumento?: string;
  descricao: string;
  valorOriginal: number;
  valorDesconto: number;
  valorJuros: number;
  valorMulta: number;
  valorLiquido: number;
  valorRecebido: number;
  
  // Datas
  dataEmissao: string;
  dataVencimento: string;
  dataRecebimento?: string;
  
  // Status e Controle
  status: StatusContaReceber;
  formaRecebimento?: FormaRecebimento;
  observacoes?: string;
  
  // Auditoria
  userCreatedId?: string;
  userUpdatedId?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relacionamentos
  empresa?: Empresa;
  contaBancaria?: ContaBancaria;
  convenio?: Convenio;
  paciente?: Paciente;
  categoria?: CategoriaFinanceira;
}

export interface CreateContaReceberData {
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
}

export interface ReceberContaData {
  valorRecebido: number;
  dataRecebimento: string;
  formaRecebimento: FormaRecebimento;
  contaBancariaId: string;
  observacoes?: string;
}

export interface UpdateContaReceberData extends Partial<CreateContaReceberData> {
  status?: StatusContaReceber;
}

export interface CancelarContaData {
  motivo?: string;
}

export interface ContaReceberFilters {
  empresaId?: string;
  contaBancariaId?: string;
  pacienteId?: string;
  convenioId?: string;
  status?: StatusContaReceber;
  dataVencimentoInicio?: string;
  dataVencimentoFim?: string;
}