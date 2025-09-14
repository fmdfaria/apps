import { ContaReceber } from '../entities/ContaReceber';

export interface IContasReceberRepository {
  create(conta: ContaReceber): Promise<ContaReceber>;
  findById(id: string): Promise<ContaReceber | null>;
  findAll(filters?: {
    empresaId?: string;
    contaBancariaId?: string;
    pacienteId?: string;
    convenioId?: string;
    status?: string;
    dataVencimentoInicio?: Date;
    dataVencimentoFim?: Date;
  }): Promise<ContaReceber[]>;
  update(id: string, conta: Partial<ContaReceber>): Promise<ContaReceber>;
  delete(id: string): Promise<void>;
  findVencidas(): Promise<ContaReceber[]>;
  findProximasVencimento(dias: number): Promise<ContaReceber[]>;
  findByPacienteId(pacienteId: string): Promise<ContaReceber[]>;
  findByConvenioId(convenioId: string): Promise<ContaReceber[]>;
  findPendentes(empresaId?: string): Promise<ContaReceber[]>;
  registrarRecebimento(id: string, valorRecebido: number, dataRecebimento: Date, formaRecebimento: string, contaBancariaId?: string): Promise<void>;
  cancelarConta(id: string, motivo?: string): Promise<void>;
  calcularTotalReceber(empresaId: string): Promise<number>;
}