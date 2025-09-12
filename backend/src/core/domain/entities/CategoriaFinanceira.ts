import { randomUUID } from 'crypto';

export class CategoriaFinanceira {
  id!: string;
  nome!: string;
  tipo!: string; // RECEITA, DESPESA
  descricao?: string | null;
  ativo!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(
    props: Omit<CategoriaFinanceira, 'id' | 'createdAt' | 'updatedAt'>,
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