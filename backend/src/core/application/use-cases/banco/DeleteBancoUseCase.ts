import { inject, injectable } from 'tsyringe';
import { IBancosRepository } from '../../../domain/repositories/IBancosRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface DeleteBancoRequest {
  id: string;
}

@injectable()
export class DeleteBancoUseCase {
  constructor(
    @inject('BancosRepository')
    private bancosRepository: IBancosRepository
  ) {}

  async execute({ id }: DeleteBancoRequest): Promise<void> {
    const banco = await this.bancosRepository.findById(id);
    
    if (!banco) {
      throw new AppError('Banco não encontrado', 404);
    }

    await this.bancosRepository.delete(id);
  }
}