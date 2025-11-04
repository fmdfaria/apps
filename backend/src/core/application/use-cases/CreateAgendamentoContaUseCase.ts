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
      // Se já existe, fazer UPDATE para adicionar a conta que está faltando
      const updateData: Partial<AgendamentoConta> = {};

      if (contaReceberId && !existingRelation.contaReceberId) {
        updateData.contaReceberId = contaReceberId;
      }

      if (contaPagarId && !existingRelation.contaPagarId) {
        updateData.contaPagarId = contaPagarId;
      }

      // Se não há nada para atualizar, lança erro
      if (Object.keys(updateData).length === 0) {
        if (contaReceberId && existingRelation.contaReceberId) {
          throw new Error('Este agendamento já possui uma conta a receber associada');
        }
        if (contaPagarId && existingRelation.contaPagarId) {
          throw new Error('Este agendamento já possui uma conta a pagar associada');
        }
      }

      return await this.agendamentosContasRepository.update(existingRelation.id!, updateData);
    }

    // Se não existe, criar novo registro
    const agendamentoConta = new AgendamentoConta({
      agendamentoId,
      contaReceberId,
      contaPagarId
    });

    return await this.agendamentosContasRepository.create(agendamentoConta);
  }
}