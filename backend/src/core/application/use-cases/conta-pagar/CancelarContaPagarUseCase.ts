import { injectable, inject } from 'tsyringe';
import { ContaPagar } from '../../../domain/entities/ContaPagar';
import { IContasPagarRepository } from '../../../domain/repositories/IContasPagarRepository';

@injectable()
export class CancelarContaPagarUseCase {
  constructor(
    @inject('ContasPagarRepository')
    private contasPagarRepository: IContasPagarRepository
  ) {}

  async execute(id: string, motivo?: string): Promise<ContaPagar> {
    // Verificar se conta existe
    const conta = await this.contasPagarRepository.findById(id);
    if (!conta) {
      throw new Error('Conta a pagar não encontrada');
    }

    // Não permitir cancelamento de contas já pagas
    if (conta.status === 'PAGO') {
      throw new Error('Não é possível cancelar conta já paga');
    }

    // Atualizar status para cancelado
    const observacoesCancelamento = motivo 
      ? `${conta.observacoes ? conta.observacoes + '\n' : ''}CANCELADO: ${motivo}`
      : `${conta.observacoes ? conta.observacoes + '\n' : ''}CANCELADO em ${new Date().toLocaleString('pt-BR')}`;

    return this.contasPagarRepository.update(id, {
      status: 'CANCELADO',
      observacoes: observacoesCancelamento
    });
  }
}