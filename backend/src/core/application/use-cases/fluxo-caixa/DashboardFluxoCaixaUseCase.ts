import { injectable, inject } from 'tsyringe';
import { IFluxoCaixaRepository } from '../../../domain/repositories/IFluxoCaixaRepository';

interface DashboardFluxoCaixaResponse {
  saldoAtual: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoLiquido: number;
  movimentacoesNaoConciliadas: number;
  resumoPorCategoria: Array<{
    categoriaId: string;
    categoria: string;
    tipo: string;
    total: number;
  }>;
}

@injectable()
export class DashboardFluxoCaixaUseCase {
  constructor(
    @inject('FluxoCaixaRepository')
    private fluxoCaixaRepository: IFluxoCaixaRepository
  ) {}

  async execute(
    empresaId: string,
    dataInicio: Date,
    dataFim: Date
  ): Promise<DashboardFluxoCaixaResponse> {
    // Calcular saldo do período
    const saldoPeriodo = await this.fluxoCaixaRepository.calcularSaldoPorPeriodo(
      empresaId,
      dataInicio,
      dataFim
    );

    // Buscar movimentações não conciliadas
    const movimentacoesNaoConciliadas = await this.fluxoCaixaRepository.findNaoConciliados();
    const naoConciliadasEmpresa = movimentacoesNaoConciliadas.filter(m => m.empresaId === empresaId);

    // Buscar todas as movimentações do período para análise por categoria
    const movimentacoes = await this.fluxoCaixaRepository.findAll({
      empresaId,
      dataMovimentoInicio: dataInicio,
      dataMovimentoFim: dataFim
    });

    // Resumo por categoria (simulado - idealmente seria feito no repositório)
    const resumoPorCategoria: Array<{
      categoriaId: string;
      categoria: string;
      tipo: string;
      total: number;
    }> = [];

    const categorias = new Map<string, { tipo: string; total: number; nome: string }>();
    
    movimentacoes.forEach(movimento => {
      const key = movimento.categoriaId;
      const existing = categorias.get(key);
      
      if (existing) {
        existing.total += movimento.valor;
      } else {
        categorias.set(key, {
          tipo: movimento.tipo,
          total: movimento.valor,
          nome: movimento.categoria?.nome || 'Categoria não encontrada'
        });
      }
    });

    categorias.forEach((value, key) => {
      resumoPorCategoria.push({
        categoriaId: key,
        categoria: value.nome,
        tipo: value.tipo,
        total: value.total
      });
    });

    return {
      saldoAtual: saldoPeriodo.saldoLiquido,
      totalEntradas: saldoPeriodo.totalEntradas,
      totalSaidas: saldoPeriodo.totalSaidas,
      saldoLiquido: saldoPeriodo.saldoLiquido,
      movimentacoesNaoConciliadas: naoConciliadasEmpresa.length,
      resumoPorCategoria
    };
  }
}