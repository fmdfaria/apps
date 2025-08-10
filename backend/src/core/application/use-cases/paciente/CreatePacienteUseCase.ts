import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { Paciente } from '../../../domain/entities/Paciente';
import { IConveniosRepository } from '../../../domain/repositories/IConveniosRepository';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';

interface IRequest {
  nomeCompleto: string;
  nomeResponsavel?: string | null;
  tipoServico: string;
  email?: string | null;
  whatsapp?: string | null;
  cpf?: string | null;
  dataNascimento?: Date | null;
  convenioId?: string | null;
  numeroCarteirinha?: string | null;
  dataPedidoMedico?: Date | null;
  crm?: string | null;
  cbo?: string | null;
  cid?: string | null;
  pedidoMedicoArquivo?: string | null;
  userId?: string | null;
}

@injectable()
export class CreatePacienteUseCase {
  constructor(
    @inject('PacientesRepository')
    private pacientesRepository: IPacientesRepository,
    @inject('ConveniosRepository')
    private conveniosRepository: IConveniosRepository
  ) {}

  async execute(data: IRequest): Promise<Paciente> {
    if (data.cpf) {
      const pacienteExists = await this.pacientesRepository.findByCpf(data.cpf);
      if (pacienteExists) {
        throw new AppError('Já existe um paciente com este CPF.');
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

    const paciente = await this.pacientesRepository.create(data);

    return paciente;
  }
} 