import { inject, injectable } from 'tsyringe';
import { IAgendamentosRepository } from '@/core/domain/repositories/IAgendamentosRepository';
import { AppError } from '@/shared/errors/AppError';

interface MarcarWhatsappPagamentoEnviadoRequest {
  agendamentosIds: string[];
}

interface MarcarWhatsappPagamentoEnviadoResponse {
  agendamentosAtualizados: number;
  agendamentosIds: string[];
}

@injectable()
export class MarcarWhatsappPagamentoEnviadoUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository
  ) {}

  async execute({
    agendamentosIds
  }: MarcarWhatsappPagamentoEnviadoRequest): Promise<MarcarWhatsappPagamentoEnviadoResponse> {
    if (!agendamentosIds || agendamentosIds.length === 0) {
      throw new AppError('Nenhum agendamento informado para marcar', 400);
    }

    // Marcar todos os agendamentos como whatsapp_pagamento_enviado = true
    const agendamentosAtualizadosIds: string[] = [];
    let agendamentosAtualizados = 0;

    for (const agendamentoId of agendamentosIds) {
      try {
        await this.agendamentosRepository.update(agendamentoId, {
          whatsappPagamentoEnviado: true
        });
        agendamentosAtualizadosIds.push(agendamentoId);
        agendamentosAtualizados++;
      } catch (error) {
        console.error(`Erro ao atualizar agendamento ${agendamentoId}:`, error);
      }
    }

    return {
      agendamentosAtualizados,
      agendamentosIds: agendamentosAtualizadosIds
    };
  }
}
