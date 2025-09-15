import { ContaPagar } from '../entities/ContaPagar';

export interface IContasPagarRepository {
  create(conta: ContaPagar): Promise<ContaPagar>;
  findById(id: string): Promise<ContaPagar | null>;
  findAll(filters?: {
    empresaId?: string;
    contaBancariaId?: string;
    profissionalId?: string;
    status?: string;
    tipoConta?: string;
    recorrente?: boolean;
    dataVencimentoInicio?: Date;
    dataVencimentoFim?: Date;
  }): Promise<ContaPagar[]>;
  update(id: string, conta: Partial<ContaPagar>): Promise<ContaPagar>;
  delete(id: string): Promise<void>;
  findVencidas(): Promise<ContaPagar[]>;
  findProximasVencimento(dias: number): Promise<ContaPagar[]>;
  findByProfissionalId(profissionalId: string): Promise<ContaPagar[]>;
  findRecorrentes(): Promise<ContaPagar[]>;
  findPendentes(empresaId?: string): Promise<ContaPagar[]>;
  calcularTotalPagar(empresaId: string): Promise<number>;
}