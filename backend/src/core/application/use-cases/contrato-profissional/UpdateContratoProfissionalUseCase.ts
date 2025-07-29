import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { ContratoProfissional } from '../../../domain/entities/ContratoProfissional';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';
import {
  IContratosProfissionaisRepository,
  IUpdateContratoProfissionalDTO,
} from '../../../domain/repositories/IContratosProfissionaisRepository';

@injectable()
export class UpdateContratoProfissionalUseCase {
  constructor(
    @inject('ContratosProfissionaisRepository')
    private contratosRepository: IContratosProfissionaisRepository,
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository
  ) {}

  async execute(id: string, data: IUpdateContratoProfissionalDTO): Promise<ContratoProfissional> {
    const contrato = await this.contratosRepository.findById(id);
    if (!contrato) {
      throw new AppError('Contrato não encontrado.', 404);
    }
    if (data.profissionalId) {
      const profissional = await this.profissionaisRepository.findById(data.profissionalId);
      if (!profissional) {
        throw new AppError('Profissional não encontrado.', 404);
      }
    }
    const updated = await this.contratosRepository.update(id, data);
    return updated;
  }
} 