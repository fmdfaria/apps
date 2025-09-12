import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { CreateContaBancariaUseCase } from '../../../core/application/use-cases/conta-bancaria/CreateContaBancariaUseCase';
import { ListContasBancariasUseCase } from '../../../core/application/use-cases/conta-bancaria/ListContasBancariasUseCase';
import { UpdateContaBancariaUseCase } from '../../../core/application/use-cases/conta-bancaria/UpdateContaBancariaUseCase';
import { DeleteContaBancariaUseCase } from '../../../core/application/use-cases/conta-bancaria/DeleteContaBancariaUseCase';
import { AtualizarSaldoContaBancariaUseCase } from '../../../core/application/use-cases/conta-bancaria/AtualizarSaldoContaBancariaUseCase';

interface CreateContaBancariaBody {
  empresaId: string;
  nome: string;
  banco: string;
  agencia: string;
  conta: string;
  digito?: string;
  tipoConta?: string;
  pixPrincipal?: string;
  tipoPix?: string;
  contaPrincipal?: boolean;
  ativo?: boolean;
  saldoInicial?: number;
  observacoes?: string;
}

interface UpdateContaBancariaBody {
  nome?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  digito?: string;
  tipoConta?: string;
  pixPrincipal?: string;
  tipoPix?: string;
  contaPrincipal?: boolean;
  ativo?: boolean;
  saldoInicial?: number;
  saldoAtual?: number;
  observacoes?: string;
}

interface ListContasBancariasQuery {
  empresaId?: string;
  ativo?: string;
  contaPrincipal?: string;
}

interface ContaBancariaParams {
  id: string;
}

interface EmpresaParams {
  empresaId: string;
}

interface AtualizarSaldoBody {
  saldo: number;
}

export class ContasBancariasController {
  async create(request: FastifyRequest<{ Body: CreateContaBancariaBody }>, reply: FastifyReply) {
    try {
      const createContaBancariaUseCase = container.resolve(CreateContaBancariaUseCase);
      
      const conta = await createContaBancariaUseCase.execute(request.body);
      
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

  async list(request: FastifyRequest<{ Querystring: ListContasBancariasQuery }>, reply: FastifyReply) {
    try {
      const listContasBancariasUseCase = container.resolve(ListContasBancariasUseCase);
      
      const filters = {
        ...(request.query.empresaId && { empresaId: request.query.empresaId }),
        ...(request.query.ativo !== undefined && { ativo: request.query.ativo === 'true' }),
        ...(request.query.contaPrincipal !== undefined && { contaPrincipal: request.query.contaPrincipal === 'true' })
      };

      const contas = await listContasBancariasUseCase.execute(filters);
      
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

  async findById(request: FastifyRequest<{ Params: ContaBancariaParams }>, reply: FastifyReply) {
    try {
      const listContasBancariasUseCase = container.resolve(ListContasBancariasUseCase);
      const contas = await listContasBancariasUseCase.execute();
      const conta = contas.find(c => c.id === request.params.id);
      
      if (!conta) {
        return reply.status(404).send({
          success: false,
          message: 'Conta bancária não encontrada'
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

  async findByEmpresa(request: FastifyRequest<{ Params: EmpresaParams }>, reply: FastifyReply) {
    try {
      const listContasBancariasUseCase = container.resolve(ListContasBancariasUseCase);
      
      const contas = await listContasBancariasUseCase.execute({
        empresaId: request.params.empresaId,
        ativo: true
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

  async update(request: FastifyRequest<{ Params: ContaBancariaParams; Body: UpdateContaBancariaBody }>, reply: FastifyReply) {
    try {
      const updateContaBancariaUseCase = container.resolve(UpdateContaBancariaUseCase);
      
      const conta = await updateContaBancariaUseCase.execute(request.params.id, request.body);
      
      return reply.send({
        success: true,
        data: conta
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Conta bancária não encontrada' ? 404 : 400;
      
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async delete(request: FastifyRequest<{ Params: ContaBancariaParams }>, reply: FastifyReply) {
    try {
      const deleteContaBancariaUseCase = container.resolve(DeleteContaBancariaUseCase);
      await deleteContaBancariaUseCase.execute(request.params.id);
      return reply.status(204).send();
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Conta bancária não encontrada' ? 404 : 400;
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async atualizarSaldo(request: FastifyRequest<{ Params: ContaBancariaParams; Body: AtualizarSaldoBody }>, reply: FastifyReply) {
    try {
      const atualizarSaldoContaBancariaUseCase = container.resolve(AtualizarSaldoContaBancariaUseCase);
      
      await atualizarSaldoContaBancariaUseCase.execute(request.params.id, request.body.saldo);
      
      return reply.send({
        success: true,
        message: 'Saldo atualizado com sucesso'
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Conta bancária não encontrada' ? 404 : 400;
      
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }
}