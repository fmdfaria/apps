import { inject, injectable } from 'tsyringe';
import { IAgendamentosContasRepository } from '@/core/domain/repositories/IAgendamentosContasRepository';
import { AgendamentoConta } from '@/core/domain/entities/AgendamentoConta';

interface GetAgendamentosContasRequest {
  contaReceberId?: string;
  contaPagarId?: string;
}

@injectable()
export class GetAgendamentosContasUseCase {
  constructor(
    @inject('AgendamentosContasRepository')
    private agendamentosContasRepository: IAgendamentosContasRepository
  ) {}

  async execute(filters?: GetAgendamentosContasRequest): Promise<AgendamentoConta[]> {
    return await this.agendamentosContasRepository.findAll(filters);
  }
}