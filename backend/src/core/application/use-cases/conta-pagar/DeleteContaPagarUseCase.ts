import { injectable, inject } from 'tsyringe';
import { IContasPagarRepository } from '../../../domain/repositories/IContasPagarRepository';

@injectable()
export class DeleteContaPagarUseCase {
  constructor(
    @inject('ContasPagarRepository')
    private contasPagarRepository: IContasPagarRepository
  ) {}

  async execute(id: string): Promise<void> {
    // Verificar se conta existe
    const conta = await this.contasPagarRepository.findById(id);
    if (!conta) {
      throw new Error('Conta a pagar não encontrada');
    }

    // Não permitir exclusão de contas já pagas
    if (conta.status === 'PAGO') {
      throw new Error('Não é possível excluir conta já paga');
    }

    return this.contasPagarRepository.delete(id);
  }
}