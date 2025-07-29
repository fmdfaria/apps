import { randomUUID } from 'crypto';

export class RefreshToken {
  id!: string;
  userId!: string;
  token!: string;
  expiresAt!: Date;
  criadoEm!: Date;
  ip?: string | null;
  userAgent?: string | null;

  constructor(
    props: Omit<RefreshToken, 'id' | 'criadoEm'>,
    id?: string
  ) {
    Object.assign(this, props);
    if (!id) {
      this.id = randomUUID();
    } else {
      this.id = id;
    }
    this.criadoEm = new Date();
  }
} 