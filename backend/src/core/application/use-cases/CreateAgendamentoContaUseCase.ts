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

    // Validar se não permite ambas no mesmo registro (cada registro = um tipo de conta)
    if (contaReceberId && contaPagarId) {
      throw new Error('Não é possível criar um registro com ambos tipos de conta. Crie registros separados.');
    }

    // Verificar se já existe registro do tipo específico
    if (contaReceberId) {
      const existeReceber = await this.agendamentosContasRepository.findByAgendamentoAndTipo(agendamentoId, 'receber');
      if (existeReceber) {
        throw new Error('Este agendamento já possui uma conta a receber associada');
      }
    }

    if (contaPagarId) {
      const existePagar = await this.agendamentosContasRepository.findByAgendamentoAndTipo(agendamentoId, 'pagar');
      if (existePagar) {
        throw new Error('Este agendamento já possui uma conta a pagar associada');
      }
    }

    // Sempre criar novo registro (nunca UPDATE)
    const agendamentoConta = new AgendamentoConta({
      agendamentoId,
      contaReceberId,
      contaPagarId
    });

    return await this.agendamentosContasRepository.create(agendamentoConta);
  }
}