import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IRecursosRepository } from '../../../domain/repositories/IRecursosRepository';

interface IRequest {
  id: string;
}

@injectable()
export class DeleteRecursoUseCase {
  constructor(
    @inject('RecursosRepository')
    private recursosRepository: IRecursosRepository
  ) {}

  async execute({ id }: IRequest): Promise<void> {
    const recurso = await this.recursosRepository.findById(id);

    if (!recurso) {
      throw new AppError('Recurso não encontrado.', 404);
    }

    await this.recursosRepository.delete(id);
  }
} 