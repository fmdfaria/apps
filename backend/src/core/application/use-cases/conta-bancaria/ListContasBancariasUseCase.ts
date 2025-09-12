import { injectable, inject } from 'tsyringe';
import { ContaBancaria } from '../../../domain/entities/ContaBancaria';
import { IContasBancariasRepository } from '../../../domain/repositories/IContasBancariasRepository';

interface ListContasBancariasRequest {
  empresaId?: string;
  ativo?: boolean;
  contaPrincipal?: boolean;
}

@injectable()
export class ListContasBancariasUseCase {
  constructor(
    @inject('ContasBancariasRepository')
    private contasBancariasRepository: IContasBancariasRepository
  ) {}

  async execute(filters?: ListContasBancariasRequest): Promise<ContaBancaria[]> {
    return this.contasBancariasRepository.findAll(filters);
  }
}