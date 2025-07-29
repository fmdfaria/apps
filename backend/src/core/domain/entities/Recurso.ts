import { randomUUID } from 'crypto';

export class Recurso {
  id!: string;
  nome!: string;
  descricao?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(
    props: Omit<Recurso, 'id' | 'createdAt' | 'updatedAt'>,
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