import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { CreateFluxoCaixaUseCase } from '../../../core/application/use-cases/fluxo-caixa/CreateFluxoCaixaUseCase';
import { ListFluxoCaixaUseCase } from '../../../core/application/use-cases/fluxo-caixa/ListFluxoCaixaUseCase';
import { UpdateFluxoCaixaUseCase } from '../../../core/application/use-cases/fluxo-caixa/UpdateFluxoCaixaUseCase';
import { ConciliarFluxoCaixaUseCase } from '../../../core/application/use-cases/fluxo-caixa/ConciliarFluxoCaixaUseCase';
import { DashboardFluxoCaixaUseCase } from '../../../core/application/use-cases/fluxo-caixa/DashboardFluxoCaixaUseCase';
import { GerarRelatorioFluxoUseCase } from '../../../core/application/use-cases/fluxo-caixa/GerarRelatorioFluxoUseCase';

interface CreateFluxoCaixaBody {
  empresaId: string;
  contaBancariaId: string;
  contaReceberId?: string;
  contaPagarId?: string;
  tipo: string;
  categoriaId: string;
  descricao: string;
  valor: number;
  dataMovimento: string;
  formaPagamento?: string;
  observacoes?: string;
}

interface UpdateFluxoCaixaBody {
  descricao?: string;
  valor?: number;
  dataMovimento?: string;
  formaPagamento?: string;
  observacoes?: string;
}

interface ConciliarMovimentoBody {
  dataConciliacao?: string;
}

interface ListFluxoCaixaQuery {
  empresaId?: string;
  contaBancariaId?: string;
  tipo?: string;
  categoriaId?: string;
  dataMovimentoInicio?: string;
  dataMovimentoFim?: string;
  conciliado?: string;
}

interface DashboardQuery {
  empresaId: string;
  dataInicio: string;
  dataFim: string;
}

interface FluxoCaixaParams {
  id: string;
}

export class FluxoCaixaController {
  async create(request: FastifyRequest<{ Body: CreateFluxoCaixaBody }>, reply: FastifyReply) {
    try {
      const createFluxoCaixaUseCase = container.resolve(CreateFluxoCaixaUseCase);
      
      const movimento = await createFluxoCaixaUseCase.execute({
        ...request.body,
        dataMovimento: new Date(request.body.dataMovimento),
        userCreatedId: (request as any).user?.id
      });
      
      return reply.status(201).send({
        success: true,
        data: movimento
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async list(request: FastifyRequest<{ Querystring: ListFluxoCaixaQuery }>, reply: FastifyReply) {
    try {
      const listFluxoCaixaUseCase = container.resolve(ListFluxoCaixaUseCase);
      
      const filters = {
        ...(request.query.empresaId && { empresaId: request.query.empresaId }),
        ...(request.query.contaBancariaId && { contaBancariaId: request.query.contaBancariaId }),
        ...(request.query.tipo && { tipo: request.query.tipo }),
        ...(request.query.categoriaId && { categoriaId: request.query.categoriaId }),
        ...(request.query.dataMovimentoInicio && { 
          dataMovimentoInicio: new Date(request.query.dataMovimentoInicio) 
        }),
        ...(request.query.dataMovimentoFim && { 
          dataMovimentoFim: new Date(request.query.dataMovimentoFim) 
        }),
        ...(request.query.conciliado !== undefined && { 
          conciliado: request.query.conciliado === 'true' 
        })
      };

      const movimentos = await listFluxoCaixaUseCase.execute(filters);
      
      return reply.send({
        success: true,
        data: movimentos
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async findById(request: FastifyRequest<{ Params: FluxoCaixaParams }>, reply: FastifyReply) {
    try {
      const listFluxoCaixaUseCase = container.resolve(ListFluxoCaixaUseCase);
      const movimentos = await listFluxoCaixaUseCase.execute();
      const movimento = movimentos.find(m => m.id === request.params.id);
      
      if (!movimento) {
        return reply.status(404).send({
          success: false,
          message: 'Movimento de fluxo de caixa não encontrado'
        });
      }
      
      return reply.send({
        success: true,
        data: movimento
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async update(request: FastifyRequest<{ Params: FluxoCaixaParams; Body: UpdateFluxoCaixaBody }>, reply: FastifyReply) {
    try {
      const updateFluxoCaixaUseCase = container.resolve(UpdateFluxoCaixaUseCase);
      
      const updateData = {
        ...request.body,
        ...(request.body.dataMovimento && { dataMovimento: new Date(request.body.dataMovimento) })
      };
      
      const movimento = await updateFluxoCaixaUseCase.execute(request.params.id, updateData);
      
      return reply.send({
        success: true,
        data: movimento
      });
    } catch (error) {
      const statusCode = error instanceof Error && 
        error.message === 'Movimento de fluxo de caixa não encontrado' ? 404 : 400;
      
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async conciliar(request: FastifyRequest<{ Params: FluxoCaixaParams; Body: ConciliarMovimentoBody }>, reply: FastifyReply) {
    try {
      const conciliarFluxoCaixaUseCase = container.resolve(ConciliarFluxoCaixaUseCase);
      
      const dataConciliacao = request.body.dataConciliacao 
        ? new Date(request.body.dataConciliacao) 
        : undefined;
      
      const movimento = await conciliarFluxoCaixaUseCase.execute(request.params.id, dataConciliacao);
      
      return reply.send({
        success: true,
        data: movimento,
        message: 'Movimento conciliado com sucesso'
      });
    } catch (error) {
      const statusCode = error instanceof Error && 
        error.message === 'Movimento de fluxo de caixa não encontrado' ? 404 : 400;
      
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async dashboard(request: FastifyRequest<{ Querystring: DashboardQuery }>, reply: FastifyReply) {
    try {
      const dashboardFluxoCaixaUseCase = container.resolve(DashboardFluxoCaixaUseCase);
      
      const { empresaId, dataInicio, dataFim } = request.query;
      
      if (!empresaId || !dataInicio || !dataFim) {
        return reply.status(400).send({
          success: false,
          message: 'empresaId, dataInicio e dataFim são obrigatórios'
        });
      }
      
      const dashboard = await dashboardFluxoCaixaUseCase.execute(
        empresaId,
        new Date(dataInicio),
        new Date(dataFim)
      );
      
      return reply.send({
        success: true,
        data: dashboard
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async relatorio(request: FastifyRequest<{ Querystring: DashboardQuery }>, reply: FastifyReply) {
    try {
      const gerarRelatorioFluxoUseCase = container.resolve(GerarRelatorioFluxoUseCase);
      
      const { empresaId, dataInicio, dataFim } = request.query;
      
      if (!empresaId || !dataInicio || !dataFim) {
        return reply.status(400).send({
          success: false,
          message: 'empresaId, dataInicio e dataFim são obrigatórios'
        });
      }
      
      const relatorio = await gerarRelatorioFluxoUseCase.execute({
        empresaId,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim)
      });
      
      return reply.send({
        success: true,
        data: relatorio
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }
}