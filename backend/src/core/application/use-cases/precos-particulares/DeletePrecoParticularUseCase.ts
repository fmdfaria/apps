import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IPrecosParticularesRepository } from '../../../domain/repositories/IPrecosParticularesRepository';

@injectable()
export class DeletePrecoParticularUseCase {
  constructor(
    @inject('PrecosParticularesRepository')
    private precosRepository: IPrecosParticularesRepository
  ) {}

  async execute(id: string): Promise<void> {
    const preco = await this.precosRepository.findById(id);

    if (!preco) {
      throw new AppError('Preço particular não encontrado.', 404);
    }

    await this.precosRepository.delete(id);
  }
} 