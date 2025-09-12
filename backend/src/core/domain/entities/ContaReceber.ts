import { randomUUID } from 'crypto';
import { Empresa } from './Empresa';
import { ContaBancaria } from './ContaBancaria';
import { CategoriaFinanceira } from './CategoriaFinanceira';
import { Convenio } from './Convenio';
import { Paciente } from './Paciente';

export class ContaReceber {
  id!: string;
  empresaId!: string;
  contaBancariaId?: string | null;
  convenioId?: string | null;
  pacienteId?: string | null;
  categoriaId!: string;
  
  // Dados Financeiros
  numeroDocumento?: string | null;
  descricao!: string;
  valorOriginal!: number;
  valorDesconto!: number;
  valorJuros!: number;
  valorMulta!: number;
  valorLiquido!: number;
  valorRecebido!: number;
  
  // Datas
  dataEmissao!: Date;
  dataVencimento!: Date;
  dataRecebimento?: Date | null;
  
  // Status e Controle
  status!: string; // PENDENTE, PARCIAL, RECEBIDO, VENCIDO, CANCELADO
  formaRecebimento?: string | null; // DINHEIRO, PIX, CARTAO_CREDITO, etc
  observacoes?: string | null;
  
  // Auditoria
  userCreatedId?: string | null;
  userUpdatedId?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  
  // Relacionamentos
  empresa?: Empresa;
  contaBancaria?: ContaBancaria;
  convenio?: Convenio;
  paciente?: Paciente;
  categoria?: CategoriaFinanceira;

  constructor(
    props: Omit<ContaReceber, 'id' | 'createdAt' | 'updatedAt' | 'empresa' | 'contaBancaria' | 'convenio' | 'paciente' | 'categoria'>,
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