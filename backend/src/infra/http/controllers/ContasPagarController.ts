import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { CreateContaPagarUseCase } from '../../../core/application/use-cases/conta-pagar/CreateContaPagarUseCase';
import { ListContasPagarUseCase } from '../../../core/application/use-cases/conta-pagar/ListContasPagarUseCase';
import { UpdateContaPagarUseCase } from '../../../core/application/use-cases/conta-pagar/UpdateContaPagarUseCase';
import { DeleteContaPagarUseCase } from '../../../core/application/use-cases/conta-pagar/DeleteContaPagarUseCase';
import { PagarContaUseCase } from '../../../core/application/use-cases/conta-pagar/PagarContaUseCase';
import { CancelarContaPagarUseCase } from '../../../core/application/use-cases/conta-pagar/CancelarContaPagarUseCase';
import { GetAgendamentosByContaPagarUseCase } from '../../../core/application/use-cases/conta-pagar/GetAgendamentosByContaPagarUseCase';

interface CreateContaPagarBody {
  empresaId: string;
  contaBancariaId?: string;
  profissionalId?: string;
  categoriaId: string;
  numeroDocumento?: string;
  descricao: string;
  valorOriginal: number;
  valorDesconto?: number;
  valorJuros?: number;
  valorMulta?: number;
  dataEmissao: string;
  dataVencimento: string;
  formaPagamento?: string;
  tipoConta?: string;
  recorrente?: boolean;
  periodicidade?: string;
  observacoes?: string;
}

interface UpdateContaPagarBody {
  empresaId?: string;
  contaBancariaId?: string;
  profissionalId?: string;
  categoriaId?: string;
  numeroDocumento?: string;
  descricao?: string;
  valorOriginal?: number;
  valorDesconto?: number;
  valorJuros?: number;
  valorMulta?: number;
  dataEmissao?: string;
  dataVencimento?: string;
  formaPagamento?: string;
  tipoConta?: string;
  recorrente?: boolean;
  periodicidade?: string;
  observacoes?: string;
}

interface PagarContaBody {
  contaBancariaId: string;
  valorPago: number;
  dataPagamento: string;
  formaPagamento: string;
  observacoes?: string;
}

interface CancelarContaBody {
  motivo?: string;
}

interface ListContasPagarQuery {
  empresaId?: string;
  profissionalId?: string;
  status?: string;
  dataVencimentoInicio?: string;
  dataVencimentoFim?: string;
}

interface ContaPagarParams {
  id: string;
}

