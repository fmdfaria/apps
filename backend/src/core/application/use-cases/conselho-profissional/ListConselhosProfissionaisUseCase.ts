import { inject, injectable } from 'tsyringe';
import { ConselhoProfissional } from '../../../domain/entities/ConselhoProfissional';
import { IConselhosProfissionaisRepository } from '../../../domain/repositories/IConselhosProfissionaisRepository';

@injectable()
export class ListConselhosProfissionaisUseCase {
  constructor(
    @inject('ConselhosProfissionaisRepository')
    private conselhosProfissionaisRepository: IConselhosProfissionaisRepository
  ) {}

  async execute(): Promise<ConselhoProfissional[]> {
    const conselhos = await this.conselhosProfissionaisRepository.findAll();
    return conselhos;
  }
} 