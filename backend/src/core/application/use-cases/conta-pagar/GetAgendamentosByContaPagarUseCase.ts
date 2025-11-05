import { injectable, inject } from 'tsyringe';
import { IAgendamentosContasRepository } from '../../../domain/repositories/IAgendamentosContasRepository';

@injectable()
export class GetAgendamentosByContaPagarUseCase {
  constructor(
    @inject('AgendamentosContasRepository')
    private agendamentosContasRepository: IAgendamentosContasRepository
  ) {}

  async execute(contaPagarId: string): Promise<any[]> {
    if (!contaPagarId) {
      throw new Error('ID da conta a pagar é obrigatório');
    }

    // Buscar todos os relacionamentos agendamento-conta para esta conta a pagar
    const agendamentosContas = await this.agendamentosContasRepository.findByContaPagar(contaPagarId);

    // Mapear para o formato de resposta
    const agendamentos = agendamentosContas.map(ac => {
      const agendamento = ac.agendamento as any;

      return {
        id: agendamento.id,
        dataHoraInicio: agendamento.dataHoraInicio,
        dataHoraFim: agendamento.dataHoraFim,
        status: agendamento.status,
        tipoAtendimento: agendamento.tipoAtendimento,
        pagamento: agendamento.pagamento,
        profissionalId: agendamento.profissionalId,
        servicoId: agendamento.servicoId,
        pacienteId: agendamento.pacienteId,
        convenioId: agendamento.convenioId,
        recursoId: agendamento.recursoId,
        pacienteNome: agendamento.paciente?.nomeCompleto,
        profissionalNome: agendamento.profissional?.nome,
        servicoNome: agendamento.servico?.nome,
        convenioNome: agendamento.convenio?.nome,
        servico: agendamento.servico ? {
          id: agendamento.servico.id,
          nome: agendamento.servico.nome,
          preco: agendamento.servico.preco,
          valorProfissional: agendamento.servico.valorProfissional
        } : undefined,
        paciente: agendamento.paciente,
        profissional: agendamento.profissional,
        convenio: agendamento.convenio,
        recurso: agendamento.recurso
      };
    });

    // Ordenar por dataHoraInicio (mais antigas primeiro)
    return agendamentos.sort((a, b) => {
      const dataA = new Date(a.dataHoraInicio).getTime();
      const dataB = new Date(b.dataHoraInicio).getTime();
      return dataA - dataB;
    });
  }
}
