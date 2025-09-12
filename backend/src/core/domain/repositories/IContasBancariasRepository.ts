import { ContaBancaria } from '../entities/ContaBancaria';

export interface IContasBancariasRepository {
  create(conta: ContaBancaria): Promise<ContaBancaria>;
  findById(id: string): Promise<ContaBancaria | null>;
  findAll(filters?: {
    empresaId?: string;
    ativo?: boolean;
    contaPrincipal?: boolean;
  }): Promise<ContaBancaria[]>;
  update(id: string, conta: Partial<ContaBancaria>): Promise<ContaBancaria>;
  delete(id: string): Promise<void>;
  findByEmpresaId(empresaId: string): Promise<ContaBancaria[]>;
  findContaPrincipalByEmpresa(empresaId: string): Promise<ContaBancaria | null>;
  atualizarSaldo(id: string, novoSaldo: number): Promise<void>;
}