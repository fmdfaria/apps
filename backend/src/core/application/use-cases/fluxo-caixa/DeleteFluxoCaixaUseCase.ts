import { inject, injectable } from 'tsyringe';
import { IFluxoCaixaRepository } from '@/core/domain/repositories/IFluxoCaixaRepository';

@injectable()
export class DeleteFluxoCaixaUseCase {
  constructor(
    @inject('FluxoCaixaRepository')
    private fluxoCaixaRepository: IFluxoCaixaRepository
  ) {}

  async execute(id: string): Promise<void> {
    if (!id) {
      throw new Error('ID do movimento de fluxo de caixa é obrigatório');
    }

    // Verificar se o movimento existe
    const movimento = await this.fluxoCaixaRepository.findById(id);
    if (!movimento) {
      throw new Error('Movimento de fluxo de caixa não encontrado');
    }

    // Não permitir exclusão de movimentos conciliados
    if (movimento.conciliado) {
      throw new Error('Não é possível excluir movimentos já conciliados');
    }

    await this.fluxoCaixaRepository.delete(id);
  }
}