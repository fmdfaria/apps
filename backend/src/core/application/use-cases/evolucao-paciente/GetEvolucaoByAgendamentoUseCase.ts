import { inject, injectable } from 'tsyringe';
import { IEvolucoesPacientesRepository } from '../../../domain/repositories/IEvolucoesPacientesRepository';
import { EvolucaoPaciente } from '../../../domain/entities/EvolucaoPaciente';

@injectable()
export class GetEvolucaoByAgendamentoUseCase {
  constructor(
    @inject('EvolucoesPacientesRepository')
    private evolucoesPacientesRepository: IEvolucoesPacientesRepository
  ) {}

  async execute(agendamentoId: string): Promise<EvolucaoPaciente | null> {
    return this.evolucoesPacientesRepository.findByAgendamento(agendamentoId);
  }
}