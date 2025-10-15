import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { ISeriesRepository } from '../../../core/domain/repositories/ISeriesRepository';
import { Agendamento } from '../../../core/domain/entities/Agendamento';

@injectable()
export class PrismaSeriesRepository implements ISeriesRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async findAgendamentosBySerieId(serieId: string): Promise<Agendamento[]> {
    const agendamentos = await this.prisma.agendamento.findMany({
      where: {
        serieId: serieId
      },
      include: {
        paciente: true,
        profissional: true,
        servico: true,
        convenio: true,
        recurso: true
      },
      orderBy: {
        dataHoraInicio: 'asc'
      }
    });

    return agendamentos.map(this.toDomain);
  }

  async findSerieIdByAgendamentoId(agendamentoId: string): Promise<string | null> {
    const agendamento = await this.prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      select: { serieId: true }
    });

    return agendamento?.serieId || null;
  }

  async updateMultipleAgendamentos(
    agendamentoIds: string[], 
    updateData: Partial<Agendamento>
  ): Promise<void> {
    // Converter dados do domain para formato Prisma
    const prismaData = this.toPrismaUpdateData(updateData);

    await this.prisma.agendamento.updateMany({
      where: {
        id: { in: agendamentoIds }
      },
      data: prismaData
    });
  }

  async deleteMultipleAgendamentos(agendamentoIds: string[]): Promise<void> {
    try {
      await this.prisma.agendamento.deleteMany({
        where: {
          id: { in: agendamentoIds }
        }
      });
    } catch (error: any) {
      // Verificar se é erro de foreign key constraint relacionado a agendamentos_contas
      if (error.code === 'P2003' || error.message?.includes('agendamentos_contas') || error.message?.includes('Foreign key constraint')) {
        const { AppError } = await import('../../../shared/errors/AppError');
        throw new AppError(
          'Não é possível excluir um ou mais agendamentos desta série pois existem contas financeiras vinculadas. Remova primeiro as contas a receber ou a pagar associadas.',
          400
        );
      }
      // Relançar outros erros
      throw error;
    }
  }

  async findAgendamentosFromDate(
    serieId: string, 
    fromDate: Date, 
    includeFromDate: boolean = true
  ): Promise<Agendamento[]> {
    const operator = includeFromDate ? 'gte' : 'gt';
    
    const agendamentos = await this.prisma.agendamento.findMany({
      where: {
        serieId: serieId,
        instanciaData: {
          [operator]: fromDate
        }
      },
      include: {
        paciente: true,
        profissional: true,
        servico: true,
        convenio: true,
        recurso: true
      },
      orderBy: {
        dataHoraInicio: 'asc'
      }
    });

    return agendamentos.map(this.toDomain);
  }

  private toDomain(prismaAgendamento: any): Agendamento {
    return {
      id: prismaAgendamento.id,
      pacienteId: prismaAgendamento.pacienteId,
      profissionalId: prismaAgendamento.profissionalId,
      recursoId: prismaAgendamento.recursoId,
      convenioId: prismaAgendamento.convenioId,
      servicoId: prismaAgendamento.servicoId,
      dataHoraInicio: prismaAgendamento.dataHoraInicio,
      dataHoraFim: prismaAgendamento.dataHoraFim,
      status: prismaAgendamento.status,
      tipoAtendimento: prismaAgendamento.tipoAtendimento,
      codLiberacao: prismaAgendamento.codLiberacao,
      statusCodLiberacao: prismaAgendamento.statusCodLiberacao,
      dataCodLiberacao: prismaAgendamento.dataCodLiberacao,
      compareceu: prismaAgendamento.compareceu,
      assinaturaPaciente: prismaAgendamento.assinaturaPaciente,
      assinaturaProfissional: prismaAgendamento.assinaturaProfissional,
      dataAtendimento: prismaAgendamento.dataAtendimento,
      recebimento: prismaAgendamento.recebimento,
      pagamento: prismaAgendamento.pagamento,
      googleEventId: prismaAgendamento.googleEventId,
      urlMeet: prismaAgendamento.urlMeet,
      avaliadoPorId: prismaAgendamento.avaliadoPorId,
      motivoReprovacao: prismaAgendamento.motivoReprovacao,
      observacoes: prismaAgendamento.observacoes,
      resultadoConsulta: prismaAgendamento.resultadoConsulta,
      // Novos campos de série
      serieId: prismaAgendamento.serieId,
      serieMaster: prismaAgendamento.serieMaster,
      instanciaData: prismaAgendamento.instanciaData,
      createdAt: prismaAgendamento.createdAt,
      updatedAt: prismaAgendamento.updatedAt,
      // Relações
      paciente: prismaAgendamento.paciente,
      profissional: prismaAgendamento.profissional,
      servico: prismaAgendamento.servico,
      convenio: prismaAgendamento.convenio,
      recurso: prismaAgendamento.recurso
    } as Agendamento;
  }

  private toPrismaUpdateData(domainData: Partial<Agendamento>): any {
    const prismaData: any = {};

    // Mapear campos do domain para nomes do banco
    if (domainData.dataHoraInicio !== undefined) prismaData.dataHoraInicio = domainData.dataHoraInicio;
    if (domainData.dataHoraFim !== undefined) prismaData.dataHoraFim = domainData.dataHoraFim;
    if (domainData.status !== undefined) prismaData.status = domainData.status;
    if (domainData.tipoAtendimento !== undefined) prismaData.tipoAtendimento = domainData.tipoAtendimento;
    if (domainData.codLiberacao !== undefined) prismaData.codLiberacao = domainData.codLiberacao;
    if (domainData.statusCodLiberacao !== undefined) prismaData.statusCodLiberacao = domainData.statusCodLiberacao;
    if (domainData.dataCodLiberacao !== undefined) prismaData.dataCodLiberacao = domainData.dataCodLiberacao;
    if (domainData.compareceu !== undefined) prismaData.compareceu = domainData.compareceu;
    if (domainData.assinaturaPaciente !== undefined) prismaData.assinaturaPaciente = domainData.assinaturaPaciente;
    if (domainData.assinaturaProfissional !== undefined) prismaData.assinaturaProfissional = domainData.assinaturaProfissional;
    if (domainData.dataAtendimento !== undefined) prismaData.dataAtendimento = domainData.dataAtendimento;
    if (domainData.recebimento !== undefined) prismaData.recebimento = domainData.recebimento;
    if (domainData.pagamento !== undefined) prismaData.pagamento = domainData.pagamento;
    if (domainData.googleEventId !== undefined) prismaData.googleEventId = domainData.googleEventId;
    if (domainData.urlMeet !== undefined) prismaData.urlMeet = domainData.urlMeet;
    if (domainData.avaliadoPorId !== undefined) prismaData.avaliadoPorId = domainData.avaliadoPorId;
    if (domainData.motivoReprovacao !== undefined) prismaData.motivoReprovacao = domainData.motivoReprovacao;
    if (domainData.observacoes !== undefined) prismaData.observacoes = domainData.observacoes;
    if (domainData.resultadoConsulta !== undefined) prismaData.resultadoConsulta = domainData.resultadoConsulta;
    if (domainData.instanciaData !== undefined) prismaData.instanciaData = domainData.instanciaData;

    // Atualizar updatedAt
    prismaData.updatedAt = new Date();

    return prismaData;
  }
}