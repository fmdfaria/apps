export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: 'RECEITA' | 'DESPESA';
  descricao?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoriaFinanceiraData {
  nome: string;
  tipo: 'RECEITA' | 'DESPESA';
  descricao?: string;
  ativo?: boolean;
}

export interface UpdateCategoriaFinanceiraData extends Partial<CreateCategoriaFinanceiraData> {}

export interface CategoriaFinanceiraFilters {
  tipo?: 'RECEITA' | 'DESPESA';
  ativo?: boolean;
}