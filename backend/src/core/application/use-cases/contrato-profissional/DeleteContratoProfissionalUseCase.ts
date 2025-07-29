import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IContratosProfissionaisRepository } from '../../../domain/repositories/IContratosProfissionaisRepository';

@injectable()
export class DeleteContratoProfissionalUseCase {
  constructor(
    @inject('ContratosProfissionaisRepository')
    private contratosRepository: IContratosProfissionaisRepository
  ) {}

  async execute(id: string): Promise<void> {
    const contrato = await this.contratosRepository.findById(id);
    if (!contrato) {
      throw new AppError('Contrato não encontrado.', 404);
    }
    await this.contratosRepository.delete(id);
  }
} 