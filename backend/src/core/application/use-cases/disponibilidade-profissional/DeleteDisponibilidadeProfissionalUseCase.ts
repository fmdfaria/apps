import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IDisponibilidadesProfissionaisRepository } from '../../../domain/repositories/IDisponibilidadesProfissionaisRepository';

@injectable()
export class DeleteDisponibilidadeProfissionalUseCase {
  constructor(
    @inject('DisponibilidadesProfissionaisRepository')
    private disponibilidadesRepository: IDisponibilidadesProfissionaisRepository
  ) {}

  async execute(id: string): Promise<void> {
    const disponibilidade = await this.disponibilidadesRepository.findById(id);
    if (!disponibilidade) {
      throw new AppError('Disponibilidade não encontrada.', 404);
    }
    await this.disponibilidadesRepository.delete(id);
  }
} 