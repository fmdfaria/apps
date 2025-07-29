import { inject, injectable } from 'tsyringe';
import { IEvolucoesPacientesRepository, IUpdateEvolucaoPacienteDTO } from '../../../domain/repositories/IEvolucoesPacientesRepository';
import { EvolucaoPaciente } from '../../../domain/entities/EvolucaoPaciente';

@injectable()
export class UpdateEvolucaoPacienteUseCase {
  constructor(
    @inject('EvolucoesPacientesRepository')
    private evolucoesPacientesRepository: IEvolucoesPacientesRepository
  ) {}

  async execute(id: string, data: IUpdateEvolucaoPacienteDTO): Promise<EvolucaoPaciente> {
    return this.evolucoesPacientesRepository.update(id, data);
  }
} 