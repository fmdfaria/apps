import type { Empresa } from './Empresa';
import type { ContaBancaria } from './ContaBancaria';
import type { CategoriaFinanceira } from './CategoriaFinanceira';
import type { Profissional } from './Profissional';

export type StatusContaPagar = 'PENDENTE' | 'SOLICITADO' | 'PARCIAL' | 'PAGO' | 'VENCIDO' | 'CANCELADO';
export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'TRANSFERENCIA' | 'CHEQUE' | 'TED' | 'DOC';
export type TipoContaPagar = 'DESPESA' | 'SALARIO' | 'ENCARGO' | 'IMPOSTO' | 'INVESTIMENTO';
export type Periodicidade = 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';

export interface ContaPagar {
  id: string;
  empresaId: string;
  contaBancariaId?: string;
  profissionalId?: string;
  categoriaId: string;
  
  // Dados Financeiros
  numeroDocumento?: string;
  descricao: string;
  valorOriginal: number;
  valorDesconto: number;
  valorJuros: number;
  valorMulta: number;
  valorLiquido: number;
  valorPago: number;
  
  // Datas
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento?: string;
  
  // Status e Controle
  status: StatusContaPagar;
  formaPagamento?: FormaPagamento;
  tipoConta: TipoContaPagar;
  recorrente: boolean;
  periodicidade?: Periodicidade;
  observacoes?: string;
  
  // Auditoria
  userCreatedId?: string;
  userUpdatedId?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relacionamentos
  empresa?: Empresa;
  contaBancaria?: ContaBancaria;
  profissional?: Profissional;
  categoria?: CategoriaFinanceira;
}

export interface CreateContaPagarData {
  empresaId: string;
  contaBancariaId?: string;
  profissionalId?: string;
  categoriaId: string;
  numeroDocumento?: string;
  descricao: string;
  valorOriginal: number;
  valorDesconto?: number;
  valorJuros?: number;
  valorMulta?: number;
  dataEmissao: string;
  dataVencimento: string;
  tipoConta?: TipoContaPagar;
  recorrente?: boolean;
  periodicidade?: Periodicidade;
  observacoes?: string;
}

export interface PagarContaData {
  valorPago: number;
  dataPagamento: string;
  formaPagamento: FormaPagamento;
  contaBancariaId: string;
  observacoes?: string;
}

export interface ContaPagarFilters {
  empresaId?: string;
  contaBancariaId?: string;
  profissionalId?: string;
  status?: StatusContaPagar;
  tipoConta?: TipoContaPagar;
  recorrente?: boolean;
  dataVencimentoInicio?: string;
  dataVencimentoFim?: string;
}