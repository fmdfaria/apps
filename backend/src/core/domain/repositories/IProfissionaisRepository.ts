import { Profissional } from '../entities/Profissional';

export interface ICreateProfissionalDTO extends Omit<Profissional, 'id' | 'createdAt' | 'updatedAt' | 'conselho' | 'especialidades' | 'servicos'> {
  especialidadesIds: string[];
  servicosIds?: string[];
  tipo_pix?: string;
}

export interface IUpdateProfissionalDTO extends Partial<Omit<ICreateProfissionalDTO, 'cpf'>> {}

export interface IProfissionaisRepository {
  create(data: ICreateProfissionalDTO): Promise<Profissional>;
  update(id: string, data: IUpdateProfissionalDTO): Promise<Profissional>;
  findById(id: string): Promise<Profissional | null>;
  findByCpf(cpf: string): Promise<Profissional | null>;
  findByEmail(email: string): Promise<Profissional | null>;
  findAll(): Promise<Profissional[]>;
  delete(id: string): Promise<void>;
} 