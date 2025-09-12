import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { CreateContaReceberUseCase } from '../../../core/application/use-cases/conta-receber/CreateContaReceberUseCase';
import { ReceberContaUseCase } from '../../../core/application/use-cases/conta-receber/ReceberContaUseCase';

interface CreateContaReceberBody {
  empresaId: string;
  contaBancariaId?: string;
  convenioId?: string;
  pacienteId?: string;
  categoriaId: string;
  numeroDocumento?: string;
  descricao: string;
  valorOriginal: number;
  valorDesconto?: number;
  valorJuros?: number;
  valorMulta?: number;
  dataEmissao: string;
  dataVencimento: string;
  observacoes?: string;
}

interface ReceberContaBody {
  valorRecebido: number;
  dataRecebimento: string;
  formaRecebimento: string;
  contaBancariaId: string;
  observacoes?: string;
}

interface ContaReceberParams {
  id: string;
}

interface ListContasReceberQuery {
  empresaId?: string;
  contaBancariaId?: string;
  pacienteId?: string;
  convenioId?: string;
  status?: string;
  dataVencimentoInicio?: string;
  dataVencimentoFim?: string;
}

export class ContasReceberController {
  async create(request: FastifyRequest<{ Body: CreateContaReceberBody }>, reply: FastifyReply) {
    try {
      const createContaReceberUseCase = container.resolve(CreateContaReceberUseCase);
      
      const data = {
        ...request.body,
        dataEmissao: new Date(request.body.dataEmissao),
        dataVencimento: new Date(request.body.dataVencimento),
        userCreatedId: (request as any).user?.id
      };
      
      const conta = await createContaReceberUseCase.execute(data);
      
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

  async list(request: FastifyRequest<{ Querystring: ListContasReceberQuery }>, reply: FastifyReply) {
    try {
      const { contasReceberRepository } = container.resolve('ContasReceberRepository') as any;
      
      const filters = {
        ...request.query,
        ...(request.query.dataVencimentoInicio && { dataVencimentoInicio: new Date(request.query.dataVencimentoInicio) }),
        ...(request.query.dataVencimentoFim && { dataVencimentoFim: new Date(request.query.dataVencimentoFim) })
      };

      const contas = await contasReceberRepository.findAll(filters);
      
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

  async receber(request: FastifyRequest<{ Params: ContaReceberParams; Body: ReceberContaBody }>, reply: FastifyReply) {
    try {
      const receberContaUseCase = container.resolve(ReceberContaUseCase);
      
      const data = {
        contaId: request.params.id,
        valorRecebido: request.body.valorRecebido,
        dataRecebimento: new Date(request.body.dataRecebimento),
        formaRecebimento: request.body.formaRecebimento,
        contaBancariaId: request.body.contaBancariaId,
        observacoes: request.body.observacoes,
        userUpdatedId: (request as any).user?.id
      };
      
      const conta = await receberContaUseCase.execute(data);
      
      return reply.send({
        success: true,
        data: conta
      });
    } catch (error) {
      const statusCode = error instanceof Error && 
        (error.message.includes('não encontrada') || error.message.includes('não encontrado')) ? 404 : 400;
      
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async show(request: FastifyRequest<{ Params: ContaReceberParams }>, reply: FastifyReply) {
    try {
      const { contasReceberRepository } = container.resolve('ContasReceberRepository') as any;
      
      const conta = await contasReceberRepository.findById(request.params.id);
      
      if (!conta) {
        return reply.status(404).send({
          success: false,
          message: 'Conta não encontrada'
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
}