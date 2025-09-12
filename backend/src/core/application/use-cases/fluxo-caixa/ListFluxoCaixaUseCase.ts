import { injectable, inject } from 'tsyringe';
import { FluxoCaixa } from '../../../domain/entities/FluxoCaixa';
import { IFluxoCaixaRepository } from '../../../domain/repositories/IFluxoCaixaRepository';

interface ListFluxoCaixaRequest {
  empresaId?: string;
  contaBancariaId?: string;
  tipo?: string;
  categoriaId?: string;
  dataMovimentoInicio?: Date;
  dataMovimentoFim?: Date;
  conciliado?: boolean;
  page?: number;
  limit?: number;
}

@injectable()
export class ListFluxoCaixaUseCase {
  constructor(
    @inject('FluxoCaixaRepository')
    private fluxoCaixaRepository: IFluxoCaixaRepository
  ) {}

  async execute(filters?: ListFluxoCaixaRequest): Promise<FluxoCaixa[]> {
    return this.fluxoCaixaRepository.findAll({
      empresaId: filters?.empresaId,
      contaBancariaId: filters?.contaBancariaId,
      tipo: filters?.tipo,
      categoriaId: filters?.categoriaId,
      dataMovimentoInicio: filters?.dataMovimentoInicio,
      dataMovimentoFim: filters?.dataMovimentoFim,
      conciliado: filters?.conciliado
    });
  }
}