export class ContasPagarController {
  async create(request: FastifyRequest<{ Body: CreateContaPagarBody }>, reply: FastifyReply) {
    try {
      const createContaPagarUseCase = container.resolve(CreateContaPagarUseCase);
      
      const conta = await createContaPagarUseCase.execute({
        ...request.body,
        dataEmissao: new Date(request.body.dataEmissao),
        dataVencimento: new Date(request.body.dataVencimento)
      });
      
      return reply.status(201).send({
        success: true,
        data: conta
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async list(request: FastifyRequest<{ Querystring: ListContasPagarQuery }>, reply: FastifyReply) {
    try {
      const listContasPagarUseCase = container.resolve(ListContasPagarUseCase);
      
      const filters = {
        ...(request.query.empresaId && { empresaId: request.query.empresaId }),
        ...(request.query.profissionalId && { profissionalId: request.query.profissionalId }),
        ...(request.query.status && { status: request.query.status }),
        ...(request.query.dataVencimentoInicio && { 
          dataVencimentoInicio: new Date(request.query.dataVencimentoInicio) 
        }),
        ...(request.query.dataVencimentoFim && { 
          dataVencimentoFim: new Date(request.query.dataVencimentoFim) 
        })
      };

      const contas = await listContasPagarUseCase.execute(filters);
      
      return reply.send({
        success: true,
        data: contas
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async findById(request: FastifyRequest<{ Params: ContaPagarParams }>, reply: FastifyReply) {
    try {
      const listContasPagarUseCase = container.resolve(ListContasPagarUseCase);
      const contas = await listContasPagarUseCase.execute();
      const conta = contas.find(c => c.id === request.params.id);
      
      if (!conta) {
        return reply.status(404).send({
          success: false,
          message: 'Conta a pagar não encontrada'
        });
      }
      
      return reply.send({
        success: true,
        data: conta
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async update(request: FastifyRequest<{ Params: ContaPagarParams; Body: UpdateContaPagarBody }>, reply: FastifyReply) {
    try {
      const updateContaPagarUseCase = container.resolve(UpdateContaPagarUseCase);
      
      const updateData = {
        ...request.body,
        ...(request.body.dataEmissao && { dataEmissao: new Date(request.body.dataEmissao) }),
        ...(request.body.dataVencimento && { dataVencimento: new Date(request.body.dataVencimento) })
      };
      
      const conta = await updateContaPagarUseCase.execute(request.params.id, updateData);
      
      return reply.send({
        success: true,
        data: conta
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Conta a pagar não encontrada' ? 404 : 400;
      
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async delete(request: FastifyRequest<{ Params: ContaPagarParams }>, reply: FastifyReply) {
    try {
      const deleteContaPagarUseCase = container.resolve(DeleteContaPagarUseCase);
      await deleteContaPagarUseCase.execute(request.params.id);
      return reply.status(204).send();
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Conta a pagar não encontrada' ? 404 : 400;
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async pagar(request: FastifyRequest<{ Params: ContaPagarParams; Body: PagarContaBody }>, reply: FastifyReply) {
    try {
      const pagarContaUseCase = container.resolve(PagarContaUseCase);

      const conta = await pagarContaUseCase.execute({
        contaId: request.params.id,
        ...request.body,
        dataPagamento: new Date(request.body.dataPagamento)
      });

      return reply.send({
        success: true,
        data: conta,
        message: 'Pagamento registrado com sucesso'
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Conta a pagar não encontrada' ? 404 : 400;

      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async cancelar(request: FastifyRequest<{ Params: ContaPagarParams; Body: CancelarContaBody }>, reply: FastifyReply) {
    try {
      const cancelarContaPagarUseCase = container.resolve(CancelarContaPagarUseCase);
      
      const conta = await cancelarContaPagarUseCase.execute(request.params.id, request.body.motivo);
      
      return reply.send({
        success: true,
        data: conta,
        message: 'Conta cancelada com sucesso'
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Conta a pagar não encontrada' ? 404 : 400;
      
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async findPendentes(request: FastifyRequest<{ Querystring: { empresaId?: string } }>, reply: FastifyReply) {
    try {
      const listContasPagarUseCase = container.resolve(ListContasPagarUseCase);
      
      const contas = await listContasPagarUseCase.execute({
        status: 'PENDENTE',
        ...(request.query.empresaId && { empresaId: request.query.empresaId })
      });
      
      return reply.send({
        success: true,
        data: contas
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async findVencidas(request: FastifyRequest<{ Querystring: { empresaId?: string } }>, reply: FastifyReply) {
    try {
      const listContasPagarUseCase = container.resolve(ListContasPagarUseCase);
      
      const contas = await listContasPagarUseCase.execute({
        vencidas: true,
        ...(request.query.empresaId && { empresaId: request.query.empresaId })
      });
      
      return reply.send({
        success: true,
        data: contas
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async findRecorrentes(request: FastifyRequest<{ Querystring: { empresaId?: string } }>, reply: FastifyReply) {
    try {
      const listContasPagarUseCase = container.resolve(ListContasPagarUseCase);
      
      const contas = await listContasPagarUseCase.execute({
        recorrentes: true,
        ...(request.query.empresaId && { empresaId: request.query.empresaId })
      });
      
      return reply.send({
        success: true,
        data: contas
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async getDadosWebhook(request: FastifyRequest<{ Params: ContaPagarParams }>, reply: FastifyReply) {
    try {
      const getDadosWebhookUseCase = container.resolve('GetDadosWebhookContaPagarUseCase');

      const dados = await getDadosWebhookUseCase.execute(request.params.id);

      return reply.send({
        success: true,
        data: dados
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Conta a pagar não encontrada' ? 404 : 500;

      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async getAgendamentos(request: FastifyRequest<{ Params: ContaPagarParams }>, reply: FastifyReply) {
    try {
      const getAgendamentosByContaPagarUseCase = container.resolve(GetAgendamentosByContaPagarUseCase);

      const agendamentos = await getAgendamentosByContaPagarUseCase.execute(request.params.id);

      return reply.send({
        success: true,
        data: agendamentos
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('obrigatório') ? 400 : 500;

      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }
}