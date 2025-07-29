import { AdendoContrato } from '../entities/AdendoContrato';

export interface ICreateAdendoContratoDTO {
  contratoId: string;
  dataAdendo: Date;
  arquivoAdendo?: string | null;
  descricao?: string | null;
}

export interface IUpdateAdendoContratoDTO extends Partial<ICreateAdendoContratoDTO> {}

export interface IAdendosContratosRepository {
  create(data: ICreateAdendoContratoDTO): Promise<AdendoContrato>;
  update(id: string, data: IUpdateAdendoContratoDTO): Promise<AdendoContrato>;
  findById(id: string): Promise<AdendoContrato | null>;
  findAll(filters?: { contratoId?: string }): Promise<AdendoContrato[]>;
  delete(id: string): Promise<void>;
} 