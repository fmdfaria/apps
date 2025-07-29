import { randomUUID } from 'crypto';

export class ConselhoProfissional {
  id!: string;
  sigla!: string;
  nome!: string;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(
    props: Omit<ConselhoProfissional, 'id' | 'createdAt' | 'updatedAt'>,
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