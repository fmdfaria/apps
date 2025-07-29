import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';

interface IRequest {
  id: string;
}

@injectable()
export class DeletePacienteUseCase {
  constructor(
    @inject('PacientesRepository')
    private pacientesRepository: IPacientesRepository
  ) {}

  async execute({ id }: IRequest): Promise<void> {
    const paciente = await this.pacientesRepository.findById(id);

    if (!paciente) {
      throw new AppError('Paciente não encontrado.', 404);
    }

    await this.pacientesRepository.delete(id);
  }
} 