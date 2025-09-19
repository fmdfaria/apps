import { inject, injectable } from 'tsyringe';
import { IAgendamentosContasRepository } from '@/core/domain/repositories/IAgendamentosContasRepository';

@injectable()
export class DeleteAgendamentoContaUseCase {
  constructor(
    @inject('AgendamentosContasRepository')
    private agendamentosContasRepository: IAgendamentosContasRepository
  ) {}

  async execute(id: string): Promise<void> {
    if (!id) {
      throw new Error('ID do relacionamento é obrigatório');
    }

    // Verificar se o relacionamento existe
    const existing = await this.agendamentosContasRepository.findById(id);
    if (!existing) {
      throw new Error('Relacionamento não encontrado');
    }

    await this.agendamentosContasRepository.delete(id);
  }
}