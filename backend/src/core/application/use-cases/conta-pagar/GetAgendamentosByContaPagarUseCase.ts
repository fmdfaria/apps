import { injectable, inject } from 'tsyringe';
import { IAgendamentosContasRepository } from '../../../domain/repositories/IAgendamentosContasRepository';

interface AgendamentoResponse {
  id: string;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  status: string;
  tipoAtendimento?: string;
  pagamento: boolean;
  pacienteNome: string;
  profissionalNome: string;
  servicoNome?: string;
  convenioNome?: string;
  valorServico?: number;
}

@injectable()
export class GetAgendamentosByContaPagarUseCase {
  constructor(
    @inject('AgendamentosContasRepository')
    private agendamentosContasRepository: IAgendamentosContasRepository
  ) {}

  async execute(contaPagarId: string): Promise<AgendamentoResponse[]> {
    if (!contaPagarId) {
      throw new Error('ID da conta a pagar é obrigatório');
    }

    // Buscar todos os relacionamentos agendamento-conta para esta conta a pagar
    const agendamentosContas = await this.agendamentosContasRepository.findByContaPagar(contaPagarId);

    // Mapear para o formato de resposta
    const agendamentos: AgendamentoResponse[] = agendamentosContas.map(ac => {
      const agendamento = ac.agendamento;

      return {
        id: agendamento.id || '',
        dataHoraInicio: agendamento.dataHoraInicio,
        dataHoraFim: agendamento.dataHoraFim,
        status: agendamento.status,
        tipoAtendimento: agendamento.tipoAtendimento,
        pagamento: agendamento.pagamento || false,
        pacienteNome: (agendamento as any).paciente?.nomeCompleto || 'Não informado',
        profissionalNome: (agendamento as any).profissional?.nome || 'Não informado',
        servicoNome: (agendamento as any).servico?.nome,
        convenioNome: (agendamento as any).convenio?.nome,
        valorServico: (agendamento as any).servico?.preco ? parseFloat((agendamento as any).servico.preco) : undefined
      };
    });

    return agendamentos;
  }
}
