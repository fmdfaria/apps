import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IAgendamentosRepository } from '../../../domain/repositories/IAgendamentosRepository';

@injectable()
export class DeleteAgendamentoUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository
  ) {}

  async execute(id: string): Promise<void> {
    const agendamento = await this.agendamentosRepository.findById(id);
    if (!agendamento) {
      throw new AppError('Agendamento não encontrado.', 404);
    }
    await this.agendamentosRepository.delete(id);
  }
} 