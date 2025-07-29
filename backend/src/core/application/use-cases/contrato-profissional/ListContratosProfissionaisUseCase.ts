import { inject, injectable } from 'tsyringe';
import { ContratoProfissional } from '../../../domain/entities/ContratoProfissional';
import { IContratosProfissionaisRepository } from '../../../domain/repositories/IContratosProfissionaisRepository';

@injectable()
export class ListContratosProfissionaisUseCase {
  constructor(
    @inject('ContratosProfissionaisRepository')
    private contratosRepository: IContratosProfissionaisRepository
  ) {}

  async execute(filters?: { profissionalId?: string }): Promise<ContratoProfissional[]> {
    return this.contratosRepository.findAll(filters);
  }
} 