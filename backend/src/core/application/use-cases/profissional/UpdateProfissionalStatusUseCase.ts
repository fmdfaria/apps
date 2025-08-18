import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { Profissional } from '../../../domain/entities/Profissional';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';

interface IRequest {
  id: string;
  ativo: boolean;
}

@injectable()
export class UpdateProfissionalStatusUseCase {
  constructor(
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository
  ) {}

  async execute({ id, ativo }: IRequest): Promise<Profissional> {
    const profissional = await this.profissionaisRepository.findById(id);
    if (!profissional) {
      throw new AppError('Profissional não encontrado.', 404);
    }

    const updated = await this.profissionaisRepository.update(id, { ativo });
    return updated;
  }
}


