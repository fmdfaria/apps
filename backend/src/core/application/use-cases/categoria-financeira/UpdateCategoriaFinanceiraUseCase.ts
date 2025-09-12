import { injectable, inject } from 'tsyringe';
import { CategoriaFinanceira } from '../../../domain/entities/CategoriaFinanceira';
import { ICategoriasFinanceirasRepository } from '../../../domain/repositories/ICategoriasFinanceirasRepository';

interface UpdateCategoriaFinanceiraRequest {
  nome?: string;
  tipo?: string;
  descricao?: string;
  ativo?: boolean;
}

@injectable()
export class UpdateCategoriaFinanceiraUseCase {
  constructor(
    @inject('CategoriasFinanceirasRepository')
    private categoriasRepository: ICategoriasFinanceirasRepository
  ) {}

  async execute(id: string, data: UpdateCategoriaFinanceiraRequest): Promise<CategoriaFinanceira> {
    // Verificar se categoria existe
    const categoriaExistente = await this.categoriasRepository.findById(id);
    if (!categoriaExistente) {
      throw new Error('Categoria financeira não encontrada');
    }

    // Se estiver alterando o nome, verificar se já existe
    if (data.nome && data.nome !== categoriaExistente.nome) {
      const categoriaComMesmoNome = await this.categoriasRepository.findByNome(data.nome);
      if (categoriaComMesmoNome) {
        throw new Error('Nome da categoria já existe');
      }
    }

    // Validar tipo se fornecido
    if (data.tipo && !['RECEITA', 'DESPESA'].includes(data.tipo)) {
      throw new Error('Tipo deve ser RECEITA ou DESPESA');
    }

    return this.categoriasRepository.update(id, data);
  }
}