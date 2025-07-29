import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IAgendamentosRepository, IUpdateAgendamentoDTO } from '../../../domain/repositories/IAgendamentosRepository';
import { Agendamento } from '../../../domain/entities/Agendamento';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';

@injectable()
export class UpdateAgendamentoUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository,
    @inject('ServicosRepository')
    private servicosRepository: IServicosRepository
  ) {}

  async execute(id: string, data: IUpdateAgendamentoDTO): Promise<Agendamento> {
    // Se profissionalId e dataHoraInicio forem atualizados, validar duplicidade
    if (data.profissionalId && data.dataHoraInicio) {
      const existente = await this.agendamentosRepository.findByProfissionalAndDataHoraInicio(data.profissionalId, data.dataHoraInicio);
      if (existente && existente.id !== id) {
        throw new AppError('Já existe um agendamento para este profissional neste horário.', 400);
      }
    }
    // Se dataHoraInicio ou servicoId forem atualizados, recalcular dataHoraFim
    let dataHoraFim = data.dataHoraFim;
    if (data.dataHoraInicio || data.servicoId) {
      // Buscar o agendamento atual para obter servicoId/dataHoraInicio se não vierem no update
      const agendamentoAtual = await this.agendamentosRepository.findById(id);
      if (!agendamentoAtual) {
        throw new AppError('Agendamento não encontrado.', 404);
      }
      const servicoId = data.servicoId || agendamentoAtual.servicoId;
      const dataHoraInicio = data.dataHoraInicio || agendamentoAtual.dataHoraInicio;
      const servico = await this.servicosRepository.findById(servicoId);
      if (!servico) {
        throw new AppError('Serviço não encontrado.', 404);
      }
      dataHoraFim = new Date(new Date(dataHoraInicio).getTime() + servico.duracaoMinutos * 60000);
    }
    return this.agendamentosRepository.update(id, { ...data, dataHoraFim });
  }
} 