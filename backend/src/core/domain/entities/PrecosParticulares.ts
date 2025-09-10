import { randomUUID } from 'crypto';
import { Paciente } from './Paciente';
import { Servico } from './Servico';

export class PrecosParticulares {
  id!: string;
  pacienteId!: string;
  servicoId!: string;
  preco!: number;
  tipoPagamento?: string | null;
  pagamentoAntecipado?: boolean | null;
  diaPagamento?: number | null;
  notaFiscal?: boolean | null;
  createdAt!: Date;
  updatedAt!: Date;

  // Relacionamentos
  paciente?: Paciente;
  servico?: Servico;

  constructor(
    props: Omit<
      PrecosParticulares,
      'id' | 'createdAt' | 'updatedAt' | 'paciente' | 'servico'
    >,
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