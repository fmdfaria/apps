import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { AdendoContrato } from '../../../domain/entities/AdendoContrato';
import { IContratosProfissionaisRepository } from '../../../domain/repositories/IContratosProfissionaisRepository';
import {
  IAdendosContratosRepository,
  ICreateAdendoContratoDTO,
} from '../../../domain/repositories/IAdendosContratosRepository';

@injectable()
export class CreateAdendoContratoUseCase {
  constructor(
    @inject('AdendosContratosRepository')
    private adendosRepository: IAdendosContratosRepository,
    @inject('ContratosProfissionaisRepository')
    private contratosRepository: IContratosProfissionaisRepository
  ) {}

  async execute(data: ICreateAdendoContratoDTO): Promise<AdendoContrato> {
    const { contratoId } = data;
    const contrato = await this.contratosRepository.findById(contratoId);
    if (!contrato) {
      throw new AppError('Contrato não encontrado.', 404);
    }
    const adendo = await this.adendosRepository.create(data);
    return adendo;
  }
} 