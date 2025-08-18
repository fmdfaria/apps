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
  valorClinica?: number | null;
  valorProfissional?: number | null;
  procedimentoPrimeiroAtendimento?: string | null;
  procedimentoDemaisAtendimentos?: string | null;
  convenioId?: string | null;
  ativo?: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  convenio?: Convenio | null;

  constructor(
    props: Omit<Servico, 'id' | 'createdAt' | 'updatedAt' | 'convenio'>,
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