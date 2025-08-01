import { Banco } from '../entities/Banco';

export interface IBancosRepository {
  create(data: Omit<Banco, 'id'>): Promise<Banco>;
  findById(id: string): Promise<Banco | null>;
  findAll(): Promise<Banco[]>;
  update(id: string, data: Partial<Omit<Banco, 'id'>>): Promise<Banco>;
  delete(id: string): Promise<void>;
  findByCodigo(codigo: string): Promise<Banco | null>;
}