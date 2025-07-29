import { Recurso } from '../entities/Recurso';

export interface ICreateRecursoDTO {
  nome: string;
  descricao?: string;
}

export interface IRecursosRepository {
  create(data: ICreateRecursoDTO): Promise<Recurso>;
  findByName(nome: string): Promise<Recurso | null>;
  findById(id: string): Promise<Recurso | null>;
  findAll(): Promise<Recurso[]>;
  save(recurso: Recurso): Promise<Recurso>;
  delete(id: string): Promise<void>;
} 