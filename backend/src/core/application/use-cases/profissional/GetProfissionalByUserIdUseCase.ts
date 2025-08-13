import { inject, injectable } from 'tsyringe';
import { Profissional } from '../../../domain/entities/Profissional';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';

@injectable()
export class GetProfissionalByUserIdUseCase {
  constructor(
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository
  ) {}

  async execute(userId: string): Promise<Profissional | null> {
    if (!userId) {
      throw new Error('User ID é obrigatório');
    }

    const profissional = await this.profissionaisRepository.findByUserId(userId);
    
    return profissional;
  }
}