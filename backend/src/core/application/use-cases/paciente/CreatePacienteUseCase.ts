import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { Paciente } from '../../../domain/entities/Paciente';
import { IConveniosRepository } from '../../../domain/repositories/IConveniosRepository';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';

interface IRequest {
  nomeCompleto: string;
  whatsapp: string;
  tipoServico: string;
  nomeResponsavel?: string | null;
  email?: string | null;
  cpf?: string | null;
  dataNascimento?: Date | null;
  convenioId?: string | null;
  numeroCarteirinha?: string | null;
  dataPedidoMedico?: Date | null;
  crm?: string | null;
  cbo?: string | null;
  cid?: string | null;
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
    // Copiar dados para permitir ajustes controlados
    const payload: IRequest = { ...data };

    if (payload.cpf) {
      const pacienteExists = await this.pacientesRepository.findByCpf(payload.cpf);
      if (pacienteExists) {
        throw new AppError('Já existe um paciente com este CPF.');
      }
    }

    // Regra: Se tipo de serviço for "Particular", vincular automaticamente ao convênio "Particular"
    if (payload.tipoServico && payload.tipoServico.toLowerCase() === 'particular') {
      const convenioParticular = await this.conveniosRepository.findByName('Particular');
      if (!convenioParticular) {
        throw new AppError("Convênio 'Particular' não encontrado. Cadastre o convênio 'Particular' antes de criar um paciente com serviço Particular.", 400);
      }
      payload.convenioId = convenioParticular.id;
    }

    if (payload.convenioId) {
      const convenioExists = await this.conveniosRepository.findById(
        payload.convenioId
      );
      if (!convenioExists) {
        throw new AppError('Convênio não encontrado.', 404);
      }
    }

    const paciente = await this.pacientesRepository.create(payload);

    return paciente;
  }
} 