import { inject, injectable } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { IAgendamentosContasRepository } from '@/core/domain/repositories/IAgendamentosContasRepository';
import { AgendamentoConta } from '@/core/domain/entities/AgendamentoConta';

@injectable()
export class PrismaAgendamentosContasRepository implements IAgendamentosContasRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(agendamentoConta: AgendamentoConta): Promise<AgendamentoConta> {
    const created = await this.prisma.agendamentoConta.create({
      data: {
        agendamentoId: agendamentoConta.agendamentoId,
        contaReceberId: agendamentoConta.contaReceberId,
        contaPagarId: agendamentoConta.contaPagarId
      },
      include: {
        agendamento: {
          include: {
            paciente: true,
            profissional: true,
            servico: true,
            convenio: true,
            recurso: true
          }
        },
        contaReceber: {
          include: {
            empresa: true,
            contaBancaria: true,
            convenio: true,
            paciente: true,
            categoria: true
          }
        },
        contaPagar: {
          include: {
            empresa: true,
            contaBancaria: true,
            profissional: true,
            categoria: true
          }
        }
      }
    });

    return new AgendamentoConta({
      agendamentoId: created.agendamentoId,
      contaReceberId: created.contaReceberId,
      contaPagarId: created.contaPagarId,
      agendamento: created.agendamento as any,
      contaReceber: created.contaReceber as any,
      contaPagar: created.contaPagar as any
    }, created.id);
  }

  async findById(id: string): Promise<AgendamentoConta | null> {
    const found = await this.prisma.agendamentoConta.findUnique({
      where: { id },
      include: {
        agendamento: {
          include: {
            paciente: true,
            profissional: true,
            servico: true,
            convenio: true,
            recurso: true
          }
        },
        contaReceber: {
          include: {
            empresa: true,
            contaBancaria: true,
            convenio: true,
            paciente: true,
            categoria: true
          }
        },
        contaPagar: {
          include: {
            empresa: true,
            contaBancaria: true,
            profissional: true,
            categoria: true
          }
        }
      }
    });

    if (!found) return null;

    return new AgendamentoConta({
      agendamentoId: found.agendamentoId,
      contaReceberId: found.contaReceberId,
      contaPagarId: found.contaPagarId,
      agendamento: found.agendamento as any,
      contaReceber: found.contaReceber as any,
      contaPagar: found.contaPagar as any
    }, found.id);
  }

  async findByAgendamentoId(agendamentoId: string): Promise<AgendamentoConta | null> {
    const found = await this.prisma.agendamentoConta.findFirst({
      where: { agendamentoId },
      include: {
        agendamento: {
          include: {
            paciente: true,
            profissional: true,
            servico: true,
            convenio: true,
            recurso: true
          }
        },
        contaReceber: {
          include: {
            empresa: true,
            contaBancaria: true,
            convenio: true,
            paciente: true,
            categoria: true
          }
        },
        contaPagar: {
          include: {
            empresa: true,
            contaBancaria: true,
            profissional: true,
            categoria: true
          }
        }
      }
    });

    if (!found) return null;

    return new AgendamentoConta({
      agendamentoId: found.agendamentoId,
      contaReceberId: found.contaReceberId,
      contaPagarId: found.contaPagarId,
      agendamento: found.agendamento as any,
      contaReceber: found.contaReceber as any,
      contaPagar: found.contaPagar as any
    }, found.id);
  }

  async findAll(filters?: {
    contaReceberId?: string;
    contaPagarId?: string;
  }): Promise<AgendamentoConta[]> {
    const where: any = {};
    
    if (filters?.contaReceberId) {
      where.contaReceberId = filters.contaReceberId;
    }
    
    if (filters?.contaPagarId) {
      where.contaPagarId = filters.contaPagarId;
    }

    const found = await this.prisma.agendamentoConta.findMany({
      where,
      include: {
        agendamento: {
          include: {
            paciente: true,
            profissional: true,
            servico: true,
            convenio: true,
            recurso: true
          }
        },
        contaReceber: {
          include: {
            empresa: true,
            contaBancaria: true,
            convenio: true,
            paciente: true,
            categoria: true
          }
        },
        contaPagar: {
          include: {
            empresa: true,
            contaBancaria: true,
            profissional: true,
            categoria: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return found.map(item => new AgendamentoConta({
      agendamentoId: item.agendamentoId,
      contaReceberId: item.contaReceberId,
      contaPagarId: item.contaPagarId,
      agendamento: item.agendamento as any,
      contaReceber: item.contaReceber as any,
      contaPagar: item.contaPagar as any
    }, item.id));
  }

  async update(id: string, agendamentoConta: Partial<AgendamentoConta>): Promise<AgendamentoConta> {
    const updated = await this.prisma.agendamentoConta.update({
      where: { id },
      data: {
        contaReceberId: agendamentoConta.contaReceberId,
        contaPagarId: agendamentoConta.contaPagarId
      },
      include: {
        agendamento: {
          include: {
            paciente: true,
            profissional: true,
            servico: true,
            convenio: true,
            recurso: true
          }
        },
        contaReceber: {
          include: {
            empresa: true,
            contaBancaria: true,
            convenio: true,
            paciente: true,
            categoria: true
          }
        },
        contaPagar: {
          include: {
            empresa: true,
            contaBancaria: true,
            profissional: true,
            categoria: true
          }
        }
      }
    });

    return new AgendamentoConta({
      agendamentoId: updated.agendamentoId,
      contaReceberId: updated.contaReceberId,
      contaPagarId: updated.contaPagarId,
      agendamento: updated.agendamento as any,
      contaReceber: updated.contaReceber as any,
      contaPagar: updated.contaPagar as any
    }, updated.id);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.agendamentoConta.delete({
      where: { id }
    });
  }

  async findByContaReceber(contaReceberId: string): Promise<AgendamentoConta[]> {
    const found = await this.prisma.agendamentoConta.findMany({
      where: { contaReceberId },
      include: {
        agendamento: {
          include: {
            paciente: true,
            profissional: true,
            servico: true,
            convenio: true,
            recurso: true
          }
        },
        contaReceber: {
          include: {
            empresa: true,
            contaBancaria: true,
            convenio: true,
            paciente: true,
            categoria: true
          }
        },
        contaPagar: {
          include: {
            empresa: true,
            contaBancaria: true,
            profissional: true,
            categoria: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return found.map(item => new AgendamentoConta({
      agendamentoId: item.agendamentoId,
      contaReceberId: item.contaReceberId,
      contaPagarId: item.contaPagarId,
      agendamento: item.agendamento as any,
      contaReceber: item.contaReceber as any,
      contaPagar: item.contaPagar as any
    }, item.id));
  }

  async findByContaPagar(contaPagarId: string): Promise<AgendamentoConta[]> {
    const found = await this.prisma.agendamentoConta.findMany({
      where: { contaPagarId },
      include: {
        agendamento: {
          include: {
            paciente: true,
            profissional: true,
            servico: true,
            convenio: true,
            recurso: true
          }
        },
        contaReceber: {
          include: {
            empresa: true,
            contaBancaria: true,
            convenio: true,
            paciente: true,
            categoria: true
          }
        },
        contaPagar: {
          include: {
            empresa: true,
            contaBancaria: true,
            profissional: true,
            categoria: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return found.map(item => new AgendamentoConta({
      agendamentoId: item.agendamentoId,
      contaReceberId: item.contaReceberId,
      contaPagarId: item.contaPagarId,
      agendamento: item.agendamento as any,
      contaReceber: item.contaReceber as any,
      contaPagar: item.contaPagar as any
    }, item.id));
  }

  async deleteByAgendamentoId(agendamentoId: string): Promise<void> {
    await this.prisma.agendamentoConta.deleteMany({
      where: { agendamentoId }
    });
  }

  async findAllByAgendamentoId(agendamentoId: string): Promise<AgendamentoConta[]> {
    const found = await this.prisma.agendamentoConta.findMany({
      where: { agendamentoId },
      include: {
        agendamento: {
          include: {
            paciente: true,
            profissional: true,
            servico: true,
            convenio: true,
            recurso: true
          }
        },
        contaReceber: {
          include: {
            empresa: true,
            contaBancaria: true,
            convenio: true,
            paciente: true,
            categoria: true
          }
        },
        contaPagar: {
          include: {
            empresa: true,
            contaBancaria: true,
            profissional: true,
            categoria: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return found.map(item => new AgendamentoConta({
      agendamentoId: item.agendamentoId,
      contaReceberId: item.contaReceberId,
      contaPagarId: item.contaPagarId,
      agendamento: item.agendamento as any,
      contaReceber: item.contaReceber as any,
      contaPagar: item.contaPagar as any
    }, item.id));
  }

  async findByAgendamentoAndTipo(agendamentoId: string, tipo: 'receber' | 'pagar'): Promise<AgendamentoConta | null> {
    const where = tipo === 'receber'
      ? { agendamentoId, contaReceberId: { not: null } }
      : { agendamentoId, contaPagarId: { not: null } };

    const found = await this.prisma.agendamentoConta.findFirst({
      where,
      include: {
        agendamento: {
          include: {
            paciente: true,
            profissional: true,
            servico: true,
            convenio: true,
            recurso: true
          }
        },
        contaReceber: {
          include: {
            empresa: true,
            contaBancaria: true,
            convenio: true,
            paciente: true,
            categoria: true
          }
        },
        contaPagar: {
          include: {
            empresa: true,
            contaBancaria: true,
            profissional: true,
            categoria: true
          }
        }
      }
    });

    if (!found) return null;

    return new AgendamentoConta({
      agendamentoId: found.agendamentoId,
      contaReceberId: found.contaReceberId,
      contaPagarId: found.contaPagarId,
      agendamento: found.agendamento as any,
      contaReceber: found.contaReceber as any,
      contaPagar: found.contaPagar as any
    }, found.id);
  }
}