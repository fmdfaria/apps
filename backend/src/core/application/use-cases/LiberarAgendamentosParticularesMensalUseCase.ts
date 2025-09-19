import { inject, injectable } from 'tsyringe';
import { IAgendamentosRepository } from '@/core/domain/repositories/IAgendamentosRepository';
import { Agendamento } from '@/core/domain/entities/Agendamento';
import { IUsersRepository } from '@/core/domain/repositories/IUsersRepository';
import { IContasReceberRepository } from '@/core/domain/repositories/IContasReceberRepository';
import { ICategoriasFinanceirasRepository } from '@/core/domain/repositories/ICategoriasFinanceirasRepository';
import { IPrecosParticularesRepository } from '@/core/domain/repositories/IPrecosParticularesRepository';
import { ContaReceber } from '@/core/domain/entities/ContaReceber';

interface LiberarAgendamentosParticularesMensalRequest {
  pacienteId: string;
  profissionalId: string;
  servicoId: string;
  mesAno: string; // formato "2024-09"
  userId: string;
  recebimento: boolean;
  dataLiberacao: string;
  pagamentoAntecipado?: boolean; // Informação se o pagamento é antecipado ou não
  registrarContaReceber?: boolean; // Se deve registrar conta a receber
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
    private usersRepository: IUsersRepository,

    @inject('ContasReceberRepository')
    private contasReceberRepository: IContasReceberRepository,

    @inject('CategoriasFinanceirasRepository')
    private categoriasFinanceirasRepository: ICategoriasFinanceirasRepository,

    @inject('PrecosParticularesRepository')
    private precosParticularesRepository: IPrecosParticularesRepository
  ) {}

  async execute({
    pacienteId,
    profissionalId,
    servicoId,
    mesAno,
    userId,
    recebimento,
    dataLiberacao,
    pagamentoAntecipado,
    registrarContaReceber
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

    // Se deve registrar conta a receber e o recebimento está marcado
    if (registrarContaReceber && recebimento && agendamentosAtualizados.length > 0) {
      // Para grupo mensal, criar uma única conta a receber com valor total
      await this.criarContaReceberGrupoMensal(
        agendamentosAtualizados[0], // usar o primeiro agendamento como referência
        agendamentosAtualizados.length,
        dataLiberacaoDate,
        userId
      );
    }

    return {
      agendamentosAtualizados,
      totalLiberados: agendamentosAtualizados.length
    };
  }

  private async criarContaReceberGrupoMensal(
    agendamentoReferencia: Agendamento, 
    quantidadeAgendamentos: number, 
    dataRecebimento: Date, 
    userId: string
  ): Promise<void> {
    try {
      // Buscar preço do serviço para o paciente particular
      const precoParticular = await this.precosParticularesRepository.findByServicoId(agendamentoReferencia.servicoId);
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

      // Calcular valor total do grupo
      const valorTotal = precoParticular.valor * quantidadeAgendamentos;
      const mesAno = new Date(agendamentoReferencia.dataHoraInicio).toLocaleDateString('pt-BR', { 
        month: 'long', 
        year: 'numeric' 
      });

      // Criar conta a receber já como recebida para o grupo mensal
      const contaReceber = new ContaReceber({
        empresaId: agendamentoReferencia.empresa?.id || 'default-empresa',
        contaBancariaId: null,
        convenioId: agendamentoReferencia.convenioId,
        pacienteId: agendamentoReferencia.pacienteId,
        categoriaId: categoriaParticular.id,
        numeroDocumento: `AGDM-${agendamentoReferencia.id.slice(-6)}`, // AGD Mensal
        descricao: `Pagamento particular mensal - ${agendamentoReferencia.servicoNome} - ${agendamentoReferencia.pacienteNome} - ${mesAno} (${quantidadeAgendamentos}x)`,
        valorOriginal: valorTotal,
        valorDesconto: 0,
        valorJuros: 0,
        valorMulta: 0,
        valorLiquido: valorTotal,
        valorRecebido: valorTotal, // já recebido
        dataEmissao: new Date(),
        dataVencimento: dataRecebimento,
        dataRecebimento: dataRecebimento,
        status: 'RECEBIDO',
        formaRecebimento: 'DINHEIRO',
        observacoes: `Gerado automaticamente pela liberação mensal de ${quantidadeAgendamentos} agendamentos particulares`,
        userCreatedId: userId,
        userUpdatedId: userId
      });

      await this.contasReceberRepository.create(contaReceber);
    } catch (error) {
      // Log do erro mas não interromper o processo de liberação
      console.error('Erro ao criar conta a receber do grupo mensal:', error);
    }
  }
}