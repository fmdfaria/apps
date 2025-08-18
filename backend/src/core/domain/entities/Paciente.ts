import { randomUUID } from 'crypto';
import { Convenio } from './Convenio';

export class Paciente {
  id!: string;
  nomeCompleto!: string;
  whatsapp!: string;
  tipoServico!: string;
  nomeResponsavel?: string | null;
  email?: string | null;
  cpf?: string | null;
  dataNascimento?: Date | null;
  convenioId?: string | null;
  convenio?: Convenio | null;
  numeroCarteirinha?: string | null;
  dataPedidoMedico?: Date | null;
  crm?: string | null;
  cbo?: string | null;
  cid?: string | null;
  userId?: string | null;
  ativo?: boolean;
  autoPedidos?: boolean | null;
  descricao?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(
    props: Omit<Paciente, 'id' | 'createdAt' | 'updatedAt' | 'convenio'>,
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