import { inject, injectable } from 'tsyringe';
import { Banco } from '../../../domain/entities/Banco';
import { IBancosRepository } from '../../../domain/repositories/IBancosRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface CreateBancoRequest {
  codigo: string;
  nome: string;
}

@injectable()
export class CreateBancoUseCase {
  constructor(
    @inject('BancosRepository')
    private bancosRepository: IBancosRepository
  ) {}

  async execute({ codigo, nome }: CreateBancoRequest): Promise<Banco> {
    // Verificar se já existe um banco com o mesmo código
    const bancoExistente = await this.bancosRepository.findByCodigo(codigo);
    
    if (bancoExistente) {
      throw new AppError('Já existe um banco com este código', 400);
    }

    const banco = await this.bancosRepository.create({
      codigo,
      nome
    });

    return banco;
  }
}