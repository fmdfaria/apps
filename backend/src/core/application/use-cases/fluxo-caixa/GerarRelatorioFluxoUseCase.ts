import { injectable, inject } from 'tsyringe';
import { IFluxoCaixaRepository } from '../../../domain/repositories/IFluxoCaixaRepository';
import { IContasReceberRepository } from '../../../domain/repositories/IContasReceberRepository';
import { IContasPagarRepository } from '../../../domain/repositories/IContasPagarRepository';

interface RelatorioFluxoRequest {
  empresaId: string;
  dataInicio: Date;
  dataFim: Date;
}

interface RelatorioFluxoResponse {
  periodo: {
    dataInicio: Date;
    dataFim: Date;
  };
  movimentacoes: {
    totalEntradas: number;
    totalSaidas: number;
    saldoLiquido: number;
  };
  contasReceber: {
    totalPendente: number;
    totalVencidas: number;
    totalRecebidas: number;
  };
  contasPagar: {
    totalPendente: number;
    totalVencidas: number;
    totalPagas: number;
  };
}

@injectable()
export class GerarRelatorioFluxoUseCase {
  constructor(
    @inject('FluxoCaixaRepository')
    private fluxoCaixaRepository: IFluxoCaixaRepository,
    @inject('ContasReceberRepository')
    private contasReceberRepository: IContasReceberRepository,
    @inject('ContasPagarRepository')
    private contasPagarRepository: IContasPagarRepository
  ) {}

  async execute(data: RelatorioFluxoRequest): Promise<RelatorioFluxoResponse> {
    // Calcular movimentações do período
    const saldoPeriodo = await this.fluxoCaixaRepository.calcularSaldoPorPeriodo(
      data.empresaId,
      data.dataInicio,
      data.dataFim
    );

    // Buscar contas a receber
    const contasReceber = await this.contasReceberRepository.findAll({
      empresaId: data.empresaId,
      dataVencimentoInicio: data.dataInicio,
      dataVencimentoFim: data.dataFim
    });

    // Buscar contas a pagar
    const contasPagar = await this.contasPagarRepository.findAll({
      empresaId: data.empresaId,
      dataVencimentoInicio: data.dataInicio,
      dataVencimentoFim: data.dataFim
    });

    // Calcular totais das contas a receber
    const hoje = new Date();
    const contasReceberPendentes = contasReceber.filter(c => c.status === 'PENDENTE' || c.status === 'PARCIAL');
    const contasReceberVencidas = contasReceberPendentes.filter(c => c.dataVencimento < hoje);
    const contasReceberRecebidas = contasReceber.filter(c => c.status === 'RECEBIDO');

    // Calcular totais das contas a pagar
    const contasPagarPendentes = contasPagar.filter(c => c.status === 'PENDENTE' || c.status === 'PARCIAL');
    const contasPagarVencidas = contasPagarPendentes.filter(c => c.dataVencimento < hoje);
    const contasPagarPagas = contasPagar.filter(c => c.status === 'PAGO');

    return {
      periodo: {
        dataInicio: data.dataInicio,
        dataFim: data.dataFim
      },
      movimentacoes: {
        totalEntradas: saldoPeriodo.totalEntradas,
        totalSaidas: saldoPeriodo.totalSaidas,
        saldoLiquido: saldoPeriodo.saldoLiquido
      },
      contasReceber: {
        totalPendente: contasReceberPendentes.reduce((sum, c) => sum + (c.valorLiquido - c.valorRecebido), 0),
        totalVencidas: contasReceberVencidas.reduce((sum, c) => sum + (c.valorLiquido - c.valorRecebido), 0),
        totalRecebidas: contasReceberRecebidas.reduce((sum, c) => sum + c.valorRecebido, 0)
      },
      contasPagar: {
        totalPendente: contasPagarPendentes.reduce((sum, c) => sum + (c.valorLiquido - c.valorPago), 0),
        totalVencidas: contasPagarVencidas.reduce((sum, c) => sum + (c.valorLiquido - c.valorPago), 0),
        totalPagas: contasPagarPagas.reduce((sum, c) => sum + c.valorPago, 0)
      }
    };
  }
}