import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IAnexosRepository } from '../../../domain/repositories/IAnexosRepository';

@injectable()
export class DeleteAnexoUseCase {
  constructor(
    @inject('AnexosRepository')
    private anexosRepository: IAnexosRepository
  ) {}

  async execute(id: string): Promise<void> {
    const anexo = await this.anexosRepository.findById(id);
    if (!anexo) {
      throw new AppError('Anexo não encontrado.', 404);
    }
    await this.anexosRepository.delete(id);
  }
} 