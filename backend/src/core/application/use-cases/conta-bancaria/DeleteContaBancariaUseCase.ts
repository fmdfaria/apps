import { injectable, inject } from 'tsyringe';
import { IContasBancariasRepository } from '../../../domain/repositories/IContasBancariasRepository';

@injectable()
export class DeleteContaBancariaUseCase {
  constructor(
    @inject('ContasBancariasRepository')
    private contasBancariasRepository: IContasBancariasRepository
  ) {}

  async execute(id: string): Promise<void> {
    // Verificar se conta existe
    const conta = await this.contasBancariasRepository.findById(id);
    if (!conta) {
      throw new Error('Conta bancária não encontrada');
    }

    // TODO: Verificar se conta possui movimentações antes de permitir exclusão
    // const possuiMovimentacoes = await this.verificarMovimentacoes(id);
    // if (possuiMovimentacoes) {
    //   throw new Error('Não é possível excluir conta bancária com movimentações');
    // }

    return this.contasBancariasRepository.delete(id);
  }
}