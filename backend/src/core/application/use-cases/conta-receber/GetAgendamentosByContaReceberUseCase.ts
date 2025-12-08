import { inject, injectable } from 'tsyringe';
import { IAgendamentosContasRepository } from '@/core/domain/repositories/IAgendamentosContasRepository';
import { IAgendamentosRepository } from '@/core/domain/repositories/IAgendamentosRepository';

@injectable()
export class GetAgendamentosByContaReceberUseCase {
  constructor(
    @inject('AgendamentosContasRepository')
    private agendamentosContasRepository: IAgendamentosContasRepository,
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository
  ) {}

  async execute(contaReceberId: string) {
    if (!contaReceberId) {
      throw new Error('ID da conta a receber é obrigatório');
    }

    // 1. Buscar registros da tabela pivot agendamentos_contas
    const agendamentosContas = await this.agendamentosContasRepository.findByContaReceber(contaReceberId);

    if (agendamentosContas.length === 0) {
      return [];
    }

    // 2. Extrair os IDs dos agendamentos
    const agendamentoIds = agendamentosContas.map(ac => ac.agendamentoId);

    // 3. Buscar os agendamentos completos
    const agendamentos = await this.agendamentosRepository.findByIds(agendamentoIds);

    return agendamentos;
  }
}
