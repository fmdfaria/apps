import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { AdendoContrato } from '../../../domain/entities/AdendoContrato';
import { IContratosProfissionaisRepository } from '../../../domain/repositories/IContratosProfissionaisRepository';
import {
  IAdendosContratosRepository,
  IUpdateAdendoContratoDTO,
} from '../../../domain/repositories/IAdendosContratosRepository';

@injectable()
export class UpdateAdendoContratoUseCase {
  constructor(
    @inject('AdendosContratosRepository')
    private adendosRepository: IAdendosContratosRepository,
    @inject('ContratosProfissionaisRepository')
    private contratosRepository: IContratosProfissionaisRepository
  ) {}

  async execute(id: string, data: IUpdateAdendoContratoDTO): Promise<AdendoContrato> {
    const adendo = await this.adendosRepository.findById(id);
    if (!adendo) {
      throw new AppError('Adendo não encontrado.', 404);
    }
    if (data.contratoId) {
      const contrato = await this.contratosRepository.findById(data.contratoId);
      if (!contrato) {
        throw new AppError('Contrato não encontrado.', 404);
      }
    }
    const updated = await this.adendosRepository.update(id, data);
    return updated;
  }
} 