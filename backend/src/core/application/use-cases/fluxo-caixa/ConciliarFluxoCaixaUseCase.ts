import { injectable, inject } from 'tsyringe';
import { FluxoCaixa } from '../../../domain/entities/FluxoCaixa';
import { IFluxoCaixaRepository } from '../../../domain/repositories/IFluxoCaixaRepository';

@injectable()
export class ConciliarFluxoCaixaUseCase {
  constructor(
    @inject('FluxoCaixaRepository')
    private fluxoCaixaRepository: IFluxoCaixaRepository
  ) {}

  async execute(id: string, dataConciliacao?: Date): Promise<FluxoCaixa> {
    // Verificar se movimento existe
    const movimento = await this.fluxoCaixaRepository.findById(id);
    if (!movimento) {
      throw new Error('Movimento de fluxo de caixa não encontrado');
    }

    // Verificar se já está conciliado
    if (movimento.conciliado) {
      throw new Error('Movimento já está conciliado');
    }

    return this.fluxoCaixaRepository.update(id, {
      conciliado: true,
      dataConciliacao: dataConciliacao || new Date()
    });
  }
}