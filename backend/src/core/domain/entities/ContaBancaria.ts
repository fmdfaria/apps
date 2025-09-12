import { randomUUID } from 'crypto';
import { Empresa } from './Empresa';

export class ContaBancaria {
  id!: string;
  empresaId!: string;
  
  // Identificação da Conta
  nome!: string;
  banco!: string;
  agencia!: string;
  conta!: string;
  digito?: string | null;
  tipoConta!: string; // CORRENTE, POUPANCA, INVESTIMENTO
  
  // PIX
  pixPrincipal?: string | null;
  tipoPix?: string | null; // CPF, CNPJ, EMAIL, TELEFONE, ALEATORIA
  
  // Controles
  contaPrincipal!: boolean;
  ativo!: boolean;
  saldoInicial!: number;
  saldoAtual!: number;
  
  // Dados complementares
  observacoes?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  
  // Relacionamentos
  empresa?: Empresa;

  constructor(
    props: Omit<ContaBancaria, 'id' | 'createdAt' | 'updatedAt' | 'empresa'>,
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