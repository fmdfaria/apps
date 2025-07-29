import { randomUUID } from 'crypto';

export type UserType = 'ADMIN' | 'RECEPCIONISTA' | 'PROFISSIONAL' | 'PACIENTE';

export class User {
  id!: string;
  nome!: string;
  email!: string;
  senha!: string;
  tipo!: UserType;
  ativo!: boolean;
  profissionalId?: string | null;
  pacienteId?: string | null;
  criadoEm!: Date;
  atualizadoEm!: Date;

  constructor(
    props: Omit<User, 'id' | 'criadoEm' | 'atualizadoEm'>,
    id?: string
  ) {
    Object.assign(this, props);
    this.ativo = props.ativo ?? true;
    if (!id) {
      this.id = randomUUID();
    } else {
      this.id = id;
    }
    this.criadoEm = new Date();
    this.atualizadoEm = new Date();
  }
} 