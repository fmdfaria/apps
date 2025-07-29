import { randomUUID } from 'crypto';
import { Profissional } from './Profissional';

export class ContratoProfissional {
  id!: string;
  profissionalId!: string;
  dataInicio!: Date;
  dataFim?: Date | null;
  arquivoContrato?: string | null;
  observacao?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  // Relacionamento
  profissional?: Profissional;

  constructor(
    props: Omit<ContratoProfissional, 'id' | 'createdAt' | 'updatedAt' | 'profissional'>,
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