import { ContaPagar } from '../../../../core/domain/entities/ContaPagar';
import { IContasPagarRepository } from '../../../../core/domain/repositories/IContasPagarRepository';
import { prisma } from '../../../../shared/database/prisma';

export class PrismaContasPagarRepository implements IContasPagarRepository {
  async create(conta: ContaPagar): Promise<ContaPagar> {
    const created = await prisma.contaPagar.create({
      data: {
        id: conta.id,
        empresaId: conta.empresaId,
        contaBancariaId: conta.contaBancariaId,
        profissionalId: conta.profissionalId,
        categoriaId: conta.categoriaId,
        numeroDocumento: conta.numeroDocumento,
        descricao: conta.descricao,
        valorOriginal: conta.valorOriginal,
        valorDesconto: conta.valorDesconto,
        valorJuros: conta.valorJuros,
        valorMulta: conta.valorMulta,
        valorLiquido: conta.valorLiquido,
        valorPago: conta.valorPago,
        dataEmissao: conta.dataEmissao,
        dataVencimento: conta.dataVencimento,
        dataPagamento: conta.dataPagamento,
        status: conta.status,
        formaPagamento: conta.formaPagamento,
        tipoConta: conta.tipoConta,
        recorrente: conta.recorrente,
        periodicidade: conta.periodicidade,
        observacoes: conta.observacoes,
        userCreatedId: conta.userCreatedId,
        userUpdatedId: conta.userUpdatedId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        empresa: true,
        contaBancaria: true,
        profissional: true,
        categoria: true
      }
    });

    return this.mapToDomain(created);
  }

  async findById(id: string): Promise<ContaPagar | null> {
    const conta = await prisma.contaPagar.findUnique({
      where: { id },
      include: {
        empresa: true,
        contaBancaria: true,
        profissional: true,
        categoria: true
      }
    });

    return conta ? this.mapToDomain(conta) : null;
  }

  async findByIdWithRelations(id: string): Promise<ContaPagar | null> {
    const conta = await prisma.contaPagar.findUnique({
      where: { id },
      include: {
        empresa: true,
        contaBancaria: true,
        profissional: true,
        categoria: true,
        agendamentosConta: {
          include: {
            agendamento: {
              include: {
                paciente: true,
                profissional: true,
                servico: true,
                convenio: true
              }
            }
          }
        }
      }
    });

    return conta ? this.mapToDomain(conta) : null;
  }

