import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { ContratoProfissional } from '../../../domain/entities/ContratoProfissional';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';
import {
  IContratosProfissionaisRepository,
  ICreateContratoProfissionalDTO,
} from '../../../domain/repositories/IContratosProfissionaisRepository';

@injectable()
export class CreateContratoProfissionalUseCase {
  constructor(
    @inject('ContratosProfissionaisRepository')
    private contratosRepository: IContratosProfissionaisRepository,
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository
  ) {}

  async execute(data: ICreateContratoProfissionalDTO): Promise<ContratoProfissional> {
    const { profissionalId } = data;
    const profissional = await this.profissionaisRepository.findById(profissionalId);
    if (!profissional) {
      throw new AppError('Profissional não encontrado.', 404);
    }
    const contrato = await this.contratosRepository.create(data);
    return contrato;
  }
} 