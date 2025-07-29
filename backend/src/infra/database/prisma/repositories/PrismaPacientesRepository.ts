import { PrismaClient } from '@prisma/client';
import { Paciente } from '../../../../core/domain/entities/Paciente';
import {
  ICreatePacienteDTO,
  IPacientesRepository,
} from '../../../../core/domain/repositories/IPacientesRepository';
import { inject, injectable } from 'tsyringe';

const pacienteInclude = {
  convenio: true,
};

// O tipo Paciente do Prisma inclui relacionamentos que não temos na nossa entidade de domínio.
// Usamos o Omit para criar um tipo que corresponde à nossa entidade de domínio para a função `save`.
type PacienteParaSalvar = Omit<
  Paciente,
  'convenio' | 'precosParticulares' | 'agendamentos' | 'atendimentosServico' | 'evolucoes'
>;

@injectable()
export class PrismaPacientesRepository implements IPacientesRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(data: ICreatePacienteDTO): Promise<Paciente> {
    const paciente = await this.prisma.paciente.create({
      data,
      include: pacienteInclude,
    });
    return paciente as Paciente;
  }
  async findByCpf(cpf: string): Promise<Paciente | null> {
    const paciente = await this.prisma.paciente.findUnique({
      where: { cpf },
      include: pacienteInclude,
    });
    return paciente as Paciente | null;
  }
  async findByEmail(email: string): Promise<Paciente | null> {
    const paciente = await this.prisma.paciente.findUnique({
      where: { email },
      include: pacienteInclude,
    });
    return paciente as Paciente | null;
  }

  async findById(id: string): Promise<Paciente | null> {
    const paciente = await this.prisma.paciente.findUnique({
      where: { id },
      include: pacienteInclude,
    });
    return paciente as Paciente | null;
  }

  async findAll(): Promise<Paciente[]> {
    const pacientes = await this.prisma.paciente.findMany({
      orderBy: { nomeCompleto: 'asc' },
      include: pacienteInclude,
    });
    return pacientes as Paciente[];
  }

  async save(data: PacienteParaSalvar): Promise<Paciente> {
    const paciente = await this.prisma.paciente.update({
      where: { id: data.id },
      data: data,
      include: pacienteInclude,
    });
    return paciente as Paciente;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.paciente.delete({ where: { id } });
  }
} 