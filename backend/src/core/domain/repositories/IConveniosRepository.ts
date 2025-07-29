import { Convenio } from '../entities/Convenio';

export interface ICreateConvenioDTO {
  nome: string;
}

export interface IConveniosRepository {
  create(data: ICreateConvenioDTO): Promise<Convenio>;
  findByName(nome: string): Promise<Convenio | null>;
  findById(id: string): Promise<Convenio | null>;
  findAll(): Promise<Convenio[]>;
  save(convenio: Convenio): Promise<Convenio>;
  delete(id: string): Promise<void>;
} 