import { inject, injectable } from 'tsyringe';
import { IAgendamentosRepository } from '@/core/domain/repositories/IAgendamentosRepository';
import { Agendamento } from '@/core/domain/entities/Agendamento';
import { IUsersRepository } from '@/core/domain/repositories/IUsersRepository';

interface LiberarAgendamentosParticularesMensalRequest {
  pacienteId: string;
  profissionalId: string;
  servicoId: string;
  mesAno: string; // formato "2024-09"
  userId: string;
  recebimento: boolean;
  dataLiberacao: string;
  pagamentoAntecipado?: boolean; // Informação se o pagamento é antecipado ou não
}

interface LiberarAgendamentosParticularesMensalResponse {
  agendamentosAtualizados: Agendamento[];
  totalLiberados: number;
}

@injectable()
export class LiberarAgendamentosParticularesMensalUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository,
    
    @inject('UsersRepository')  
    private usersRepository: IUsersRepository
  ) {}

  async execute({
    pacienteId,
    profissionalId,
    servicoId,
    mesAno,
    userId,
    recebimento,
    dataLiberacao,
    pagamentoAntecipado
  }: LiberarAgendamentosParticularesMensalRequest): Promise<LiberarAgendamentosParticularesMensalResponse> {
    // Verificar se o usuário existe
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Validar campos obrigatórios baseado no tipo de pagamento
    if (pagamentoAntecipado === true && !recebimento) {
      throw new Error('Para pagamento antecipado é obrigatório confirmar o recebimento do pagamento');
    }

    if (!dataLiberacao) {
      throw new Error('Data da liberação é obrigatória');
    }

    // Validar e converter formato da data
    const dataLiberacaoDate = new Date(dataLiberacao);
    if (isNaN(dataLiberacaoDate.getTime())) {
      throw new Error('Data da liberação inválida');
    }

    // Validar se a data não é futura
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999); // Final do dia atual
    if (dataLiberacaoDate > hoje) {
      throw new Error('Data da liberação não pode ser futura');
    }

    // Construir filtros para buscar agendamentos do grupo mensal
    const [ano, mes] = mesAno.split('-');
    const primeiroDiaDoMes = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    const ultimoDiaDoMes = new Date(parseInt(ano), parseInt(mes), 0, 23, 59, 59, 999);

    // Buscar todos os agendamentos do grupo mensal
    const agendamentosDoGrupo = await this.agendamentosRepository.findAll({
      pacienteId,
      profissionalId,
      servicoId,
      dataInicio: primeiroDiaDoMes,
      dataFim: ultimoDiaDoMes,
      limit: 100 // Limite alto para pegar todos os agendamentos do mês
    });

    if (!agendamentosDoGrupo || agendamentosDoGrupo.data.length === 0) {
      throw new Error('Nenhum agendamento encontrado para liberação no período especificado');
    }

    // Filtrar apenas agendamentos que podem ser liberados
    const agendamentosLiberaveis = agendamentosDoGrupo.data.filter(ag => 
      ['SOLICITADO', 'AGENDADO'].includes(ag.status)
    );

    if (agendamentosLiberaveis.length === 0) {
      throw new Error('Nenhum agendamento pode ser liberado no período especificado (todos já foram processados ou estão em status inválido)');
    }

    // Atualizar todos os agendamentos liberáveis do grupo
    const agendamentosAtualizados: Agendamento[] = [];
    
    for (const agendamento of agendamentosLiberaveis) {
      try {
        const agendamentoAtualizado = await this.agendamentosRepository.update(agendamento.id, {
          status: 'LIBERADO',
          recebimento: recebimento,
          dataCodLiberacao: dataLiberacaoDate,
          updatedAt: new Date()
        });
        agendamentosAtualizados.push(agendamentoAtualizado);
      } catch (error) {
        // Se falhar em algum agendamento, log o erro mas continue
        console.error(`Erro ao liberar agendamento ${agendamento.id}:`, error);
        throw new Error(`Falha ao liberar agendamento de ${new Date(agendamento.dataHoraInicio).toLocaleDateString('pt-BR')}`);
      }
    }

    return {
      agendamentosAtualizados,
      totalLiberados: agendamentosAtualizados.length
    };
  }
}