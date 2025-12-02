import { inject, injectable } from 'tsyringe';
import { IAgendamentosRepository } from '@/core/domain/repositories/IAgendamentosRepository';
import { AppError } from '@/shared/errors/AppError';

interface MarcarWhatsappPagamentoEnviadoRequest {
  profissionalId: string;
  dataInicio: string;
  dataFim: string;
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
    profissionalId,
    dataInicio,
    dataFim
  }: MarcarWhatsappPagamentoEnviadoRequest): Promise<MarcarWhatsappPagamentoEnviadoResponse> {
    // Buscar agendamentos FINALIZADOS no período
    const result = await this.agendamentosRepository.findAll({
      profissionalId,
      dataInicio,
      dataFim,
      status: 'FINALIZADO'
    });

    const agendamentos = result.data;

    if (agendamentos.length === 0) {
      throw new AppError('Nenhum agendamento encontrado no período informado', 404);
    }

    // Marcar todos os agendamentos como whatsapp_pagamento_enviado = true
    const agendamentosIds: string[] = [];
    let agendamentosAtualizados = 0;

    for (const agendamento of agendamentos) {
      try {
        await this.agendamentosRepository.update(agendamento.id!, {
          whatsappPagamentoEnviado: true
        });
        agendamentosIds.push(agendamento.id!);
        agendamentosAtualizados++;
      } catch (error) {
        console.error(`Erro ao atualizar agendamento ${agendamento.id}:`, error);
      }
    }

    return {
      agendamentosAtualizados,
      agendamentosIds
    };
  }
}
