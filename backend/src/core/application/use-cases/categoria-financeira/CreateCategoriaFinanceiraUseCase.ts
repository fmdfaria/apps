import { injectable, inject } from 'tsyringe';
import { CategoriaFinanceira } from '../../../domain/entities/CategoriaFinanceira';
import { ICategoriasFinanceirasRepository } from '../../../domain/repositories/ICategoriasFinanceirasRepository';

interface CreateCategoriaFinanceiraRequest {
  nome: string;
  tipo: string; // RECEITA, DESPESA
  descricao?: string;
  ativo?: boolean;
}

@injectable()
export class CreateCategoriaFinanceiraUseCase {
  constructor(
    @inject('CategoriasFinanceirasRepository')
    private categoriasRepository: ICategoriasFinanceirasRepository
  ) {}

  async execute(data: CreateCategoriaFinanceiraRequest): Promise<CategoriaFinanceira> {
    // Verificar se nome já existe
    const categoriaExistente = await this.categoriasRepository.findByNome(data.nome);
    if (categoriaExistente) {
      throw new Error('Nome da categoria já existe');
    }

    // Validar tipo
    if (!['RECEITA', 'DESPESA'].includes(data.tipo)) {
      throw new Error('Tipo deve ser RECEITA ou DESPESA');
    }

    const categoria = new CategoriaFinanceira({
      nome: data.nome,
      tipo: data.tipo,
      descricao: data.descricao,
      ativo: data.ativo ?? true
    });

    return this.categoriasRepository.create(categoria);
  }
}