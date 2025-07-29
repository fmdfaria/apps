import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { PrecosParticulares } from '../../../domain/entities/PrecosParticulares';
import {
  IPrecosParticularesRepository,
  IUpdatePrecoParticularDTO,
} from '../../../domain/repositories/IPrecosParticularesRepository';

@injectable()
export class UpdatePrecoParticularUseCase {
  constructor(
    @inject('PrecosParticularesRepository')
    private precosRepository: IPrecosParticularesRepository
  ) {}

  async execute({
    id,
    ...data
  }: IUpdatePrecoParticularDTO & { id: string }): Promise<PrecosParticulares> {
    const preco = await this.precosRepository.findById(id);

    if (!preco) {
      throw new AppError('Preço particular não encontrado.', 404);
    }

    // Impede a alteração das chaves estrangeiras
    if (data.pacienteId || data.servicoId) {
      throw new AppError(
        'Não é permitido alterar o paciente ou o serviço de um preço existente.'
      );
    }

    const updatedPreco = await this.precosRepository.update(id, data);

    return updatedPreco;
  }
} 