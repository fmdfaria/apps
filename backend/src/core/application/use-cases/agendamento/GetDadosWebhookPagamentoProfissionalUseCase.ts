import { injectable, inject } from 'tsyringe';
import { IAgendamentosRepository } from '../../../domain/repositories/IAgendamentosRepository';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';
import { IPrecosServicosProfissionaisRepository } from '../../../domain/repositories/IPrecosServicosProfissionaisRepository';

@injectable()
export class GetDadosWebhookPagamentoProfissionalUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository,
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository,
    @inject('PrecosServicosProfissionaisRepository')
    private precosRepository: IPrecosServicosProfissionaisRepository
  ) {}

  async execute(params: {
    profissionalId: string;
    dataInicio: string;
    dataFim: string;
  }) {
    // Query agendamentos with status='FINALIZADO' in date range
    const result = await this.agendamentosRepository.findAll({
      profissionalId: params.profissionalId,
      dataInicio: new Date(params.dataInicio),
      dataFim: new Date(params.dataFim),
      status: 'FINALIZADO'
    });

    const agendamentos = result.data;

    // Load professional details
    const profissional = await this.profissionaisRepository.findById(params.profissionalId);

    if (!profissional) {
      throw new Error('Profissional não encontrado');
    }

    // Calculate valorTotal using pricing table with proper priority
    let valorTotal = 0;

    for (const agendamento of agendamentos) {
      const preco = await this.precosRepository.findByProfissionalAndServico(
        params.profissionalId,
        agendamento.servicoId
      );

      let valorProfissional = 0;

      if (preco?.precoProfissional && preco.precoProfissional > 0) {
        valorProfissional = preco.precoProfissional;
      } else if (agendamento.servico?.valorProfissional) {
        valorProfissional = agendamento.servico.valorProfissional;
      }

      valorTotal += valorProfissional;
    }

    return {
      profissional: {
        id: profissional.id,
        nome: profissional.nome,
        cpf: profissional.cpf,
        email: profissional.email,
        whatsapp: profissional.whatsapp
      },
      periodo: {
        dataInicio: params.dataInicio,
        dataFim: params.dataFim
      },
      resumo: {
        qtdAgendamentos: agendamentos.length,
        valorTotal
      }
    };
  }
}
