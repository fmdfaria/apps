import { inject, injectable } from 'tsyringe';
import { IEvolucoesPacientesRepository, ICreateEvolucaoPacienteDTO } from '../../../domain/repositories/IEvolucoesPacientesRepository';
import { EvolucaoPaciente } from '../../../domain/entities/EvolucaoPaciente';

@injectable()
export class CreateEvolucaoPacienteUseCase {
  constructor(
    @inject('EvolucoesPacientesRepository')
    private evolucoesPacientesRepository: IEvolucoesPacientesRepository
  ) {}

  async execute(data: ICreateEvolucaoPacienteDTO): Promise<EvolucaoPaciente> {
    return this.evolucoesPacientesRepository.create(data);
  }
} 