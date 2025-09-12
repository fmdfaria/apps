import { injectable, inject } from 'tsyringe';
import { ICategoriasFinanceirasRepository } from '../../../domain/repositories/ICategoriasFinanceirasRepository';

@injectable()
export class DeleteCategoriaFinanceiraUseCase {
  constructor(
    @inject('CategoriasFinanceirasRepository')
    private categoriasRepository: ICategoriasFinanceirasRepository
  ) {}

  async execute(id: string): Promise<void> {
    // Verificar se categoria existe
    const categoria = await this.categoriasRepository.findById(id);
    if (!categoria) {
      throw new Error('Categoria financeira não encontrada');
    }

    // TODO: Verificar se categoria possui contas associadas antes de permitir exclusão
    // const possuiContas = await this.verificarContasAssociadas(id);
    // if (possuiContas) {
    //   throw new Error('Não é possível excluir categoria com contas associadas');
    // }

    return this.categoriasRepository.delete(id);
  }
}