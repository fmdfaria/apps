import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { CreateAgendamentoContaUseCase } from '@/core/application/use-cases/CreateAgendamentoContaUseCase';
import { GetAgendamentosContasUseCase } from '@/core/application/use-cases/GetAgendamentosContasUseCase';
import { GetAgendamentoContaByAgendamentoUseCase } from '@/core/application/use-cases/GetAgendamentoContaByAgendamentoUseCase';
import { GetAgendamentosContasByContaReceberUseCase } from '@/core/application/use-cases/GetAgendamentosContasByContaReceberUseCase';
import { GetAgendamentosContasByContaPagarUseCase } from '@/core/application/use-cases/GetAgendamentosContasByContaPagarUseCase';
import { DeleteAgendamentoContaUseCase } from '@/core/application/use-cases/DeleteAgendamentoContaUseCase';

export class AgendamentosContasController {
  async create(request: Request, response: Response): Promise<Response> {
    try {
      const { agendamentoId, contaReceberId, contaPagarId } = request.body;

      const createAgendamentoContaUseCase = container.resolve(CreateAgendamentoContaUseCase);
      
      const agendamentoConta = await createAgendamentoContaUseCase.execute({
        agendamentoId,
        contaReceberId,
        contaPagarId
      });

      return response.status(201).json({
        success: true,
        message: 'Relacionamento criado com sucesso',
        data: agendamentoConta
      });
    } catch (error: any) {
      return response.status(400).json({
        success: false,
        message: error.message || 'Erro ao criar relacionamento'
      });
    }
  }

  async findAll(request: Request, response: Response): Promise<Response> {
    try {
      const { contaReceberId, contaPagarId } = request.query;

      const getAgendamentosContasUseCase = container.resolve(GetAgendamentosContasUseCase);
      
      const agendamentosContas = await getAgendamentosContasUseCase.execute({
        contaReceberId: contaReceberId as string,
        contaPagarId: contaPagarId as string
      });

      return response.json({
        success: true,
        data: agendamentosContas
      });
    } catch (error: any) {
      return response.status(400).json({
        success: false,
        message: error.message || 'Erro ao buscar relacionamentos'
      });
    }
  }

  async findByAgendamento(request: Request, response: Response): Promise<Response> {
    try {
      const { id } = request.params;

      const getAgendamentoContaByAgendamentoUseCase = container.resolve(GetAgendamentoContaByAgendamentoUseCase);
      
      const agendamentoConta = await getAgendamentoContaByAgendamentoUseCase.execute(id);

      if (!agendamentoConta) {
        return response.status(404).json({
          success: false,
          message: 'Relacionamento não encontrado para este agendamento'
        });
      }

      return response.json({
        success: true,
        data: agendamentoConta
      });
    } catch (error: any) {
      return response.status(400).json({
        success: false,
        message: error.message || 'Erro ao buscar relacionamento'
      });
    }
  }

  async findByContaReceber(request: Request, response: Response): Promise<Response> {
    try {
      const { id } = request.params;

      const getAgendamentosContasByContaReceberUseCase = container.resolve(GetAgendamentosContasByContaReceberUseCase);
      
      const agendamentosContas = await getAgendamentosContasByContaReceberUseCase.execute(id);

      return response.json({
        success: true,
        data: agendamentosContas
      });
    } catch (error: any) {
      return response.status(400).json({
        success: false,
        message: error.message || 'Erro ao buscar relacionamentos'
      });
    }
  }

  async findByContaPagar(request: Request, response: Response): Promise<Response> {
    try {
      const { id } = request.params;

      const getAgendamentosContasByContaPagarUseCase = container.resolve(GetAgendamentosContasByContaPagarUseCase);
      
      const agendamentosContas = await getAgendamentosContasByContaPagarUseCase.execute(id);

      return response.json({
        success: true,
        data: agendamentosContas
      });
    } catch (error: any) {
      return response.status(400).json({
        success: false,
        message: error.message || 'Erro ao buscar relacionamentos'
      });
    }
  }

  async delete(request: Request, response: Response): Promise<Response> {
    try {
      const { id } = request.params;

      const deleteAgendamentoContaUseCase = container.resolve(DeleteAgendamentoContaUseCase);
      
      await deleteAgendamentoContaUseCase.execute(id);

      return response.json({
        success: true,
        message: 'Relacionamento removido com sucesso'
      });
    } catch (error: any) {
      return response.status(400).json({
        success: false,
        message: error.message || 'Erro ao remover relacionamento'
      });
    }
  }
}