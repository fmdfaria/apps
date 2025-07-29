import { inject, injectable } from 'tsyringe';
import { DisponibilidadeProfissional } from '../../../domain/entities/DisponibilidadeProfissional';
import { IDisponibilidadesProfissionaisRepository } from '../../../domain/repositories/IDisponibilidadesProfissionaisRepository';

@injectable()
export class ListDisponibilidadesProfissionaisUseCase {
  constructor(
    @inject('DisponibilidadesProfissionaisRepository')
    private disponibilidadesRepository: IDisponibilidadesProfissionaisRepository
  ) {}

  async execute(filters?: { profissionalId?: string; diaSemana?: number; tipo?: string }): Promise<DisponibilidadeProfissional[]> {
    return this.disponibilidadesRepository.findAll(filters);
  }
} 