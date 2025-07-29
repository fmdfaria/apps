import { Especialidade } from '../entities/Especialidade';

export interface ICreateEspecialidadeDTO {
  nome: string;
}

export interface IEspecialidadesRepository {
  create(data: ICreateEspecialidadeDTO): Promise<Especialidade>;
  findByName(nome: string): Promise<Especialidade | null>;
  findById(id: string): Promise<Especialidade | null>;
  findAll(): Promise<Especialidade[]>;
  save(especialidade: Especialidade): Promise<Especialidade>;
  delete(id: string): Promise<void>;
} 