  async findAll(filters?: {
    empresaId?: string;
    contaBancariaId?: string;
    profissionalId?: string;
    status?: string;
    tipoConta?: string;
    recorrente?: boolean;
    dataVencimentoInicio?: Date;
    dataVencimentoFim?: Date;
    vencidas?: boolean;
    recorrentes?: boolean;
    pendentes?: boolean;
  }): Promise<ContaPagar[]> {
    const where: any = {};

    if (filters?.empresaId) where.empresaId = filters.empresaId;
    if (filters?.contaBancariaId) where.contaBancariaId = filters.contaBancariaId;
    if (filters?.profissionalId) where.profissionalId = filters.profissionalId;
    if (filters?.status) where.status = filters.status;
    if (filters?.tipoConta) where.tipoConta = filters.tipoConta;
    if (filters?.recorrente !== undefined) where.recorrente = filters.recorrente;

    if (filters?.dataVencimentoInicio || filters?.dataVencimentoFim) {
      where.dataVencimento = {};
      if (filters.dataVencimentoInicio) {
        where.dataVencimento.gte = filters.dataVencimentoInicio;
      }
      if (filters.dataVencimentoFim) {
        where.dataVencimento.lte = filters.dataVencimentoFim;
      }
    }

    // Filtro para contas vencidas
    if (filters?.vencidas) {
      const hoje = new Date();
      where.dataVencimento = { lt: hoje };
      where.status = { in: ['PENDENTE', 'PARCIAL'] };
    }

    // Filtro para contas recorrentes
    if (filters?.recorrentes) {
      where.recorrente = true;
    }

    // Filtro para contas pendentes
    if (filters?.pendentes) {
      where.status = { in: ['PENDENTE', 'PARCIAL'] };
    }

    const contas = await prisma.contaPagar.findMany({
      where,
      include: {
        empresa: true,
        contaBancaria: true,
        profissional: true,
        categoria: true
      },
      orderBy: [
        { dataVencimento: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return contas.map(this.mapToDomain);
  }

  async update(id: string, data: Partial<ContaPagar>): Promise<ContaPagar> {
    const updated = await prisma.contaPagar.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        empresa: true,
        contaBancaria: true,
        profissional: true,
        categoria: true
      }
    });

    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. Buscar os IDs dos agendamentos vinculados à conta a pagar
      const agendamentosConta = await tx.agendamentoConta.findMany({
        where: { contaPagarId: id },
        select: { agendamentoId: true }
      });

      const agendamentoIds = agendamentosConta.map(ac => ac.agendamentoId);

      // 2. Atualizar os agendamentos vinculados:
      //    - Status: ARQUIVADO -> FINALIZADO
      //    - pagamento: false
      if (agendamentoIds.length > 0) {
        await tx.agendamento.updateMany({
          where: {
            id: { in: agendamentoIds },
            status: 'ARQUIVADO' // Apenas se estiver ARQUIVADO
          },
          data: {
            status: 'FINALIZADO',
            pagamento: false,
            updatedAt: new Date()
          }
        });
      }

      // 3. Remover relacionamentos em agendamentos_contas
      await tx.agendamentoConta.deleteMany({
        where: { contaPagarId: id }
      });

      // 4. Remover lançamentos de fluxo de caixa vinculados a esta conta a pagar
      await tx.fluxoCaixa.deleteMany({
        where: { contaPagarId: id }
      });

      // 5. Finalmente remover a conta a pagar
      await tx.contaPagar.delete({
        where: { id }
      });
    });
  }

  async findVencidas(): Promise<ContaPagar[]> {
    const hoje = new Date();
    
    const contas = await prisma.contaPagar.findMany({
      where: {
        dataVencimento: { lt: hoje },
        status: { in: ['PENDENTE', 'PARCIAL'] }
      },
      include: {
        empresa: true,
        contaBancaria: true,
        profissional: true,
        categoria: true
      },
      orderBy: { dataVencimento: 'asc' }
    });

    return contas.map(this.mapToDomain);
  }

  async findProximasVencimento(dias: number): Promise<ContaPagar[]> {
    const hoje = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + dias);

    const contas = await prisma.contaPagar.findMany({
      where: {
        dataVencimento: {
          gte: hoje,
          lte: dataLimite
        },
        status: { in: ['PENDENTE', 'PARCIAL'] }
      },
      include: {
        empresa: true,
        contaBancaria: true,
        profissional: true,
        categoria: true
      },
      orderBy: { dataVencimento: 'asc' }
    });

    return contas.map(this.mapToDomain);
  }

  async findByProfissionalId(profissionalId: string): Promise<ContaPagar[]> {
    const contas = await prisma.contaPagar.findMany({
      where: { profissionalId },
      include: {
        empresa: true,
        contaBancaria: true,
        profissional: true,
        categoria: true
      },
      orderBy: { dataVencimento: 'desc' }
    });

    return contas.map(this.mapToDomain);
  }

  async findRecorrentes(): Promise<ContaPagar[]> {
    const contas = await prisma.contaPagar.findMany({
      where: { recorrente: true },
      include: {
        empresa: true,
        contaBancaria: true,
        profissional: true,
        categoria: true
      },
      orderBy: { dataVencimento: 'desc' }
    });

    return contas.map(this.mapToDomain);
  }

  async registrarPagamento(
    id: string, 
    valorPago: number, 
    dataPagamento: Date, 
    formaPagamento: string,
    contaBancariaId?: string
  ): Promise<void> {
    const conta = await prisma.contaPagar.findUnique({
      where: { id }
    });

    if (!conta) {
      throw new Error('Conta a pagar não encontrada');
    }

    const novoValorPago = Number(conta.valorPago) + valorPago;
    const valorLiquido = Number(conta.valorLiquido);
    
    let novoStatus = 'PENDENTE';
    if (novoValorPago >= valorLiquido) {
      novoStatus = 'PAGO';
    } else if (novoValorPago > 0) {
      novoStatus = 'PARCIAL';
    }

    await prisma.contaPagar.update({
      where: { id },
      data: {
        valorPago: novoValorPago,
        dataPagamento: novoStatus === 'PAGO' ? dataPagamento : conta.dataPagamento || dataPagamento,
        formaPagamento,
        status: novoStatus,
        contaBancariaId: contaBancariaId || conta.contaBancariaId,
        updatedAt: new Date()
      }
    });
  }

  async cancelarConta(id: string, motivo?: string): Promise<void> {
    const conta = await prisma.contaPagar.findUnique({
      where: { id }
    });

    if (!conta) {
      throw new Error('Conta a pagar não encontrada');
    }

    if (conta.status === 'PAGO') {
      throw new Error('Não é possível cancelar uma conta já paga');
    }

    await prisma.contaPagar.update({
      where: { id },
      data: {
        status: 'CANCELADO',
        observacoes: motivo ? `${conta.observacoes || ''}\nCancelado: ${motivo}`.trim() : conta.observacoes,
        updatedAt: new Date()
      }
    });
  }

  async findPendentes(empresaId?: string): Promise<ContaPagar[]> {
    const contas = await prisma.contaPagar.findMany({
      where: {
        ...(empresaId && { empresaId }),
        status: { in: ['PENDENTE', 'PARCIAL'] }
      },
      include: {
        empresa: true,
        contaBancaria: true,
        profissional: true,
        categoria: true
      },
      orderBy: { dataVencimento: 'asc' }
    });

    return contas.map(this.mapToDomain);
  }

  async calcularTotalPagar(empresaId: string): Promise<number> {
    const resultado = await prisma.contaPagar.aggregate({
      where: {
        empresaId,
        status: { in: ['PENDENTE', 'PARCIAL'] }
      },
      _sum: {
        valorLiquido: true,
        valorPago: true
      }
    });

    const totalLiquido = Number(resultado._sum.valorLiquido || 0);
    const totalPago = Number(resultado._sum.valorPago || 0);
    
    return totalLiquido - totalPago;
  }

  private mapToDomain(raw: any): ContaPagar {
    const conta = new ContaPagar({
      empresaId: raw.empresaId,
      contaBancariaId: raw.contaBancariaId,
      profissionalId: raw.profissionalId,
      categoriaId: raw.categoriaId,
      numeroDocumento: raw.numeroDocumento,
      descricao: raw.descricao,
      valorOriginal: Number(raw.valorOriginal),
      valorDesconto: Number(raw.valorDesconto),
      valorJuros: Number(raw.valorJuros),
      valorMulta: Number(raw.valorMulta),
      valorLiquido: Number(raw.valorLiquido),
      valorPago: Number(raw.valorPago),
      dataEmissao: raw.dataEmissao,
      dataVencimento: raw.dataVencimento,
      dataPagamento: raw.dataPagamento,
      status: raw.status,
      formaPagamento: raw.formaPagamento,
      tipoConta: raw.tipoConta,
      recorrente: raw.recorrente,
      periodicidade: raw.periodicidade,
      observacoes: raw.observacoes,
      userCreatedId: raw.userCreatedId,
      userUpdatedId: raw.userUpdatedId
    }, raw.id);

    // Mapear relacionamentos
    if (raw.empresa) {
      conta.empresa = raw.empresa;
    }
    if (raw.contaBancaria) {
      conta.contaBancaria = raw.contaBancaria;
    }
    if (raw.profissional) {
      conta.profissional = raw.profissional;
    }
    if (raw.categoria) {
      conta.categoria = raw.categoria;
    }
    if (raw.agendamentosConta) {
      conta.agendamentosConta = raw.agendamentosConta;
    }

    return conta;
  }
}