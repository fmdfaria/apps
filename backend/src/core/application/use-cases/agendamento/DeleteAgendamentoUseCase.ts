import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IAgendamentosRepository } from '../../../domain/repositories/IAgendamentosRepository';
import { GoogleCalendarService } from '../../../../infra/services/GoogleCalendarService';

@injectable()
export class DeleteAgendamentoUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository,
    @inject('GoogleCalendarService')
    private googleCalendarService: GoogleCalendarService
  ) {}

  async execute(id: string, tipoEdicaoRecorrencia?: 'apenas_esta' | 'esta_e_futuras' | 'toda_serie'): Promise<void> {
    const agendamento = await this.agendamentosRepository.findById(id);
    if (!agendamento) {
      throw new AppError('Agendamento não encontrado.', 404);
    }

    // Se for online e tiver googleEventId, verificar se é série recorrente
    if (agendamento.tipoAtendimento === 'online' && 
        agendamento.googleEventId && 
        this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        // Buscar outros agendamentos com mesmo googleEventId (série recorrente)
        const agendamentosDoMesmoEvento = await this.agendamentosRepository.findAll({
          profissionalId: agendamento.profissionalId,
          pacienteId: agendamento.pacienteId,
          servicoId: agendamento.servicoId,
          limit: 100
        });

        const serieRecorrente = agendamentosDoMesmoEvento.data.filter(ag => 
          ag.googleEventId === agendamento.googleEventId && ag.id !== agendamento.id
        );

        if (serieRecorrente.length > 0) {
          // É uma série recorrente
          console.log('🔍 Detectada exclusão em série recorrente:', {
            agendamentoExcluido: agendamento.id,
            totalNaSerie: serieRecorrente.length + 1,
            googleEventId: agendamento.googleEventId,
            tipoEdicao: tipoEdicaoRecorrencia
          });

          const agendamentosFuturos = serieRecorrente.filter(ag => 
            new Date(ag.dataHoraInicio) > new Date(agendamento.dataHoraInicio)
          );

          // Decidir tipo de exclusão
          const tipoExclusao = tipoEdicaoRecorrencia || 
            (agendamentosFuturos.length > 0 ? 'esta_e_futuras' : 'apenas_esta');

          if (tipoExclusao === 'toda_serie') {
            // Excluir TODA a série
            console.log('🗑️ Excluindo TODA a série recorrente');
            
            await this.googleCalendarService.deletarEvento(agendamento.googleEventId);
            
            // Deletar TODOS os agendamentos da série
            const todosAgendamentosDaSerie = [agendamento, ...serieRecorrente];
            await Promise.all(
              todosAgendamentosDaSerie.map(ag => 
                this.agendamentosRepository.delete(ag.id)
              )
            );
            return; // Sair aqui pois já deletou tudo

          } else if (tipoExclusao === 'esta_e_futuras' && agendamentosFuturos.length > 0) {
            // Excluir "esta e futuras ocorrências"
            console.log('🗑️ Excluindo esta e futuras ocorrências da série');
            
            await this.googleCalendarService.deletarSerieAPartirDe(
              agendamento.googleEventId,
              agendamento.dataHoraInicio
            );

            // Deletar o agendamento atual e todos os futuros
            const agendamentosParaExcluir = [agendamento, ...agendamentosFuturos];
            await Promise.all(
              agendamentosParaExcluir.map(ag => 
                this.agendamentosRepository.delete(ag.id)
              )
            );
            return; // Sair aqui pois já deletou os necessários

          } else {
            // Excluir apenas esta ocorrência
            console.log('🗑️ Excluindo apenas esta ocorrência específica');
            
            await this.googleCalendarService.deletarOcorrenciaEspecifica(
              agendamento.googleEventId,
              agendamento.dataHoraInicio
            );
          }

        } else {
          // Não é série recorrente - evento único
          console.log('🗑️ Excluindo evento único (não recorrente)');
          await this.googleCalendarService.deletarEvento(agendamento.googleEventId);
        }

      } catch (error) {
        console.error('Erro ao deletar evento do Google Calendar:', error);
        // Continua com a exclusão do agendamento mesmo se falhar a exclusão do Google Calendar
      }
    }

    // Deletar o agendamento do banco (apenas este, a menos que já tenha sido deletado acima)
    await this.agendamentosRepository.delete(id);
  }
} 