import { injectable, inject } from 'tsyringe';
import { Empresa } from '../../../domain/entities/Empresa';
import { IEmpresasRepository } from '../../../domain/repositories/IEmpresasRepository';

interface ListEmpresasRequest {
  ativo?: boolean;
  empresaPrincipal?: boolean;
}

@injectable()
export class ListEmpresasUseCase {
  constructor(
    @inject('EmpresasRepository')
    private empresasRepository: IEmpresasRepository
  ) {}

  async execute(filters?: ListEmpresasRequest): Promise<Empresa[]> {
    return this.empresasRepository.findAll(filters);
  }
}