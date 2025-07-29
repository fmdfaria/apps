import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';

interface IRequest {
  id: string;
}

@injectable()
export class DeleteProfissionalUseCase {
  constructor(
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository
  ) {}

  async execute({ id }: IRequest): Promise<void> {
    const profissional = await this.profissionaisRepository.findById(id);

    if (!profissional) {
      throw new AppError('Profissional não encontrado.', 404);
    }

    await this.profissionaisRepository.delete(id);
  }
} 