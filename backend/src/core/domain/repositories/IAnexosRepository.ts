import { Anexo } from '../entities/Anexo';

export interface ICreateAnexoDTO {
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
}

export interface IAnexosRepository {
  create(data: ICreateAnexoDTO): Promise<Anexo>;
  findById(id: string): Promise<Anexo | null>;
  findAll(filters?: { entidadeId?: string }): Promise<Anexo[]>;
  delete(id: string): Promise<void>;
  update(id: string, data: Partial<{ 
    descricao: string | null; 
    nomeArquivo: string; 
    url: string;
    s3Key: string | null;
    tamanhoBytes: number | null;
    mimeType: string | null;
    hashArquivo: string | null;
  }>): Promise<Anexo>;
} 