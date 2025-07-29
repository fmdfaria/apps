import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { Recurso } from '../../../domain/entities/Recurso';
import { IRecursosRepository } from '../../../domain/repositories/IRecursosRepository';

interface IRequest {
  nome: string;
  descricao?: string;
}

@injectable()
export class CreateRecursoUseCase {
  constructor(
    @inject('RecursosRepository')
    private recursosRepository: IRecursosRepository
  ) {}

  async execute({ nome, descricao }: IRequest): Promise<Recurso> {
    const recursoExists = await this.recursosRepository.findByName(nome);

    if (recursoExists) {
      throw new AppError('Recurso já cadastrado.');
    }

    const recurso = await this.recursosRepository.create({
      nome,
      descricao,
    });

    return recurso;
  }
} 