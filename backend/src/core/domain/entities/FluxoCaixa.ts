import { randomUUID } from 'crypto';
import { Empresa } from './Empresa';
import { ContaBancaria } from './ContaBancaria';
import { CategoriaFinanceira } from './CategoriaFinanceira';
import { ContaReceber } from './ContaReceber';
import { ContaPagar } from './ContaPagar';

export class FluxoCaixa {
  id!: string;
  empresaId!: string;
  contaBancariaId!: string;
  contaReceberId?: string | null;
  contaPagarId?: string | null;
  
  // Dados da Movimentação
  tipo!: string; // ENTRADA, SAIDA
  categoriaId!: string;
  
  descricao!: string;
  valor!: number;
  dataMovimento!: Date;
  formaPagamento?: string | null;
  
  // Controle
  conciliado!: boolean;
  dataConciliacao?: Date | null;
  observacoes?: string | null;
  
  // Auditoria
  userCreatedId?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  
  // Relacionamentos
  empresa?: Empresa;
  contaBancaria?: ContaBancaria;
  contaReceber?: ContaReceber;
  contaPagar?: ContaPagar;
  categoria?: CategoriaFinanceira;

  constructor(
    props: Omit<FluxoCaixa, 'id' | 'createdAt' | 'updatedAt' | 'empresa' | 'contaBancaria' | 'contaReceber' | 'contaPagar' | 'categoria'>,
    id?: string
  ) {
    Object.assign(this, props);
    if (!id) {
      this.id = randomUUID();
    } else {
      this.id = id;
    }
  }
}