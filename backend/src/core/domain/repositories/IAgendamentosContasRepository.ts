import { AgendamentoConta } from '../entities/AgendamentoConta';

export interface IAgendamentosContasRepository {
  create(agendamentoConta: AgendamentoConta): Promise<AgendamentoConta>;
  findById(id: string): Promise<AgendamentoConta | null>;
  findByAgendamentoId(agendamentoId: string): Promise<AgendamentoConta | null>;
  findAll(filters?: {
    contaReceberId?: string;
    contaPagarId?: string;
  }): Promise<AgendamentoConta[]>;
  update(id: string, agendamentoConta: Partial<AgendamentoConta>): Promise<AgendamentoConta>;
  delete(id: string): Promise<void>;
  findByContaReceber(contaReceberId: string): Promise<AgendamentoConta[]>;
  findByContaPagar(contaPagarId: string): Promise<AgendamentoConta[]>;
  deleteByAgendamentoId(agendamentoId: string): Promise<void>;

  // Novos métodos para suportar múltiplos registros por agendamento
  findAllByAgendamentoId(agendamentoId: string): Promise<AgendamentoConta[]>;
  findByAgendamentoAndTipo(agendamentoId: string, tipo: 'receber' | 'pagar'): Promise<AgendamentoConta | null>;
}