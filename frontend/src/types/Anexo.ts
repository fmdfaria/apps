export interface Anexo {
  id: string;
  entidadeId: string;
  bucket: string;
  nomeArquivo: string;
  descricao?: string | null;
  criadoPor?: string | null;
  url?: string | null;
  // Novos campos para S3
  s3Key?: string | null;
  tamanhoBytes?: number | null;
  mimeType?: string | null;
  hashArquivo?: string | null;
  storageProvider?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  // Campos opcionais que podem não existir no banco
  modulo?: string;
  categoria?: string;
} 