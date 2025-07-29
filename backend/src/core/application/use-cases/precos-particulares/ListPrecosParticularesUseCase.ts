import { inject, injectable } from 'tsyringe';
import { PrecosParticulares } from '../../../domain/entities/PrecosParticulares';
import { IPrecosParticularesRepository } from '../../../domain/repositories/IPrecosParticularesRepository';

interface IRequest {
  pacienteId?: string;
  servicoId?: string;
}

@injectable()
export class ListPrecosParticularesUseCase {
  constructor(
    @inject('PrecosParticularesRepository')
    private precosRepository: IPrecosParticularesRepository
  ) {}

  async execute(filters: IRequest): Promise<PrecosParticulares[]> {
    const precos = await this.precosRepository.findAll(filters);
    return precos;
  }
} 