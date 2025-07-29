import { randomUUID } from 'crypto';

export class EvolucaoPaciente {
  id!: string;
  pacienteId!: string;
  agendamentoId!: string;
  dataEvolucao!: Date;
  objetivoSessao!: string;
  descricaoEvolucao!: string;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(
    props: Omit<EvolucaoPaciente, 'id' | 'createdAt' | 'updatedAt'>,
    id?: string
  ) {
    Object.assign(this, props);
    this.id = id ?? randomUUID();
  }
} 