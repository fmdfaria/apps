import { FluxoCaixa } from '../../../../core/domain/entities/FluxoCaixa';
import { IFluxoCaixaRepository } from '../../../../core/domain/repositories/IFluxoCaixaRepository';
import { prisma } from '../../../../shared/database/prisma';

export class PrismaFluxoCaixaRepository implements IFluxoCaixaRepository {
  async create(movimento: FluxoCaixa): Promise<FluxoCaixa> {
    const created = await prisma.fluxoCaixa.create({
      data: {
        id: movimento.id,
        empresaId: movimento.empresaId,
        contaBancariaId: movimento.contaBancariaId,
        contaReceberId: movimento.contaReceberId,
        contaPagarId: movimento.contaPagarId,
        tipo: movimento.tipo,
        categoriaId: movimento.categoriaId,
        descricao: movimento.descricao,
        valor: movimento.valor,
        dataMovimento: movimento.dataMovimento,
        formaPagamento: movimento.formaPagamento,
        conciliado: movimento.conciliado,
        dataConciliacao: movimento.dataConciliacao,
        observacoes: movimento.observacoes,
        userCreatedId: movimento.userCreatedId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        empresa: true,
        contaBancaria: true,
        contaReceber: true,
        contaPagar: true,
        categoria: true
      }
    });

    return this.mapToDomain(created);
  }

  async findById(id: string): Promise<FluxoCaixa | null> {
    const movimento = await prisma.fluxoCaixa.findUnique({
      where: { id },
      include: {
        empresa: true,
        contaBancaria: true,
        contaReceber: true,
        contaPagar: true,
        categoria: true
      }
    });

    return movimento ? this.mapToDomain(movimento) : null;
  }

  async findAll(filters?: {
    empresaId?: string;
    contaBancariaId?: string;
    tipo?: string;
    categoriaId?: string;
    dataMovimentoInicio?: Date;
    dataMovimentoFim?: Date;
    conciliado?: boolean;
  }): Promise<FluxoCaixa[]> {
    const where: any = {};

    if (filters?.empresaId) where.empresaId = filters.empresaId;
    if (filters?.contaBancariaId) where.contaBancariaId = filters.contaBancariaId;
    if (filters?.tipo) where.tipo = filters.tipo;
    if (filters?.categoriaId) where.categoriaId = filters.categoriaId;
    if (filters?.conciliado !== undefined) where.conciliado = filters.conciliado;

    if (filters?.dataMovimentoInicio || filters?.dataMovimentoFim) {
      where.dataMovimento = {};
      if (filters.dataMovimentoInicio) {
        where.dataMovimento.gte = filters.dataMovimentoInicio;
      }
      if (filters.dataMovimentoFim) {
        where.dataMovimento.lte = filters.dataMovimentoFim;
      }
    }

    const movimentos = await prisma.fluxoCaixa.findMany({
      where,
      include: {
        empresa: true,
        contaBancaria: true,
        contaReceber: true,
        contaPagar: true,
        categoria: true
      },
      orderBy: [
        { dataMovimento: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return movimentos.map(this.mapToDomain);
  }

  async update(id: string, data: Partial<FluxoCaixa>): Promise<FluxoCaixa> {
    const updated = await prisma.fluxoCaixa.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        empresa: true,
        contaBancaria: true,
        contaReceber: true,
        contaPagar: true,
        categoria: true
      }
    });

    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await prisma.fluxoCaixa.delete({
      where: { id }
    });
  }

  async findByContaBancaria(contaBancariaId: string): Promise<FluxoCaixa[]> {
    const movimentos = await prisma.fluxoCaixa.findMany({
      where: { contaBancariaId },
      include: {
        empresa: true,
        contaBancaria: true,
        contaReceber: true,
        contaPagar: true,
        categoria: true
      },
      orderBy: { dataMovimento: 'desc' }
    });

    return movimentos.map(this.mapToDomain);
  }

  async findByPeriodo(dataInicio: Date, dataFim: Date): Promise<FluxoCaixa[]> {
    const movimentos = await prisma.fluxoCaixa.findMany({
      where: {
        dataMovimento: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      include: {
        empresa: true,
        contaBancaria: true,
        contaReceber: true,
        contaPagar: true,
        categoria: true
      },
      orderBy: { dataMovimento: 'desc' }
    });

    return movimentos.map(this.mapToDomain);
  }

  async calcularSaldoPorPeriodo(empresaId: string, dataInicio: Date, dataFim: Date): Promise<{
    totalEntradas: number;
    totalSaidas: number;
    saldoLiquido: number;
  }> {
    const entradas = await prisma.fluxoCaixa.aggregate({
      where: {
        empresaId,
        tipo: 'ENTRADA',
        dataMovimento: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      _sum: {
        valor: true
      }
    });

    const saidas = await prisma.fluxoCaixa.aggregate({
      where: {
        empresaId,
        tipo: 'SAIDA',
        dataMovimento: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      _sum: {
        valor: true
      }
    });

    const totalEntradas = Number(entradas._sum.valor || 0);
    const totalSaidas = Number(saidas._sum.valor || 0);
    const saldoLiquido = totalEntradas - totalSaidas;

    return {
      totalEntradas,
      totalSaidas,
      saldoLiquido
    };
  }

  async findNaoConciliados(): Promise<FluxoCaixa[]> {
    const movimentos = await prisma.fluxoCaixa.findMany({
      where: { conciliado: false },
      include: {
        empresa: true,
        contaBancaria: true,
        contaReceber: true,
        contaPagar: true,
        categoria: true
      },
      orderBy: { dataMovimento: 'desc' }
    });

    return movimentos.map(this.mapToDomain);
  }

  private mapToDomain(raw: any): FluxoCaixa {
    const movimento = new FluxoCaixa({
      empresaId: raw.empresaId,
      contaBancariaId: raw.contaBancariaId,
      contaReceberId: raw.contaReceberId,
      contaPagarId: raw.contaPagarId,
      tipo: raw.tipo,
      categoriaId: raw.categoriaId,
      descricao: raw.descricao,
      valor: Number(raw.valor),
      dataMovimento: raw.dataMovimento,
      formaPagamento: raw.formaPagamento,
      conciliado: raw.conciliado,
      dataConciliacao: raw.dataConciliacao,
      observacoes: raw.observacoes,
      userCreatedId: raw.userCreatedId
    }, raw.id);

    // Mapear relacionamentos
    if (raw.empresa) {
      movimento.empresa = raw.empresa;
    }
    if (raw.contaBancaria) {
      movimento.contaBancaria = raw.contaBancaria;
    }
    if (raw.contaReceber) {
      movimento.contaReceber = raw.contaReceber;
    }
    if (raw.contaPagar) {
      movimento.contaPagar = raw.contaPagar;
    }
    if (raw.categoria) {
      movimento.categoria = raw.categoria;
    }

    return movimento;
  }
}