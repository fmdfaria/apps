import { randomUUID } from 'crypto';
import { Profissional } from './Profissional';
import { Servico } from './Servico';

export class PrecosServicosProfissionais {
  id!: string;
  profissionalId!: string;
  servicoId!: string;
  precoProfissional?: number | null;
  precoClinica?: number | null;
  createdAt!: Date;
  updatedAt!: Date;

  // Relacionamentos
  profissional?: Profissional;
  servico?: Servico;

  constructor(
    props: Omit<
      PrecosServicosProfissionais,
      'id' | 'createdAt' | 'updatedAt' | 'profissional' | 'servico'
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