import { injectable, inject } from 'tsyringe';
import { ContaPagar } from '../../../domain/entities/ContaPagar';
import { IContasPagarRepository } from '../../../domain/repositories/IContasPagarRepository';

interface UpdateContaPagarRequest {
  empresaId?: string;
  contaBancariaId?: string;
  profissionalId?: string;
  categoriaId?: string;
  numeroDocumento?: string;
  descricao?: string;
  valorOriginal?: number;
  valorDesconto?: number;
  valorJuros?: number;
  valorMulta?: number;
  valorLiquido?: number;
  dataEmissao?: Date;
  dataVencimento?: Date;
  formaPagamento?: string;
  tipoConta?: string;
  recorrente?: boolean;
  periodicidade?: string;
  observacoes?: string;
}

@injectable()
export class UpdateContaPagarUseCase {
  constructor(
    @inject('ContasPagarRepository')
    private contasPagarRepository: IContasPagarRepository
  ) {}

  async execute(id: string, data: UpdateContaPagarRequest): Promise<ContaPagar> {
    // Verificar se conta existe
    const contaExistente = await this.contasPagarRepository.findById(id);
    if (!contaExistente) {
      throw new Error('Conta a pagar não encontrada');
    }

    // Recalcular valor líquido se necessário
    if (data.valorOriginal || data.valorDesconto || data.valorJuros || data.valorMulta) {
      const valorOriginal = data.valorOriginal ?? contaExistente.valorOriginal;
      const valorDesconto = data.valorDesconto ?? contaExistente.valorDesconto;
      const valorJuros = data.valorJuros ?? contaExistente.valorJuros;
      const valorMulta = data.valorMulta ?? contaExistente.valorMulta;
      
      data.valorLiquido = valorOriginal - valorDesconto + valorJuros + valorMulta;
    }

    return this.contasPagarRepository.update(id, data);
  }
}