import { injectable, inject } from 'tsyringe';
import { IContaPagarRepository } from '../../../domain/repositories/IContaPagarRepository';

@injectable()
export class GetDadosWebhookContaPagarUseCase {
  constructor(
    @inject('ContasPagarRepository')
    private contaPagarRepository: IContaPagarRepository
  ) {}

  async execute(contaPagarId: string) {
    const contaPagar = await this.contaPagarRepository.findByIdWithRelations(contaPagarId);
    
    if (!contaPagar) {
      throw new Error('Conta a pagar não encontrada');
    }

    // Estruturar os dados para envio via webhook
    return {
      contaPagar: {
        id: contaPagar.id,
        descricao: contaPagar.descricao,
        valorOriginal: contaPagar.valorOriginal,
        valorLiquido: contaPagar.valorLiquido,
        dataVencimento: contaPagar.dataVencimento,
        status: contaPagar.status,
        numeroDocumento: contaPagar.numeroDocumento,
        observacoes: contaPagar.observacoes
      },
      empresa: contaPagar.empresa ? {
        id: contaPagar.empresa.id,
        razaoSocial: contaPagar.empresa.razaoSocial,
        cnpj: contaPagar.empresa.cnpj,
        email: contaPagar.empresa.email,
        telefone: contaPagar.empresa.telefone
      } : null,
      profissional: contaPagar.profissional ? {
        id: contaPagar.profissional.id,
        nome: contaPagar.profissional.nome,
        cpf: contaPagar.profissional.cpf,
        email: contaPagar.profissional.email,
        whatsapp: contaPagar.profissional.whatsapp
      } : null,
      agendamentos: contaPagar.agendamentosConta ? contaPagar.agendamentosConta.map(ac => ({
        agendamento: {
          id: ac.agendamento.id,
          dataHoraInicio: ac.agendamento.dataHoraInicio,
          dataHoraFim: ac.agendamento.dataHoraFim,
          status: ac.agendamento.status,
          tipoAtendimento: ac.agendamento.tipoAtendimento,
          paciente: {
            id: ac.agendamento.paciente.id,
            nomeCompleto: ac.agendamento.paciente.nomeCompleto,
            email: ac.agendamento.paciente.email,
            whatsapp: ac.agendamento.paciente.whatsapp,
            cpf: ac.agendamento.paciente.cpf
          },
          servico: ac.agendamento.servico ? {
            id: ac.agendamento.servico.id,
            nome: ac.agendamento.servico.nome,
            descricao: ac.agendamento.servico.descricao
          } : null,
          convenio: ac.agendamento.convenio ? {
            id: ac.agendamento.convenio.id,
            nome: ac.agendamento.convenio.nome
          } : null
        }
      })) : []
    };
  }
}