import { inject, injectable } from 'tsyringe';
import { Banco } from '../../../domain/entities/Banco';
import { IBancosRepository } from '../../../domain/repositories/IBancosRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface UpdateBancoRequest {
  id: string;
  codigo?: string;
  nome?: string;
}

@injectable()
export class UpdateBancoUseCase {
  constructor(
    @inject('BancosRepository')
    private bancosRepository: IBancosRepository
  ) {}

  async execute({ id, codigo, nome }: UpdateBancoRequest): Promise<Banco> {
    const banco = await this.bancosRepository.findById(id);
    
    if (!banco) {
      throw new AppError('Banco não encontrado', 404);
    }

    // Se está alterando o código, verificar se não existe outro banco com o mesmo código
    if (codigo && codigo !== banco.codigo) {
      const bancoExistente = await this.bancosRepository.findByCodigo(codigo);
      
      if (bancoExistente) {
        throw new AppError('Já existe um banco com este código', 400);
      }
    }

    const bancoAtualizado = await this.bancosRepository.update(id, {
      codigo,
      nome
    });

    return bancoAtualizado;
  }
}