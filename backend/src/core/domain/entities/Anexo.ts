import { randomUUID } from 'crypto';

export class Anexo {
  id!: string;
  entidadeId!: string;
  bucket!: string;
  nomeArquivo!: string;
  descricao?: string | null;
  criadoPor?: string | null;
  url?: string | null;
  // Novos campos para S3
  s3Key?: string | null;
  tamanhoBytes?: number | null;
  mimeType?: string | null;
  hashArquivo?: string | null;
  storageProvider?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(
    props: Omit<Anexo, 'id' | 'createdAt' | 'updatedAt'>,
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