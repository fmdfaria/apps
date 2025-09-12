import { injectable, inject } from 'tsyringe';
import { CategoriaFinanceira } from '../../../domain/entities/CategoriaFinanceira';
import { ICategoriasFinanceirasRepository } from '../../../domain/repositories/ICategoriasFinanceirasRepository';

interface ListCategoriasFinanceirasRequest {
  tipo?: string;
  ativo?: boolean;
}

@injectable()
export class ListCategoriasFinanceirasUseCase {
  constructor(
    @inject('CategoriasFinanceirasRepository')
    private categoriasRepository: ICategoriasFinanceirasRepository
  ) {}

  async execute(filters?: ListCategoriasFinanceirasRequest): Promise<CategoriaFinanceira[]> {
    return this.categoriasRepository.findAll(filters);
  }
}