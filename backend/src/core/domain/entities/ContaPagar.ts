import { randomUUID } from 'crypto';
import { Empresa } from './Empresa';
import { ContaBancaria } from './ContaBancaria';
import { CategoriaFinanceira } from './CategoriaFinanceira';
import { Profissional } from './Profissional';
import { AgendamentoConta } from './AgendamentoConta';

export class ContaPagar {
  id!: string;
  empresaId!: string;
  contaBancariaId?: string | null;
  profissionalId?: string | null;
  categoriaId!: string;
  
  // Dados Financeiros
  numeroDocumento?: string | null;
  descricao!: string;
  valorOriginal!: number;
  valorDesconto!: number;
  valorJuros!: number;
  valorMulta!: number;
  valorLiquido!: number;
  valorPago!: number;
  
  // Datas
  dataEmissao!: Date;
  dataVencimento!: Date;
  dataPagamento?: Date | null;
  
  // Status e Controle
  status!: string; // PENDENTE, PARCIAL, PAGO, VENCIDO, CANCELADO
  formaPagamento?: string | null; // DINHEIRO, PIX, TRANSFERENCIA, etc
  tipoConta!: string; // DESPESA, SALARIO, ENCARGO, IMPOSTO, INVESTIMENTO
  recorrente!: boolean;
  periodicidade?: string | null; // MENSAL, TRIMESTRAL, SEMESTRAL, ANUAL
  observacoes?: string | null;
  
  // Auditoria
  userCreatedId?: string | null;
  userUpdatedId?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  
  // Relacionamentos
  empresa?: Empresa;
  contaBancaria?: ContaBancaria;
  profissional?: Profissional;
  categoria?: CategoriaFinanceira;
  agendamentosConta?: AgendamentoConta[];

  constructor(
    props: Omit<ContaPagar, 'id' | 'createdAt' | 'updatedAt' | 'empresa' | 'contaBancaria' | 'profissional' | 'categoria' | 'agendamentosConta'>,
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