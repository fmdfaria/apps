import { randomUUID } from 'crypto';

export class FilaEspera {
  id!: string;
  pacienteId!: string;
  servicoId!: string;
  profissionalId?: string | null;
  horarioPreferencia!: string;
  observacao?: string | null;
  status?: string | null;
  ativo?: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  
  // Campos relacionados
  pacienteNome?: string;
  servicoNome?: string;
  profissionalNome?: string;

  constructor(
    props: Omit<FilaEspera, 'id' | 'createdAt' | 'updatedAt'>,
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


