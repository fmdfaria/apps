import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { CreateContaReceberUseCase } from '../../../core/application/use-cases/conta-receber/CreateContaReceberUseCase';
import { ListContasReceberUseCase } from '../../../core/application/use-cases/conta-receber/ListContasReceberUseCase';
import { UpdateContaReceberUseCase } from '../../../core/application/use-cases/conta-receber/UpdateContaReceberUseCase';
import { DeleteContaReceberUseCase } from '../../../core/application/use-cases/conta-receber/DeleteContaReceberUseCase';
import { ReceberContaUseCase } from '../../../core/application/use-cases/conta-receber/ReceberContaUseCase';
import { CancelarContaReceberUseCase } from '../../../core/application/use-cases/conta-receber/CancelarContaReceberUseCase';
import { ListContasPendentesUseCase } from '../../../core/application/use-cases/conta-receber/ListContasPendentesUseCase';
import { ListContasVencidasUseCase } from '../../../core/application/use-cases/conta-receber/ListContasVencidasUseCase';
import { GetAgendamentosByContaReceberUseCase } from '../../../core/application/use-cases/conta-receber/GetAgendamentosByContaReceberUseCase';

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

interface UpdateContaReceberBody {
  empresaId?: string;
  contaBancariaId?: string;
  convenioId?: string;
  pacienteId?: string;
  categoriaId?: string;
  numeroDocumento?: string;
  descricao?: string;
  valorOriginal?: number;
  valorDesconto?: number;
  valorJuros?: number;
  valorMulta?: number;
  dataEmissao?: string;
  dataVencimento?: string;
  observacoes?: string;
}

interface ReceberContaBody {
  valorRecebido: number;
  dataRecebimento: string;
  formaRecebimento: string;
  contaBancariaId: string;
  observacoes?: string;
}

interface CancelarContaBody {
  motivo?: string;
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
        valorDesconto: request.body.valorDesconto || 0,
        valorJuros: request.body.valorJuros || 0,
        valorMulta: request.body.valorMulta || 0,
        dataEmissao: new Date(request.body.dataEmissao),
        dataVencimento: new Date(request.body.dataVencimento)
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
      const listContasReceberUseCase = container.resolve(ListContasReceberUseCase);
      
      const filters = {
        ...request.query,
        dataVencimentoInicio: request.query.dataVencimentoInicio ? new Date(request.query.dataVencimentoInicio) : undefined,
        dataVencimentoFim: request.query.dataVencimentoFim ? new Date(request.query.dataVencimentoFim) : undefined
      };

      const contas = await listContasReceberUseCase.execute(filters);
      
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

  async findById(request: FastifyRequest<{ Params: ContaReceberParams }>, reply: FastifyReply) {
    try {
      const listContasReceberUseCase = container.resolve(ListContasReceberUseCase);
      const contas = await listContasReceberUseCase.execute();
      const conta = contas.find(c => c.id === request.params.id);
      
      if (!conta) {
        return reply.status(404).send({
          success: false,
          message: 'Conta a receber não encontrada'
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

  async update(request: FastifyRequest<{ Params: ContaReceberParams; Body: UpdateContaReceberBody }>, reply: FastifyReply) {
    try {
      const updateContaReceberUseCase = container.resolve(UpdateContaReceberUseCase);
      
      const data = {
        ...request.body,
        dataEmissao: request.body.dataEmissao ? new Date(request.body.dataEmissao) : undefined,
        dataVencimento: request.body.dataVencimento ? new Date(request.body.dataVencimento) : undefined
      };

      const conta = await updateContaReceberUseCase.execute(request.params.id, data);
      
      return reply.send({
        success: true,
        data: conta
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Conta a receber não encontrada' ? 404 : 400;
      
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async delete(request: FastifyRequest<{ Params: ContaReceberParams }>, reply: FastifyReply) {
    try {
      const deleteContaReceberUseCase = container.resolve(DeleteContaReceberUseCase);
      await deleteContaReceberUseCase.execute(request.params.id);
      
      return reply.status(204).send();
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Conta a receber não encontrada' ? 404 : 400;
      
      return reply.status(statusCode).send({
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
        observacoes: request.body.observacoes
      };

      const conta = await receberContaUseCase.execute(data);
      
      return reply.send({
        success: true,
        data: conta,
        message: 'Recebimento registrado com sucesso'
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('não encontrada') ? 404 : 400;
      
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async cancelar(request: FastifyRequest<{ Params: ContaReceberParams; Body: CancelarContaBody }>, reply: FastifyReply) {
    try {
      const cancelarContaReceberUseCase = container.resolve(CancelarContaReceberUseCase);
      
      await cancelarContaReceberUseCase.execute(request.params.id, {
        motivo: request.body.motivo
      });
      
      return reply.send({
        success: true,
        message: 'Conta cancelada com sucesso'
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('não encontrada') ? 404 : 400;
      
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async listPendentes(request: FastifyRequest<{ Querystring: { empresaId?: string } }>, reply: FastifyReply) {
    try {
      const listContasPendentesUseCase = container.resolve(ListContasPendentesUseCase);
      
      const contas = await listContasPendentesUseCase.execute(request.query.empresaId);
      
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

  async listVencidas(request: FastifyRequest, reply: FastifyReply) {
    try {
      const listContasVencidasUseCase = container.resolve(ListContasVencidasUseCase);
      
      const contas = await listContasVencidasUseCase.execute();

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

  async getAgendamentosByConta(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      const getAgendamentosByContaReceberUseCase = container.resolve(GetAgendamentosByContaReceberUseCase);
      const agendamentos = await getAgendamentosByContaReceberUseCase.execute(id);

      return reply.send({
        success: true,
        data: agendamentos
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }
}