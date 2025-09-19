import { inject, injectable } from 'tsyringe';
import { IAgendamentosContasRepository } from '@/core/domain/repositories/IAgendamentosContasRepository';
import { AgendamentoConta } from '@/core/domain/entities/AgendamentoConta';

@injectable()
export class GetAgendamentosContasByContaPagarUseCase {
  constructor(
    @inject('AgendamentosContasRepository')
    private agendamentosContasRepository: IAgendamentosContasRepository
  ) {}

  async execute(contaPagarId: string): Promise<AgendamentoConta[]> {
    if (!contaPagarId) {
      throw new Error('ID da conta a pagar é obrigatório');
    }

    return await this.agendamentosContasRepository.findByContaPagar(contaPagarId);
  }
}