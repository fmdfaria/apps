import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { DisponibilidadeProfissional } from '../../../domain/entities/DisponibilidadeProfissional';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';
import {
  IDisponibilidadesProfissionaisRepository,
  ICreateDisponibilidadeProfissionalDTO,
} from '../../../domain/repositories/IDisponibilidadesProfissionaisRepository';

@injectable()
export class CreateDisponibilidadeProfissionalUseCase {
  constructor(
    @inject('DisponibilidadesProfissionaisRepository')
    private disponibilidadesRepository: IDisponibilidadesProfissionaisRepository,
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository
  ) {}

  async execute(data: ICreateDisponibilidadeProfissionalDTO): Promise<DisponibilidadeProfissional> {
    const { profissionalId, diaSemana, dataEspecifica, horaInicio, horaFim } = data;

    const profissional = await this.profissionaisRepository.findById(profissionalId);
    if (!profissional) {
      throw new AppError('Profissional não encontrado.', 404);
    }

    const overlapping = await this.disponibilidadesRepository.existsOverlapping({
      profissionalId,
      diaSemana,
      dataEspecifica,
      horaInicio,
      horaFim,
    });
    if (overlapping) {
      throw new AppError('Já existe uma disponibilidade sobreposta para este profissional.', 409);
    }

    const disponibilidade = await this.disponibilidadesRepository.create({
      ...data,
      tipo: data.tipo || 'disponivel',
    });
    return disponibilidade;
  }
} 