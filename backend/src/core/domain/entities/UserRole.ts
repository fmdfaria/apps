import { randomUUID } from 'crypto';

export class UserRole {
  id!: string;
  userId!: string;
  roleId!: string;
  ativo!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(
    props: Omit<UserRole, 'id' | 'createdAt' | 'updatedAt'>,
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