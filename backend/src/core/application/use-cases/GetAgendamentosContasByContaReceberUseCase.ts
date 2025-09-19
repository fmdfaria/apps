import { inject, injectable } from 'tsyringe';
import { IAgendamentosContasRepository } from '@/core/domain/repositories/IAgendamentosContasRepository';
import { AgendamentoConta } from '@/core/domain/entities/AgendamentoConta';

@injectable()
export class GetAgendamentosContasByContaReceberUseCase {
  constructor(
    @inject('AgendamentosContasRepository')
    private agendamentosContasRepository: IAgendamentosContasRepository
  ) {}

  async execute(contaReceberId: string): Promise<AgendamentoConta[]> {
    if (!contaReceberId) {
      throw new Error('ID da conta a receber é obrigatório');
    }

    return await this.agendamentosContasRepository.findByContaReceber(contaReceberId);
  }
}