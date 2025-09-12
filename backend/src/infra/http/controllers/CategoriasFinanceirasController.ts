import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { CreateCategoriaFinanceiraUseCase } from '../../../core/application/use-cases/categoria-financeira/CreateCategoriaFinanceiraUseCase';
import { ListCategoriasFinanceirasUseCase } from '../../../core/application/use-cases/categoria-financeira/ListCategoriasFinanceirasUseCase';
import { UpdateCategoriaFinanceiraUseCase } from '../../../core/application/use-cases/categoria-financeira/UpdateCategoriaFinanceiraUseCase';
import { DeleteCategoriaFinanceiraUseCase } from '../../../core/application/use-cases/categoria-financeira/DeleteCategoriaFinanceiraUseCase';

interface CreateCategoriaFinanceiraBody {
  nome: string;
  tipo: string;
  descricao?: string;
  ativo?: boolean;
}

interface UpdateCategoriaFinanceiraBody {
  nome?: string;
  tipo?: string;
  descricao?: string;
  ativo?: boolean;
}

interface ListCategoriasFinanceirasQuery {
  tipo?: string;
  ativo?: string;
}

interface CategoriaFinanceiraParams {
  id: string;
}

interface TipoParams {
  tipo: string;
}

export class CategoriasFinanceirasController {
  async create(request: FastifyRequest<{ Body: CreateCategoriaFinanceiraBody }>, reply: FastifyReply) {
    try {
      const createCategoriaFinanceiraUseCase = container.resolve(CreateCategoriaFinanceiraUseCase);
      
      const categoria = await createCategoriaFinanceiraUseCase.execute(request.body);
      
      return reply.status(201).send({
        success: true,
        data: categoria
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async list(request: FastifyRequest<{ Querystring: ListCategoriasFinanceirasQuery }>, reply: FastifyReply) {
    try {
      const listCategoriasFinanceirasUseCase = container.resolve(ListCategoriasFinanceirasUseCase);
      
      const filters = {
        ...(request.query.tipo && { tipo: request.query.tipo }),
        ...(request.query.ativo !== undefined && { ativo: request.query.ativo === 'true' })
      };

      const categorias = await listCategoriasFinanceirasUseCase.execute(filters);
      
      return reply.send({
        success: true,
        data: categorias
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async findById(request: FastifyRequest<{ Params: CategoriaFinanceiraParams }>, reply: FastifyReply) {
    try {
      const listCategoriasFinanceirasUseCase = container.resolve(ListCategoriasFinanceirasUseCase);
      const categorias = await listCategoriasFinanceirasUseCase.execute();
      const categoria = categorias.find(c => c.id === request.params.id);
      
      if (!categoria) {
        return reply.status(404).send({
          success: false,
          message: 'Categoria financeira não encontrada'
        });
      }
      
      return reply.send({
        success: true,
        data: categoria
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async findByTipo(request: FastifyRequest<{ Params: TipoParams }>, reply: FastifyReply) {
    try {
      const listCategoriasFinanceirasUseCase = container.resolve(ListCategoriasFinanceirasUseCase);
      
      // Validar tipo
      if (!['RECEITA', 'DESPESA'].includes(request.params.tipo)) {
        return reply.status(400).send({
          success: false,
          message: 'Tipo deve ser RECEITA ou DESPESA'
        });
      }
      
      const categorias = await listCategoriasFinanceirasUseCase.execute({
        tipo: request.params.tipo,
        ativo: true
      });
      
      return reply.send({
        success: true,
        data: categorias
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async update(request: FastifyRequest<{ Params: CategoriaFinanceiraParams; Body: UpdateCategoriaFinanceiraBody }>, reply: FastifyReply) {
    try {
      const updateCategoriaFinanceiraUseCase = container.resolve(UpdateCategoriaFinanceiraUseCase);
      
      const categoria = await updateCategoriaFinanceiraUseCase.execute(request.params.id, request.body);
      
      return reply.send({
        success: true,
        data: categoria
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Categoria financeira não encontrada' ? 404 : 400;
      
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async delete(request: FastifyRequest<{ Params: CategoriaFinanceiraParams }>, reply: FastifyReply) {
    try {
      const deleteCategoriaFinanceiraUseCase = container.resolve(DeleteCategoriaFinanceiraUseCase);
      await deleteCategoriaFinanceiraUseCase.execute(request.params.id);
      return reply.status(204).send();
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Categoria financeira não encontrada' ? 404 : 400;
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }
}