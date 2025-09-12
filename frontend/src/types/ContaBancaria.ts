import type { Empresa } from './Empresa';

export interface ContaBancaria {
  id: string;
  empresaId: string;
  
  // Identificação da Conta
  nome: string;
  banco: string;
  agencia: string;
  conta: string;
  digito?: string;
  tipoConta: 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO';
  
  // PIX
  pixPrincipal?: string;
  tipoPix?: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
  
  // Controles
  contaPrincipal: boolean;
  ativo: boolean;
  saldoInicial: number;
  saldoAtual: number;
  
  // Dados complementares
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relacionamentos
  empresa?: Empresa;
}

export interface CreateContaBancariaData {
  empresaId: string;
  nome: string;
  banco: string;
  agencia: string;
  conta: string;
  digito?: string;
  tipoConta?: 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO';
  pixPrincipal?: string;
  tipoPix?: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
  contaPrincipal?: boolean;
  ativo?: boolean;
  saldoInicial?: number;
  observacoes?: string;
}

export interface UpdateContaBancariaData extends Partial<CreateContaBancariaData> {}

export interface ContaBancariaFilters {
  empresaId?: string;
  ativo?: boolean;
  contaPrincipal?: boolean;
}