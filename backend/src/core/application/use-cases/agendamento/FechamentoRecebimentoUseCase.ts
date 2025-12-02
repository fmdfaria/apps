import { inject, injectable } from 'tsyringe';
import { IAgendamentosRepository } from '@/core/domain/repositories/IAgendamentosRepository';
import { IContasReceberRepository } from '@/core/domain/repositories/IContasReceberRepository';
import { IAgendamentosContasRepository } from '@/core/domain/repositories/IAgendamentosContasRepository';
import { ContaReceber } from '@/core/domain/entities/ContaReceber';
import { AgendamentoConta } from '@/core/domain/entities/AgendamentoConta';
import { AppError } from '@/shared/errors/AppError';

interface FechamentoRecebimentoRequest {
  agendamentoIds: string[];
  contaReceber: {
    descricao: string;
    valorOriginal: number;
    dataVencimento: Date;
    dataEmissao: Date;
    empresaId?: string;
    contaBancariaId?: string;
    categoriaId?: string;
    convenioId?: string;
    pacienteId?: string;
    numeroDocumento?: string;
    formaRecebimento?: string;
    observacoes?: string;
  };
  userId: string;
}

interface FechamentoRecebimentoResponse {
  contaReceber: ContaReceber;
  agendamentosAtualizados: any[];
  agendamentosContas: AgendamentoConta[];
}

@injectable()
export class FechamentoRecebimentoUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository,

    @inject('ContasReceberRepository')
    private contasReceberRepository: IContasReceberRepository,

    @inject('AgendamentosContasRepository')
    private agendamentosContasRepository: IAgendamentosContasRepository
  ) {}

  async execute({
    agendamentoIds,
    contaReceber: contaReceberData,
    userId
  }: FechamentoRecebimentoRequest): Promise<FechamentoRecebimentoResponse> {
    // 1. Validar se todos os agendamentos existem e estão FINALIZADOS
    const agendamentos = await this.agendamentosRepository.findByIds(agendamentoIds);

    if (agendamentos.length !== agendamentoIds.length) {
      throw new AppError('Alguns agendamentos não foram encontrados', 400);
    }

    // Verificar se todos estão FINALIZADOS
    const agendamentosNaoFinalizados = agendamentos.filter(a => a.status !== 'FINALIZADO');
    if (agendamentosNaoFinalizados.length > 0) {
      throw new AppError('Apenas agendamentos FINALIZADOS podem ter fechamento de recebimento', 400);
    }

    // 2. Verificar se algum agendamento já possui conta_receber associada
    const agendamentosJaAssociados = [];
    for (const agendamentoId of agendamentoIds) {
      const associacaoReceber = await this.agendamentosContasRepository.findByAgendamentoAndTipo(agendamentoId, 'receber');
      if (associacaoReceber) {
        agendamentosJaAssociados.push(agendamentoId);
      }
    }

    if (agendamentosJaAssociados.length > 0) {
      throw new AppError(`Agendamentos já possuem conta a receber associada: ${agendamentosJaAssociados.join(', ')}`, 400);
    }

    // 3. Criar a conta a receber
    const contaReceber = new ContaReceber({
      ...contaReceberData,
      status: 'PENDENTE',
      valorRecebido: 0,
      valorDesconto: 0,
      valorJuros: 0,
      valorMulta: 0,
      valorLiquido: contaReceberData.valorOriginal, // Valor líquido = valor original (sem descontos, juros ou multas)
      userCreatedId: userId
    });

    const contaReceberCriada = await this.contasReceberRepository.create(contaReceber);

    try {
      // 4. Criar relacionamentos agendamentos_contas (sempre CREATE, nunca UPDATE)
      const agendamentosContas: AgendamentoConta[] = [];
      for (const agendamentoId of agendamentoIds) {
        const agendamentoConta = new AgendamentoConta({
          agendamentoId,
          contaReceberId: contaReceberCriada.id!,
          contaPagarId: undefined
        });

        const associacao = await this.agendamentosContasRepository.create(agendamentoConta);
        agendamentosContas.push(associacao);
      }

      // 5. Atualizar agendamentos: marcar recebimento como true, MAS NÃO ALTERAR O STATUS
      const agendamentosAtualizados = [];
      for (const agendamento of agendamentos) {
        const agendamentoAtualizado = await this.agendamentosRepository.update(agendamento.id!, {
          recebimento: true // Marca como recebimento registrado, MAS mantém status como FINALIZADO
        });
        agendamentosAtualizados.push(agendamentoAtualizado);
      }

      return {
        contaReceber: contaReceberCriada,
        agendamentosAtualizados,
        agendamentosContas
      };

    } catch (error) {
      console.error('Erro no fechamento de recebimento:', error);

      // Em caso de erro, reverter as alterações (sempre DELETE, nunca UPDATE)
      try {
        for (const agendamentoId of agendamentoIds) {
          try {
            const associacaoReceber = await this.agendamentosContasRepository.findByAgendamentoAndTipo(agendamentoId, 'receber');
            if (associacaoReceber && associacaoReceber.contaReceberId === contaReceberCriada.id) {
              await this.agendamentosContasRepository.delete(associacaoReceber.id!);
            }
          } catch (deleteAssocError) {
            console.error(`Erro ao reverter associação do agendamento ${agendamentoId}:`, deleteAssocError);
          }
        }

        // Depois deletar a conta a receber
        await this.contasReceberRepository.delete(contaReceberCriada.id!);
      } catch (deleteError) {
        console.error('Erro ao reverter criação da conta a receber:', deleteError);
      }

      // Mostrar o erro original para debug
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new AppError(`Erro ao processar fechamento de recebimento: ${errorMessage}`, 500);
    }
  }
}
