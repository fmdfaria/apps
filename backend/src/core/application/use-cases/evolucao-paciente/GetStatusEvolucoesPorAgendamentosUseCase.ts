import { inject, injectable } from 'tsyringe';
import { IEvolucoesPacientesRepository } from '../../../domain/repositories/IEvolucoesPacientesRepository';

@injectable()
export class GetStatusEvolucoesPorAgendamentosUseCase {
  constructor(
    @inject('EvolucoesPacientesRepository')
    private evolucoesPacientesRepository: IEvolucoesPacientesRepository
  ) {}

  async execute(agendamentoIds: string[]): Promise<Array<{ agendamentoId: string; temEvolucao: boolean }>> {
    return this.evolucoesPacientesRepository.getStatusByAgendamentos(agendamentoIds);
  }
}