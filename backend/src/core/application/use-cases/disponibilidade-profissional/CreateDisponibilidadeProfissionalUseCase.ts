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
    const { profissionalId, recursoId, diaSemana, dataEspecifica, horaInicio, horaFim } = data;

    const profissional = await this.profissionaisRepository.findById(profissionalId);
    if (!profissional) {
      throw new AppError('Profissional não encontrado.', 404);
    }

    // Validação 1: Verificar sobreposição para o mesmo profissional
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

    // Validação 2: Verificar conflito de recurso (apenas para atendimentos presenciais)
    // Para atendimentos online, múltiplos profissionais podem usar o mesmo "recurso" simultaneamente
    if (recursoId && diaSemana !== null && diaSemana !== undefined && !dataEspecifica) {
      const resourceConflict = await this.disponibilidadesRepository.findResourceConflict({
        recursoId,
        diaSemana,
        dataEspecifica,
        horaInicio,
        horaFim,
      });
      
      if (resourceConflict && resourceConflict.profissional) {
        // Verificar se é atendimento online - se for, permitir múltiplos profissionais
        const isOnline = data.tipo === 'online';
        
        if (!isOnline) {
          // Apenas bloquear para atendimentos presenciais
          const nomeProfissional = resourceConflict.profissional.nome;
          const nomeRecurso = resourceConflict.recurso?.nome || 'o recurso';
          throw new AppError(
            `Conflito de horário detectado! O profissional "${nomeProfissional}" já está utilizando ${nomeRecurso} neste horário.`, 
            409
          );
        }
        // Para atendimentos online, não bloquear - permite múltiplos profissionais simultaneamente
      }
    }

    const disponibilidade = await this.disponibilidadesRepository.create({
      ...data,
      tipo: data.tipo || 'disponivel',
    });
    return disponibilidade;
  }
} 