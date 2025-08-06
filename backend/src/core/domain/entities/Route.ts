import { randomUUID } from 'crypto';

export class Route {
  id!: string;
  path!: string;
  method!: string;
  nome!: string;
  descricao?: string | null;
  modulo?: string | null;
  ativo!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(
    props: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>,
    id?: string
  ) {
    Object.assign(this, props);
    this.ativo = props.ativo ?? true;
    if (!id) {
      this.id = randomUUID();
    } else {
      this.id = id;
    }
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}