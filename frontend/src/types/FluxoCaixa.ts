import type { Empresa } from './Empresa';
import type { ContaBancaria } from './ContaBancaria';
import type { CategoriaFinanceira } from './CategoriaFinanceira';
import type { ContaReceber } from './ContaReceber';
import type { ContaPagar } from './ContaPagar';

export type TipoMovimento = 'ENTRADA' | 'SAIDA';
export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'TRANSFERENCIA' | 'CHEQUE' | 'BOLETO';

export interface FluxoCaixa {
  id: string;
  empresaId: string;
  contaBancariaId: string;
  contaReceberId?: string;
  contaPagarId?: string;
  categoriaId: string;
  
  // Dados da Movimentação
  tipo: TipoMovimento;
  descricao: string;
  valor: number;
  dataMovimento: string;
  formaPagamento?: FormaPagamento;
  observacoes?: string;
  
  // Status e Controle
  conciliado: boolean;
  dataConciliacao?: string;
  
  // Auditoria
  userCreatedId?: string;
  userUpdatedId?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relacionamentos
  empresa?: Empresa;
  contaBancaria?: ContaBancaria;
  categoria?: CategoriaFinanceira;
  contaReceber?: ContaReceber;
  contaPagar?: ContaPagar;
}

export interface CreateFluxoCaixaData {
  empresaId: string;
  contaBancariaId: string;
  contaReceberId?: string;
  contaPagarId?: string;
  categoriaId: string;
  tipo: TipoMovimento;
  descricao: string;
  valor: number;
  dataMovimento: string;
  formaPagamento?: FormaPagamento;
  observacoes?: string;
}

export interface UpdateFluxoCaixaData {
  descricao?: string;
  valor?: number;
  dataMovimento?: string;
  formaPagamento?: FormaPagamento;
  observacoes?: string;
}

export interface ConciliarMovimentoData {
  dataConciliacao?: string;
}

export interface FluxoCaixaFilters {
  empresaId?: string;
  contaBancariaId?: string;
  tipo?: TipoMovimento;
  categoriaId?: string;
  dataMovimentoInicio?: string;
  dataMovimentoFim?: string;
  conciliado?: boolean;
}

export interface DashboardFluxoCaixa {
  totalEntradas: number;
  totalSaidas: number;
  saldoLiquido: number;
  movimentosHoje: number;
  movimentosNaoConciliados: number;
  entradaPorCategoria: Array<{
    categoria: string;
    valor: number;
  }>;
  saidaPorCategoria: Array<{
    categoria: string;
    valor: number;
  }>;
  fluxoDiario: Array<{
    data: string;
    entradas: number;
    saidas: number;
    saldo: number;
  }>;
}