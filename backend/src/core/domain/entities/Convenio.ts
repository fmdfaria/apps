import { randomUUID } from 'crypto';

export class Convenio {
  id!: string;
  nome!: string;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(
    props: Omit<Convenio, 'id' | 'createdAt' | 'updatedAt'>,
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