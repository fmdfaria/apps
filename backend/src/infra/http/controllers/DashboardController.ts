import { Request, Reply } from 'fastify';
import { container } from 'tsyringe';
import { GetOcupacaoUseCase } from '../../../core/application/use-cases/dashboard/GetOcupacaoUseCase';

export class DashboardController {
  async getOcupacao(request: Request, reply: Reply) {
    try {
      const getOcupacaoUseCase = container.resolve(GetOcupacaoUseCase);
      const result = await getOcupacaoUseCase.execute();

      // Debug: verificar o que está sendo enviado
      console.log('[DEBUG CONTROLLER] Primeiro recurso sendo enviado:', JSON.stringify(result.ocupacoesRecursos[0], null, 2));

      return reply.status(200).send(result);
    } catch (error) {
      console.error('Erro ao buscar dados de ocupação:', error);
      return reply.status(500).send({ 
        error: 'Erro interno do servidor ao buscar dados de ocupação' 
      });
    }
  }
}