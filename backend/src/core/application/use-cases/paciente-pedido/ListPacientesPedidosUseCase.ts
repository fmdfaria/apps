import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { PacientePedido } from '../../../domain/entities/PacientePedido';
import { IPacientesPedidosRepository } from '../../../domain/repositories/IPacientesPedidosRepository';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';

interface IRequest {
  pacienteId?: string;
}

@injectable()
export class ListPacientesPedidosUseCase {
  constructor(
    @inject('PacientesPedidosRepository')
    private pacientesPedidosRepository: IPacientesPedidosRepository,
    @inject('PacientesRepository')
    private pacientesRepository: IPacientesRepository
  ) {}

  async execute({ pacienteId }: IRequest): Promise<PacientePedido[]> {
    if (pacienteId) {
      const paciente = await this.pacientesRepository.findById(pacienteId);
      if (!paciente) {
        throw new AppError('Paciente não encontrado.', 404);
      }
      return this.pacientesPedidosRepository.findByPacienteId(pacienteId);
    }
    return this.pacientesPedidosRepository.findAll();
  }
}