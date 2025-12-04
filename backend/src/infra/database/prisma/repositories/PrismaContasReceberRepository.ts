import { ContaReceber } from '../../../../core/domain/entities/ContaReceber';
import { IContasReceberRepository } from '../../../../core/domain/repositories/IContasReceberRepository';
import { prisma } from '../../../../shared/database/prisma';

export class PrismaContasReceberRepository implements IContasReceberRepository {
  async create(conta: ContaReceber): Promise<ContaReceber> {
    const created = await prisma.contaReceber.create({
      data: {
        id: conta.id,
        empresaId: conta.empresaId,
        contaBancariaId: conta.contaBancariaId,
        convenioId: conta.convenioId,
        pacienteId: conta.pacienteId,
        categoriaId: conta.categoriaId,
        numeroDocumento: conta.numeroDocumento,
        descricao: conta.descricao,
        valorOriginal: conta.valorOriginal,
        valorDesconto: conta.valorDesconto,
        valorJuros: conta.valorJuros,
        valorMulta: conta.valorMulta,
        valorLiquido: conta.valorLiquido,
        valorRecebido: conta.valorRecebido,
        dataEmissao: conta.dataEmissao,
        dataVencimento: conta.dataVencimento,
        dataRecebimento: conta.dataRecebimento,
        status: conta.status,
        formaRecebimento: conta.formaRecebimento,
        observacoes: conta.observacoes,
        userCreatedId: conta.userCreatedId,
        userUpdatedId: conta.userUpdatedId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        empresa: true,
        contaBancaria: true,
        convenio: true,
        paciente: true,
        categoria: true
      }
    });

    return this.mapToDomain(created);
  }

  async findById(id: string): Promise<ContaReceber | null> {
    const conta = await prisma.contaReceber.findUnique({
      where: { id },
      include: {
        empresa: true,
        contaBancaria: true,
        convenio: true,
        paciente: true,
        categoria: true
      }
    });

    return conta ? this.mapToDomain(conta) : null;
  }

