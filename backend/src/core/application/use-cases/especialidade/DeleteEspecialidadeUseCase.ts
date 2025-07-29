import { inject, injectable } from 'tsyringe';
import { IEspecialidadesRepository } from '../../../domain/repositories/IEspecialidadesRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface IRequest {
  id: string;
}

@injectable()
export class DeleteEspecialidadeUseCase {
  constructor(
    @inject('EspecialidadesRepository')
    private especialidadesRepository: IEspecialidadesRepository
  ) {}

  async execute({ id }: IRequest): Promise<void> {
    const especialidade = await this.especialidadesRepository.findById(id);

    if (!especialidade) {
      throw new AppError('Especialidade não encontrada.', 404);
    }

    await this.especialidadesRepository.delete(id);
  }
} 