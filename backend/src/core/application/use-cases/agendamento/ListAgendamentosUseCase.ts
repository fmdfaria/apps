import { inject, injectable } from 'tsyringe';
import { IAgendamentosRepository, IAgendamentoFilters, IPaginatedResponse } from '../../../domain/repositories/IAgendamentosRepository';
import { Agendamento } from '../../../domain/entities/Agendamento';

@injectable()
export class ListAgendamentosUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository
  ) {}

  async execute(filters?: IAgendamentoFilters): Promise<IPaginatedResponse<Agendamento>> {
    // Validar parâmetros de paginação
    if (filters?.page && filters.page < 1) {
      filters.page = 1;
    }
    if (filters?.limit && (filters.limit < 1 || filters.limit > 100)) {
      filters.limit = Math.min(Math.max(filters.limit, 1), 100);
    }

    return this.agendamentosRepository.findAll(filters);
  }
} 