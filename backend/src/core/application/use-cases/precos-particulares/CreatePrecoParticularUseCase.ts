import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { PrecosParticulares } from '../../../domain/entities/PrecosParticulares';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';
import {
  IPrecosParticularesRepository,
  ICreatePrecoParticularDTO,
} from '../../../domain/repositories/IPrecosParticularesRepository';

@injectable()
export class CreatePrecoParticularUseCase {
  constructor(
    @inject('PrecosParticularesRepository')
    private precosRepository: IPrecosParticularesRepository,
    @inject('PacientesRepository')
    private pacientesRepository: IPacientesRepository,
    @inject('ServicosRepository')
    private servicosRepository: IServicosRepository
  ) {}

  async execute(
    data: ICreatePrecoParticularDTO
  ): Promise<PrecosParticulares> {
    const { pacienteId, servicoId } = data;

    const [paciente, servico, precoExists] = await Promise.all([
      this.pacientesRepository.findById(pacienteId),
      this.servicosRepository.findById(servicoId),
      this.precosRepository.findByPacienteAndServico(pacienteId, servicoId),
    ]);

    if (!paciente) {
      throw new AppError('Paciente não encontrado.', 404);
    }

    if (!servico) {
      throw new AppError('Serviço não encontrado.', 404);
    }

    if (precoExists) {
      throw new AppError(
        'Já existe um preço particular cadastrado para este paciente e serviço.',
        409
      );
    }

    const preco = await this.precosRepository.create(data);

    return preco;
  }
} 