import { injectable, inject } from 'tsyringe';
import { IContasBancariasRepository } from '../../../domain/repositories/IContasBancariasRepository';

@injectable()
export class AtualizarSaldoContaBancariaUseCase {
  constructor(
    @inject('ContasBancariasRepository')
    private contasBancariasRepository: IContasBancariasRepository
  ) {}

  async execute(id: string, novoSaldo: number): Promise<void> {
    // Verificar se conta existe
    const conta = await this.contasBancariasRepository.findById(id);
    if (!conta) {
      throw new Error('Conta bancária não encontrada');
    }

    // Validar saldo
    if (typeof novoSaldo !== 'number' || isNaN(novoSaldo)) {
      throw new Error('Saldo deve ser um número válido');
    }

    return this.contasBancariasRepository.atualizarSaldo(id, novoSaldo);
  }
}