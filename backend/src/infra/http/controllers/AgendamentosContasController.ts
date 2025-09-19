import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { CreateAgendamentoContaUseCase } from '@/core/application/use-cases/CreateAgendamentoContaUseCase';
import { GetAgendamentosContasUseCase } from '@/core/application/use-cases/GetAgendamentosContasUseCase';
import { GetAgendamentoContaByAgendamentoUseCase } from '@/core/application/use-cases/GetAgendamentoContaByAgendamentoUseCase';
import { GetAgendamentosContasByContaReceberUseCase } from '@/core/application/use-cases/GetAgendamentosContasByContaReceberUseCase';
import { GetAgendamentosContasByContaPagarUseCase } from '@/core/application/use-cases/GetAgendamentosContasByContaPagarUseCase';
import { DeleteAgendamentoContaUseCase } from '@/core/application/use-cases/DeleteAgendamentoContaUseCase';

export class AgendamentosContasController {
  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { agendamentoId, contaReceberId, contaPagarId } = request.body as any;

      const createAgendamentoContaUseCase = container.resolve(CreateAgendamentoContaUseCase);
      
      const agendamentoConta = await createAgendamentoContaUseCase.execute({
        agendamentoId,
        contaReceberId,
        contaPagarId
      });

      reply.status(201).send({
        success: true,
        message: 'Relacionamento criado com sucesso',
        data: agendamentoConta
      });
    } catch (error: any) {
      reply.status(400).send({
        success: false,
        message: error.message || 'Erro ao criar relacionamento'
      });
    }
  }

  async findAll(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { contaReceberId, contaPagarId } = request.query as any;

      const getAgendamentosContasUseCase = container.resolve(GetAgendamentosContasUseCase);
      
      const agendamentosContas = await getAgendamentosContasUseCase.execute({
        contaReceberId: contaReceberId as string,
        contaPagarId: contaPagarId as string
      });

      reply.send({
        success: true,
        data: agendamentosContas
      });
    } catch (error: any) {
      reply.status(400).send({
        success: false,
        message: error.message || 'Erro ao buscar relacionamentos'
      });
    }
  }

  async findByAgendamento(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as any;

      const getAgendamentoContaByAgendamentoUseCase = container.resolve(GetAgendamentoContaByAgendamentoUseCase);
      
      const agendamentoConta = await getAgendamentoContaByAgendamentoUseCase.execute(id);

      if (!agendamentoConta) {
        reply.status(404).send({
          success: false,
          message: 'Relacionamento não encontrado para este agendamento'
        });
        return;
      }

      reply.send({
        success: true,
        data: agendamentoConta
      });
    } catch (error: any) {
      reply.status(400).send({
        success: false,
        message: error.message || 'Erro ao buscar relacionamento'
      });
    }
  }

  async findByContaReceber(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as any;

      const getAgendamentosContasByContaReceberUseCase = container.resolve(GetAgendamentosContasByContaReceberUseCase);
      
      const agendamentosContas = await getAgendamentosContasByContaReceberUseCase.execute(id);

      reply.send({
        success: true,
        data: agendamentosContas
      });
    } catch (error: any) {
      reply.status(400).send({
        success: false,
        message: error.message || 'Erro ao buscar relacionamentos'
      });
    }
  }

  async findByContaPagar(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as any;

      const getAgendamentosContasByContaPagarUseCase = container.resolve(GetAgendamentosContasByContaPagarUseCase);
      
      const agendamentosContas = await getAgendamentosContasByContaPagarUseCase.execute(id);

      reply.send({
        success: true,
        data: agendamentosContas
      });
    } catch (error: any) {
      reply.status(400).send({
        success: false,
        message: error.message || 'Erro ao buscar relacionamentos'
      });
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as any;

      const deleteAgendamentoContaUseCase = container.resolve(DeleteAgendamentoContaUseCase);
      
      await deleteAgendamentoContaUseCase.execute(id);

      reply.send({
        success: true,
        message: 'Relacionamento removido com sucesso'
      });
    } catch (error: any) {
      reply.status(400).send({
        success: false,
        message: error.message || 'Erro ao remover relacionamento'
      });
    }
  }
}