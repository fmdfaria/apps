import { inject, injectable } from 'tsyringe';
import { IAgendamentosContasRepository } from '@/core/domain/repositories/IAgendamentosContasRepository';
import { AgendamentoConta } from '@/core/domain/entities/AgendamentoConta';

interface CreateAgendamentoContaRequest {
  agendamentoId: string;
  contaReceberId?: string;
  contaPagarId?: string;
}

@injectable()
export class CreateAgendamentoContaUseCase {
  constructor(
    @inject('AgendamentosContasRepository')
    private agendamentosContasRepository: IAgendamentosContasRepository
  ) {}

  async execute({
    agendamentoId,
    contaReceberId,
    contaPagarId
  }: CreateAgendamentoContaRequest): Promise<AgendamentoConta> {
    // Validar se pelo menos uma conta foi informada
    if (!contaReceberId && !contaPagarId) {
      throw new Error('Pelo menos uma conta (receber ou pagar) deve ser informada');
    }

    // Verificar se já existe relacionamento para este agendamento
    const existingRelation = await this.agendamentosContasRepository.findByAgendamentoId(agendamentoId);
    if (existingRelation) {
      throw new Error('Já existe um relacionamento para este agendamento');
    }

    const agendamentoConta = new AgendamentoConta({
      agendamentoId,
      contaReceberId,
      contaPagarId
    });

    return await this.agendamentosContasRepository.create(agendamentoConta);
  }
}