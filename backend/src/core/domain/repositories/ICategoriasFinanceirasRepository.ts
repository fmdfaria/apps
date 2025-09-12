import { CategoriaFinanceira } from '../entities/CategoriaFinanceira';

export interface ICategoriasFinanceirasRepository {
  create(categoria: CategoriaFinanceira): Promise<CategoriaFinanceira>;
  findById(id: string): Promise<CategoriaFinanceira | null>;
  findByNome(nome: string): Promise<CategoriaFinanceira | null>;
  findAll(filters?: {
    tipo?: string;
    ativo?: boolean;
  }): Promise<CategoriaFinanceira[]>;
  update(id: string, categoria: Partial<CategoriaFinanceira>): Promise<CategoriaFinanceira>;
  delete(id: string): Promise<void>;
  findByTipo(tipo: string): Promise<CategoriaFinanceira[]>;
}