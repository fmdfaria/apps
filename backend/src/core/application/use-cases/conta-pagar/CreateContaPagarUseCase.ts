import { injectable, inject } from 'tsyringe';
import { ContaPagar } from '../../../domain/entities/ContaPagar';
import { IContasPagarRepository } from '../../../domain/repositories/IContasPagarRepository';
import { IEmpresasRepository } from '../../../domain/repositories/IEmpresasRepository';
import { ICategoriasFinanceirasRepository } from '../../../domain/repositories/ICategoriasFinanceirasRepository';

interface CreateContaPagarRequest {
  empresaId: string;
  contaBancariaId?: string;
  profissionalId?: string;
  categoriaId: string;
  numeroDocumento?: string;
  descricao: string;
  valorOriginal: number;
  valorDesconto?: number;
  valorJuros?: number;
  valorMulta?: number;
  dataEmissao: Date;
  dataVencimento: Date;
  tipoConta?: string;
  recorrente?: boolean;
  periodicidade?: string;
  observacoes?: string;
  userCreatedId?: string;
}

@injectable()
export class CreateContaPagarUseCase {
  constructor(
    @inject('ContasPagarRepository')
    private contasPagarRepository: IContasPagarRepository,
    @inject('EmpresasRepository')
    private empresasRepository: IEmpresasRepository,
    @inject('CategoriasFinanceirasRepository')
    private categoriasRepository: ICategoriasFinanceirasRepository
  ) {}

  async execute(data: CreateContaPagarRequest): Promise<ContaPagar> {
    // Validações
    const empresa = await this.empresasRepository.findById(data.empresaId);
    if (!empresa) {
      throw new Error('Empresa não encontrada');
    }

    const categoria = await this.categoriasRepository.findById(data.categoriaId);
    if (!categoria) {
      throw new Error('Categoria não encontrada');
    }

    if (categoria.tipo !== 'DESPESA') {
      throw new Error('Categoria deve ser do tipo DESPESA');
    }

    if (data.valorOriginal <= 0) {
      throw new Error('Valor original deve ser maior que zero');
    }

    // Calcular valor líquido
    const valorDesconto = data.valorDesconto ?? 0;
    const valorJuros = data.valorJuros ?? 0;
    const valorMulta = data.valorMulta ?? 0;
    const valorLiquido = data.valorOriginal - valorDesconto + valorJuros + valorMulta;

    if (valorLiquido <= 0) {
      throw new Error('Valor líquido deve ser maior que zero');
    }

    const conta = new ContaPagar({
      empresaId: data.empresaId,
      contaBancariaId: data.contaBancariaId,
      profissionalId: data.profissionalId,
      categoriaId: data.categoriaId,
      numeroDocumento: data.numeroDocumento,
      descricao: data.descricao,
      valorOriginal: data.valorOriginal,
      valorDesconto: valorDesconto,
      valorJuros: valorJuros,
      valorMulta: valorMulta,
      valorLiquido: valorLiquido,
      valorPago: 0,
      dataEmissao: data.dataEmissao,
      dataVencimento: data.dataVencimento,
      status: 'PENDENTE',
      tipoConta: data.tipoConta ?? 'DESPESA',
      recorrente: data.recorrente ?? false,
      periodicidade: data.periodicidade,
      observacoes: data.observacoes,
      userCreatedId: data.userCreatedId
    });

    return this.contasPagarRepository.create(conta);
  }
}