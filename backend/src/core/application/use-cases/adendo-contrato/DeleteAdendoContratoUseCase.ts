import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IAdendosContratosRepository } from '../../../domain/repositories/IAdendosContratosRepository';

@injectable()
export class DeleteAdendoContratoUseCase {
  constructor(
    @inject('AdendosContratosRepository')
    private adendosRepository: IAdendosContratosRepository
  ) {}

  async execute(id: string): Promise<void> {
    const adendo = await this.adendosRepository.findById(id);
    if (!adendo) {
      throw new AppError('Adendo não encontrado.', 404);
    }
    await this.adendosRepository.delete(id);
  }
} 