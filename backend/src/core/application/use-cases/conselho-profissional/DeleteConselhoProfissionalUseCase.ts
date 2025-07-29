import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IConselhosProfissionaisRepository } from '../../../domain/repositories/IConselhosProfissionaisRepository';

interface IRequest {
  id: string;
}

@injectable()
export class DeleteConselhoProfissionalUseCase {
  constructor(
    @inject('ConselhosProfissionaisRepository')
    private conselhosProfissionaisRepository: IConselhosProfissionaisRepository
  ) {}

  async execute({ id }: IRequest): Promise<void> {
    const conselho = await this.conselhosProfissionaisRepository.findById(id);

    if (!conselho) {
      throw new AppError('Conselho Profissional não encontrado.', 404);
    }

    await this.conselhosProfissionaisRepository.delete(id);
  }
} 