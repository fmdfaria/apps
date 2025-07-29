import { randomUUID } from 'crypto';

export class Especialidade {
  id!: string;
  nome!: string;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(
    props: Omit<Especialidade, 'id' | 'createdAt' | 'updatedAt'>,
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