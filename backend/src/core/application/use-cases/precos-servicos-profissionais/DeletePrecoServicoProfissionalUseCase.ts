import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IPrecosServicosProfissionaisRepository } from '../../../domain/repositories/IPrecosServicosProfissionaisRepository';

@injectable()
export class DeletePrecoServicoProfissionalUseCase {
  constructor(
    @inject('PrecosServicosProfissionaisRepository')
    private precosRepository: IPrecosServicosProfissionaisRepository
  ) {}

  async execute(id: string): Promise<void> {
    const preco = await this.precosRepository.findById(id);

    if (!preco) {
      throw new AppError('Preço não encontrado.', 404);
    }

    await this.precosRepository.delete(id);
  }
} 