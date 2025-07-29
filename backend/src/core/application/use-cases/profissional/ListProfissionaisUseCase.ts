import { inject, injectable } from 'tsyringe';
import { Profissional } from '../../../domain/entities/Profissional';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';

@injectable()
export class ListProfissionaisUseCase {
  constructor(
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository
  ) {}

  async execute(): Promise<Profissional[]> {
    const profissionais = await this.profissionaisRepository.findAll();
    return profissionais;
  }
} 