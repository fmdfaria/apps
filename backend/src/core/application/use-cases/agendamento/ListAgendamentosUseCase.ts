import { inject, injectable } from 'tsyringe';
import { IAgendamentosRepository } from '../../../domain/repositories/IAgendamentosRepository';
import { Agendamento } from '../../../domain/entities/Agendamento';

@injectable()
export class ListAgendamentosUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository
  ) {}

  async execute(filters?: Partial<{ profissionalId: string; pacienteId: string; dataHora: Date; status: string }>): Promise<Agendamento[]> {
    return this.agendamentosRepository.findAll(filters);
  }
} 