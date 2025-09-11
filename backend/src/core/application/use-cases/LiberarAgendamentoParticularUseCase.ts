import { inject, injectable } from 'tsyringe';
import { IAgendamentosRepository } from '@/core/domain/repositories/IAgendamentosRepository';
import { Agendamento } from '@/core/domain/entities/Agendamento';
import { IUsersRepository } from '@/core/domain/repositories/IUsersRepository';

interface LiberarAgendamentoParticularRequest {
  agendamentoId: string;
  userId: string;
  recebimento: boolean;
  dataLiberacao: string;
}

@injectable()
export class LiberarAgendamentoParticularUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository,
    
    @inject('UsersRepository')  
    private usersRepository: IUsersRepository
  ) {}

  async execute({
    agendamentoId,
    userId,
    recebimento,
    dataLiberacao
  }: LiberarAgendamentoParticularRequest): Promise<Agendamento> {
    // Verificar se o usuário existe
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Buscar o agendamento
    const agendamento = await this.agendamentosRepository.findById(agendamentoId);
    if (!agendamento) {
      throw new Error('Agendamento não encontrado');
    }

    // Validar se o agendamento pode ser liberado (deve estar SOLICITADO ou AGENDADO)
    if (!['SOLICITADO', 'AGENDADO'].includes(agendamento.status)) {
      throw new Error(`Não é possível liberar um agendamento com status ${agendamento.status}`);
    }

    // Validar campos obrigatórios
    if (!recebimento) {
      throw new Error('É obrigatório confirmar o recebimento do pagamento');
    }

    if (!dataLiberacao) {
      throw new Error('Data da liberação é obrigatória');
    }

    // Validar formato da data
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

    // Atualizar o agendamento
    const agendamentoAtualizado = await this.agendamentosRepository.update(agendamentoId, {
      status: 'LIBERADO',
      recebimento: recebimento,
      dataCodLiberacao: dataLiberacao,
      updatedAt: new Date(),
      updatedBy: userId
    });

    return agendamentoAtualizado;
  }
}