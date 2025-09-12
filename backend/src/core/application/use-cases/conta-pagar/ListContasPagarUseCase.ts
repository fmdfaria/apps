import { injectable, inject } from 'tsyringe';
import { ContaPagar } from '../../../domain/entities/ContaPagar';
import { IContasPagarRepository } from '../../../domain/repositories/IContasPagarRepository';

interface ListContasPagarRequest {
  empresaId?: string;
  profissionalId?: string;
  status?: string;
  dataVencimentoInicio?: Date;
  dataVencimentoFim?: Date;
  vencidas?: boolean;
  pendentes?: boolean;
}

@injectable()
export class ListContasPagarUseCase {
  constructor(
    @inject('ContasPagarRepository')
    private contasPagarRepository: IContasPagarRepository
  ) {}

  async execute(filters?: ListContasPagarRequest): Promise<ContaPagar[]> {
    return this.contasPagarRepository.findAll(filters);
  }
}