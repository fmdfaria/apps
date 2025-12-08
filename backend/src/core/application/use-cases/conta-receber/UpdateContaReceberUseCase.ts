import { injectable, inject } from 'tsyringe';
import { IContasReceberRepository } from '../../../domain/repositories/IContasReceberRepository';
import { ContaReceber } from '../../../domain/entities/ContaReceber';

interface UpdateContaReceberRequest {
  empresaId?: string;
  contaBancariaId?: string;
  convenioId?: string;
  pacienteId?: string;
  categoriaId?: string;
  numeroDocumento?: string;
  descricao?: string;
  valorOriginal?: number;
  valorDesconto?: number;
  valorJuros?: number;
  valorMulta?: number;
  dataEmissao?: Date;
  dataVencimento?: Date;
  status?: string; // PENDENTE, PARCIAL, RECEBIDO, VENCIDO, CANCELADO, SOLICITADO
  observacoes?: string;
}

@injectable()
export class UpdateContaReceberUseCase {
  constructor(
    @inject('ContasReceberRepository')
    private contasReceberRepository: IContasReceberRepository
  ) {}

  async execute(id: string, data: UpdateContaReceberRequest): Promise<ContaReceber> {
    const contaExistente = await this.contasReceberRepository.findById(id);
    if (!contaExistente) {
      throw new Error('Conta a receber não encontrada');
    }

    // Recalcular valor líquido se necessário
    let valorLiquido = contaExistente.valorLiquido;
    if (data.valorOriginal !== undefined || data.valorDesconto !== undefined || 
        data.valorJuros !== undefined || data.valorMulta !== undefined) {
      
      const valorOriginal = data.valorOriginal ?? contaExistente.valorOriginal;
      const valorDesconto = data.valorDesconto ?? contaExistente.valorDesconto;
      const valorJuros = data.valorJuros ?? contaExistente.valorJuros;
      const valorMulta = data.valorMulta ?? contaExistente.valorMulta;
      
      valorLiquido = valorOriginal - valorDesconto + valorJuros + valorMulta;
    }

    return this.contasReceberRepository.update(id, {
      ...data,
      valorLiquido
    });
  }
}