import { randomUUID } from 'crypto';
import { ContratoProfissional } from './ContratoProfissional';

export class AdendoContrato {
  id!: string;
  contratoId!: string;
  dataAdendo!: Date;
  arquivoAdendo?: string | null;
  descricao?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  // Relacionamento
  contrato?: ContratoProfissional;

  constructor(
    props: Omit<AdendoContrato, 'id' | 'createdAt' | 'updatedAt' | 'contrato'>,
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