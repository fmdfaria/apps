import { inject, injectable } from 'tsyringe';
import { IAgendamentosRepository } from '@/core/domain/repositories/IAgendamentosRepository';
import { Agendamento } from '@/core/domain/entities/Agendamento';
import { IUsersRepository } from '@/core/domain/repositories/IUsersRepository';
import { IContasReceberRepository } from '@/core/domain/repositories/IContasReceberRepository';
import { ICategoriasFinanceirasRepository } from '@/core/domain/repositories/ICategoriasFinanceirasRepository';
import { IPrecosParticularesRepository } from '@/core/domain/repositories/IPrecosParticularesRepository';
import { ContaReceber } from '@/core/domain/entities/ContaReceber';

interface LiberarAgendamentoParticularRequest {
  agendamentoId: string;
  userId: string;
  recebimento: boolean;
  dataLiberacao: string;
  pagamentoAntecipado?: boolean; // Informação se o pagamento é antecipado ou não
  registrarContaReceber?: boolean; // Se deve registrar conta a receber
}

@injectable()
export class LiberarAgendamentoParticularUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository,
    
    @inject('UsersRepository')  
    private usersRepository: IUsersRepository,

    @inject('ContasReceberRepository')
    private contasReceberRepository: IContasReceberRepository,

    @inject('CategoriasFinanceirasRepository')
    private categoriasFinanceirasRepository: ICategoriasFinanceirasRepository,

    @inject('PrecosParticularesRepository')
    private precosParticularesRepository: IPrecosParticularesRepository
  ) {}

  async execute({
    agendamentoId,
    userId,
    recebimento,
    dataLiberacao,
    pagamentoAntecipado,
    registrarContaReceber
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

    // Atualizar o agendamento
    const agendamentoAtualizado = await this.agendamentosRepository.update(agendamentoId, {
      status: 'LIBERADO',
      recebimento: recebimento,
      dataCodLiberacao: dataLiberacaoDate, // Usar objeto Date em vez de string
      updatedAt: new Date()
    });

    // Se deve registrar conta a receber e o recebimento está marcado
    if (registrarContaReceber && recebimento) {
      await this.criarContaReceber(agendamento, dataLiberacaoDate, userId);
    }

    return agendamentoAtualizado;
  }

  private async criarContaReceber(agendamento: Agendamento, dataRecebimento: Date, userId: string): Promise<void> {
    try {
      // Buscar preço do serviço para o paciente particular
      const precoParticular = await this.precosParticularesRepository.findByServicoId(agendamento.servicoId);
      if (!precoParticular) {
        throw new Error('Preço particular não encontrado para este serviço');
      }

      // Buscar categoria padrão para recebimentos de particulares
      const categorias = await this.categoriasFinanceirasRepository.findByTipo('RECEITA');
      const categoriaParticular = categorias.find(c => 
        c.nome.toLowerCase().includes('particular') || 
        c.nome.toLowerCase().includes('consulta') ||
        c.codigo === 'PART' ||
        c.codigo === 'CONS'
      );
      
      if (!categoriaParticular) {
        throw new Error('Categoria financeira para particulares não encontrada');
      }

      // Criar conta a receber já como recebida
      const contaReceber = new ContaReceber({
        empresaId: agendamento.empresa?.id || 'default-empresa', // usar empresa do agendamento ou padrão
        contaBancariaId: null, // será definida quando houver integração com conta bancária
        convenioId: agendamento.convenioId,
        pacienteId: agendamento.pacienteId,
        categoriaId: categoriaParticular.id,
        numeroDocumento: `AGD-${agendamento.id.slice(-8)}`, // usar parte do ID do agendamento
        descricao: `Pagamento particular - ${agendamento.servicoNome} - ${agendamento.pacienteNome}`,
        valorOriginal: precoParticular.valor,
        valorDesconto: 0,
        valorJuros: 0,
        valorMulta: 0,
        valorLiquido: precoParticular.valor,
        valorRecebido: precoParticular.valor, // já recebido
        dataEmissao: new Date(),
        dataVencimento: dataRecebimento,
        dataRecebimento: dataRecebimento,
        status: 'RECEBIDO', // já marcado como recebido
        formaRecebimento: 'DINHEIRO', // padrão, pode ser alterado posteriormente
        observacoes: `Gerado automaticamente pela liberação do agendamento ${agendamento.id}`,
        userCreatedId: userId,
        userUpdatedId: userId
      });

      await this.contasReceberRepository.create(contaReceber);
    } catch (error) {
      // Log do erro mas não interromper o processo de liberação
      console.error('Erro ao criar conta a receber:', error);
      // Pode ser implementado um sistema de log mais robusto aqui
    }
  }
}