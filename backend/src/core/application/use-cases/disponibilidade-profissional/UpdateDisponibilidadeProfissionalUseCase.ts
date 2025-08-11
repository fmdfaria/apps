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

    const mergedData = {
      profissionalId: data.profissionalId || disponibilidade.profissionalId,
      recursoId: data.recursoId !== undefined ? data.recursoId : disponibilidade.recursoId,
      diaSemana: data.diaSemana !== undefined ? data.diaSemana : disponibilidade.diaSemana,
      dataEspecifica: data.dataEspecifica !== undefined ? data.dataEspecifica : disponibilidade.dataEspecifica,
      horaInicio: data.horaInicio ?? disponibilidade.horaInicio,
      horaFim: data.horaFim ?? disponibilidade.horaFim,
    };

    // Validação 1: Verificar sobreposição para o mesmo profissional
    const overlapping = await this.disponibilidadesRepository.existsOverlapping({
      profissionalId: mergedData.profissionalId,
      diaSemana: mergedData.diaSemana,
      dataEspecifica: mergedData.dataEspecifica,
      horaInicio: mergedData.horaInicio,
      horaFim: mergedData.horaFim,
      excludeId: id,
    });
    if (overlapping) {
      throw new AppError('Já existe uma disponibilidade sobreposta para este profissional.', 409);
    }

    // Validação 2: Verificar conflito de recurso (apenas para disponibilidades semanais com recurso)
    if (mergedData.recursoId && mergedData.diaSemana !== null && mergedData.diaSemana !== undefined && !mergedData.dataEspecifica) {
      const resourceConflict = await this.disponibilidadesRepository.findResourceConflict({
        recursoId: mergedData.recursoId,
        diaSemana: mergedData.diaSemana,
        dataEspecifica: mergedData.dataEspecifica,
        horaInicio: mergedData.horaInicio,
        horaFim: mergedData.horaFim,
        excludeId: id,
      });
      
      if (resourceConflict && resourceConflict.profissional) {
        const nomeProfissional = resourceConflict.profissional.nome;
        const nomeRecurso = resourceConflict.recurso?.nome || 'o recurso';
        throw new AppError(
          `Conflito de horário detectado! O profissional "${nomeProfissional}" já está utilizando ${nomeRecurso} neste horário.`, 
          409
        );
      }
    }

    const updated = await this.disponibilidadesRepository.update(id, data);
    return updated;
  }
} 