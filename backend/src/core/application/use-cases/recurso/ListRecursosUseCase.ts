import { inject, injectable } from 'tsyringe';
import { Recurso } from '../../../domain/entities/Recurso';
import { IRecursosRepository } from '../../../domain/repositories/IRecursosRepository';

@injectable()
export class ListRecursosUseCase {
  constructor(
    @inject('RecursosRepository')
    private recursosRepository: IRecursosRepository
  ) {}

  async execute(): Promise<Recurso[]> {
    const recursos = await this.recursosRepository.findAll();
    return recursos;
  }
} 