import { FluxoCaixa } from '../entities/FluxoCaixa';

export interface IFluxoCaixaRepository {
  create(movimento: FluxoCaixa): Promise<FluxoCaixa>;
  findById(id: string): Promise<FluxoCaixa | null>;
  findAll(filters?: {
    empresaId?: string;
    contaBancariaId?: string;
    tipo?: string;
    categoriaId?: string;
    dataMovimentoInicio?: Date;
    dataMovimentoFim?: Date;
    conciliado?: boolean;
  }): Promise<FluxoCaixa[]>;
  update(id: string, movimento: Partial<FluxoCaixa>): Promise<FluxoCaixa>;
  delete(id: string): Promise<void>;
  findByContaBancaria(contaBancariaId: string): Promise<FluxoCaixa[]>;
  findByPeriodo(dataInicio: Date, dataFim: Date): Promise<FluxoCaixa[]>;
  calcularSaldoPorPeriodo(empresaId: string, dataInicio: Date, dataFim: Date): Promise<{
    totalEntradas: number;
    totalSaidas: number;
    saldoLiquido: number;
  }>;
  findNaoConciliados(): Promise<FluxoCaixa[]>;
}