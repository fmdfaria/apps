import { randomUUID } from 'crypto';
import { Convenio } from './Convenio';

export class Servico {
  id!: string;
  nome!: string;
  descricao?: string | null;
  duracaoMinutos!: number;
  preco!: number;
  percentualClinica?: number | null;
  percentualProfissional?: number | null;
  procedimentoPrimeiroAtendimento?: string | null;
  procedimentoDemaisAtendimentos?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  convenios?: Convenio[];

  constructor(
    props: Omit<Servico, 'id' | 'createdAt' | 'updatedAt' | 'convenios'>,
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