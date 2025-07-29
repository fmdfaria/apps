import { PrecosServicosProfissionais } from '../entities/PrecosServicosProfissionais';

export interface ICreatePrecoServicoProfissionalDTO {
  profissionalId: string;
  servicoId: string;
  precoProfissional?: number | null;
  precoClinica?: number | null;
}

export interface IUpdatePrecoServicoProfissionalDTO
  extends Partial<ICreatePrecoServicoProfissionalDTO> {}

export interface IPrecosServicosProfissionaisRepository {
  create(
    data: ICreatePrecoServicoProfissionalDTO
  ): Promise<PrecosServicosProfissionais>;
  update(
    id: string,
    data: IUpdatePrecoServicoProfissionalDTO
  ): Promise<PrecosServicosProfissionais>;
  findById(id: string): Promise<PrecosServicosProfissionais | null>;
  findByProfissionalAndServico(
    profissionalId: string,
    servicoId: string
  ): Promise<PrecosServicosProfissionais | null>;
  findAll(filters: {
    profissionalId?: string;
    servicoId?: string;
  }): Promise<PrecosServicosProfissionais[]>;
  delete(id: string): Promise<void>;
} 