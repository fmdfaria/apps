import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { Paciente } from '../../../domain/entities/Paciente';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';

interface IRequest {
  id: string;
  ativo: boolean;
}

@injectable()
export class UpdatePacienteStatusUseCase {
  constructor(
    @inject('PacientesRepository')
    private pacientesRepository: IPacientesRepository
  ) {}

  async execute({ id, ativo }: IRequest): Promise<Paciente> {
    const paciente = await this.pacientesRepository.findById(id);
    if (!paciente) {
      throw new AppError('Paciente não encontrado.', 404);
    }

    paciente.ativo = ativo;
    const updated = await this.pacientesRepository.save(paciente);
    return updated;
  }
}


