import { randomUUID } from 'crypto';
import { Profissional } from './Profissional';

export class DisponibilidadeProfissional {
  id!: string;
  profissionalId!: string;
  diaSemana?: number | null;
  dataEspecifica?: Date | null;
  horaInicio!: Date;
  horaFim!: Date;
  observacao?: string | null;
  tipo!: string;
  createdAt!: Date;
  updatedAt!: Date;

  // Relacionamento
  profissional?: Profissional;

  constructor(
    props: Omit<DisponibilidadeProfissional, 'id' | 'createdAt' | 'updatedAt' | 'profissional'>,
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