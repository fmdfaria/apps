export interface Anexo {
  id: string;
  entidadeId: string;
  bucket: string;
  nomeArquivo: string;
  descricao?: string | null;
  criadoPor?: string | null;
  url?: string | null;
} 