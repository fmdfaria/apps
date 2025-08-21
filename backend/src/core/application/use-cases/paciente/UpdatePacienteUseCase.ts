import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { Paciente } from '../../../domain/entities/Paciente';
import { IConveniosRepository } from '../../../domain/repositories/IConveniosRepository';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';

interface IRequest {
  id: string;
  nomeCompleto: string;
  whatsapp: string;
  tipoServico: string;
  nomeResponsavel?: string | null;
  email?: string | null;
  cpf?: string | null;
  dataNascimento?: Date | null;
  convenioId?: string | null;
  numeroCarteirinha?: string | null;
  userId?: string | null;
}

@injectable()
export class UpdatePacienteUseCase {
  constructor(
    @inject('PacientesRepository')
    private pacientesRepository: IPacientesRepository,
    @inject('ConveniosRepository')
    private conveniosRepository: IConveniosRepository
  ) {}

  async execute({ id, ...data }: IRequest): Promise<Paciente> {
    const paciente = await this.pacientesRepository.findById(id);

    if (!paciente) {
      throw new AppError('Paciente não encontrado.', 404);
    }

    if (data.nomeCompleto !== paciente.nomeCompleto) {
      const pacienteExists = await this.pacientesRepository.findByNomeCompleto(data.nomeCompleto);
      if (pacienteExists && pacienteExists.id !== paciente.id) {
        throw new AppError('Já existe um paciente com este nome.');
      }
    }

    if (data.convenioId) {
      const convenioExists = await this.conveniosRepository.findById(
        data.convenioId
      );
      if (!convenioExists) {
        throw new AppError('Convênio não encontrado.', 404);
      }
    }

    // Atualiza o paciente com os novos dados
    paciente.nomeCompleto = data.nomeCompleto;
    paciente.nomeResponsavel = data.nomeResponsavel;
    paciente.tipoServico = data.tipoServico;
    paciente.email = data.email;
    paciente.whatsapp = data.whatsapp;
    paciente.cpf = data.cpf;
    paciente.dataNascimento = data.dataNascimento;
    paciente.convenioId = data.convenioId;
    paciente.numeroCarteirinha = data.numeroCarteirinha;
    paciente.userId = data.userId;

    // Remove a propriedade do objeto aninhado para evitar o erro do Prisma
    delete (paciente as any).convenio;

    const updatedPaciente = await this.pacientesRepository.save(paciente);

    return updatedPaciente;
  }
} 