import { inject, injectable } from 'tsyringe';
import { IEvolucoesPacientesRepository } from '../../../domain/repositories/IEvolucoesPacientesRepository';

@injectable()
export class DeleteEvolucaoPacienteUseCase {
  constructor(
    @inject('EvolucoesPacientesRepository')
    private evolucoesPacientesRepository: IEvolucoesPacientesRepository
  ) {}

  async execute(id: string): Promise<void> {
    await this.evolucoesPacientesRepository.delete(id);
  }
} 