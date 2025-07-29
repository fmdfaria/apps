import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { DisponibilidadeProfissional } from '../../../domain/entities/DisponibilidadeProfissional';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';
import {
  IDisponibilidadesProfissionaisRepository,
  IUpdateDisponibilidadeProfissionalDTO,
} from '../../../domain/repositories/IDisponibilidadesProfissionaisRepository';

@injectable()
export class UpdateDisponibilidadeProfissionalUseCase {
  constructor(
    @inject('DisponibilidadesProfissionaisRepository')
    private disponibilidadesRepository: IDisponibilidadesProfissionaisRepository,
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository
  ) {}

  async execute(id: string, data: IUpdateDisponibilidadeProfissionalDTO): Promise<DisponibilidadeProfissional> {
    const disponibilidade = await this.disponibilidadesRepository.findById(id);
    if (!disponibilidade) {
      throw new AppError('Disponibilidade não encontrada.', 404);
    }

    if (data.profissionalId) {
      const profissional = await this.profissionaisRepository.findById(data.profissionalId);
      if (!profissional) {
        throw new AppError('Profissional não encontrado.', 404);
      }
    }

    const overlapping = await this.disponibilidadesRepository.existsOverlapping({
      profissionalId: data.profissionalId || disponibilidade.profissionalId,
      diaSemana: data.diaSemana ?? disponibilidade.diaSemana,
      dataEspecifica: data.dataEspecifica ?? disponibilidade.dataEspecifica,
      horaInicio: data.horaInicio ?? disponibilidade.horaInicio,
      horaFim: data.horaFim ?? disponibilidade.horaFim,
      excludeId: id,
    });
    if (overlapping) {
      throw new AppError('Já existe uma disponibilidade sobreposta para este profissional.', 409);
    }

    const updated = await this.disponibilidadesRepository.update(id, data);
    return updated;
  }
} 