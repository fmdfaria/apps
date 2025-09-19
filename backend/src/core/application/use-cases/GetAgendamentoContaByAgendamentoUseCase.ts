import { inject, injectable } from 'tsyringe';
import { IAgendamentosContasRepository } from '@/core/domain/repositories/IAgendamentosContasRepository';
import { AgendamentoConta } from '@/core/domain/entities/AgendamentoConta';

@injectable()
export class GetAgendamentoContaByAgendamentoUseCase {
  constructor(
    @inject('AgendamentosContasRepository')
    private agendamentosContasRepository: IAgendamentosContasRepository
  ) {}

  async execute(agendamentoId: string): Promise<AgendamentoConta | null> {
    if (!agendamentoId) {
      throw new Error('ID do agendamento é obrigatório');
    }

    return await this.agendamentosContasRepository.findByAgendamentoId(agendamentoId);
  }
}