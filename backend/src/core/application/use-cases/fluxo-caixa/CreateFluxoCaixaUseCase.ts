import { injectable, inject } from 'tsyringe';
import { FluxoCaixa } from '../../../domain/entities/FluxoCaixa';
import { IFluxoCaixaRepository } from '../../../domain/repositories/IFluxoCaixaRepository';

interface CreateFluxoCaixaRequest {
  empresaId: string;
  contaBancariaId: string;
  contaReceberId?: string;
  contaPagarId?: string;
  tipo: string; // ENTRADA, SAIDA
  categoriaId: string;
  descricao: string;
  valor: number;
  dataMovimento: Date;
  formaPagamento?: string;
  observacoes?: string;
  userCreatedId?: string;
}

@injectable()
export class CreateFluxoCaixaUseCase {
  constructor(
    @inject('FluxoCaixaRepository')
    private fluxoCaixaRepository: IFluxoCaixaRepository
  ) {}

  async execute(data: CreateFluxoCaixaRequest): Promise<FluxoCaixa> {
    // Validar tipo
    if (!['ENTRADA', 'SAIDA'].includes(data.tipo)) {
      throw new Error('Tipo deve ser ENTRADA ou SAIDA');
    }

    // Validar valor
    if (data.valor <= 0) {
      throw new Error('Valor deve ser maior que zero');
    }

    const movimento = new FluxoCaixa({
      empresaId: data.empresaId,
      contaBancariaId: data.contaBancariaId,
      contaReceberId: data.contaReceberId,
      contaPagarId: data.contaPagarId,
      tipo: data.tipo,
      categoriaId: data.categoriaId,
      descricao: data.descricao,
      valor: data.valor,
      dataMovimento: data.dataMovimento,
      formaPagamento: data.formaPagamento,
      conciliado: false,
      observacoes: data.observacoes,
      userCreatedId: data.userCreatedId
    });

    return this.fluxoCaixaRepository.create(movimento);
  }
}