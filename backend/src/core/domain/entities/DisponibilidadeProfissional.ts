import { randomUUID } from 'crypto';
import { Profissional } from './Profissional';
import { Recurso } from './Recurso';

export class DisponibilidadeProfissional {
  id!: string;
  profissionalId!: string;
  recursoId?: string | null;
  diaSemana?: number | null;
  dataEspecifica?: Date | null;
  horaInicio!: Date;
  horaFim!: Date;
  observacao?: string | null;
  tipo!: string;
  createdAt!: Date;
  updatedAt!: Date;

  // Relacionamentos
  profissional?: Profissional;
  recurso?: Recurso | null;

  constructor(
    props: Omit<DisponibilidadeProfissional, 'id' | 'createdAt' | 'updatedAt' | 'profissional' | 'recurso'>,
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