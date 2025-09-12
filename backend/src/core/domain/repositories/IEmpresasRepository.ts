import { Empresa } from '../entities/Empresa';

export interface IEmpresasRepository {
  create(empresa: Empresa): Promise<Empresa>;
  findById(id: string): Promise<Empresa | null>;
  findByCnpj(cnpj: string): Promise<Empresa | null>;
  findAll(filters?: {
    ativo?: boolean;
    empresaPrincipal?: boolean;
  }): Promise<Empresa[]>;
  update(id: string, empresa: Partial<Empresa>): Promise<Empresa>;
  delete(id: string): Promise<void>;
  findEmpresaPrincipal(): Promise<Empresa | null>;
}