  async findAll(filters?: {
    empresaId?: string;
    contaBancariaId?: string;
    pacienteId?: string;
    convenioId?: string;
    status?: string;
    dataVencimentoInicio?: Date;
    dataVencimentoFim?: Date;
  }): Promise<ContaReceber[]> {
    const where: any = {};

    if (filters?.empresaId) where.empresaId = filters.empresaId;
    if (filters?.contaBancariaId) where.contaBancariaId = filters.contaBancariaId;
    if (filters?.pacienteId) where.pacienteId = filters.pacienteId;
    if (filters?.convenioId) where.convenioId = filters.convenioId;
    if (filters?.status) where.status = filters.status;

    if (filters?.dataVencimentoInicio || filters?.dataVencimentoFim) {
      where.dataVencimento = {};
      if (filters.dataVencimentoInicio) {
        where.dataVencimento.gte = filters.dataVencimentoInicio;
      }
      if (filters.dataVencimentoFim) {
        where.dataVencimento.lte = filters.dataVencimentoFim;
      }
    }

    const contas = await prisma.contaReceber.findMany({
      where,
      include: {
        empresa: true,
        contaBancaria: true,
        convenio: true,
        paciente: true,
        categoria: true
      },
      orderBy: [
        { dataVencimento: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return contas.map(this.mapToDomain);
  }

  async update(id: string, data: Partial<ContaReceber>): Promise<ContaReceber> {
    const updated = await prisma.contaReceber.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        empresa: true,
        contaBancaria: true,
        convenio: true,
        paciente: true,
        categoria: true
      }
    });

    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. Buscar os IDs dos agendamentos vinculados à conta a receber
      const agendamentosConta = await tx.agendamentoConta.findMany({
        where: { contaReceberId: id },
        select: { agendamentoId: true }
      });

      const agendamentoIds = agendamentosConta.map(ac => ac.agendamentoId);

      // 2. Atualizar os agendamentos vinculados: recebimento = false
      //    OBS: Não alterar o status, somente o campo recebimento
      if (agendamentoIds.length > 0) {
        await tx.agendamento.updateMany({
          where: {
            id: { in: agendamentoIds }
          },
          data: {
            recebimento: false,
            updatedAt: new Date()
          }
        });
      }

      // 3. Remover relacionamentos em agendamentos_contas
      await tx.agendamentoConta.deleteMany({
        where: { contaReceberId: id }
      });

      // 4. Remover lançamentos de fluxo de caixa vinculados a esta conta a receber
      await tx.fluxoCaixa.deleteMany({
        where: { contaReceberId: id }
      });

      // 5. Finalmente remover a conta a receber
      await tx.contaReceber.delete({
        where: { id }
      });
    });
  }

  async findVencidas(): Promise<ContaReceber[]> {
    const hoje = new Date();
    
    const contas = await prisma.contaReceber.findMany({
      where: {
        dataVencimento: { lt: hoje },
        status: { in: ['PENDENTE', 'PARCIAL'] }
      },
      include: {
        empresa: true,
        contaBancaria: true,
        convenio: true,
        paciente: true,
        categoria: true
      },
      orderBy: { dataVencimento: 'asc' }
    });

    return contas.map(this.mapToDomain);
  }

  async findProximasVencimento(dias: number): Promise<ContaReceber[]> {
    const hoje = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + dias);

    const contas = await prisma.contaReceber.findMany({
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
        convenio: true,
        paciente: true,
        categoria: true
      },
      orderBy: { dataVencimento: 'asc' }
    });

    return contas.map(this.mapToDomain);
  }

  async findByPacienteId(pacienteId: string): Promise<ContaReceber[]> {
    const contas = await prisma.contaReceber.findMany({
      where: { pacienteId },
      include: {
        empresa: true,
        contaBancaria: true,
        convenio: true,
        paciente: true,
        categoria: true
      },
      orderBy: { dataVencimento: 'desc' }
    });

    return contas.map(this.mapToDomain);
  }

  async findByConvenioId(convenioId: string): Promise<ContaReceber[]> {
    const contas = await prisma.contaReceber.findMany({
      where: { convenioId },
      include: {
        empresa: true,
        contaBancaria: true,
        convenio: true,
        paciente: true,
        categoria: true
      },
      orderBy: { dataVencimento: 'desc' }
    });

    return contas.map(this.mapToDomain);
  }

  async findPendentes(empresaId?: string): Promise<ContaReceber[]> {
    const contas = await prisma.contaReceber.findMany({
      where: {
        ...(empresaId && { empresaId }),
        status: { in: ['PENDENTE', 'PARCIAL'] }
      },
      include: {
        empresa: true,
        contaBancaria: true,
        convenio: true,
        paciente: true,
        categoria: true
      },
      orderBy: { dataVencimento: 'asc' }
    });

    return contas.map(this.mapToDomain);
  }

  async registrarRecebimento(
    id: string, 
    valorRecebido: number, 
    dataRecebimento: Date, 
    formaRecebimento: string,
    contaBancariaId?: string
  ): Promise<void> {
    const conta = await prisma.contaReceber.findUnique({
      where: { id }
    });

    if (!conta) {
      throw new Error('Conta a receber não encontrada');
    }

    const novoValorRecebido = Number(conta.valorRecebido) + valorRecebido;
    const valorLiquido = Number(conta.valorLiquido);
    
    let novoStatus = 'PENDENTE';
    if (novoValorRecebido >= valorLiquido) {
      novoStatus = 'RECEBIDO';
    } else if (novoValorRecebido > 0) {
      novoStatus = 'PARCIAL';
    }

    await prisma.contaReceber.update({
      where: { id },
      data: {
        valorRecebido: novoValorRecebido,
        dataRecebimento: novoStatus === 'RECEBIDO' ? dataRecebimento : conta.dataRecebimento || dataRecebimento,
        formaRecebimento,
        status: novoStatus,
        contaBancariaId: contaBancariaId || conta.contaBancariaId,
        updatedAt: new Date()
      }
    });
  }

  async cancelarConta(id: string, motivo?: string): Promise<void> {
    const conta = await prisma.contaReceber.findUnique({
      where: { id }
    });

    if (!conta) {
      throw new Error('Conta a receber não encontrada');
    }

    if (conta.status === 'RECEBIDO') {
      throw new Error('Não é possível cancelar uma conta já recebida');
    }

    await prisma.contaReceber.update({
      where: { id },
      data: {
        status: 'CANCELADO',
        observacoes: motivo ? `${conta.observacoes || ''}\nCancelado: ${motivo}`.trim() : conta.observacoes,
        updatedAt: new Date()
      }
    });
  }

  async calcularTotalReceber(empresaId: string): Promise<number> {
    const resultado = await prisma.contaReceber.aggregate({
      where: {
        empresaId,
        status: { in: ['PENDENTE', 'PARCIAL'] }
      },
      _sum: {
        valorLiquido: true,
        valorRecebido: true
      }
    });

    const totalLiquido = Number(resultado._sum.valorLiquido || 0);
    const totalRecebido = Number(resultado._sum.valorRecebido || 0);
    
    return totalLiquido - totalRecebido;
  }

  private mapToDomain(raw: any): ContaReceber {
    const conta = new ContaReceber({
      empresaId: raw.empresaId,
      contaBancariaId: raw.contaBancariaId,
      convenioId: raw.convenioId,
      pacienteId: raw.pacienteId,
      categoriaId: raw.categoriaId,
      numeroDocumento: raw.numeroDocumento,
      descricao: raw.descricao,
      valorOriginal: Number(raw.valorOriginal),
      valorDesconto: Number(raw.valorDesconto),
      valorJuros: Number(raw.valorJuros),
      valorMulta: Number(raw.valorMulta),
      valorLiquido: Number(raw.valorLiquido),
      valorRecebido: Number(raw.valorRecebido),
      dataEmissao: raw.dataEmissao,
      dataVencimento: raw.dataVencimento,
      dataRecebimento: raw.dataRecebimento,
      status: raw.status,
      formaRecebimento: raw.formaRecebimento,
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
    if (raw.convenio) {
      conta.convenio = raw.convenio;
    }
    if (raw.paciente) {
      conta.paciente = raw.paciente;
    }
    if (raw.categoria) {
      conta.categoria = raw.categoria;
    }

    return conta;
  }
}