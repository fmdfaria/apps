import { injectable, inject } from 'tsyringe';
import { IContasReceberRepository } from '../../../domain/repositories/IContasReceberRepository';

@injectable()
export class DeleteContaReceberUseCase {
  constructor(
    @inject('ContasReceberRepository')
    private contasReceberRepository: IContasReceberRepository
  ) {}

  async execute(id: string): Promise<void> {
    const conta = await this.contasReceberRepository.findById(id);
    if (!conta) {
      throw new Error('Conta a receber não encontrada');
    }

    if (conta.status === 'RECEBIDO') {
      throw new Error('Não é possível excluir uma conta já recebida');
    }

    await this.contasReceberRepository.delete(id);
  }
}