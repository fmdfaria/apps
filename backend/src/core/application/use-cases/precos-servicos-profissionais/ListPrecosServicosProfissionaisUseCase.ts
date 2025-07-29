import { inject, injectable } from 'tsyringe';
import { PrecosServicosProfissionais } from '../../../domain/entities/PrecosServicosProfissionais';
import { IPrecosServicosProfissionaisRepository } from '../../../domain/repositories/IPrecosServicosProfissionaisRepository';

interface IRequest {
  profissionalId?: string;
  servicoId?: string;
}

@injectable()
export class ListPrecosServicosProfissionaisUseCase {
  constructor(
    @inject('PrecosServicosProfissionaisRepository')
    private precosRepository: IPrecosServicosProfissionaisRepository
  ) {}

  async execute(
    filters: IRequest
  ): Promise<PrecosServicosProfissionais[]> {
    const precos = await this.precosRepository.findAll(filters);
    return precos;
  }
} 