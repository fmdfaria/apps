import { ConselhoProfissional } from '../entities/ConselhoProfissional';

export interface ICreateConselhoProfissionalDTO {
  sigla: string;
  nome: string;
}

export interface IConselhosProfissionaisRepository {
  create(data: ICreateConselhoProfissionalDTO): Promise<ConselhoProfissional>;
  findBySigla(sigla: string): Promise<ConselhoProfissional | null>;
  findById(id: string): Promise<ConselhoProfissional | null>;
  findAll(): Promise<ConselhoProfissional[]>;
  save(conselho: ConselhoProfissional): Promise<ConselhoProfissional>;
  delete(id: string): Promise<void>;
} 