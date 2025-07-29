import { ContratoProfissional } from '../entities/ContratoProfissional';

export interface ICreateContratoProfissionalDTO {
  profissionalId: string;
  dataInicio: Date;
  dataFim?: Date | null;
  arquivoContrato?: string | null;
  observacao?: string | null;
}

export interface IUpdateContratoProfissionalDTO extends Partial<ICreateContratoProfissionalDTO> {}

export interface IContratosProfissionaisRepository {
  create(data: ICreateContratoProfissionalDTO): Promise<ContratoProfissional>;
  update(id: string, data: IUpdateContratoProfissionalDTO): Promise<ContratoProfissional>;
  findById(id: string): Promise<ContratoProfissional | null>;
  findAll(filters?: { profissionalId?: string }): Promise<ContratoProfissional[]>;
  delete(id: string): Promise<void>;
} 