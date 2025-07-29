import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { Recurso } from '../../../domain/entities/Recurso';
import { IRecursosRepository } from '../../../domain/repositories/IRecursosRepository';

interface IRequest {
  id: string;
  nome: string;
  descricao?: string;
}

@injectable()
export class UpdateRecursoUseCase {
  constructor(
    @inject('RecursosRepository')
    private recursosRepository: IRecursosRepository
  ) {}

  async execute({ id, nome, descricao }: IRequest): Promise<Recurso> {
    const recurso = await this.recursosRepository.findById(id);

    if (!recurso) {
      throw new AppError('Recurso não encontrado.', 404);
    }

    const recursoComMesmoNome = await this.recursosRepository.findByName(nome);

    if (recursoComMesmoNome && recursoComMesmoNome.id !== id) {
      throw new AppError('Já existe um recurso com este nome.');
    }

    recurso.nome = nome;
    recurso.descricao = descricao;

    await this.recursosRepository.save(recurso);

    return recurso;
  }
} 