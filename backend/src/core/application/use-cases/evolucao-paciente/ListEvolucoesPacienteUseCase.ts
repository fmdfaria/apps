import { inject, injectable } from 'tsyringe';
import { IEvolucoesPacientesRepository } from '../../../domain/repositories/IEvolucoesPacientesRepository';
import { EvolucaoPaciente } from '../../../domain/entities/EvolucaoPaciente';

@injectable()
export class ListEvolucoesPacienteUseCase {
  constructor(
    @inject('EvolucoesPacientesRepository')
    private evolucoesPacientesRepository: IEvolucoesPacientesRepository
  ) {}

  async execute(pacienteId: string): Promise<EvolucaoPaciente[]> {
    return this.evolucoesPacientesRepository.findAllByPaciente(pacienteId);
  }
} 