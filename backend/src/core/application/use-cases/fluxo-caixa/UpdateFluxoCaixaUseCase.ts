import { injectable, inject } from 'tsyringe';
import { FluxoCaixa } from '../../../domain/entities/FluxoCaixa';
import { IFluxoCaixaRepository } from '../../../domain/repositories/IFluxoCaixaRepository';

interface UpdateFluxoCaixaRequest {
  descricao?: string;
  valor?: number;
  dataMovimento?: Date;
  formaPagamento?: string;
  observacoes?: string;
}

@injectable()
export class UpdateFluxoCaixaUseCase {
  constructor(
    @inject('FluxoCaixaRepository')
    private fluxoCaixaRepository: IFluxoCaixaRepository
  ) {}

  async execute(id: string, data: UpdateFluxoCaixaRequest): Promise<FluxoCaixa> {
    // Verificar se movimento existe
    const movimentoExistente = await this.fluxoCaixaRepository.findById(id);
    if (!movimentoExistente) {
      throw new Error('Movimento de fluxo de caixa não encontrado');
    }

    // Não permitir alteração de movimentos já conciliados
    if (movimentoExistente.conciliado) {
      throw new Error('Não é possível alterar movimento já conciliado');
    }

    // Validar valor se fornecido
    if (data.valor && data.valor <= 0) {
      throw new Error('Valor deve ser maior que zero');
    }

    return this.fluxoCaixaRepository.update(id, data);
  }
}