import { randomUUID } from 'crypto';
import { Agendamento } from './Agendamento';
import { ContaReceber } from './ContaReceber';
import { ContaPagar } from './ContaPagar';

export class AgendamentoConta {
  id!: string;
  agendamentoId!: string;
  contaReceberId?: string | null;
  contaPagarId?: string | null;
  
  createdAt!: Date;
  updatedAt!: Date;
  
  // Relacionamentos
  agendamento?: Agendamento;
  contaReceber?: ContaReceber;
  contaPagar?: ContaPagar;

  constructor(
    props: Omit<AgendamentoConta, 'id' | 'createdAt' | 'updatedAt'> & {
      agendamento?: Agendamento;
      contaReceber?: ContaReceber;
      contaPagar?: ContaPagar;
    },
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