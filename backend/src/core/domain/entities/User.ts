import { randomUUID } from 'crypto';

export class User {
  id!: string;
  nome!: string;
  email!: string;
  senha!: string;
  whatsapp!: string;
  ativo!: boolean;
  primeiroLogin!: boolean;
  profissionalId?: string | null;
  pacienteId?: string | null;
  criadoEm!: Date;
  atualizadoEm!: Date;
  resetToken?: string | null;
  resetTokenExpires?: Date | null;
  emailConfirmationToken?: string | null;
  emailConfirmed?: boolean;

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