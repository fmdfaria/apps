import { inject, injectable } from 'tsyringe';
import { IAgendamentosRepository } from '@/core/domain/repositories/IAgendamentosRepository';
import { IContasPagarRepository } from '@/core/domain/repositories/IContasPagarRepository';
import { IAgendamentosContasRepository } from '@/core/domain/repositories/IAgendamentosContasRepository';
import { ContaPagar } from '@/core/domain/entities/ContaPagar';
import { AgendamentoConta } from '@/core/domain/entities/AgendamentoConta';
import { AppError } from '@/shared/errors/AppError';

interface FechamentoPagamentoRequest {
  agendamentoIds: string[];
  contaPagar: {
    descricao: string;
    valorOriginal: number;
    dataVencimento: Date;
    dataEmissao: Date;
    empresaId?: string;
    contaBancariaId?: string;
    categoriaId?: string;
    profissionalId: string;
    numeroDocumento?: string;
    tipoConta: 'DESPESA';
    recorrente?: boolean;
    observacoes?: string;
  };
  userId: string;
}

interface FechamentoPagamentoResponse {
  contaPagar: ContaPagar;
  agendamentosAtualizados: any[];
  agendamentosContas: AgendamentoConta[];
}

@injectable()
export class FechamentoPagamentoUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository,
    
    @inject('ContasPagarRepository')
    private contasPagarRepository: IContasPagarRepository,
    
    @inject('AgendamentosContasRepository')
    private agendamentosContasRepository: IAgendamentosContasRepository
  ) {}

  async execute({ 
    agendamentoIds, 
    contaPagar: contaPagarData, 
    userId 
  }: FechamentoPagamentoRequest): Promise<FechamentoPagamentoResponse> {
    // 1. Validar se todos os agendamentos existem e estão FINALIZADOS
    const agendamentos = await this.agendamentosRepository.findByIds(agendamentoIds);
    
    if (agendamentos.length !== agendamentoIds.length) {
      throw new AppError('Alguns agendamentos não foram encontrados', 400);
    }

    // Verificar se todos estão FINALIZADOS
    const agendamentosNaoFinalizados = agendamentos.filter(a => a.status !== 'FINALIZADO');
    if (agendamentosNaoFinalizados.length > 0) {
      throw new AppError('Apenas agendamentos FINALIZADOS podem ser fechados', 400);
    }

    // 2. Verificar se algum agendamento já possui conta_pagar associada
    const agendamentosJaAssociados = [];
    for (const agendamentoId of agendamentoIds) {
      const associacao = await this.agendamentosContasRepository.findByAgendamentoId(agendamentoId);
      if (associacao && associacao.contaPagarId) {
        agendamentosJaAssociados.push(agendamentoId);
      }
    }

    if (agendamentosJaAssociados.length > 0) {
      throw new AppError(`Agendamentos já possuem conta a pagar associada: ${agendamentosJaAssociados.join(', ')}`, 400);
    }

    // 3. Criar a conta a pagar
    const contaPagar = new ContaPagar({
      ...contaPagarData,
      status: 'PENDENTE',
      valorPago: 0,
      valorDesconto: 0,
      valorJuros: 0,
      valorMulta: 0,
      valorLiquido: contaPagarData.valorOriginal, // Valor líquido = valor original (sem descontos, juros ou multas)
      recorrente: contaPagarData.recorrente || false,
      criadoPor: userId
    });

    const contaPagarCriada = await this.contasPagarRepository.create(contaPagar);

    try {
      // 4. Criar relacionamentos agendamentos_contas
      const agendamentosContas: AgendamentoConta[] = [];
      for (const agendamentoId of agendamentoIds) {
        const agendamentoConta = new AgendamentoConta({
          agendamentoId,
          contaPagarId: contaPagarCriada.id!,
          contaReceberId: undefined
        });

        const associacao = await this.agendamentosContasRepository.create(agendamentoConta);
        agendamentosContas.push(associacao);
      }

      // 5. Atualizar status dos agendamentos para ARQUIVADO e marcar pagamento = true
      const agendamentosAtualizados = [];
      for (const agendamento of agendamentos) {
        const agendamentoAtualizado = await this.agendamentosRepository.update(agendamento.id!, {
          status: 'ARQUIVADO',
          pagamento: true
        });
        agendamentosAtualizados.push(agendamentoAtualizado);
      }

      return {
        contaPagar: contaPagarCriada,
        agendamentosAtualizados,
        agendamentosContas
      };

    } catch (error) {
      console.error('Erro no fechamento de pagamento:', error);
      
      // Em caso de erro, reverter a criação da conta a pagar
      // Primeiro deletar os relacionamentos agendamentos_contas criados
      try {
        for (const agendamentoId of agendamentoIds) {
          try {
            const associacao = await this.agendamentosContasRepository.findByAgendamentoId(agendamentoId);
            if (associacao && associacao.contaPagarId === contaPagarCriada.id) {
              await this.agendamentosContasRepository.delete(associacao.id!);
            }
          } catch (deleteAssocError) {
            console.error(`Erro ao deletar associação do agendamento ${agendamentoId}:`, deleteAssocError);
          }
        }
        
        // Depois deletar a conta a pagar
        await this.contasPagarRepository.delete(contaPagarCriada.id!);
      } catch (deleteError) {
        console.error('Erro ao reverter criação da conta a pagar:', deleteError);
      }
      
      // Mostrar o erro original para debug
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new AppError(`Erro ao processar fechamento: ${errorMessage}`, 500);
    }
  }
}