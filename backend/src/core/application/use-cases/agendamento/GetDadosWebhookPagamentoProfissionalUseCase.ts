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

    // Calculate valores using precos_servicos_profissionais
    let valorTotal = 0;
    const agendamentosComValor = await Promise.all(
      agendamentos.map(async (agendamento) => {
        const preco = await this.precosRepository.findByProfissionalAndServico(
          params.profissionalId,
          agendamento.servicoId
        );
        const valorProfissional = preco?.precoProfissional || 0;
        valorTotal += valorProfissional;

        return {
          id: agendamento.id,
          dataHoraInicio: agendamento.dataHoraInicio,
          dataHoraFim: agendamento.dataHoraFim,
          status: agendamento.status,
          tipoAtendimento: agendamento.tipoAtendimento,
          valorProfissional,
          paciente: {
            id: agendamento.paciente.id,
            nomeCompleto: agendamento.paciente.nomeCompleto,
            email: agendamento.paciente.email,
            whatsapp: agendamento.paciente.whatsapp,
            cpf: agendamento.paciente.cpf
          },
          servico: agendamento.servico ? {
            id: agendamento.servico.id,
            nome: agendamento.servico.nome,
            descricao: agendamento.servico.descricao
          } : null,
          convenio: agendamento.convenio ? {
            id: agendamento.convenio.id,
            nome: agendamento.convenio.nome
          } : null
        };
      })
    );

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
      },
      agendamentos: agendamentosComValor
    };
  }
}
