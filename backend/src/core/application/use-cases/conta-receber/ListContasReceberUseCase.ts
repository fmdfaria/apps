import { injectable, inject } from 'tsyringe';
import { IContasReceberRepository } from '../../../domain/repositories/IContasReceberRepository';
import { ContaReceber } from '../../../domain/entities/ContaReceber';

interface ListContasReceberRequest {
  empresaId?: string;
  contaBancariaId?: string;
  pacienteId?: string;
  convenioId?: string;
  status?: string;
  dataVencimentoInicio?: Date;
  dataVencimentoFim?: Date;
}

@injectable()
export class ListContasReceberUseCase {
  constructor(
    @inject('ContasReceberRepository')
    private contasReceberRepository: IContasReceberRepository
  ) {}

  async execute(filters?: ListContasReceberRequest): Promise<ContaReceber[]> {
    return this.contasReceberRepository.findAll(filters);
  }
}